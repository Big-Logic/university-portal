const { deliverInBackground, layout } = require('./mail.helpers');

// Carries no credential and no link. Its only job is to reach the
// owner if it wasn't them who changed the password.
function sendPasswordChangedEmail(email) {
  deliverInBackground({
    to: email,
    subject: 'Your University Portal password was changed',
    text: [
      'Your University Portal password was just changed, and every signed-in session was ended.',
      '',
      "If this was you, there's nothing to do.",
      "If it wasn't, contact support immediately — someone else may have access to your account.",
    ].join('\n'),
    html: layout({
      heading: 'Your password was changed',
      body: `<p>Your University Portal password was just changed, and every signed-in session was ended.</p>
             <p style="color:#555;font-size:14px">If this was you, there's nothing to do. If it wasn't, <strong>contact support immediately</strong> — someone else may have access to your account.</p>`,
    }),
  });
}

module.exports = sendPasswordChangedEmail;
