const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token expired', 'TOKEN_EXPIRED'));
    }
    return next(ApiError.unauthorized('Invalid access token'));
  }
};
