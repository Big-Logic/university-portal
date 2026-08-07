// Public surface of the mail service: the messages the rest of the app
// can send, and nothing else. The transport and the shared layout stay
// internal to this directory (mail.helpers.js), so swapping providers
// is a change in one file that no caller sees.
const sendPasswordResetEmail = require('./mail.passwordReset');
const sendNewAccountEmail = require('./mail.newAccount');
const sendTemporaryPasswordEmail = require('./mail.temporaryPassword');
const sendPasswordChangedEmail = require('./mail.passwordChanged');

module.exports = {
  sendPasswordResetEmail,
  sendNewAccountEmail,
  sendTemporaryPasswordEmail,
  sendPasswordChangedEmail,
};
