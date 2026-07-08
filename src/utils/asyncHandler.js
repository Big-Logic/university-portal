// Avoids repeating try/catch in every controller. Any rejected promise
// from an async handler is forwarded to Express's error-handling middleware.
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
