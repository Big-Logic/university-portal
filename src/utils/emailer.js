// Placeholder until a real provider (SendGrid, SES, Postmark, etc.) is
// wired up. For now this just logs, so the reset flow is fully
// testable without live email infrastructure -- swap the body of this
// function out when that's ready; nothing else in the codebase needs
// to change since callers only depend on this function's signature.
async function sendPasswordResetEmail(email, rawToken) {
  console.log(
    `[email] Password reset requested for ${email}. Token: ${rawToken}`,
  );
  // TODO: replace with real email provider integration.
}

module.exports = { sendPasswordResetEmail };
