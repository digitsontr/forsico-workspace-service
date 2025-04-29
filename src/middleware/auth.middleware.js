const authService = require('../services/auth.service');
const { AuthenticationError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const validation = await authService.validateToken(token);
    
    if (!validation.isValid) {
      throw new AuthenticationError(validation.message);
    }

    // Store the validated token info in the request for later use
    req.auth = {
      token,
      ...validation
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        error: error.name,
        message: error.message
      });
    } else {
      next(error);
    }
  }
};

module.exports = {
  authenticate,
  requireAuth: authenticate
}; 