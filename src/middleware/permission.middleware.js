const roleService = require('../services/role.service');
const { AuthorizationError } = require('../utils/errors');

const requirePermission = (permission, scopeType = 'workspace') => async (req, res, next) => {
  try {
    const subscriptionId = req.body.subscriptionId || req.query.subscriptionId || req.params.subscriptionId;
    
    if (!subscriptionId) {
      throw new AuthorizationError('Subscription ID is required');
    }

    // For routes without specific resource ID (like list routes)
    if (scopeType === 'workspace' && !req.params.id) {
      // Skip permission check for list routes, as they will be filtered by the service layer
      return next();
    }

    const scopeId = scopeType === 'workspace' ? req.params.id : null;
    const workspaceId = scopeType === 'board' ? req.params.workspaceId : null;
    const boardId = scopeType === 'board' ? req.params.id : null;

    const hasPermission = await roleService.checkPermission({
      token: req.auth.token,
      subscriptionId,
      requiredPermission: permission,
      scopeType,
      scopeId,
      workspaceId,
      boardId
    });

    if (!hasPermission) {
      throw new AuthorizationError(`Missing required permission: ${permission}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Commonly used permission middleware
const permissions = {
  createWorkspace: requirePermission('SUBSCRIPTION.WORKSPACES.CREATE', 'subscription'),
  viewWorkspace: requirePermission('WORKSPACE.VIEW', 'workspace'),
  manageWorkspace: requirePermission('WORKSPACE.MANAGE', 'workspace'),
  manageWorkspaceUsers: requirePermission('WORKSPACE.USERS.MANAGE', 'workspace')
};

module.exports = {
  requirePermission,
  permissions
}; 