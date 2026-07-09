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

| Method | Path                 | Auth         | Validated body  | Description                                       |
| ------ | -------------------- | ------------ | --------------- | ------------------------------------------------- |
| POST   | /api/v1/auth/login   | —            | email, password | Returns access + refresh token                    |
| POST   | /api/v1/auth/refresh | —            | refreshToken    | Rotates a valid refresh token for a new pair      |
| POST   | /api/v1/auth/logout  | —            | refreshToken    | Revokes a refresh token                           |
| GET    | /api/v1/users/me     | Bearer token | —               | Returns the current user (demo of JWT middleware) |

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
