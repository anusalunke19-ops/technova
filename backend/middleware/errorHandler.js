const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = { status: 404, message: 'Resource not found' };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = { status: 400, message: `${field} already exists` };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { status: 400, message };
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error = { status: 401, message: 'Invalid token' };
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Server Error'
  });
};

module.exports = errorHandler;
