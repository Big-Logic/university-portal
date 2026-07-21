require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || "development",

  db: {
    connectionString: required("DATABASE_URL"),
    // Prisma 7 uses node-pg directly and is strict about TLS by
    // default. Modes:
    //   'disable'     no SSL -- local Postgres with SSL off
    //   'no-verify'   SSL on, but accept any cert -- quick unblock,
    //                 vulnerable to MITM, avoid beyond local dev
    //   'verify-full' SSL on, cert verified against a CA -- required
    //                 for managed providers (Aiven, RDS, etc.) that
    //                 sign with their own CA. Needs sslCaPath below.
    sslMode: process.env.DATABASE_SSL_MODE || "disable",
    // Path to the provider's CA certificate (e.g. Aiven's ca.pem,
    // downloaded from their console). Required when sslMode is
    // 'verify-full'.
    sslCaPath: process.env.DATABASE_SSL_CA_PATH || null,
  },

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresInDays: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_DAYS || "30",
      10,
    ),
  },
};
