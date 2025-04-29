const { WorkspaceEventTypes, BaseEvent } = require('./types');
const ServiceBusConnection = require('../config/serviceBus');

class WorkspaceEventPublisher {
  constructor() {
    this.serviceBus = ServiceBusConnection.getInstance();
    this.topicName = 'workspace-events';
  }

  async publishEvent(event) {
    const sender = await this.serviceBus.createSender(this.topicName);
    try {
      const message = {
        body: event,
        contentType: 'application/json',
        correlationId: event.correlationId,
        userProperties: {
          eventType: event.type,
          tenantId: event.data.tenantId
        }
      };
      
      await sender.sendMessages(message);
    } finally {
      await sender.close();
    }
  }

  async publishWorkspaceCreated(workspace) {
    const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_CREATED, {
      workspaceId: workspace._id,
      tenantId: workspace.tenantId,
      name: workspace.name,
      createdBy: workspace.createdBy,
      settings: workspace.settings
    });
    await this.publishEvent(event);
  }

  async publishWorkspaceUpdated(workspace) {
    const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_UPDATED, {
      workspaceId: workspace._id,
      tenantId: workspace.tenantId,
      name: workspace.name,
      updatedBy: workspace.updatedBy,
      settings: workspace.settings
    });
    await this.publishEvent(event);
  }

  async publishWorkspaceMemberAdded(workspaceId, tenantId, memberId, role) {
    const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_MEMBER_ADDED, {
      workspaceId,
      tenantId,
      memberId,
      role
    });
    await this.publishEvent(event);
  }
}

module.exports = WorkspaceEventPublisher; 