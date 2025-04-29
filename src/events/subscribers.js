const ServiceBusConnection = require('../config/serviceBus');

class WorkspaceEventSubscriber {
  constructor() {
    this.serviceBus = ServiceBusConnection.getInstance();
    this.subscriptionName = 'workspace-subscription';
  }

  async subscribe() {
    // User events subscription
    await this.subscribeToUserEvents();
    // Role events subscription
    await this.subscribeToRoleEvents();
  }

  async subscribeToUserEvents() {
    const receiver = await this.serviceBus.createReceiver('user-events', this.subscriptionName);
    
    receiver.subscribe({
      processMessage: async (message) => {
        try {
          const event = message.body;
          await this.handleUserEvent(event);
          await message.complete();
        } catch (error) {
          console.error('Error processing user event:', error);
          await message.abandon();
        }
      },
      processError: async (args) => {
        console.error('Error from user event subscription:', args.error);
      }
    });
  }

  async subscribeToRoleEvents() {
    const receiver = await this.serviceBus.createReceiver('role-events', this.subscriptionName);
    
    receiver.subscribe({
      processMessage: async (message) => {
        try {
          const event = message.body;
          await this.handleRoleEvent(event);
          await message.complete();
        } catch (error) {
          console.error('Error processing role event:', error);
          await message.abandon();
        }
      },
      processError: async (args) => {
        console.error('Error from role event subscription:', args.error);
      }
    });
  }

  async handleUserEvent(event) {
    switch (event.type) {
      case 'user.deleted':
        // Handle user deletion - remove from workspaces
        await this.handleUserDeletion(event.data);
        break;
      case 'user.deactivated':
        // Handle user deactivation
        await this.handleUserDeactivation(event.data);
        break;
      // Add more user event handlers as needed
    }
  }

  async handleRoleEvent(event) {
    switch (event.type) {
      case 'role.updated':
        // Handle role updates in workspaces
        await this.handleRoleUpdate(event.data);
        break;
      // Add more role event handlers as needed
    }
  }

  async handleUserDeletion(userData) {
    // Implement user deletion logic
    console.log('Handling user deletion:', userData);
  }

  async handleUserDeactivation(userData) {
    // Implement user deactivation logic
    console.log('Handling user deactivation:', userData);
  }

  async handleRoleUpdate(roleData) {
    // Implement role update logic
    console.log('Handling role update:', roleData);
  }
}

module.exports = WorkspaceEventSubscriber; 