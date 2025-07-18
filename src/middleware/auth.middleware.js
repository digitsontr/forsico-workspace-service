const authService = require("../services/auth.service");
const userProfileService = require("../services/userProfile.service");
const { AuthenticationError } = require("../utils/errors");
const jwt = require("jsonwebtoken");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    const validation = await authService.validateToken(token);

    if (!validation.isValid) {
      throw new AuthenticationError(validation.message);
    }

    // Parse JWT token to get auth ID
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.sub) {
      throw new AuthenticationError("Invalid token format");
    }

    try {
      const userProfile = await userProfileService.getUserProfile(
        decoded.sub,
        token
      );

      console.log("::::::::::::userProfileId::::::::::", userProfile._id);

      req.auth = {
        token,
        ...validation,
        userId: userProfile._id,
        authId: decoded.sub,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw new AuthenticationError("Failed to fetch user profile");
    }

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        error: error.name,
        message: error.message,
      });
    } else {
      next(error);
    }
  }
};

module.exports = {
  authenticate,
  requireAuth: authenticate,
};
