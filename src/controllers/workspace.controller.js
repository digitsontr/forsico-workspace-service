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

  createWorkspace = async (req, res) => {
    try {
      const workspace = await this.workspaceService.create(req.body, req.auth.userId);
      
      await this.eventPublisher.publishWorkspaceCreated(workspace);
      
      res.status(201).json(workspace);
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  updateWorkspace = async (req, res) => {
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

      await this.eventPublisher.publishWorkspaceUpdated(workspace);

      res.json(workspace);
    } catch (error) {
      console.error('Error updating workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  addWorkspaceMember = async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { memberId, role } = req.body;

      const workspace = await this.workspaceService.addMember(workspaceId, memberId, role);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      await this.eventPublisher.publishWorkspaceMemberAdded(
        workspaceId,
        workspace.subscriptionId,
        memberId,
        role
      );

      res.json(workspace);
    } catch (error) {
      console.error('Error adding workspace member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  getAll = async (req, res, next) => {
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

  getBySubscription = async (req, res, next) => {
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

  getMyWorkspaces = async (req, res, next) => {
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

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const includeSoftDeleted = req.query.includeSoftDeleted === 'true';

      const workspace = await this.workspaceService.findById(id, includeSoftDeleted);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      if (!(await this.workspaceService.hasAccess(id, req.auth.userId))) {
        throw new AuthorizationError('You do not have access to this workspace');
      }

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can update workspace details');
      }

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

      await this.eventPublisher.publishWorkspaceUpdated(workspace);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can delete workspaces');
      }

      const workspace = await this.workspaceService.softDelete(id);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      await this.eventPublisher.publishWorkspaceDeleted(workspace);

      res.json({ message: 'Workspace deleted successfully', deletionId: workspace.deletionId });
    } catch (error) {
      next(error);
    }
  }

  restore = async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can restore workspaces');
      }

      const workspace = await this.workspaceService.restore(id);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found or not deleted');
      }

      await this.eventPublisher.publishWorkspaceRestored(workspace);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  updateProgress = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { state, comment } = req.body;

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

      await this.eventPublisher.publishWorkspaceProgressUpdated(workspace);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  addUsers = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userIds } = req.body;

      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can add users');
      }

      const workspace = await this.workspaceService.addUsers(id, userIds);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      await this.eventPublisher.publishWorkspaceUsersAdded(workspace, userIds);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }

  removeUsers = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userIds } = req.body;

      if (!(await this.workspaceService.isOwner(id, req.auth.userId))) {
        throw new AuthorizationError('Only workspace owners can remove users');
      }

      const workspace = await this.workspaceService.removeUsers(id, userIds);
      
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      await this.eventPublisher.publishWorkspaceUsersRemoved(workspace, userIds);

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }
}

const workspaceController = new WorkspaceController();

module.exports = workspaceController; 