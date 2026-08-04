const prisma = require('../../db/prisma');
const { sendPasswordResetEmail } = require('../../utils/emailer');
const { generateResetToken } = require('../../utils/resetToken');
const env = require('../../config/env');
const { findUserByEmail } = require('./auth.helpers');

const RESET_TOKEN_TTL_MINUTES = 30;

async function forgotPassword({ email }) {
  const user = await findUserByEmail(email);

  // Always behave the same way whether or not the email exists --
  // otherwise this endpoint becomes a way to enumerate real accounts.
  if (!user || !user.is_active) {
    return;
  }

  const { raw, hash } = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.password_reset_tokens.create({
    data: { user_id: user.id, token_hash: hash, expires_at: expiresAt },
  });

  await sendPasswordResetEmail(user.email, raw);

  // Only surface the raw token directly in non-production environments,
  // so the flow is testable end-to-end without real email
  // infrastructure. In production this must never leave the server --
  // the email is the only channel it should travel through.
  return env.nodeEnv !== 'production' ? { devResetToken: raw } : undefined;
}

module.exports = forgotPassword;
