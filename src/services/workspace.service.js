const { WorkspaceModel } = require('../models/workspace.model');
const { ValidationError, NotFoundError } = require('../utils/errors');
const redisService = require('./redis.service');
const subscriptionService = require('./subscription.service');
const validTransitions = {
    INITIAL: ['WAITING_TASKS'],
    WAITING_TASKS: ['TASKS_CREATED'],
    TASKS_CREATED: ['COMPLETED'],
    COMPLETED: []
};

class WorkspaceService {
    constructor() {
        this.workspaceModel = WorkspaceModel;
        this.cacheKeyPrefix = 'workspace:';
        this.cacheTTL = 3600;
    }

    getCacheKey(workspaceId) {
        return `${this.cacheKeyPrefix}${workspaceId}`;
    }

    async refreshCache(workspace) {
        const redisClient = redisService.getClient();
        await redisClient.setEx(
            this.getCacheKey(workspace.id),
            this.cacheTTL,
            JSON.stringify(workspace)
        );
    }

    async create(workspaceData, userId) {
        try {
            const workspace = await new this.workspaceModel({
                ...workspaceData,
                createdAt: new Date(),
                updatedAt: new Date(),
                owner: userId,
                members: [userId],
            }).save();

            await this.refreshCache(workspace);
            return  workspace
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

            await this.refreshCache(workspace);

            return workspace;
        } catch (error) {
            if (error.name === 'ValidationError') {
                throw new ValidationError(error.message);
            }
            throw error;
        }
    }

    async findById(id, includeSoftDeleted = false) {
        const redisClient = redisService.getClient();
        const cachedWorkspace = await redisClient.get(this.getCacheKey(id));

        if (cachedWorkspace) {
            return JSON.parse(cachedWorkspace);
        }

        const query = { _id: id };
        if (!includeSoftDeleted) {
            query.isDeleted = { $ne: true };
        }

        const workspace = await this.workspaceModel.findOne(query);

        if (workspace) {
            await this.refreshCache(workspace);
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
            await this.refreshCache(workspace);
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
        await this.refreshCache(workspace);

        return workspace;
    }

    async hasAccess(workspaceId, userId) {
        const workspace = await this.findById(workspaceId);
        if (!workspace) {
            return false;
        }

        return workspace.owner === userId || workspace.members.includes(userId);
    }

    async isOwner(workspaceId, userId) {
        const workspace = await this.findById(workspaceId);
        if (!workspace) {
            return false;
        }

        return workspace.owner === userId;
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

        await this.refreshCache(workspace);

        return workspace;
    }

    async updateProgress(id, newState, userId, comment = '') {
        const workspace = await this.workspaceModel.findById(id);

        if (!workspace) {
            return null;
        }

        if (!validTransitions[workspace.progress.state]?.includes(newState)) {
            throw new ValidationError(
                `Invalid transition from ${workspace.progress.state} to ${newState}`
            );
        }

        workspace.progress.state = newState;
        workspace.updatedBy = userId;
        workspace.setProgressStateComment(comment);

        const updatedWorkspace = await workspace.save();

        await this.refreshCache(updatedWorkspace);

        return updatedWorkspace;
    }

    async addUsers(id, userIds, token) {
        const workspace = await this.workspaceModel.findById(id);

        if (!workspace) {
            return null;
        }

        const validUsers = [];
        for (const userId of userIds) {
            if (await subscriptionService.isUserInSubscription(workspace.subscriptionId, userId, token)) {
                validUsers.push(userId);
            }
        }

        if (validUsers.length === 0) {
            throw new Error('No valid users to add');
        }

        const newMembers = validUsers.filter(userId =>
            !workspace.members.includes(userId) && workspace.owner !== userId
        );

        if (newMembers.length > 0) {
            workspace.members.push(...newMembers);
            workspace.updatedAt = new Date();

            const updatedWorkspace = await workspace.save();

            await this.refreshCache(updatedWorkspace);

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

        workspace.members = workspace.members.filter(memberId => !userIds.includes(memberId));
        workspace.updatedAt = new Date();
        const updatedWorkspace = await workspace.save();
        await this.refreshCache(updatedWorkspace);

        return {
            workspace: updatedWorkspace,
            removedUsers: userIds.filter(userId =>
                !updatedWorkspace.members.includes(userId) && updatedWorkspace.owner !== userId
            )
        };
    }
}

module.exports = WorkspaceService; 