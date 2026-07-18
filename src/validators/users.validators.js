const { z } = require('zod');

const VALID_ROLES = ['student', 'faculty', 'registrar', 'finance', 'admin'];

// Student accounts are created exclusively through /api/v1/students
// (which creates the user + their students profile together) -- not
// through this resource, so 'student' is deliberately excluded here.
const STAFF_ROLES = VALID_ROLES.filter((r) => r !== 'student');

const createUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  full_name: z.string().min(1, 'full_name is required').max(255),
  role: z.enum(STAFF_ROLES, { error: `role must be one of: ${STAFF_ROLES.join(', ')}` }),
});

const updateRoleSchema = z.object({
  role: z.enum(STAFF_ROLES, { error: `role must be one of: ${STAFF_ROLES.join(', ')}` }),
});

module.exports = { createUserSchema, updateRoleSchema, VALID_ROLES };
