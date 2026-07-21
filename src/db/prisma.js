const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const env = require("../config/env");

// Prisma 7 requires an explicit driver adapter -- new PrismaClient()
// with no arguments is invalid in this version.
//
// SSL: Prisma 7's node-pg-based adapter is strict about certificate
// verification by default. Managed providers (Aiven, RDS, etc.) sign
// with their own CA, which isn't in Node's default trust store, so
// 'verify-full' needs that CA certificate supplied explicitly.
function resolveSsl(mode, caPath, caContent) {
  if (mode === 'disable') return false;

  if (mode === "no-verify") return { rejectUnauthorized: false };

  if (mode === 'verify-full') {
    if (caContent) {
      return { rejectUnauthorized: true, ca: caContent };
    }
    if (!caPath) {
      throw new Error(
        "DATABASE_SSL_MODE=verify-full requires DATABASE_SSL_CA_PATH to be set " +
          "(path to your provider's CA certificate, e.g. Aiven's ca.pem).",
      );
    }
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.resolve(caPath), "utf8"),
    };
  }

  throw new Error(`Unknown DATABASE_SSL_MODE: ${mode}`);
}

const adapter = new PrismaPg({
  connectionString: env.db.connectionString,
  ssl: resolveSsl(env.db.sslMode, env.db.sslCaPath, env.db.sslCaContent),
});

// Prints once at startup so SSL config is visible, not inferred --
// stale env vars (e.g. after editing .env without restarting the
// process) are a common cause of confusing TLS errors.
console.log(
  `[db] SSL mode: ${env.db.sslMode}` +
    (env.db.sslCaContent ? ' (CA: from DATABASE_SSL_CA_CONTENT)' : '') +
    (!env.db.sslCaContent && env.db.sslCaPath ? ` (CA: ${env.db.sslCaPath})` : '')
);

// Singleton so we don't open a new connection pool per import.
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
