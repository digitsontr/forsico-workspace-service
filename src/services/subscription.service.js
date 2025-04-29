const axios = require('axios');
const config = require('../config');
const redisService = require('./redis.service');

class SubscriptionService {
  constructor() {
    this.baseUrl = config.get().subscription.serviceUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000
    });
    this.cacheKeyPrefix = 'subscription:';
    this.cacheTTL = 300; // 5 minutes cache for subscription data
  }

  getCacheKey(subscriptionId) {
    return `${this.cacheKeyPrefix}${subscriptionId}`;
  }

  async getSubscriptionDetails(subscriptionId, token) {
    try {
      // Try to get from cache first
      const redisClient = redisService.getClient();
      const cachedData = await redisClient.get(this.getCacheKey(subscriptionId));
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // If not in cache, fetch from service
      const response = await this.axiosInstance.get(
        `/api/user/subscription/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const subscriptionData = response.data;

      // Cache the response
      await redisClient.setEx(
        this.getCacheKey(subscriptionId),
        this.cacheTTL,
        JSON.stringify(subscriptionData)
      );

      return subscriptionData;
    } catch (error) {
      console.error('Error fetching subscription details:', error.message);
      throw error;
    }
  }

  async isSubscriptionValid(subscriptionId, token) {
    try {
      const details = await this.getSubscriptionDetails(subscriptionId, token);
      return details.subscription_request.status === 'approved';
    } catch (error) {
      console.error('Error checking subscription validity:', error.message);
      return false;
    }
  }

  async isUserInSubscription(subscriptionId, userId, token) {
    try {
      const details = await this.getSubscriptionDetails(subscriptionId, token);
      return details.subscription_request.user_ids.includes(userId);
    } catch (error) {
      console.error('Error checking user subscription:', error.message);
      return false;
    }
  }

  async validateUserLimit(subscriptionId, token, currentCount = 1) {
    try {
      const details = await this.getSubscriptionDetails(subscriptionId, token);
      const { user_limit, user_count } = details.subscription_request;
      
      // If there's no limit, always return true
      if (user_limit === null) return true;
      
      // Check if adding the new users would exceed the limit
      return (user_count + currentCount) <= user_limit;
    } catch (error) {
      console.error('Error validating user limit:', error.message);
      return false;
    }
  }
}

module.exports = new SubscriptionService(); 