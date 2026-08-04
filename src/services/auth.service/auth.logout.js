const prisma = require('../../db/prisma');
const { hashRefreshToken } = require('../../utils/refreshToken');

async function logout({ refreshToken }) {
  const hash = hashRefreshToken(refreshToken);
  await prisma.refresh_tokens.updateMany({
    where: { token_hash: hash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

module.exports = logout;
