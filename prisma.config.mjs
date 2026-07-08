// Prisma 7 moved the database connection URL out of schema.prisma and
// into this config file. .mjs (not .ts) since this project is plain
// JavaScript/CommonJS -- Node loads .mjs as ESM regardless of the
// "type" field in package.json, so this works without converting the
// rest of the project.
//
// SSL note: the CLI (db pull, generate, migrate) connects using this
// URL directly, so if your provider requires SSL (e.g. Aiven), make
// sure DATABASE_URL includes ?sslmode=require -- that's independent
// of DATABASE_SSL_MODE in .env, which only controls the application's
// own runtime connection (see src/db/prisma.js).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
