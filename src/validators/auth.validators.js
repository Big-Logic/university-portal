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

module.exports = { loginSchema, refreshSchema, logoutSchema };
