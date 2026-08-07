const env = require('../../config/env');
const { deliverInBackground, layout } = require('./mail.helpers');

// Carries a working credential, so it tells the recipient to replace it
// immediately. Sending passwords by email is a known weak spot -- see
// the mailer plan's "out of scope" note.
function sendNewAccountEmail(email, temporaryPassword) {
  const url = `${env.mail.appUrl}/login`;

  deliverInBackground({
    to: email,
    subject: 'Your University Portal account is ready',
    text: [
      'An administrator has created a University Portal account for you.',
      '',
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      '',
      `Sign in at ${url} and change this password straight away.`,
    ].join('\n'),
    html: layout({
      heading: 'Your account is ready',
      body: `<p>An administrator has created a University Portal account for you.</p>
             <p style="background:#f6f6f6;padding:12px;border-radius:6px;font-family:ui-monospace,monospace;font-size:14px">
               Email: ${email}<br>Temporary password: <strong>${temporaryPassword}</strong>
             </p>
             <p style="color:#555;font-size:14px">Please change this password as soon as you sign in.</p>`,
      action: { url, label: 'Sign in' },
    }),
  });
}

module.exports = sendNewAccountEmail;
