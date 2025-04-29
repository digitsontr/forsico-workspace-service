const { v4: uuidv4 } = require('uuid');

const WorkspaceEventTypes = {
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',
  WORKSPACE_MEMBER_ADDED: 'workspace.member.added',
  WORKSPACE_MEMBER_REMOVED: 'workspace.member.removed',
  WORKSPACE_SETTINGS_UPDATED: 'workspace.settings.updated'
};

class BaseEvent {
  constructor(type, data) {
    this.id = uuidv4();
    this.type = type;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.correlationId = uuidv4();
    this.source = 'workspace-service';
  }
}

module.exports = {
  WorkspaceEventTypes,
  BaseEvent
}; 