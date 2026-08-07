const { generateRandomPassword } = require('../../utils/password');
const { sendTemporaryPasswordEmail } = require('../mail.service');
const { setUserPassword } = require('../../utils/credentials');
const { findUserOrThrow } = require('./user.helpers');

// Admin resetting somebody else's password. The new password is
// generated server-side rather than chosen by the admin -- same as
// account creation, so an admin never picks a credential another
// person will keep using.
//
// The route is what enforces admin-only; nothing here checks the
// caller, so it must always sit behind requireRole('admin').
async function resetUserPassword(targetUserId) {
  const user = await findUserOrThrow(targetUserId);

  const generatedPassword = generateRandomPassword();
  const passwordChangedAt = await setUserPassword(targetUserId, generatedPassword);

  sendTemporaryPasswordEmail(user.email, generatedPassword);

  return { id: user.id, email: user.email, generatedPassword, passwordChangedAt };
}

module.exports = resetUserPassword;
