const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { setUserPassword } = require('../../utils/credentials');
const { sendPasswordChangedEmail } = require('../../utils/emailer');
const { hashResetToken } = require('../../utils/resetToken');

const INVALID_TOKEN = ['Reset token is invalid or expired', 'INVALID_RESET_TOKEN'];

async function resetPassword({ token, newPassword }) {
  const hash = hashResetToken(token);

  const record = await prisma.password_reset_tokens.findUnique({
    where: { token_hash: hash },
    include: { users: { select: { id: true, email: true, is_active: true } } },
  });
  if (!record) {
    throw ApiError.badRequest(...INVALID_TOKEN);
  }

  // Claim the token with a conditional update rather than checking
  // used_at and then writing: the two aren't atomic, so concurrent
  // requests carrying the same token would both pass the check and
  // both reset the password. Whoever gets count === 1 won the race;
  // everyone else gets the same generic rejection as a stale token.
  const claimed = await prisma.password_reset_tokens.updateMany({
    where: { id: record.id, used_at: null, expires_at: { gt: new Date() } },
    data: { used_at: new Date() },
  });
  if (claimed.count !== 1) {
    throw ApiError.badRequest(...INVALID_TOKEN);
  }

  // Fail closed from here: the token is spent even if the write below
  // fails, so a partial failure leaves nothing replayable -- the user
  // requests a fresh link.

  // A token issued before the account was deactivated shouldn't still
  // rewrite its password; forgotPassword already refuses to issue one.
  if (!record.users.is_active) {
    throw ApiError.unauthorized(
      'Inactive user account. Please contact support.',
      'INACTIVE_ACCOUNT'
    );
  }

  // Also revokes every refresh token and deletes the remaining reset
  // tokens for this user -- see utils/credentials.js.
  await setUserPassword(record.user_id, newPassword);

  await sendPasswordChangedEmail(record.users.email);
}

module.exports = resetPassword;
