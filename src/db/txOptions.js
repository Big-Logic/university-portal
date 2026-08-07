// Generous window for a remote DB (Aiven, etc.) -- Prisma's default
// maxWait (2s) assumes a fast/local connection and can be too tight
// once TLS handshake + network latency are in the mix. Blowing it
// surfaces as P2028 "Unable to start a transaction in the given time",
// which has already been observed against this database.
//
// Pass to every $transaction that must be atomic. Read-only pairs
// don't need a transaction at all -- see user.listUsers.js.
const TX_OPTIONS = { maxWait: 10000, timeout: 15000 };

module.exports = TX_OPTIONS;
