const ApiError = require('../utils/ApiError');

// Raw Postgres error codes. Primary use: Prisma 7's DriverAdapterError
// (see below) nests these unchanged inside err.cause.code for any
// failed SQL statement -- constraint violations, trigger RAISE
// EXCEPTION, etc. Also applies to any future prisma.$queryRaw usage.
const PG_ERROR_MAP = {
  '23505': { status: 409, code: 'DUPLICATE', message: 'A record with this value already exists.' },
  '23P01': { status: 409, code: 'CONFLICT', message: 'This booking conflicts with an existing one.' }, // EXCLUDE constraint
  '23503': { status: 400, code: 'INVALID_REFERENCE', message: 'Referenced record does not exist.' },
  '23514': { status: 400, code: 'CHECK_FAILED', message: 'Value violates a data rule.' },
  P0001: { status: 400, code: 'BUSINESS_RULE', message: null }, // custom RAISE EXCEPTION from our trigger functions
};

// Prisma's typed-client errors (PrismaClientKnownRequestError) -- a
// different, narrower class than DriverAdapterError. Confirmed via a
// live server that constraint/trigger violations do NOT come through
// this path in Prisma 7 + @prisma/adapter-pg; kept for whatever still
// does use it (e.g. P2025 from update/delete affecting zero rows).
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

  // Prisma 7 + @prisma/adapter-pg throws `DriverAdapterError` for any
  // failed SQL statement (constraint violations, trigger RAISE
  // EXCEPTION, etc.) -- confirmed against a live server. The raw
  // Postgres code is NOT at err.code; it's nested at err.cause.code,
  // passed through unchanged (e.g. '23P01', 'P0001'), which is why
  // this must be checked before the other two mappings below.
  const causeCode = err.cause?.code || err.cause?.originalCode;
  if (causeCode && PG_ERROR_MAP[causeCode]) {
    const mapped = PG_ERROR_MAP[causeCode];
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message || err.cause?.message || err.message },
    });
  }

  // Prisma's typed-client errors (PrismaClientKnownRequestError) --
  // e.g. P2025 "record not found" from an update/delete that affected
  // zero rows. This is a different code path than a rejected SQL
  // statement, so it still carries `err.code` at the top level.
  if (err.code && PRISMA_ERROR_MAP[err.code]) {
    const mapped = PRISMA_ERROR_MAP[err.code];
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message || err.meta?.message || err.message },
    });
  }

  // Fallback for any raw pg errors from code that bypasses Prisma
  // entirely (none currently, kept for forward-compatibility).
  if (err.code && PG_ERROR_MAP[err.code]) {
    const mapped = PG_ERROR_MAP[err.code];
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message || err.message },
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
};
