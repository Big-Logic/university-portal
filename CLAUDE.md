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

A service is either a single `<name>.service.js` file or, once it grows,
a `<name>.service/` directory: one operation per file, shared internals
together in `helpers.js`, and an `index.js` re-exporting the public
surface (`auth.service/` is the example — `storeRefreshToken` lives in
its `helpers.js` and is deliberately not re-exported). Consumers
`require('../services/<name>.service')` either way.

- **`src/app.js`** wires helmet, cors, morgan, `express.json()`, mounts all routes under `/api/v1`, a catch-all 404, then the central `errorHandler`.
- **`authenticate`** (`src/middleware/authenticate.js`) verifies the JWT from `Authorization: Bearer <token>` and sets `req.user = { id, role }`. Stateless — no DB lookup per request.
- **`requireRole(...roles)`** (`src/middleware/requireRole.js`) gates a route to specific roles; must run after `authenticate`.
- **`validate(schema)`** (`src/middleware/validate.js`) runs a Zod `safeParse` on `req.body`, replaces it with the parsed/coerced value, and turns failures into a single `400 VALIDATION_ERROR` with per-field messages — controllers never do manual `if (!field)` checks.
- **`validateQuery(schema)`** (`src/middleware/validateQuery.js`) does the same for the query string, but writes to **`req.validatedQuery`** — Express 5 defines `req.query` as a getter, so assigning to it is silently ignored and the controller would still see raw strings. List endpoints read `req.validatedQuery`; use `z.coerce` in the schema since every param arrives as a string.
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
- **Setting a password goes through `setUserPassword` (`src/utils/credentials.js`) — the only implementation, used by all three paths** (`auth.resetPassword`, `user.changeOwnPassword`, `user.resetUserPassword`). In one transaction it writes `password_hash` + `password_changed_at`, revokes every refresh token, and **deletes every reset token for that user**. Don't hand-roll a password write: the point is that no route back into the account survives the old password.
- Emails are normalised to lowercase by `emailField` (`src/validators/userProfile.validators.js`), which every email-accepting schema uses. `users_email_key` is a case-sensitive btree, so without it `Ada@uni.edu` and `ada@uni.edu` are separate accounts.

## User vs. student accounts — a deliberate hard boundary

`/api/v1/users` and `/api/v1/students` are two separate resources on purpose:

- `POST /api/v1/users` is **staff-only** — it rejects `role: "student"` on both create and role-update. `PATCH /users/:id/role` also refuses a student as the *subject* (`STUDENT_ROLE_IMMUTABLE`): promoting one to staff would strand its `students` profile.
- `POST /api/v1/students` creates the user account **and** the student profile together, atomically, with an auto-generated `student_id`. There is no path that creates a bare student user without a profile, and no supported way to convert an existing staff account into a student.
- `GET /api/v1/users` lists **staff only** — students are filtered out in `buildWhere`, and its `role` query param accepts staff roles only. `GET /users/:id` still resolves a student by id.
- `DELETE /api/v1/students/:id` removes only the academic profile, never the underlying user account.

If a new endpoint needs to create or modify a student's account, model it against `students.controller.js` / `student.service.js`, not `users.*`.

## User profile fields

There is no `full_name` column — names are stored in parts (`first_name`,
optional `middle_name`, `last_name`), alongside `avatar_url`, `phone`,
`date_of_birth`, `timezone`, `locale`, `last_login_at`,
`password_changed_at`.

- Responses return the name **parts** (`firstName` / `middleName` / `lastName`) and never a composed display string — assembling one is the client's job. Don't reintroduce a `fullName`/`full_name` field.
- `src/utils/userProfile.js` owns everything that crosses the DB/wire boundary for these columns: `USER_PROFILE_SELECT` (the Prisma select), `formatUserProfile` (the response shape), and `toProfileData` (narrows a validated body to writable columns, so nothing else rides along into a Prisma write). The select and the formatter list the same columns — `id`, `email`, the names, the profile fields, `is_active`, `last_login_at`, `created_at`, `updated_at` — and must be changed together. `role` is not among them: it lives on the related `roles` row, so callers needing it add `roles: { select: { name: true } }` and merge it in themselves (see `/users/me`).
- A user embedded in another resource goes under a `user` key rather than being flattened in — see `formatStudent`, where a flat merge would make `id` and `createdAt` ambiguous between the student record and its account.
- **Request bodies are camelCase**, matching what responses already emit — `firstName`, `dateOfBirth`, `avatarUrl`. Only `/users` has been migrated; `/students` still takes snake_case via `legacyProfileFields`, and `toProfileData` reads the camelCase key with a snake_case fallback so both work. When `/students` migrates, delete `legacyProfileFields` and that fallback together.
- `src/validators/userProfile.validators.js` holds the shared Zod fields both `/users` and `/students` spread into their create schemas — the two resources stay separate, but the profile columns they write are identical. `dateOfBirth` arrives as `"YYYY-MM-DD"` and is returned the same way (like meeting times' `"HH:MM"`), parsed at UTC midnight so the stored day can't shift.
- `last_login_at` is written by `auth.service.login` (best-effort — a failed write must not fail an authenticated login); `password_changed_at` by `resetPassword`, inside its existing transaction. Neither is client-settable.

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

`forgot-password` answers three cases two ways:

- **unknown email** and **active account** — the same generic 200 message, so
  the endpoint can't be used to test whether an address is registered.
- **deactivated account** — `403 INACTIVE_ACCOUNT`. A deliberate, narrow
  enumeration leak: it confirms a given address belongs to a *deactivated*
  account, accepted so a locked-out user isn't left requesting resets that
  silently go nowhere. Active accounts stay indistinguishable from unknown
  ones, which is the case that matters.

Outside of `NODE_ENV=production`, the response also includes `devResetToken`
(the raw token) so the flow is testable without sending mail.

## Email

`src/services/mail.service/` follows the usual service-directory shape: one
message per file (each owning its own subject/text/html), transport and layout
in `mail.helpers.js`, `index.js` exporting the four `send*` functions. Swapping
providers is a change to `mail.helpers.js` alone — nodemailer over SMTP today,
pointed at Mailtrap.

- **`SMTP_HOST` unset → mail is off.** `deliver()` drops the message and returns
  `false` without logging it. That's the local-dev and CI default (no sockets,
  no noise); the reset flow stays testable through `devResetToken`.
- **Sends are fire-and-forget — don't `await` them.** The four `send*` functions
  are synchronous and return nothing; `deliverInBackground` runs the send after
  the request has already returned, so a slow or dead SMTP hop can't add
  latency to work that's already committed. Two attempts, then give up —
  there's no queue, and a lost email is not a failed request.
- That only stays safe because `deliverInBackground` attaches a `.catch`. A
  floating promise that rejects **takes the Node process down**; if you add a
  send that isn't routed through it, catch it yourself.
- `APP_URL` is the frontend base that reset links point at, and is **required in
  production** (`src/config/env.js`) — a link pointing nowhere fails silently.
- Log lines carry the recipient and subject but never the body, which holds
  reset links and temporary passwords.

**A user holds at most one live reset token.** Issuing one deletes the
previous (`auth.forgotPassword`), and setting a password deletes them all
(`setUserPassword`) — so an attacker-triggered link can't outlive the victim's
own reset, and the table can't accumulate spent rows. `auth.resetPassword`
claims a token with a conditional `updateMany` (`used_at: null` + not expired,
then `count === 1`) rather than checking `used_at` and writing separately;
the two aren't atomic, so concurrent requests with one token would both
succeed. It is deliberately fail-closed: the token is spent even if the
password write then fails.

**Still open, by decision:** no rate limiting on `forgot-password`, and the
known-email path does a DB write plus an email send while the unknown-email
path returns immediately — a measurable timing side channel despite the
identical response.

## Course/program archiving — not implemented

Hard deletes exist for courses/programs; soft-delete/archive semantics were
deliberately deferred because the cascade behavior (does archiving a course
hide its historical offerings?) needs Grading/Transcripts to exist first to
clarify the requirements. Don't add archiving without revisiting this.
