const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const usersController = require('../controllers/users.controller');
const { createUserSchema, updateRoleSchema } = require('../validators/users.validators');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../db/prisma');
const ApiError = require('../utils/ApiError');

const router = express.Router();

// Protected: requires a valid access token. Proves the JWT middleware
// actually resolves req.user from the token, not just that login works.
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      include: { roles: true },
    });
    if (!user) throw ApiError.notFound('User not found');

    res.json({ id: user.id, email: user.email, fullName: user.full_name, role: user.roles.name });
  })
);

// Admin-only: provision a new account. No password is set by the
// admin -- the new user completes setup via the password-reset flow.
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createUserSchema),
  usersController.create
);

// Admin-only: change another user's role. Writes to role_audit_log.
router.patch(
  '/:id/role',
  authenticate,
  requireRole('admin'),
  validate(updateRoleSchema),
  usersController.updateRole
);

// Admin-only: deactivate/reactivate an account. Deactivation revokes
// all refresh tokens immediately; existing access tokens remain valid
// until their own short expiry (see setUserActive for details).
router.patch('/:id/deactivate', authenticate, requireRole('admin'), usersController.deactivate);
router.patch('/:id/reactivate', authenticate, requireRole('admin'), usersController.reactivate);

module.exports = router;
