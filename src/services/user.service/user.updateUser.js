const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { USER_PROFILE_SELECT, formatUserProfile } = require('../../utils/userProfile');

// `profile` is the validated set of writable users-table columns --
// build it with toProfileData (utils/userProfile.js) so nothing else
// can ride along into the write.
//
// Deliberately not updatable here: `email` is a login credential and a
// unique key, `role` has its own audited endpoint (updateUserRole),
// `is_active` has setUserActive, and the password goes through the
// reset flow. Each is a different decision with different
// consequences, so none of them belongs in a profile PATCH.
async function updateUser(targetUserId, profile) {
  const targetUser = await prisma.users.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!targetUser) {
    // Clean 404 instead of Prisma's P2025 bubbling out of the update.
    throw ApiError.notFound('User not found');
  }

  const updated = await prisma.users.update({
    where: { id: targetUserId },
    data: profile,
    select: { ...USER_PROFILE_SELECT, roles: { select: { name: true } } },
  });

  // Same shape as getUserById, so a client can re-render straight from
  // a PATCH response. role lives on the related roles row, so
  // USER_PROFILE_SELECT can't carry it and it's merged in here.
  return { ...formatUserProfile(updated), role: updated.roles.name };
}

module.exports = updateUser;
