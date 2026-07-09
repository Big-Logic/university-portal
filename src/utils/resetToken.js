const crypto = require("crypto");

// Same pattern as refresh tokens: only the hash is stored, so a
// leaked database can't be used to reset anyone's password directly.
function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashResetToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

module.exports = { generateResetToken, hashResetToken };
