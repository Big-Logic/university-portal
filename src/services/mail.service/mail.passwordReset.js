const env = require('../../config/env');
const { deliverInBackground, layout } = require('./mail.helpers');

// The reset token travels only in this link. It is never logged
// outside development (see auth.forgotPassword's devResetToken).
function sendPasswordResetEmail(email, rawToken) {
  const url = `${env.mail.appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  deliverInBackground({
    to: email,
    subject: 'Reset your University Portal password',
    text: [
      'We received a request to reset your University Portal password.',
      '',
      `Open this link to choose a new one: ${url}`,
      '',
      'The link expires in 30 minutes and can only be used once.',
      "If you didn't request this, you can ignore this email — your password stays as it is.",
    ].join('\n'),
    html: layout({
      heading: 'Reset your password',
      body: `<p>We received a request to reset your University Portal password.</p>
             <p style="color:#555;font-size:14px">The link expires in <strong>30 minutes</strong> and can only be used once. If you didn't request this, you can ignore this email — your password stays as it is.</p>`,
      action: { url, label: 'Choose a new password' },
    }),
  });
}

module.exports = sendPasswordResetEmail;
