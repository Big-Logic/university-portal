const prisma = require('../db/prisma');
const ApiError = require('../utils/ApiError');
const { comparePassword, hashPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/emailer');
const { generateRefreshToken, hashRefreshToken } = require('../utils/refreshToken');
const { generateResetToken, hashResetToken } = require('../utils/resetToken');
const env = require('../config/env');

const RESET_TOKEN_TTL_MINUTES = 30;

async function findUserByEmail(email) {
  const user = await prisma.users.findUnique({
    where: { email },
    include: { roles: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    is_active: user.is_active,
    role: user.roles.name,
  };
}

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

  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const { raw: refreshToken, hash: refreshHash } = generateRefreshToken();
  await storeRefreshToken(user.id, refreshHash, clientLabel);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      role: user.role,
    },
  };
}

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

async function logout({ refreshToken }) {
  const hash = hashRefreshToken(refreshToken);
  await prisma.refresh_tokens.updateMany({
    where: { token_hash: hash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

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

async function resetPassword({ token, newPassword }) {
  const hash = hashResetToken(token);

  const record = await prisma.password_reset_tokens.findFirst({
    where: { token_hash: hash },
  });

  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    throw ApiError.badRequest('Reset token is invalid or expired', 'INVALID_RESET_TOKEN');
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.users.update({
      where: { id: record.user_id },
      data: { password_hash: newHash },
    }),
    prisma.password_reset_tokens.update({
      where: { id: record.id },
      data: { used_at: new Date() },
    }),
    // Changing the password invalidates every existing session -- if
    // an account was compromised, this locks the old session out too,
    // not just the password.
    prisma.refresh_tokens.updateMany({
      where: { user_id: record.user_id, revoked_at: null },
      data: { revoked_at: new Date() },
    }),
  ]);
}

module.exports = { login, refresh, logout, findUserByEmail, forgotPassword, resetPassword };
