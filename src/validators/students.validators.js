const { z } = require('zod');
const { profileFields } = require('./userProfile.validators');

const STUDENT_STATUSES = ['active', 'inactive', 'graduated', 'withdrawn'];

const createStudentSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  ...profileFields,
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
