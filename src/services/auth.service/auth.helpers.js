// Shared building blocks for the auth operations in this directory --
// each is used by more than one of them, and none is an operation in
// its own right.
const prisma = require('../../db/prisma');
const { USER_PROFILE_SELECT } = require('../../utils/userProfile');
const env = require('../../config/env');

// A raw lookup: returns the users row as stored (snake_case), password
// hash included. Shaping any of it for a client is the caller's job --
// only `login` responds with user data, and it formats there.
// Used by login and forgotPassword.
function findUserByEmail(email) {
  return prisma.users.findUnique({
    where: { email },
    // select, not include: password_hash is pulled deliberately rather
    // than riding along with every other column by default.
    select: { ...USER_PROFILE_SELECT, password_hash: true, roles: { select: { name: true } } },
  });
}

// Used by login and refresh, which both issue a token.
async function storeRefreshToken(userId, hash, clientLabel) {
  const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);
  await prisma.refresh_tokens.create({
    data: {
      user_id: userId,
      token_hash: hash,
      client_label: clientLabel || null,
      expires_at: expiresAt,
    },
  });
}

module.exports = { findUserByEmail, storeRefreshToken };
