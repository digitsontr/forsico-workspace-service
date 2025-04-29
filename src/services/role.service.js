const axios = require('axios');
const config = require('../config');

class RoleService {
  constructor() {
    this.baseUrl = config.get().role.serviceUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000
    });
  }

  async checkPermission({
    token,
    subscriptionId,
    requiredPermission,
    scopeType,
    scopeId = null,
    workspaceId = null,
    boardId = null,
    roleTemplateType = 'RoleTemplate'
  }) {
    try {
      const response = await this.axiosInstance.post(
        '/api/v1/roles/check-permission',
        {
          subscriptionId,
          requiredPermission,
          roleTemplateType,
          scopeType,
          ...(scopeId && { scopeId }),
          ...(workspaceId && { workspaceId }),
          ...(boardId && { boardId })
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return response.data?.data?.hasPermission || false;
    } catch (error) {
      console.error('Error checking permission:', error.message);
      return false;
    }
  }

  // Helper methods for workspace-specific permissions
  async canManageWorkspace(token, workspaceId, subscriptionId) {
    return this.checkPermission({
      token,
      subscriptionId,
      requiredPermission: 'WORKSPACE.MANAGE',
      scopeType: 'workspace',
      scopeId: workspaceId
    });
  }

  async canViewWorkspace(token, workspaceId, subscriptionId) {
    return this.checkPermission({
      token,
      subscriptionId,
      requiredPermission: 'WORKSPACE.VIEW',
      scopeType: 'workspace',
      scopeId: workspaceId
    });
  }

  async canManageWorkspaceUsers(token, workspaceId, subscriptionId) {
    return this.checkPermission({
      token,
      subscriptionId,
      requiredPermission: 'WORKSPACE.USERS.MANAGE',
      scopeType: 'workspace',
      scopeId: workspaceId
    });
  }

  async canCreateWorkspace(token, subscriptionId) {
    return this.checkPermission({
      token,
      subscriptionId,
      requiredPermission: 'SUBSCRIPTION.WORKSPACES.CREATE',
      scopeType: 'subscription'
    });
  }
}

module.exports = new RoleService(); 