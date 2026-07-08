const crypto = require('crypto');

// The raw token is what the client stores and sends back; only its
// SHA-256 hash is persisted in the database (mirrors password_hash --
// if the DB leaks, stored refresh tokens can't be replayed directly).
function generateRefreshToken() {
  const raw = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { generateRefreshToken, hashRefreshToken };
