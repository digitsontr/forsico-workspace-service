const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
require('dotenv').config();

class ConfigManager {
  constructor() {
    this.config = {
      port: process.env.PORT || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      mongodb: {
        uri: process.env.MONGODB_URI
      },
      redis: {
        // Prefer full connection string if provided; fall back to host/port
        connectionString: process.env.REDIS_CONNECTION_STRING,
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        ttl: {
          permissions: 3600 // 1 hour
        }
      },
      azure: {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
        serviceBus: {
          connectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING,
          queueName: process.env.AZURE_SERVICE_BUS_QUEUE_NAME
        }
      },
      auth: {
        serviceUrl: process.env.AUTH_SERVICE_URL
      },
      subscription: {
        serviceUrl: process.env.SUBSCRIPTION_SERVICE_URL
      },
      role: {
        serviceUrl: process.env.ROLE_SERVICE_URL
      },
      userProfile: {
        serviceUrl: process.env.USER_PROFILE_SERVICE_URL
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info'
      },
      internalApiKey: process.env.INTERNAL_API_KEY,
    };
  }

  async loadProductionSecrets() {
    // Load secrets from Azure Key Vault for any environment other than local development
    if (this.config.nodeEnv !== 'development') {
      try {
        const credential = new DefaultAzureCredential();
        const secretClient = new SecretClient(this.config.azure.keyVaultUrl, credential);

        // Load secrets from Key Vault
        const [mongoUri, redisConnection, serviceBusConnection] = await Promise.all([
          // Align secret names with naming convention used in Role-Service
          secretClient.getSecret('WorkspaceService-DbConString'),
          secretClient.getSecret('Forsico-RedisConnection'),
          secretClient.getSecret('AuthApi-ServiceBusConnection')
        ]);

        // Update config with Key Vault values
        this.config.mongodb.uri = mongoUri.value;
        this.config.redis.connectionString = redisConnection.value;
        this.config.azure.serviceBus.connectionString = serviceBusConnection.value;
      } catch (error) {
        console.error('Error loading secrets from Key Vault:', error);
        throw error;
      }
    }
  }

  get() {
    return this.config;
  }
}

module.exports = new ConfigManager(); 