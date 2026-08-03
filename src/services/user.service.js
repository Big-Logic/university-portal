const prisma = require('../db/prisma');
const ApiError = require('../utils/ApiError');
const { hashPassword, generateRandomPassword } = require('../utils/password');
const { formatUserProfile } = require('../utils/userProfile');

// Generous window for a remote DB (Aiven, etc.) -- Prisma's default
// maxWait (2s) assumes a fast/local connection and can be too tight
// once TLS handshake + network latency are in the mix.
const TX_OPTIONS = { maxWait: 10000, timeout: 15000 };

// `profile` is the validated set of users-table profile columns
// (first_name, last_name, phone, ...) -- see utils/userProfile.js.
async function createUser({ email, profile, roleName }) {
  const role = await prisma.roles.findUnique({ where: { name: roleName } });
  if (!role) {
    throw ApiError.badRequest(`Unknown role: ${roleName}`);
  }

  const generatedPassword = generateRandomPassword();
  const passwordHash = await hashPassword(generatedPassword);

  const user = await prisma.users.create({
    data: { email, ...profile, password_hash: passwordHash, role_id: role.id },
  });

  return {
    ...formatUserProfile(user),
    role: roleName,
    generatedPassword,
  };
}

async function setUserActive(targetUserId, isActive) {
  const targetUser = await prisma.users.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  const updated = await prisma.users.update({
    where: { id: targetUserId },
    data: { is_active: isActive },
  });

  if (!isActive) {
    // Deactivation should stop new sessions immediately. Existing
    // access tokens remain valid until their own short expiry
    // (JWT_ACCESS_EXPIRES_IN, 15m by default) since they're stateless
    // and not re-checked against the DB on every request -- a
    // deliberate performance trade-off. Revoking refresh tokens
    // guarantees no *new* access token can be issued after this point.
    await prisma.refresh_tokens.updateMany({
      where: { user_id: targetUserId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  return { id: updated.id, email: updated.email, isActive: updated.is_active };
}

async function updateUserRole({ targetUserId, newRoleName, changedByUserId }) {
  // Reads happen outside the transaction -- they don't need to be
  // atomic with the write, and keeping them out avoids holding an
  // interactive transaction open (prisma.$transaction(async tx => ...))
  // just to wait on round trips, which is what was timing out here.
  const targetUser = await prisma.users.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  const newRole = await prisma.roles.findUnique({ where: { name: newRoleName } });
  if (!newRole) {
    throw ApiError.badRequest(`Unknown role: ${newRoleName}`);
  }

  const oldRoleId = targetUser.role_id;

  if (oldRoleId === newRole.id) {
    // No-op, but still return current state rather than erroring --
    // re-assigning the same role isn't a client mistake worth a 4xx.
    return { id: targetUser.id, email: targetUser.email, role: newRoleName, changed: false };
  }

  // Only the actual write needs to be atomic: the role change and its
  // audit log entry must succeed or fail together.
  const [updated] = await prisma.$transaction(
    [
      prisma.users.update({ where: { id: targetUserId }, data: { role_id: newRole.id } }),
      prisma.role_audit_log.create({
        data: {
          user_id: targetUserId,
          changed_by: changedByUserId,
          old_role_id: oldRoleId,
          new_role_id: newRole.id,
        },
      }),
    ],
    TX_OPTIONS
  );

  return { id: updated.id, email: updated.email, role: newRoleName, changed: true };
}

module.exports = { createUser, setUserActive, updateUserRole };
