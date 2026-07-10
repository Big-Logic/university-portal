const { z } = require('zod');

const VALID_ROLES = ['student', 'faculty', 'registrar', 'finance', 'admin'];

const updateRoleSchema = z.object({
  role: z.enum(VALID_ROLES, { error: `role must be one of: ${VALID_ROLES.join(', ')}` }),
});

module.exports = { updateRoleSchema, VALID_ROLES };
