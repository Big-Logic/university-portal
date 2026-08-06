const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');

async function setUserActive(targetUserId, isActive) {
  const targetUser = await prisma.users.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  if (targetUser.is_active === isActive) {
    // Already in the requested state, so skip the write rather than
    // bumping updated_at for nothing. Not an error: deactivating an
    // inactive account isn't a client mistake worth a 4xx -- return
    // the current state, same as updateUserRole does for a same-role
    // assignment.
    console.log('hey');
    return {
      id: targetUser.id,
      email: targetUser.email,
      isActive: targetUser.is_active,
      changed: false,
    };
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

  return { id: updated.id, email: updated.email, isActive: updated.is_active, changed: true };
}

module.exports = setUserActive;
