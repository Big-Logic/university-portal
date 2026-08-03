# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Standalone Express + PostgreSQL API for a university portal. Serves a Next.js
web frontend and (later) a mobile app as ordinary clients of the same REST
endpoints. Plain JavaScript/CommonJS, no TypeScript.

## Commands

```bash
npm install          # also runs `prisma generate` via postinstall
npm run dev           # nodemon, auto-restarts on file changes
npm start             # plain node

npm run lint          # eslint .
npm run lint:fix
npm run format         # prettier --write .
npm run format:check

npm run prisma:pull    # regenerate prisma/schema.prisma from the live DB
npm run prisma:generate
```

There is no test suite / test runner configured in this repo yet.

Server listens on `PORT` (default 4000). Health check: `GET /health`.

## Database / Prisma — read before touching data-access code

Database access goes through **Prisma** in *introspection mode*: the raw SQL
schema (`sprint1_schema.sql`, applied directly to Postgres) is the source of
truth, not Prisma's migration DSL. `prisma/schema.prisma` is regenerated from
the live database with `npx prisma db pull`, never hand-edited to add
models/fields — schema changes happen in SQL first, then get pulled in.

Prisma 7 specifics that shape `src/db/prisma.js` and `prisma.config.mjs`:
- `new PrismaClient()` requires an explicit driver adapter (`@prisma/adapter-pg`) — no bare constructor.
- The database URL lives in `prisma.config.mjs`, not in `schema.prisma`.
- Constraint/trigger violations (CHECK, EXCLUDE, UNIQUE, custom `RAISE EXCEPTION`) surface as `DriverAdapterError`, with the raw Postgres code nested at `err.cause.code` — **not** as `PrismaClientKnownRequestError` with `err.code`. `src/middleware/errorHandler.js` checks `err.cause?.code` against `PG_ERROR_MAP` *before* falling back to `PRISMA_ERROR_MAP` (P2002/P2003/P2025/P2010); get this order wrong and DB-enforced business rules (double-booking, role checks, etc.) stop mapping to clean 4xx responses.
- `src/db/pool.js` is a raw `pg.Pool` — currently unused by app code, kept in case something needs a raw query path outside Prisma.

Two independent SSL configs, don't conflate them: `DATABASE_URL`'s own
`?sslmode=` query param controls the Prisma **CLI's** connection (db pull /
generate / migrate); `DATABASE_SSL_MODE` / `DATABASE_SSL_CA_PATH` /
`DATABASE_SSL_CA_CONTENT` env vars control the **application's** runtime
connection (`src/db/prisma.js`, `src/db/pool.js`).

## Request lifecycle / architecture

```
routes/ (express.Router, one file per resource, mounted in routes/index.js)
  -> middleware: authenticate -> requireRole(...) -> validate(zodSchema)
  -> controllers/ (HTTP layer: parse req, call service, shape response)
  -> services/ (business logic, talks to Prisma directly)
```

- **`src/app.js`** wires helmet, cors, morgan, `express.json()`, mounts all routes under `/api/v1`, a catch-all 404, then the central `errorHandler`.
- **`authenticate`** (`src/middleware/authenticate.js`) verifies the JWT from `Authorization: Bearer <token>` and sets `req.user = { id, role }`. Stateless — no DB lookup per request.
- **`requireRole(...roles)`** (`src/middleware/requireRole.js`) gates a route to specific roles; must run after `authenticate`.
- **`validate(schema)`** (`src/middleware/validate.js`) runs a Zod `safeParse` on `req.body`, replaces it with the parsed/coerced value, and turns failures into a single `400 VALIDATION_ERROR` with per-field messages — controllers never do manual `if (!field)` checks.
- **`errorHandler`** (`src/middleware/errorHandler.js`, mounted last) is the only place HTTP status/error-code mapping happens — see the Prisma section above for why the check order matters.
- Errors are thrown as `ApiError` (`src/utils/ApiError.js`: `badRequest` / `unauthorized` / `forbidden` / `notFound` / `conflict`) from anywhere in the services/controllers and caught by `errorHandler`.
- Controllers/services are wrapped with `asyncHandler` (`src/utils/asyncHandler.js`) so rejected promises reach `errorHandler` instead of hanging.

### Adding a protected, role-gated, validated route

```js
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { updateRoleSchema } = require('../validators/users.validators');

router.patch(
  '/users/:id/role',
  authenticate,
  requireRole('admin'),
  validate(updateRoleSchema),
  handler
);
```

## Auth model

- **Access token**: JWT, short-lived (`JWT_ACCESS_EXPIRES_IN`, default 15m). Stateless, not stored server-side, not re-checked against the DB per request — a deactivated user's already-issued access token stays valid until natural expiry even though their refresh tokens are revoked immediately.
- **Refresh token**: random string, stored **hashed** in `refresh_tokens`. Rotated on every use (old one revoked the instant a new one is issued); revocable early via logout.

## User vs. student accounts — a deliberate hard boundary

`/api/v1/users` and `/api/v1/students` are two separate resources on purpose:

- `POST /api/v1/users` is **staff-only** — it rejects `role: "student"` on both create and role-update.
- `POST /api/v1/students` creates the user account **and** the student profile together, atomically, with an auto-generated `student_id`. There is no path that creates a bare student user without a profile, and no supported way to convert an existing staff account into a student.
- `DELETE /api/v1/students/:id` removes only the academic profile, never the underlying user account.

If a new endpoint needs to create or modify a student's account, model it against `students.controller.js` / `student.service.js`, not `users.*`.

## Course offerings — DB-enforced rules

Room/instructor double-booking, the online-delivery/room `CHECK`, and the
faculty-only-instructor rule are enforced by triggers/constraints in
`sprint1_schema.sql`, not in application code — they surface through
`errorHandler`'s `PG_ERROR_MAP` (`23P01`, `23514`, `P0001`, `23505`). Don't
re-implement these checks in a service; if a new rule is needed, it likely
belongs in the SQL schema, mirroring the existing ones.

`room_id` / `instructor_id` on a meeting time are intentionally **not**
accepted from the request body — a DB trigger syncs them from the parent
offering. `start_time` / `end_time` are sent/returned as plain `"HH:MM"`
strings over the wire despite being `TIME` columns internally.

## Password reset

`forgot-password` always returns the same generic response regardless of
whether the email exists (prevents account enumeration). Outside of
`NODE_ENV=production`, the response also includes `devResetToken` (the raw
token) so the flow is testable without real email infrastructure —
`src/utils/emailer.js` is the seam to swap in a real provider.

## Course/program archiving — not implemented

Hard deletes exist for courses/programs; soft-delete/archive semantics were
deliberately deferred because the cascade behavior (does archiving a course
hide its historical offerings?) needs Grading/Transcripts to exist first to
clarify the requirements. Don't add archiving without revisiting this.
