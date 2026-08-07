const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { hashPassword, generateRandomPassword } = require('../../utils/password');
const { formatUserProfile } = require('../../utils/userProfile');
const { sendNewAccountEmail } = require('../mail.service');

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

  sendNewAccountEmail(user.email, generatedPassword);

  return {
    ...formatUserProfile(user),
    role: roleName,
    generatedPassword,
  };
}

module.exports = createUser;
