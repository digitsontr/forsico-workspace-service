const Redis = require('redis');
const config = require('../config');

class RedisService {
  constructor() {
    this.client = null;
  }

  async connect() {
    this.client = Redis.createClient({
      url: `redis://${config.get().redis.host}:${config.get().redis.port}`,
      password: config.get().redis.password
    });

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