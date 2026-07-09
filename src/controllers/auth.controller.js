const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

// Validation already happened in the `validate` middleware, so
// req.body is guaranteed to match the schema by the time we get here.

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const clientLabel = req.headers["user-agent"] || null;
  const result = await authService.login({ email, password, clientLabel });
  res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const clientLabel = req.headers["user-agent"] || null;
  const result = await authService.refresh({ refreshToken, clientLabel });
  res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout({ refreshToken });
  res.status(204).send();
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const devInfo = await authService.forgotPassword({ email });
  // Always the same response whether or not the account exists.
  res.status(200).json({
    message:
      "If that email is registered, a password reset link has been sent.",
    ...(devInfo || {}),
  });
});

module.exports = { login, refresh, logout, forgotPassword };
