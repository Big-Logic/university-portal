const ApiError = require('../utils/ApiError');

// Usage: router.post('/login', validate(loginSchema), authController.login)
module.exports = function validate(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return next(ApiError.badRequest(message, 'VALIDATION_ERROR'));
    }
    req.body = result.data; // parsed/coerced value
    next();
  };
};
