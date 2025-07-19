const Redis = require('redis');
const config = require('../config');

class RedisService {
  constructor() {
    this.client = null;
  }

  async connect() {
    const redisConfig = config.get().redis;

    if (redisConfig.connectionString) {
      // Use full connection string when provided
      this.client = Redis.createClient({ url: redisConfig.connectionString });
    } else {
      // Fallback to discrete host/port configuration
      this.client = Redis.createClient({
        url: `redis://${redisConfig.host}:${redisConfig.port}`,
        password: redisConfig.password
      });
    }

    this.client.on('error', (err) => console.log('Redis Client Error', err));
    
    await this.client.connect();
    console.log('Connected to Redis');
    return this.client;
  }

  async ping() {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return await this.client.ping();
  }

  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }
}

module.exports = new RedisService(); 