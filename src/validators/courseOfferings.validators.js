const { z } = require('zod');

const DELIVERY_MODES = ['in_person', 'online', 'hybrid'];

const createCourseOfferingSchema = z
  .object({
    course_id: z.number().int().positive(),
    term_id: z.number().int().positive(),
    instructor_id: z.number().int().positive(),
    section: z.string().min(1, 'section is required').max(10),
    delivery_mode: z.enum(DELIVERY_MODES).default('in_person'),
    room_id: z.number().int().positive().optional(),
    capacity: z.number().int().positive(),
  })
  // Mirrors the DB's CHECK constraint, but catching it here gives a
  // friendlier message before it ever reaches Postgres.
  .refine((data) => (data.delivery_mode === 'online' ? !data.room_id : !!data.room_id), {
    message:
      "room_id is required unless delivery_mode is 'online' (and must be omitted when it is)",
    path: ['room_id'],
  });

// Partial update -- the online/room cross-check isn't re-validated
// here since we may not know the resulting combination without
// reading current state first; the DB's CHECK constraint is the
// backstop for update-time consistency.
const updateCourseOfferingSchema = z
  .object({
    term_id: z.number().int().positive().optional(),
    instructor_id: z.number().int().positive().optional(),
    section: z.string().min(1).max(10).optional(),
    delivery_mode: z.enum(DELIVERY_MODES).optional(),
    room_id: z.number().int().positive().nullable().optional(),
    capacity: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const addMeetingTimeSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'start_time must be HH:MM'),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'end_time must be HH:MM'),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  });

module.exports = {
  createCourseOfferingSchema,
  updateCourseOfferingSchema,
  addMeetingTimeSchema,
  DELIVERY_MODES,
};
