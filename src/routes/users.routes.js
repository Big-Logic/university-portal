const express = require('express');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../db/prisma');
const ApiError = require('../utils/ApiError');

const router = express.Router();

// Protected: requires a valid access token. Proves the JWT middleware
// actually resolves req.user from the token, not just that login works.
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    include: { roles: true },
  });
  if (!user) throw ApiError.notFound('User not found');

  res.json({ id: user.id, email: user.email, fullName: user.full_name, role: user.roles.name });
}));

module.exports = router;
