const prisma = require('../../db/prisma');
const { USER_PROFILE_SELECT, formatUserProfile } = require('../../utils/userProfile');

// Maps the sort keys the API accepts to their columns. A whitelist,
// not a passthrough: `orderBy` goes straight into the query, so an
// unmapped value must never reach Prisma. The validator enforces the
// same list, this is the second line of defence.
const SORT_COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  lastLoginAt: 'last_login_at',
  email: 'email',
  firstName: 'first_name',
  lastName: 'last_name',
};

// `search` matches any of these, case-insensitively.
const SEARCH_COLUMNS = ['email', 'first_name', 'middle_name', 'last_name'];

function buildWhere({ role, isActive, search }) {
  const where = {};

  // role lives on the related roles row, not on users. Students are
  // always excluded: /users is the staff resource, and listing student
  // accounts here would cut across the boundary the rest of it enforces
  // (no student creation, no re-roling a student). They're listed by
  // /students, which carries their academic profile too. The validator
  // only accepts staff roles in `role`, so an explicit filter can never
  // contradict this.
  where.roles = role ? { name: role } : { name: { not: 'student' } };
  if (isActive !== undefined) where.is_active = isActive;
  if (search) {
    where.OR = SEARCH_COLUMNS.map((column) => ({
      [column]: { contains: search, mode: 'insensitive' },
    }));
  }

  return where;
}

async function listUsers({
  page = 1,
  limit = 20,
  role,
  isActive,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) {
  const where = buildWhere({ role, isActive, search });
  const skip = (page - 1) * limit;

  // Deliberately NOT a $transaction. Both are reads, and wrapping them
  // only buys a `total` that's exactly consistent with `data` -- worth
  // little on an admin list, where a count that's momentarily off by
  // one changes nothing. It costs a round trip to open the transaction,
  // and against a remote DB that reliably blew Prisma's 2s maxWait
  // (P2028, "Unable to start a transaction in the given time"). Run
  // them concurrently instead.
  const [rows, total] = await Promise.all([
    prisma.users.findMany({
      where,
      select: { ...USER_PROFILE_SELECT, roles: { select: { name: true } } },
      orderBy: { [SORT_COLUMNS[sortBy]]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.users.count({ where }),
  ]);

  return {
    data: rows.map((user) => ({ ...formatUserProfile(user), role: user.roles.name })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + rows.length < total,
    },
  };
}

module.exports = listUsers;
