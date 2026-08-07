// Shared building blocks for the user operations in this directory --
// each is used by more than one of them.
const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');

// Both password paths (self-service change and admin reset) need to
// 404 cleanly before touching credentials. password_hash comes along
// for changeOwnPassword, which has to verify the current one; the
// admin path ignores it.
//
// The credential write itself lives in utils/credentials.js -- it's
// shared with auth.resetPassword, so it can't live in this directory.
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

module.exports = { findUserOrThrow };
