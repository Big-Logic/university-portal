const { z } = require('zod');

const createCourseSchema = z.object({
  code: z.string().min(1, 'code is required').max(20),
  title: z.string().min(1, 'title is required').max(255),
  credit_hours: z.number().int().positive().max(20).optional(),
  program_id: z.number().int().positive().optional(),
});

const updateCourseSchema = z
  .object({
    code: z.string().min(1).max(20).optional(),
    title: z.string().min(1).max(255).optional(),
    credit_hours: z.number().int().positive().max(20).optional(),
    program_id: z.number().int().positive().nullable().optional(), // null explicitly unassigns
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

module.exports = { createCourseSchema, updateCourseSchema };
