const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

// Validation already happened in the `validate` middleware, so
// req.body is guaranteed to match the schema by the time we get here.

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const clientLabel = req.headers['user-agent'] || null;
  const result = await authService.login({ email, password, clientLabel });
  res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const clientLabel = req.headers['user-agent'] || null;
  const result = await authService.refresh({ refreshToken, clientLabel });
  res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout({ refreshToken });
  res.status(204).send();
});

module.exports = { login, refresh, logout };
