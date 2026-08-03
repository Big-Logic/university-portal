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

// Shared by /users and /students: both create a row in `users`, so both
// accept the same profile fields even though they are otherwise
// deliberately separate resources. Lengths mirror the SQL column widths.
const nameFields = {
  first_name: z.string().trim().min(1, 'first_name is required').max(100),
  middle_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().min(1, 'last_name is required').max(100),
};

// Everything here is nullable or defaulted in the database, so all of
// it is optional on create.
const optionalProfileFields = {
  avatar_url: z.string().url('avatar_url must be a valid URL').optional(),
  phone: z.string().trim().min(1).max(30).optional(),
  date_of_birth: isoDate.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  locale: z.string().trim().min(1).max(10).optional(),
};

const profileFields = { ...nameFields, ...optionalProfileFields };

module.exports = { profileFields, nameFields, optionalProfileFields, isoDate };
