class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
  }

  static badRequest(message, code) {
    return new ApiError(400, message, code || 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized', code) {
    return new ApiError(401, message, code || 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden', code) {
    return new ApiError(403, message, code || 'FORBIDDEN');
  }

  static notFound(message = 'Not found', code) {
    return new ApiError(404, message, code || 'NOT_FOUND');
  }

  static conflict(message, code) {
    return new ApiError(409, message, code || 'CONFLICT');
  }
}

module.exports = ApiError;
