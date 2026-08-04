const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { signAccessToken } = require('../../utils/jwt');
const { generateRefreshToken, hashRefreshToken } = require('../../utils/refreshToken');
const { storeRefreshToken } = require('./auth.helpers');

async function refresh({ refreshToken, clientLabel }) {
  const hash = hashRefreshToken(refreshToken);

  const record = await prisma.refresh_tokens.findUnique({
    where: { token_hash: hash },
    include: { users: { include: { roles: true } } },
  });

  if (
    !record ||
    record.revoked_at ||
    new Date(record.expires_at) < new Date() ||
    !record.users.is_active
  ) {
    throw ApiError.unauthorized('Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
  }

  // Rotate: revoke the old refresh token and issue a new one. This
  // limits how long a stolen refresh token remains useful.
  await prisma.refresh_tokens.update({
    where: { id: record.id },
    data: { revoked_at: new Date() },
  });

  const accessToken = signAccessToken({
    id: record.user_id,
    role: record.users.roles.name,
  });
  const { raw: newRefreshToken, hash: newHash } = generateRefreshToken();
  await storeRefreshToken(record.user_id, newHash, clientLabel);

  return { accessToken, refreshToken: newRefreshToken };
}

module.exports = refresh;
