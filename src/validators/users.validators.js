const { z } = require('zod');
const { emailField, profileFields } = require('./userProfile.validators');

const VALID_ROLES = ['student', 'faculty', 'registrar', 'finance', 'admin'];

// Student accounts are created exclusively through /api/v1/students
// (which creates the user + their students profile together) -- not
// through this resource, so 'student' is deliberately excluded here.
const STAFF_ROLES = VALID_ROLES.filter((r) => r !== 'student');

const createUserSchema = z.object({
  email: emailField,
  ...profileFields,
  role: z.enum(STAFF_ROLES, { error: `role must be one of: ${STAFF_ROLES.join(', ')}` }),
});

// Every profile field optional, but the body can't be empty -- an
// empty PATCH would otherwise bump updated_at without changing
// anything. email/role/is_active/password are not updatable here; each
// has its own endpoint (see user.updateUser.js).
const updateUserSchema = z
  .object(profileFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// Sort keys the list endpoint accepts, mapped to columns in
// user.listUsers.js. Keep the two in step.
const SORT_KEYS = ['createdAt', 'updatedAt', 'lastLoginAt', 'email', 'firstName', 'lastName'];

// Query string, so everything arrives as a string and gets coerced
// here. Defaults live here too, which is why the service can be called
// with no arguments in tests and still behave.
const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive('page must be 1 or greater').default(1),
  // Capped: an uncapped limit lets one request pull the whole table.
  limit: z.coerce
    .number()
    .int()
    .positive('limit must be 1 or greater')
    .max(100, 'limit cannot exceed 100')
    .default(20),
  // Staff roles only: the list never returns student accounts, so
  // accepting 'student' here would just guarantee an empty page.
  role: z.enum(STAFF_ROLES, { error: `role must be one of: ${STAFF_ROLES.join(', ')}` }).optional(),
  isActive: z
    .enum(['true', 'false'], { error: 'isActive must be true or false' })
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().min(1).max(255).optional(),
  sortBy: z
    .enum(SORT_KEYS, { error: `sortBy must be one of: ${SORT_KEYS.join(', ')}` })
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc'], { error: 'sortOrder must be asc or desc' }).default('desc'),
});

// Self-service password change. Same 8-character floor as the reset
// flow (auth.validators.js) -- the two ways to set a password
// shouldn't disagree on what a valid one is. The admin reset takes no
// body at all: the server generates that password.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateRoleSchema = z.object({
  role: z.enum(STAFF_ROLES, { error: `role must be one of: ${STAFF_ROLES.join(', ')}` }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  changePasswordSchema,
  updateRoleSchema,
  VALID_ROLES,
  SORT_KEYS,
};
