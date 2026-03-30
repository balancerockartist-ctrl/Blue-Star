/**
 * Centralised error handler middleware.
 * Logs the error and returns a consistent JSON shape to the client.
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  console.error('[Blue-Star Error]', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
