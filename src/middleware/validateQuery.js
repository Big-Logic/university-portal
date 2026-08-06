const ApiError = require('../utils/ApiError');

// Same contract as validate(), but for the query string: coerces and
// defaults the params, and turns failures into one 400 VALIDATION_ERROR
// so controllers never hand-parse `req.query`.
//
// The result lands on req.validatedQuery rather than replacing
// req.query -- Express 5 defines req.query as a getter, so assigning to
// it is silently ignored and the controller would keep seeing raw
// strings.
//
// Usage: router.get('/', validateQuery(listUsersQuerySchema), handler)
module.exports = function validateQuery(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return next(ApiError.badRequest(message, 'VALIDATION_ERROR'));
    }
    req.validatedQuery = result.data;
    next();
  };
};
