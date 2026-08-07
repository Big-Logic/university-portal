const nodemailer = require('nodemailer');
// Promise-based timer, so the retry backoff doesn't need setTimeout on
// the global object (which eslint's config here doesn't declare).
const { setTimeout: sleep } = require('timers/promises');
const env = require('../../config/env');

// Shared internals for the mail operations in this directory -- the
// transport, the send wrapper, and the layout every message uses.

const SEND_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

// Without SMTP_HOST, mail is off: deliver() drops the message and says
// so in its return value. Keeps local dev and CI from opening sockets;
// the reset flow stays testable through devResetToken.
const isConfigured = Boolean(env.mail.smtp.host);

let transport = null;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.mail.smtp.host,
      port: env.mail.smtp.port,
      secure: env.mail.smtp.secure,
      auth: env.mail.smtp.user ? { user: env.mail.smtp.user, pass: env.mail.smtp.pass } : undefined,
    });
  }
  return transport;
}

// Never throws. Every caller has already committed the work the email
// describes -- a password changed, an account created -- so a failed
// send must not turn a successful request into an error. Callers that
// need to know get `false`; the reason is logged either way.
async function deliver({ to, subject, text, html }) {
  if (!isConfigured) {
    return false;
  }

  for (let attempt = 1; attempt <= SEND_ATTEMPTS; attempt += 1) {
    try {
      await getTransport().sendMail({ from: env.mail.from, to, subject, text, html });
      return true;
    } catch (err) {
      const lastAttempt = attempt === SEND_ATTEMPTS;
      // Subject but never body: the body carries reset links and
      // temporary passwords.
      console.error(
        `[email] send failed (attempt ${attempt}/${SEND_ATTEMPTS}) to ${to} | ${subject}: ${err.message}`
      );
      if (lastAttempt) return false;
      await sleep(RETRY_DELAY_MS);
    }
  }

  return false;
}

// What the send functions actually call. Mail is never something a
// request should wait on: the work it describes has already committed,
// and no caller can act on the outcome -- so the send runs in the
// background and the request returns now.
//
// The .catch is what makes that safe. A floating promise that rejects
// takes the process down in Node, and deliver() only guarantees it
// won't throw for send failures; a bug anywhere else in it would
// otherwise crash the server rather than lose an email.
function deliverInBackground(message) {
  deliver(message).catch((err) => {
    console.error(
      `[email] unexpected failure for ${message.to} | ${message.subject}: ${err.message}`
    );
  });
}

// One plain wrapper so every message looks like it came from the same
// system. Deliberately minimal markup -- inlined styles only, since
// mail clients strip <style> blocks, and no images to load.
function layout({ heading, body, action }) {
  const button = action
    ? `<p style="margin:24px 0"><a href="${action.url}" style="background:#1f3a8a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${action.label}</a></p>
       <p style="color:#555;font-size:13px">If the button doesn't work, paste this into your browser:<br><span style="color:#1f3a8a">${action.url}</span></p>`
    : '';

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:18px;margin:0 0 16px">${heading}</h1>
  ${body}
  ${button}
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0">
  <p style="color:#777;font-size:12px;margin:0">University Portal. This is an automated message — please don't reply.</p>
</div>`;
}

module.exports = { deliverInBackground, layout };
