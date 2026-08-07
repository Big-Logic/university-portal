const env = require('../../config/env');
const { deliverInBackground, layout } = require('./mail.helpers');

// Admin-initiated reset. Unlike the self-service flow this carries the
// password itself rather than a link, because the admin path generates
// it server-side (user.resetUserPassword).
function sendTemporaryPasswordEmail(email, temporaryPassword) {
  const url = `${env.mail.appUrl}/login`;

  deliverInBackground({
    to: email,
    subject: 'Your University Portal password was reset',
    text: [
      'An administrator has reset your University Portal password.',
      '',
      `Temporary password: ${temporaryPassword}`,
      '',
      `Sign in at ${url} and change it straight away.`,
      "If you didn't expect this, contact support — every other session has been signed out.",
    ].join('\n'),
    html: layout({
      heading: 'Your password was reset',
      body: `<p>An administrator has reset your University Portal password.</p>
             <p style="background:#f6f6f6;padding:12px;border-radius:6px;font-family:ui-monospace,monospace;font-size:14px">
               Temporary password: <strong>${temporaryPassword}</strong>
             </p>
             <p style="color:#555;font-size:14px">Please change it as soon as you sign in. If you didn't expect this, contact support — every other session has been signed out.</p>`,
      action: { url, label: 'Sign in' },
    }),
  });
}

module.exports = sendTemporaryPasswordEmail;
