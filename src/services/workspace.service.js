const { WorkspaceModel } = require('../models/workspace.model');
const { ValidationError, NotFoundError } = require('../utils/errors');
const redisService = require('./redis.service');
const subscriptionService = require('./subscription.service');
const crypto = require('crypto');

class WorkspaceService {
  constructor() {
    this.workspaceModel = WorkspaceModel;
    this.cacheKeyPrefix = 'workspace:';
    this.cacheTTL = 3600; // 1 hour in seconds
  }

  generateGuid() {
    return crypto.randomUUID();
  }

  getCacheKey(workspaceId) {
    return `${this.cacheKeyPrefix}${workspaceId}`;
  }

  async create(workspaceData) {
    try {
      const workspace = new this.workspaceModel({
        ...workspaceData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await workspace.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  }

  async update(id, updateData) {
    try {
      const workspace = await this.workspaceModel.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      // Update cache
      const redisClient = redisService.getClient();
      await redisClient.setEx(
        this.getCacheKey(workspace.id),
        this.cacheTTL,
        JSON.stringify(workspace)
      );

      return workspace;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  }

  async findById(id, includeSoftDeleted = false) {
    // Try to get from cache first
    const redisClient = redisService.getClient();
    const cachedWorkspace = await redisClient.get(this.getCacheKey(id));
    
    if (cachedWorkspace) {
      return JSON.parse(cachedWorkspace);
    }

    const query = { _id: id };
    if (!includeSoftDeleted) {
      query.isDeleted = { $ne: true };
    }

    // If not in cache, get from database
    const workspace = await this.workspaceModel.findOne(query);

    if (workspace) {
      // Cache the workspace
      await redisClient.setEx(
        this.getCacheKey(workspace.id),
        this.cacheTTL,
        JSON.stringify(workspace)
      );
    }

    return workspace;
  }

  async findAll(page = 1, limit = 10, options = {}) {
    const { includeSoftDeleted = false, userId, subscriptionId, isOwnerOnly = false } = options;
    
    const query = {};
    if (!includeSoftDeleted) {
      query.isDeleted = { $ne: true };
    }
    
    if (subscriptionId) {
      query.subscriptionId = subscriptionId;
    }

    if (userId) {
      if (isOwnerOnly) {
        query.owner = userId;
      } else {
        query.$or = [
          { owner: userId },
          { members: userId }
        ];
      }
    }

    const skip = (page - 1) * limit;
    
    const [workspaces, total] = await Promise.all([
      this.workspaceModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.workspaceModel.countDocuments(query)
    ]);

    return {
      workspaces,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findBySubscription(subscriptionId, page = 1, limit = 10, includeSoftDeleted = false) {
    return this.findAll(page, limit, { 
      includeSoftDeleted, 
      subscriptionId 
    });
  }

  async findByUser(userId, page = 1, limit = 10, options = {}) {
    return this.findAll(page, limit, { 
      ...options,
      userId
    });
  }

  async addMember(workspaceId, memberId, role) {
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    if (!workspace.members.includes(memberId)) {
      workspace.members.push(memberId);
      workspace.memberRoles = workspace.memberRoles || {};
      workspace.memberRoles[memberId] = role;
      workspace.updatedAt = new Date();
      await workspace.save();
    }

    return workspace;
  }

  async removeMember(workspaceId, memberId) {
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    workspace.members = workspace.members.filter(id => id.toString() !== memberId);
    if (workspace.memberRoles) {
      delete workspace.memberRoles[memberId];
    }
    workspace.updatedAt = new Date();
    await workspace.save();

    return workspace;
  }

  async hasAccess(workspaceId, userId) {
    const workspace = await this.findById(workspaceId);
    if (!workspace) {
      return false;
    }

    return workspace.owner.includes(userId) || workspace.members.includes(userId);
  }

  async isOwner(workspaceId, userId) {
    const workspace = await this.findById(workspaceId);
    if (!workspace) {
      return false;
    }

    return workspace.owner.includes(userId);
  }

  async softDelete(id) {
    const workspace = await this.workspaceModel.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletionId: require('crypto').randomBytes(16).toString('hex')
      },
      { new: true }
    );

    // Remove from cache
    const redisClient = redisService.getClient();
    await redisClient.del(this.getCacheKey(id));

    return workspace;
  }

  async restore(id) {
    const workspace = await this.workspaceModel.findByIdAndUpdate(
      id,
      {
        $unset: { isDeleted: "", deletedAt: "", deletionId: "" }
      },
      { new: true }
    );

    // Update cache
    const redisClient = redisService.getClient();
    await redisClient.setEx(
      this.getCacheKey(workspace.id),
      this.cacheTTL,
      JSON.stringify(workspace)
    );

    return workspace;
  }

  async updateProgress(id, newState, userId, comment = '') {
    const workspace = await this.workspaceModel.findById(id);
    
    if (!workspace) {
      return null;
    }

    workspace.progress.state = newState;
    workspace.updatedBy = userId;
    workspace.setProgressStateComment(comment);
    
    const updatedWorkspace = await workspace.save();

    // Update cache
    const redisClient = redisService.getClient();
    await redisClient.setEx(
      this.getCacheKey(updatedWorkspace.id),
      this.cacheTTL,
      JSON.stringify(updatedWorkspace)
    );

    return updatedWorkspace;
  }

  async addUsers(id, userIds, token) {
    const workspace = await this.workspaceModel.findById(id);
    
    if (!workspace) {
      return null;
    }

    // Validate users are in the subscription
    const validUsers = [];
    for (const userId of userIds) {
      if (await subscriptionService.isUserInSubscription(workspace.subscriptionId, userId, token)) {
        validUsers.push(userId);
      }
    }

    if (validUsers.length === 0) {
      throw new Error('No valid users to add');
    }

    // Add users that aren't already members
    const newMembers = validUsers.filter(userId => 
      !workspace.members.includes(userId) && !workspace.owner.includes(userId)
    );

    if (newMembers.length > 0) {
      workspace.members.push(...newMembers);
      workspace.updatedAt = new Date();
      const updatedWorkspace = await workspace.save();

      // Update cache
      const redisClient = redisService.getClient();
      await redisClient.setEx(
        this.getCacheKey(updatedWorkspace.id),
        this.cacheTTL,
        JSON.stringify(updatedWorkspace)
      );

      return {
        workspace: updatedWorkspace,
        addedUsers: newMembers,
        invalidUsers: userIds.filter(id => !validUsers.includes(id))
      };
    }

    return {
      workspace,
      addedUsers: [],
      invalidUsers: userIds.filter(id => !validUsers.includes(id))
    };
  }

  async removeUsers(id, userIds) {
    const workspace = await this.workspaceModel.findById(id);
    
    if (!workspace) {
      return null;
    }

    // Remove users from members array
    workspace.members = workspace.members.filter(memberId => !userIds.includes(memberId));
    workspace.updatedAt = new Date();
    const updatedWorkspace = await workspace.save();

    // Update cache
    const redisClient = redisService.getClient();
    await redisClient.setEx(
      this.getCacheKey(updatedWorkspace.id),
      this.cacheTTL,
      JSON.stringify(updatedWorkspace)
    );

    return {
      workspace: updatedWorkspace,
      removedUsers: userIds.filter(userId => 
        !updatedWorkspace.members.includes(userId) && !updatedWorkspace.owner.includes(userId)
      )
    };
  }
}

module.exports = WorkspaceService; 