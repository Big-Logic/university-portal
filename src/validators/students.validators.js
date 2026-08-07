const { z } = require('zod');
// Still on snake_case request bodies -- see legacyProfileFields.
const { emailField, legacyProfileFields } = require('./userProfile.validators');

const STUDENT_STATUSES = ['active', 'inactive', 'graduated', 'withdrawn'];

const createStudentSchema = z.object({
  email: emailField,
  ...legacyProfileFields,
  program_id: z.number().int().positive().optional(),
  admission_term_id: z.number().int().positive().optional(),
});

const updateStudentSchema = z
  .object({
    program_id: z.number().int().positive().nullable().optional(),
    admission_term_id: z.number().int().positive().nullable().optional(),
    status: z
      .enum(STUDENT_STATUSES, {
        error: `status must be one of: ${STUDENT_STATUSES.join(', ')}`,
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

module.exports = { createStudentSchema, updateStudentSchema, STUDENT_STATUSES };
