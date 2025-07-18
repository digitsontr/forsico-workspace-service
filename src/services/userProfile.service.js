const axios = require('axios');
const config = require('../config');
const redisService = require('./redis.service');

class UserProfileService {
  constructor() {
    this.baseUrl = config.get().userProfile.serviceUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000
    });
    this.cacheKeyPrefix = 'userprofile:';
    this.cacheTTL = 300;
  }

  getCacheKey(authId) {
    return `${this.cacheKeyPrefix}${authId}`;
  }

  async getUserProfile(authId, token) {
    try {
      const redisClient = redisService.getClient();
      const cachedData = await redisClient.get(this.getCacheKey(authId));
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await this.axiosInstance.get(
        `/profiles/${authId}`,
        {
          headers: {
            'X-Api-Key': config.get().internalApiKey,
            'X-Service-Name': 'workspace-service'
          }
        }
      );

      if (!response.data || !response.data.data) {
        throw new Error('User profile not found');
      }

      const profileData = response.data.data;

      await redisClient.setEx(
        this.getCacheKey(authId),
        this.cacheTTL,
        JSON.stringify(profileData)
      );

      return profileData;
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
      throw error;
    }
  }

  async getProfileById(userId, token) {
    try {
      console.error("getProfileById", config.get().internalApiKey);
      const response = await this.axiosInstance.get(
        `/profiles/${userId}`,
        {
          headers: {
            'x-api-key': config.get().internalApiKey,
            'x-service-name': 'workspace-service'
          }
        }
      );

      if (!response.data || !response.data.data) {
        throw new Error('User profile not found');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching user profile by ID:', error.message);
      throw error;
    }
  }

  async invalidateCache(authId) {
    try {
      const redisClient = redisService.getClient();
      await redisClient.del(this.getCacheKey(authId));
    } catch (error) {
      console.error('Error invalidating user profile cache:', error.message);
    }
  }
}

module.exports = new UserProfileService(); 