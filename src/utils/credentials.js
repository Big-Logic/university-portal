const prisma = require('../db/prisma');
const TX_OPTIONS = require('../db/txOptions');
const { hashPassword } = require('./password');

// The single implementation of "set this user's password". Shared by
// every path that writes a credential -- the self-service reset
// (auth.service), the self-service change and the admin reset
// (user.service) -- so the rule below can't drift between them.
//
// Setting a password ends every way back into the account that the old
// one could have opened:
//   - the password itself, with password_changed_at stamped alongside
//   - every refresh token, revoked
//   - every pending reset link, deleted
//
// Already-issued access tokens stay valid until their own short expiry
// (JWT_ACCESS_EXPIRES_IN, 15m by default) since they're stateless --
// see user.setUserActive.js for why that trade-off stands.
async function setUserPassword(userId, newPassword) {
  const passwordHash = await hashPassword(newPassword);
  const changedAt = new Date();

  await prisma.$transaction(
    [
      prisma.users.update({
        where: { id: userId },
        data: { password_hash: passwordHash, password_changed_at: changedAt },
      }),
      prisma.refresh_tokens.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
      // Deleting rather than marking used does two jobs at once: no
      // pending link survives a password change (an attacker-triggered
      // reset can't outlive the victim's own), and the table can't
      // accumulate spent rows.
      prisma.password_reset_tokens.deleteMany({ where: { user_id: userId } }),
    ],
    TX_OPTIONS
  );

  return changedAt;
}

module.exports = { setUserPassword };
