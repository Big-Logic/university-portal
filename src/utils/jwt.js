const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(user) {
  // Keep the payload minimal -- id and role are all downstream
  // middleware needs. Never put sensitive data in a JWT payload;
  // it's base64, not encrypted.
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

module.exports = { signAccessToken, verifyAccessToken };
