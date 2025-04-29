const WorkspaceEventSubscriber = require('../events/subscribers');

async function initializeEventHandlers() {
  try {
    const subscriber = new WorkspaceEventSubscriber();
    await subscriber.subscribe();
    console.log('Event handlers initialized successfully');
  } catch (error) {
    console.error('Failed to initialize event handlers:', error);
    throw error;
  }
}

module.exports = {
  initializeEventHandlers
}; 