const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../config/env');

function resolveSsl(mode, caPath) {
  if (mode === 'disable') return false;

  if (mode === 'no-verify') return { rejectUnauthorized: false };

  if (mode === 'verify-full') {
    if (!caPath) {
      throw new Error('DATABASE_SSL_MODE=verify-full requires DATABASE_SSL_CA_PATH to be set.');
    }
    return { rejectUnauthorized: true, ca: fs.readFileSync(path.resolve(caPath), 'utf8') };
  }

  throw new Error(`Unknown DATABASE_SSL_MODE: ${mode}`);
}

const pool = new Pool({
  connectionString: env.db.connectionString,
  ssl: resolveSsl(env.db.sslMode, env.db.sslCaPath),
});

pool.on('error', (err) => {
  // Idle client errors (e.g. DB restart) should not crash the process.
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
