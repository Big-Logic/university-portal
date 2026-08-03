# University Portal API

Standalone Express + PostgreSQL API. Serves the Next.js web frontend and, in
later sprints, the mobile app — both as ordinary clients of the same endpoints.

Database access: **Prisma** (introspection mode — the SQL schema file is the
source of truth, not Prisma's migration DSL). Request validation: **Zod**.

## ⚠️ Setup note on Prisma

`prisma/schema.prisma` in this project was **hand-written**, not generated —
it was built in a sandbox without network access to Prisma's binary host, so
`prisma db pull` / `prisma generate` could never actually be run there. Before
trusting it:

```bash
npx prisma db pull       # regenerates schema.prisma from your real database
npx prisma generate      # generates the Prisma Client
```

Then diff the result against the checked-in file. Most likely to differ:
relation names on `role_audit_log` (it has two foreign keys into `users` and
two into `roles`, which Prisma auto-disambiguates in a way I approximated by
hand rather than replicated exactly).

Everything **else** in this project (Express app, middleware, JWT logic, Zod
validation) was tested against a live server and confirmed working. Only the
Prisma data-access layer is unverified pending your local `db pull`/`generate`.

## Setup

```bash
npm install               # triggers `prisma generate` via postinstall
cp .env.example .env      # then edit DATABASE_URL and JWT_ACCESS_SECRET
npx prisma db pull        # see note above -- do this before first run
npx prisma generate
```

Apply the Sprint 1 schema to your Postgres database first (see `sprint1_schema.sql`).

## Run

```bash
npm run dev     # nodemon, auto-restarts on file changes
npm start        # plain node
```

Server starts on `PORT` (default 4000). Health check: `GET /health`.

## Endpoints (Sprint 1)

| Method | Path                                                      | Auth                                  | Validated body                                                                                                                       | Description                                                                                                                                             |
| ------ | --------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/v1/auth/login                                        | —                                     | email, password                                                                                                                      | Returns access + refresh token                                                                                                                          |
| POST   | /api/v1/auth/refresh                                      | —                                     | refreshToken                                                                                                                         | Rotates a valid refresh token for a new pair                                                                                                            |
| POST   | /api/v1/auth/logout                                       | —                                     | refreshToken                                                                                                                         | Revokes a refresh token                                                                                                                                 |
| POST   | /api/v1/auth/forgot-password                              | —                                     | email                                                                                                                                | Generates a reset token (emailed; console-logged for now)                                                                                               |
| POST   | /api/v1/auth/reset-password                               | —                                     | token, newPassword                                                                                                                   | Consumes the token, updates password, revokes all sessions                                                                                              |
| GET    | /api/v1/users/me                                          | Bearer token                          | —                                                                                                                                    | Returns the current user (demo of JWT middleware)                                                                                                       |
| POST   | /api/v1/users                                             | Bearer token, admin only              | email, first_name, last_name, role (staff roles only), middle_name?, phone?, date_of_birth?, avatar_url?, timezone?, locale?         | Admin provisions a staff account; user sets their own password via reset flow. **Student accounts are not created here** — use `POST /api/v1/students`. |
| PATCH  | /api/v1/users/:id/role                                    | Bearer token, admin only              | role (staff roles only)                                                                                                              | Changes a user's role, writes to `role_audit_log`. Cannot set role to "student".                                                                        |
| PATCH  | /api/v1/users/:id/deactivate                              | Bearer token, admin only              | —                                                                                                                                    | Deactivates account, revokes all refresh tokens                                                                                                         |
| PATCH  | /api/v1/users/:id/reactivate                              | Bearer token, admin only              | —                                                                                                                                    | Reactivates account                                                                                                                                     |
| POST   | /api/v1/students                                          | Bearer token, registrar/admin         | email, first_name, last_name, middle_name?, phone?, date_of_birth?, avatar_url?, timezone?, locale?, program_id?, admission_term_id? | Creates a student account **and** profile together (auto-generated `student_id`)                                                                        |
| GET    | /api/v1/students                                          | Bearer token, registrar/admin/faculty | —                                                                                                                                    | List students; filter by `?program_id=`, `?status=`                                                                                                     |
| GET    | /api/v1/students/me                                       | Bearer token                          | —                                                                                                                                    | Current user's own student profile                                                                                                                      |
| GET    | /api/v1/students/:id                                      | Bearer token, registrar/admin/faculty | —                                                                                                                                    | Get one student profile                                                                                                                                 |
| PATCH  | /api/v1/students/:id                                      | Bearer token, registrar/admin         | program_id?, admission_term_id?, status?                                                                                             | Update a student profile                                                                                                                                |
| DELETE | /api/v1/students/:id                                      | Bearer token, registrar/admin         | —                                                                                                                                    | Deletes the academic profile only — **not** the user account                                                                                            |
| GET    | /api/v1/programs                                          | Bearer token                          | —                                                                                                                                    | List all programs                                                                                                                                       |
| GET    | /api/v1/programs/:id                                      | Bearer token                          | —                                                                                                                                    | Get one program                                                                                                                                         |
| POST   | /api/v1/programs                                          | Bearer token, registrar/admin         | name, code, department?                                                                                                              | Create a program                                                                                                                                        |
| PATCH  | /api/v1/programs/:id                                      | Bearer token, registrar/admin         | any of the above                                                                                                                     | Update a program                                                                                                                                        |
| GET    | /api/v1/courses                                           | Bearer token                          | —                                                                                                                                    | List courses; `?program_id=` to filter                                                                                                                  |
| GET    | /api/v1/courses/:id                                       | Bearer token                          | —                                                                                                                                    | Get one course (includes its program)                                                                                                                   |
| POST   | /api/v1/courses                                           | Bearer token, registrar/admin         | code, title, credit_hours?, program_id?                                                                                              | Create a course (program is optional)                                                                                                                   |
| PATCH  | /api/v1/courses/:id                                       | Bearer token, registrar/admin         | any of the above; `program_id: null` unassigns                                                                                       | Update a course                                                                                                                                         |
| GET    | /api/v1/course-offerings                                  | Bearer token                          | —                                                                                                                                    | List offerings; filter by `?course_id=`, `?term_id=`, `?instructor_id=`                                                                                 |
| GET    | /api/v1/course-offerings/:id                              | Bearer token                          | —                                                                                                                                    | Get one offering (includes course, term, instructor, room, meeting times)                                                                               |
| POST   | /api/v1/course-offerings                                  | Bearer token, registrar/admin         | course_id, term_id, instructor_id, section, delivery_mode, room_id?, capacity                                                        | Create an offering                                                                                                                                      |
| PATCH  | /api/v1/course-offerings/:id                              | Bearer token, registrar/admin         | any of the above                                                                                                                     | Update an offering                                                                                                                                      |
| GET    | /api/v1/course-offerings/:id/meeting-times                | Bearer token                          | —                                                                                                                                    | List an offering's meeting times                                                                                                                        |
| POST   | /api/v1/course-offerings/:id/meeting-times                | Bearer token, registrar/admin         | day_of_week, start_time, end_time                                                                                                    | Add a meeting time (HH:MM strings)                                                                                                                      |
| DELETE | /api/v1/course-offerings/:id                              | Bearer token, registrar/admin         | —                                                                                                                                    | Delete an offering (meeting times cascade automatically)                                                                                                |
| DELETE | /api/v1/course-offerings/:id/meeting-times/:meetingTimeId | Bearer token, registrar/admin         | —                                                                                                                                    | Delete a single meeting time                                                                                                                            |

Notes on user & student management:

- **`/api/v1/users` is staff-only.** It rejects `role: "student"` on both
  create and role-update, pointing to `/api/v1/students` instead. This
  keeps a hard boundary: student accounts always get a `students` profile
  created atomically with the user, never as a separate forgotten step.
- **Converting an existing staff account into a student isn't supported
  yet** — flagged as a known gap, not currently a real use case.
- **Deactivation timing**: revokes all refresh tokens immediately, so no
  _new_ access token can be issued after that point. An access token
  already issued before deactivation stays valid until its own natural
  expiry (`JWT_ACCESS_EXPIRES_IN`, 15m default) -- it's not re-checked
  against the DB on every request, which is a deliberate performance
  trade-off. If you need deactivation to take effect within seconds
  rather than up to 15 minutes, that means checking `is_active` inside
  `authenticate` middleware on every request instead -- flag it if you
  want that traded in.
- **Course/program archiving**: deliberately not built yet. Both hard
  deletes (courses, programs) and soft-delete/archive semantics were
  considered; archiving needs real design decisions (does archiving a
  course cascade to its offerings? do archived courses still render in
  historical offering data?) that are premature before Grading/Transcripts
  exists to clarify what actually needs protecting. Revisit at the start
  of that epic.

Notes on course offerings:

- The "faculty's assigned offerings" backlog story is covered by
  `GET /api/v1/course-offerings?instructor_id=<id>` rather than a separate
  dedicated route — one filterable endpoint instead of two doing the same
  thing.
- `room_id`/`instructor_id` on a meeting time are **not** accepted in the
  request — they're synced automatically from the parent offering by a DB
  trigger. Sending them would be ignored either way.
- Room/instructor double-booking, the online-delivery/room CHECK, and the
  faculty-only-instructor rule are all enforced by the database (see
  `sprint1_schema.sql`) — verified directly against Postgres, returning the
  exact codes `errorHandler.js` maps: `P0001`, `23P01`, `23514`, `23505`.
  **Not yet verified**: the exact error shape Prisma's typed client (as
  opposed to raw SQL) surfaces for these — first live test of this is on
  you; report back what you see and we'll tighten the mapping if needed.
- `start_time`/`end_time` are sent and returned as plain `"HH:MM"` strings,
  even though the DB stores them as `TIME` and Prisma models them as
  `DateTime` internally — worth double-checking a round-trip (create a
  meeting time, then GET it back) actually returns what you sent, since
  this conversion couldn't be tested against a live Prisma Client here.

Note on `forgot-password`: it always returns the same generic response whether
or not the email exists, to avoid leaking which accounts are real. In
non-production environments the response also includes the raw reset token
directly (`devResetToken`), so the flow is testable without a real email
provider — swap `src/utils/emailer.js` for a real provider before production,
and that dev-token field disappears automatically (`NODE_ENV=production`).

## Auth model

- **Access token**: JWT, short-lived (`JWT_ACCESS_EXPIRES_IN`, default 15m), sent as `Authorization: Bearer <token>`. Stateless — not stored server-side.
- **Refresh token**: random string, stored **hashed** in `refresh_tokens`. Rotated on every use (old one is revoked the moment a new one is issued) and can be revoked early via logout.

## Validation

Request bodies are validated with Zod schemas in `src/validators/`, applied via
the `validate(schema)` middleware. A failed validation returns a clean 400
with a field-by-field message — no manual `if (!field)` checks in controllers.

## Project structure

```
prisma/schema.prisma  Hand-written -- see setup note above
src/
  app.js              Express app, middleware, route mounting
  server.js           Entry point
  config/env.js       Environment variable loading + validation
  db/prisma.js        Prisma Client singleton
  middleware/
    authenticate.js   Verifies JWT, sets req.user
    requireRole.js     Role-based route guard
    validate.js         Zod validation middleware factory
    errorHandler.js    Central error handler (maps Prisma + raw Postgres errors)
  validators/         Zod schemas per resource (auth.validators.js)
  utils/
    jwt.js, password.js, refreshToken.js, ApiError.js, asyncHandler.js
  services/           Business logic (auth.service.js) -- uses Prisma
  controllers/        HTTP layer (auth.controller.js)
  routes/             Route definitions
```

## Adding a protected, role-gated, validated route

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
