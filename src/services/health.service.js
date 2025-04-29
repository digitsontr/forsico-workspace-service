const mongoose = require('mongoose');
const redisService = require('./redis.service');

class HealthService {
  async check() {
    const health = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now()
    };
    
    try {
      await mongoose.connection.db.admin().ping();
      health.mongodb = 'Connected';
    } catch (error) {
      health.mongodb = 'Disconnected';
      health.message = 'ERROR';
    }

    try {
      await redisService.ping();
      health.redis = 'Connected';
    } catch (error) {
      health.redis = 'Disconnected';
      health.message = 'ERROR';
    }

    return {
      health,
      statusCode: health.message === 'OK' ? 200 : 503
    };
  }
}

module.exports = new HealthService(); 