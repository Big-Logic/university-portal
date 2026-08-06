const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const usersController = require('../controllers/users.controller');
const {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  changePasswordSchema,
  updateRoleSchema,
} = require('../validators/users.validators');

const router = express.Router();

// Protected: returns the account behind the access token.
router.get('/me', authenticate, usersController.getMe);

// Self-service profile edit. Must be declared before '/:id' or Express
// would match this as id === 'me'. No requireRole: the token decides
// whose profile is edited, so there's nobody else to reach.
router.patch('/me', authenticate, validate(updateUserSchema), usersController.updateMe);

// Self-service password change. Requires the current password, and
// ends every session on success -- the caller has to log in again.
router.patch(
  '/me/password',
  authenticate,
  validate(changePasswordSchema),
  usersController.changeMyPassword
);

// Admin-only: paginated list. Filter with ?role=, ?isActive=,
// ?search=; page with ?page=/?limit= (max 100); sort with
// ?sortBy=/?sortOrder=.
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  validateQuery(listUsersQuerySchema),
  usersController.list
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

// Admin-only: fetch any account. Declared after '/me' so that path
// isn't swallowed as an id.
router.get('/:id', authenticate, requireRole('admin'), usersController.getOne);

// Admin-only: edit another user's profile. Same writable columns as
// PATCH /me -- email, role and is_active each have their own path.
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateUserSchema),
  usersController.update
);

// Admin-only: reset another user's password. No body -- the new
// password is generated server-side, emailed, and returned once.
router.post(
  '/:id/password/reset',
  authenticate,
  requireRole('admin'),
  usersController.resetPassword
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
