const { z } = require('zod');

const createProgramSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  code: z.string().min(1, 'code is required').max(20),
  department: z.string().max(255).optional(),
});

// All fields optional on update -- but at least one must be present,
// otherwise a PATCH with an empty body would silently succeed and do
// nothing, which is more confusing than an explicit error.
const updateProgramSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    code: z.string().min(1).max(20).optional(),
    department: z.string().max(255).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

module.exports = { createProgramSchema, updateProgramSchema };
