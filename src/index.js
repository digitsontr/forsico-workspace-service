const mongoose = require('mongoose');
const config = require('./config');
const createApp = require('./loaders/app.loader');
const redisService = require('./services/redis.service');

async function startServer() {
  try {
    // Load production secrets if in production
    await config.loadProductionSecrets();
    
    // Connect to MongoDB
    await mongoose.connect(config.get().mongodb.uri);
    console.log('Connected to MongoDB');
    
    // Connect to Redis
    await redisService.connect();
    
    // Create and start the Express app
    const app = createApp();
    const port = config.get().port;
    
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 