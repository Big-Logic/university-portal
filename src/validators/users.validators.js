const { z } = require('zod');

const VALID_ROLES = ['student', 'faculty', 'registrar', 'finance', 'admin'];

const createUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  full_name: z.string().min(1, 'full_name is required').max(255),
  role: z.enum(VALID_ROLES, { error: `role must be one of: ${VALID_ROLES.join(', ')}` }),
});

const updateRoleSchema = z.object({
  role: z.enum(VALID_ROLES, { error: `role must be one of: ${VALID_ROLES.join(', ')}` }),
});

module.exports = { createUserSchema, updateRoleSchema, VALID_ROLES };
