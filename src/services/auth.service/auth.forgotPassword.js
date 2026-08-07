const prisma = require('../../db/prisma');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const TX_OPTIONS = require('../../db/txOptions');
const { sendPasswordResetEmail } = require('../mail.service');
const { generateResetToken } = require('../../utils/resetToken');
const { findUserByEmail } = require('./auth.helpers');

const RESET_TOKEN_TTL_MINUTES = 30;

async function forgotPassword({ email }) {
  const user = await findUserByEmail(email);

  // An unknown email looks exactly like a successful request: the
  // controller sends the same generic message either way, so this
  // endpoint can't be used to test whether an address is registered.
  if (!user) {
    return;
  }

  // A deactivated account is answered differently, on purpose. It
  // trades a narrow leak -- an attacker can confirm that a given
  // address belongs to a *deactivated* account, though active ones
  // stay indistinguishable from unknown ones -- for not leaving a
  // locked-out user requesting resets that silently go nowhere.
  if (!user.is_active) {
    throw ApiError.forbidden(
      'This account is deactivated. Please contact support.',
      'INACTIVE_ACCOUNT'
    );
  }

  const { raw, hash } = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  // Issuing a link retires the previous one, so a user holds at most a
  // single live token. Without this, every request left another
  // working key to the account for its full TTL -- ten requests, ten
  // ways in. Deleting rather than marking used also keeps the table
  // from accumulating rows nothing will ever read again.
  await prisma.$transaction(
    [
      prisma.password_reset_tokens.deleteMany({ where: { user_id: user.id } }),
      prisma.password_reset_tokens.create({
        data: { user_id: user.id, token_hash: hash, expires_at: expiresAt },
      }),
    ],
    TX_OPTIONS
  );

  // Not awaited: the send runs in the background, so a slow SMTP hop
  // doesn't hold the response open. Nothing here could act on a
  // failure anyway -- the reply has to stay generic either way.
  sendPasswordResetEmail(user.email, raw);

  // Only surface the raw token directly in non-production environments,
  // so the flow is testable end-to-end without real email
  // infrastructure. In production this must never leave the server --
  // the email is the only channel it should travel through.
  return env.nodeEnv !== 'production' ? { devResetToken: raw } : undefined;
}

module.exports = forgotPassword;
