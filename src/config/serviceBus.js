const { ServiceBusClient } = require("@azure/service-bus");

class ServiceBusConnection {
  constructor() {
    // Prefer explicit environment variable, fall back to the value loaded via ConfigManager
    const config = require('./index');
    this.connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || config.get().azure.serviceBus.connectionString;

    if (!this.connectionString) {
      throw new Error('Azure Service Bus connection string is not configured');
    }
    this.client = new ServiceBusClient(this.connectionString);
  }

  async createSender(topicName) {
    return this.client.createSender(topicName);
  }

  async createReceiver(topicName, subscriptionName) {
    return this.client.createReceiver(topicName, subscriptionName);
  }

  async close() {
    await this.client.close();
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new ServiceBusConnection();
    }
    return instance;
  }
}; 