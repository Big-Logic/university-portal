require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    connectionString: required('DATABASE_URL'),
    // 'disable' = no SSL (local dev). 'no-verify' = SSL but accept any
    // cert (quick unblock only). 'verify-full' = SSL + verified against
    // a CA -- required for managed providers (Aiven, RDS, etc.).
    sslMode: process.env.DATABASE_SSL_MODE || 'disable',
    // Preferred: raw PEM text in an env var, works on any host.
    sslCaContent: process.env.DATABASE_SSL_CA_CONTENT || null,
    // Fallback: a file path (local dev, or a platform's secret-file mount).
    sslCaPath: process.env.DATABASE_SSL_CA_PATH || null,
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresInDays: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30', 10),
  },
};
