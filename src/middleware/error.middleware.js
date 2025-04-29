const { BaseError, ValidationError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(err.errors && { errors: err.errors }) // Include validation errors if they exist
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: err.message,
      details: err.details
    });
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Validation failed',
      errors: Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }))
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'DuplicateError',
      message: 'Duplicate key error',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  // Handle other errors
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: 'InternalServerError',
    message: statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler; 