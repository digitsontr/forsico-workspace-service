const mongoose = require('mongoose');
const config = require('./config');
const createApp = require('./loaders/app.loader');
const redisService = require('./services/redis.service');

async function startServer() {
  try {
    await config.loadProductionSecrets();
    
    await mongoose.connect(config.get().mongodb.uri);
    console.log('Connected to MongoDB');
    
    await redisService.connect();
    
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