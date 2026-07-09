const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Must be a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

module.exports = {
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
