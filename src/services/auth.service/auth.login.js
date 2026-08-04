const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { comparePassword } = require('../../utils/password');
const { signAccessToken } = require('../../utils/jwt');
const { generateRefreshToken } = require('../../utils/refreshToken');
const { findUserByEmail, storeRefreshToken } = require('./auth.helpers');

async function login({ email, password, clientLabel }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw ApiError.unauthorized(
      'Inactive user account. Please contact support.',
      'INACTIVE_ACCOUNT'
    );
  }

  const role = user.roles.name;
  const accessToken = signAccessToken({ id: user.id, role });
  const { raw: refreshToken, hash: refreshHash } = generateRefreshToken();
  await storeRefreshToken(user.id, refreshHash, clientLabel);

  // Best-effort: a failed bookkeeping write shouldn't cost the user a
  // login they've already authenticated for.
  prisma.users
    .update({ where: { id: user.id }, data: { last_login_at: new Date() } })
    .catch(() => {});

  return { accessToken, refreshToken, user: { id: user.id, role } };
}

module.exports = login;
