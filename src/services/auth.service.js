const axios = require('axios');
const config = require('../config');
const { AuthenticationError } = require('../utils/errors');

class AuthService {
  constructor() {
    this.baseUrl = config.get().auth.serviceUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000
    });
  }

  async validateToken(token) {
    try {
      const response = await this.axiosInstance.post('/api/Auth/validate-token', null, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        isValid: response.data.isValid,
        message: response.data.message
      };
    } catch (error) {
      console.error('Token validation error:', error.message);
      if (error.response) {
        throw new AuthenticationError(error.response.data.message || 'Invalid token');
      } else if (error.request) {
        throw new AuthenticationError('Auth service is not responding');
      } else {
        throw new AuthenticationError('Failed to validate token');
      }
    }
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }
}

module.exports = new AuthService(); 