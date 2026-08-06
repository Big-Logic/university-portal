const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');

// Generous window for a remote DB (Aiven, etc.) -- Prisma's default
// maxWait (2s) assumes a fast/local connection and can be too tight
// once TLS handshake + network latency are in the mix.
const TX_OPTIONS = { maxWait: 10000, timeout: 15000 };

async function updateUserRole({ targetUserId, newRoleName, changedByUserId }) {
  // Reads happen outside the transaction -- they don't need to be
  // atomic with the write, and keeping them out avoids holding an
  // interactive transaction open (prisma.$transaction(async tx => ...))
  // just to wait on round trips, which is what was timing out here.
  const targetUser = await prisma.users.findUnique({
    where: { id: targetUserId },
    include: { roles: { select: { name: true } } },
  });
  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  // The other half of the users/students boundary: the validator
  // already refuses `role: "student"` as a target, and this refuses a
  // student as the subject. A student account exists only alongside a
  // students profile, so promoting one to staff would leave an
  // orphaned academic record pointing at a non-student.
  if (targetUser.roles.name === 'student') {
    throw ApiError.badRequest(
      'Student accounts cannot have their role changed',
      'STUDENT_ROLE_IMMUTABLE'
    );
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

module.exports = updateUserRole;
