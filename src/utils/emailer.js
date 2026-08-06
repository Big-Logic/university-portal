// Placeholder until a real provider (SendGrid, SES, Postmark, etc.) is
// wired up. For now this just logs, so the reset flow is fully
// testable without live email infrastructure -- swap the body of this
// function out when that's ready; nothing else in the codebase needs
// to change since callers only depend on this function's signature.
async function sendPasswordResetEmail(email, rawToken) {
  console.log(`[email] Password reset requested for ${email}. Token: ${rawToken}`);
  // TODO: replace with real email provider integration.
}

// Sent when an admin provisions an account: the new user has no way to
// sign in otherwise, since they never chose a password. Same
// placeholder deal as above -- logs for now, swap the body out when a
// real provider is wired up.
async function sendNewAccountEmail(email, temporaryPassword) {
  console.log(`[email] Account created for ${email}. Temporary password: ${temporaryPassword}`);
  // TODO: replace with real email provider integration.
}

// Sent when an admin resets someone's password: the generated one is
// the only way back into the account, and the admin relaying it by
// hand shouldn't be the mechanism. Placeholder, same as above.
async function sendTemporaryPasswordEmail(email, temporaryPassword) {
  console.log(`[email] Password reset for ${email}. Temporary password: ${temporaryPassword}`);
  // TODO: replace with real email provider integration.
}

module.exports = { sendPasswordResetEmail, sendNewAccountEmail, sendTemporaryPasswordEmail };
