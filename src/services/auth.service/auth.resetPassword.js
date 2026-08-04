const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { hashPassword } = require('../../utils/password');
const { hashResetToken } = require('../../utils/resetToken');

async function resetPassword({ token, newPassword }) {
  const hash = hashResetToken(token);

  const record = await prisma.password_reset_tokens.findFirst({
    where: { token_hash: hash },
  });

  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    throw ApiError.badRequest('Reset token is invalid or expired', 'INVALID_RESET_TOKEN');
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.users.update({
      where: { id: record.user_id },
      // Inside the transaction, so the timestamp can't record a change
      // that then failed to commit.
      data: { password_hash: newHash, password_changed_at: new Date() },
    }),
    prisma.password_reset_tokens.update({
      where: { id: record.id },
      data: { used_at: new Date() },
    }),
    // Changing the password invalidates every existing session -- if
    // an account was compromised, this locks the old session out too,
    // not just the password.
    prisma.refresh_tokens.updateMany({
      where: { user_id: record.user_id, revoked_at: null },
      data: { revoked_at: new Date() },
    }),
  ]);
}

module.exports = resetPassword;
