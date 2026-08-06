// Shared building blocks for the user operations in this directory --
// each is used by more than one of them.
const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { hashPassword } = require('../../utils/password');

// Both password paths (self-service change and admin reset) need to
// 404 cleanly before touching credentials. password_hash comes along
// for changeOwnPassword, which has to verify the current one; the
// admin path ignores it.
async function findUserOrThrow(targetUserId) {
  const user = await prisma.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, password_hash: true },
  });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
}

// The credential write itself, identical for both paths: hash, stamp
// password_changed_at, and end every existing session in one
// transaction so a compromised password can't outlive the change.
// Already-issued access tokens stay valid until their own short expiry
// -- see setUserActive for why that trade-off stands.
async function setUserPassword(targetUserId, newPassword) {
  const passwordHash = await hashPassword(newPassword);
  const changedAt = new Date();

  await prisma.$transaction([
    prisma.users.update({
      where: { id: targetUserId },
      data: { password_hash: passwordHash, password_changed_at: changedAt },
    }),
    prisma.refresh_tokens.updateMany({
      where: { user_id: targetUserId, revoked_at: null },
      data: { revoked_at: new Date() },
    }),
  ]);

  return changedAt;
}

module.exports = { findUserOrThrow, setUserPassword };
