const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { USER_PROFILE_SELECT, formatUserProfile } = require('../../utils/userProfile');

async function getUserById(id) {
  const user = await prisma.users.findUnique({
    where: { id },
    // select, not include: keeps password_hash out of the row entirely.
    select: { ...USER_PROFILE_SELECT, roles: { select: { name: true } } },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // role isn't a users column -- it comes off the related roles row, so
  // USER_PROFILE_SELECT can't carry it and it's merged in here.
  return { ...formatUserProfile(user), role: user.roles.name };
}

module.exports = getUserById;
