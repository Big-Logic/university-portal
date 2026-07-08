const ApiError = require('../utils/ApiError');

// Usage: router.patch('/users/:id/role', authenticate, requireRole('admin'), handler)
module.exports = function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
};
