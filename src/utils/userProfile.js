// Everything about moving the `users` profile columns between the DB
// and the wire lives here, so the selects, the write payloads and the
// response shapes can't drift apart.

// Columns a create/update may set from a request body, paired with the
// camelCase key they arrive under. Anything not listed is server-owned
// (password_hash, role_id, is_active, last_login_at,
// password_changed_at) and is set explicitly by the service that owns
// that behaviour.
const WRITABLE_PROFILE_FIELDS = [
  ['first_name', 'firstName'],
  ['middle_name', 'middleName'],
  ['last_name', 'lastName'],
  ['avatar_url', 'avatarUrl'],
  ['phone', 'phone'],
  ['date_of_birth', 'dateOfBirth'],
  ['timezone', 'timezone'],
  ['locale', 'locale'],
];

// Read-side mirror of formatUserProfile below -- the two are meant to
// list the same columns. `role` is deliberately absent: it lives on the
// related roles row, not on users, so callers that need it add
// `roles: { select: { name: true } }` themselves.
const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  first_name: true,
  middle_name: true,
  last_name: true,
  avatar_url: true,
  phone: true,
  date_of_birth: true,
  timezone: true,
  locale: true,
  is_active: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
};

// Profile shape for a user in a response. Names go out as the parts
// they're stored as -- no derived display string; composing one is the
// client's call. date_of_birth is a DATE column, so it goes out as a
// plain "YYYY-MM-DD" string rather than leaking the
// "1990-05-04T00:00:00.000Z" internal representation (same convention
// as meeting times' "HH:MM").
function formatUserProfile(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    middleName: user.middle_name ?? null,
    lastName: user.last_name,
    avatarUrl: user.avatar_url ?? null,
    phone: user.phone ?? null,
    dateOfBirth: user.date_of_birth ? user.date_of_birth.toISOString().slice(0, 10) : null,
    timezone: user.timezone,
    locale: user.locale,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

// Narrow a (already validated) request body down to the profile
// columns, so nothing else can ride along into a Prisma write.
//
// Reads the camelCase key first, then falls back to the column name
// itself for resources still on snake_case bodies (/students). The
// validators only ever let one spelling through, so the fallback can't
// mix formats -- drop it once /students migrates.
function toProfileData(body) {
  const data = {};
  for (const [column, key] of WRITABLE_PROFILE_FIELDS) {
    const value = body[key] !== undefined ? body[key] : body[column];
    if (value !== undefined) data[column] = value;
  }
  return data;
}

module.exports = {
  USER_PROFILE_SELECT,
  WRITABLE_PROFILE_FIELDS,
  formatUserProfile,
  toProfileData,
};
