const WorkspaceService = require('../services/workspace.service');
const WorkspaceEventPublisher = require('../events/publishers');
const { WorkspaceProgressState } = require('../models/workspace.model');
const { ValidationError, NotFoundError, AuthorizationError } = require('../utils/errors');
const { validateWorkspace } = require('../validations/workspace.validation');

class WorkspaceController {
  constructor() {
    this.workspaceService = new WorkspaceService();
    this.eventPublisher = new WorkspaceEventPublisher();
  }

  async createWorkspace(req, res) {
    try {
      const { error } = validateWorkspace(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const workspace = await this.workspaceService.create(req.body);
      
      // Publish workspace created event
      await this.eventPublisher.publishWorkspaceCreated(workspace);
      
      res.status(201).json(workspace);
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateWorkspace(req, res) {
    try {
      const { id } = req.params;
      const { error } = validateWorkspace(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const workspace = await this.workspaceService.update(id, req.body);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Publish workspace updated event
      await this.eventPublisher.publishWorkspaceUpdated(workspace);

      res.json(workspace);
    } catch (error) {
      console.error('Error updating workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async addWorkspaceMember(req, res) {
    try {
      const { workspaceId } = req.params;
      const { memberId, role } = req.body;

      const workspace = await this.workspaceService.addMember(workspaceId, memberId, role);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Publish member added event
      await this.eventPublisher.publishWorkspaceMemberAdded(
        workspaceId,
        workspace.tenantId,
        memberId,
        role
      );

      res.json(workspace);
    } catch (error) {
      console.error('Error adding workspace member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const includeSoftDeleted = req.query.includeSoftDeleted === 'true';
      const subscriptionId = req.query.subscriptionId;
      const ownerOnly = req.query.ownerOnly === 'true';

      if (page < 1) {
        throw new ValidationError('Page number must be greater than 0');
      }

      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }

      const result = await this.workspaceService.findAll(page, limit, {
        includeSoftDeleted,
        userId: req.auth.userId,
        subscriptionId,
        isOwnerOnly: ownerOnly
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getBySubscription(req, res, next) {
    try {
      const { subscriptionId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const includeSoftDeleted = req.query.includeSoftDeleted === 'true';

      if (!subscriptionId) {
        throw new ValidationError('Subscription ID is required');
      }

      const result = await this.workspaceService.findBySubscription(
        subscriptionId,
        page,
        limit,
        includeSoftDeleted
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMyWorkspaces(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const includeSoftDeleted = req.query.includeSoftDeleted === 'true';
      const ownerOnly = req.query.ownerOnly === 'true';
      const subscriptionId = req.query.subscriptionId;

      const result = await this.workspaceService.findByUser(
        req.auth.userId,
        page,
        limit,
        {
          includeSoftDeleted,
          subscriptionId,
          isOwnerOnly: ownerOnly
        }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const includeSoftDeleted = req.query.includeSoftDeleted === 'true';

      const workspace = await this.workspaceService.findById(id, includeSoftDeleted);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      // Check if user has access to the workspace
      if (!(await this.workspaceService.hasAccess(id, req.auth.userId))) {
        throw new AuthorizationError('You do not have access to this workspace');
      }

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if user is owner
      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can update workspace details');
      }

      // Prevent updating certain fields
      delete updateData.id;
      delete updateData.isDeleted;
      delete updateData.deletedAt;
      delete updateData.deletionId;
      delete updateData.owner;

      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('No valid update data provided');
      }

      const workspace = await this.workspaceService.update(id, updateData);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      // Publish workspace updated event
      await this.eventPublisher.publishWorkspaceUpdated(workspace);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      // Check if user is owner
      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can delete workspaces');
      }

      const workspace = await this.workspaceService.softDelete(id);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      // Publish workspace deleted event
      await this.eventPublisher.publishWorkspaceDeleted(workspace);

      res.json({ message: 'Workspace deleted successfully', deletionId: workspace.deletionId });
    } catch (error) {
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const { id } = req.params;

      // Check if user is owner
      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can restore workspaces');
      }

      const workspace = await this.workspaceService.restore(id);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found or not deleted');
      }

      // Publish workspace restored event
      await this.eventPublisher.publishWorkspaceRestored(workspace);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  async updateProgress(req, res, next) {
    try {
      const { id } = req.params;
      const { state, comment } = req.body;

      // Check if user is owner
      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can update progress state');
      }

      if (!state) {
        throw new ValidationError('Progress state is required');
      }

      if (!Object.values(WorkspaceProgressState).includes(state)) {
        throw new ValidationError('Invalid progress state', [{
          field: 'state',
          message: `State must be one of: ${Object.values(WorkspaceProgressState).join(', ')}`
        }]);
      }

      const workspace = await this.workspaceService.updateProgress(id, state, req.auth.userId, comment);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      // Publish workspace progress updated event
      await this.eventPublisher.publishWorkspaceProgressUpdated(workspace);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  async addUsers(req, res, next) {
    try {
      const { id } = req.params;
      const { userIds } = req.body;
      const token = req.headers.authorization;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new ValidationError('userIds must be a non-empty array');
      }

      const result = await this.workspaceService.addUsers(id, userIds, token);
      
      if (!result) {
        throw new NotFoundError('Workspace not found');
      }

      // Publish member added event
      await this.eventPublisher.publishWorkspaceMemberAdded(
        id,
        result.tenantId,
        result.owner,
        result.role
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async removeUsers(req, res, next) {
    try {
      const { id } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new ValidationError('userIds must be a non-empty array');
      }

      const result = await this.workspaceService.removeUsers(id, userIds);
      
      if (!result) {
        throw new NotFoundError('Workspace not found');
      }

      // Publish member removed event
      await this.eventPublisher.publishWorkspaceMemberRemoved(
        id,
        result.tenantId,
        result.owner,
        result.role
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

// Create an instance of the controller
const workspaceController = new WorkspaceController();

// Export the instance
module.exports = workspaceController; 