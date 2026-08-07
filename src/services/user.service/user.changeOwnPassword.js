const ApiError = require('../../utils/ApiError');
const { comparePassword } = require('../../utils/password');
const { setUserPassword } = require('../../utils/credentials');
const { sendPasswordChangedEmail } = require('../mail.service');
const { findUserOrThrow } = require('./user.helpers');

// Self-service: the caller supplies the new password and it applies to
// their own account only -- the route takes the id from the token, so
// there is no target to point elsewhere.
async function changeOwnPassword(userId, { currentPassword, newPassword }) {
  const user = await findUserOrThrow(userId);

  // Knowing the current password is what separates the account owner
  // from someone holding a stolen access token. Without this check a
  // leaked token could take the account over -- and since the change
  // revokes every refresh token, lock the real owner out.
  const currentMatches = await comparePassword(currentPassword, user.password_hash);
  if (!currentMatches) {
    throw ApiError.unauthorized('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current one');
  }

  const passwordChangedAt = await setUserPassword(userId, newPassword);

  // Tells the owner their password moved -- the signal that matters if
  // it wasn't them who moved it.
  sendPasswordChangedEmail(user.email);

  // Revoking every refresh token logs this session out too, so the
  // client has to sign in again with the new password.
  return { id: user.id, email: user.email, changed: true, passwordChangedAt };
}

module.exports = changeOwnPassword;
