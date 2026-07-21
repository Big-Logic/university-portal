const ApiError = require('../utils/ApiError');

// Raw Postgres error codes -- still relevant for any query we run via
// prisma.$queryRaw / $executeRaw (e.g. the scheduling EXCLUDE-constraint
// inserts in a later sprint, which Prisma's typed API can't express).
const PG_ERROR_MAP = {
  '23505': { status: 409, code: 'DUPLICATE', message: 'A record with this value already exists.' },
  '23P01': { status: 409, code: 'CONFLICT', message: 'This booking conflicts with an existing one.' }, // EXCLUDE constraint
  '23503': { status: 400, code: 'INVALID_REFERENCE', message: 'Referenced record does not exist.' },
  '23514': { status: 400, code: 'CHECK_FAILED', message: 'Value violates a data rule.' },
  P0001: { status: 400, code: 'BUSINESS_RULE', message: null }, // custom RAISE EXCEPTION from our trigger functions
};

// Prisma's own error codes (thrown for normal Client calls like
// create/update/findUnique, as opposed to raw queries above).
// NOTE: unverified against a live Prisma Client in this environment --
// double check P2010's `meta` payload against our actual trigger/EXCLUDE
// errors once this runs for real, since those may need a bit more digging
// (e.g. err.meta.code / err.meta.message) to surface a clean message.
const PRISMA_ERROR_MAP = {
  P2002: { status: 409, code: 'DUPLICATE', message: 'A record with this value already exists.' },
  P2003: { status: 400, code: 'INVALID_REFERENCE', message: 'Referenced record does not exist.' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Record not found.' },
  P2010: { status: 400, code: 'BUSINESS_RULE', message: null }, // raw query failed -- likely a trigger RAISE EXCEPTION or CHECK/EXCLUDE violation; inspect err.meta for detail
};

module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
  }

  // Prisma errors have a `code` like "P2002" and a `name` of PrismaClientKnownRequestError.
  if (err.code && PRISMA_ERROR_MAP[err.code]) {
    const mapped = PRISMA_ERROR_MAP[err.code];
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message || err.meta?.message || err.message },
    });
  }

  if (err.code && PG_ERROR_MAP[err.code]) {
    const mapped = PG_ERROR_MAP[err.code];
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message || err.message },
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
};
