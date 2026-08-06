const { z } = require('zod');

function isRealCalendarDate(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

// date_of_birth is a DATE column -- no time, no zone. Parse at UTC
// midnight explicitly rather than letting JS read a bare date string
// in the server's local timezone, which can shift the stored day.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')
  // V8 silently rolls over out-of-range days ("2023-02-30" becomes
  // March 2nd), so round-trip it instead of just checking for NaN.
  .refine((value) => isRealCalendarDate(value), { error: 'Must be a real calendar date' })
  .transform((value) => new Date(`${value}T00:00:00Z`));

// The profile fields any resource that writes a `users` row accepts.
// Request bodies are camelCase, matching what responses already emit;
// the snake_case column names stay behind utils/userProfile.js.
// Lengths mirror the SQL column widths.
const profileFields = {
  firstName: z.string().trim().min(1, 'firstName is required').max(100),
  middleName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().min(1, 'lastName is required').max(100),
  // Everything below is nullable or defaulted in the database, so all
  // of it is optional on create.
  avatarUrl: z.string().url('avatarUrl must be a valid URL').optional(),
  phone: z.string().trim().min(1).max(30).optional(),
  dateOfBirth: isoDate.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  locale: z.string().trim().min(1).max(10).optional(),
};

// LEGACY: the same fields under their old snake_case names, still used
// by /students. Delete this (and the snake_case fallback in
// toProfileData) once /students moves to camelCase bodies too.
const legacyProfileFields = {
  first_name: z.string().trim().min(1, 'first_name is required').max(100),
  middle_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().min(1, 'last_name is required').max(100),
  avatar_url: z.string().url('avatar_url must be a valid URL').optional(),
  phone: z.string().trim().min(1).max(30).optional(),
  date_of_birth: isoDate.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  locale: z.string().trim().min(1).max(10).optional(),
};

module.exports = { profileFields, legacyProfileFields, isoDate };
