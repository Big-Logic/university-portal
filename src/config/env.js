require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv,

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

  mail: {
    // Frontend base URL -- emails link back to it (password reset, etc.).
    // Required in production: a reset email whose link points nowhere is
    // worse than no email at all, and the failure is silent otherwise.
    appUrl: isProduction ? required('APP_URL') : process.env.APP_URL || 'http://localhost:3000',
    from: process.env.MAIL_FROM || 'University Portal <no-reply@example.edu>',
    // No SMTP_HOST -> the transport logs to the console instead of
    // connecting. Keeps local dev and CI working without credentials.
    smtp: {
      host: process.env.SMTP_HOST || null,
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      // Only port 465 uses implicit TLS; 587/2525 start plaintext and
      // upgrade via STARTTLS, which nodemailer does on its own.
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || null,
      pass: process.env.SMTP_PASS || null,
    },
  },
};
