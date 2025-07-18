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
                    subscriptionId: event.data.subscriptionId
                },
                applicationProperties: {
                    eventType: event.type,
                    subscriptionId: event.data.subscriptionId
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
            subscriptionId: workspace.subscriptionId,
            name: workspace.name,
            createdBy: workspace.createdBy,
            settings: workspace.settings
        });
        await this.publishEvent(event);
    }

    async publishWorkspaceUpdated(workspace) {
        const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_UPDATED, {
            workspaceId: workspace._id,
            subscriptionId: workspace.subscriptionId,
            name: workspace.name,
            updatedBy: workspace.updatedBy,
            settings: workspace.settings
        });
        await this.publishEvent(event);
    }

    async publishWorkspaceMemberAdded(workspaceId, subscriptionId, memberId, role) {
        const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_MEMBER_ADDED, {
            workspaceId,
            subscriptionId,
            memberId,
            role
        });
        await this.publishEvent(event);
    }

    async publishWorkspaceDeleted(workspace) {
        const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_DELETED, {
            workspaceId: workspace._id,
            subscriptionId: workspace.subscriptionId,
            deletionId: workspace.deletionId,
            deletedAt: workspace.deletedAt,
            deletedBy: workspace.updatedBy || workspace.owner
        });
        await this.publishEvent(event);
    }

    async publishWorkspaceMemberRemoved(workspaceId, subscriptionId, memberId) {
        const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_MEMBER_REMOVED, {
            workspaceId,
            subscriptionId,
            memberId
        });
        await this.publishEvent(event);
    }

    async publishWorkspaceSettingsUpdated(workspace) {
        const event = new BaseEvent(WorkspaceEventTypes.WORKSPACE_SETTINGS_UPDATED, {
            workspaceId: workspace._id,
            subscriptionId: workspace.subscriptionId,
            updatedBy: workspace.updatedBy,
            settings: workspace.settings
        });
        await this.publishEvent(event);
    }
}

module.exports = WorkspaceEventPublisher; 