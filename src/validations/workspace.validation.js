const Joi = require("joi");
const { WorkspaceProgressState } = require("../models/workspace.model");

const id = Joi.string().guid({
  version: ["uuidv4"],
});

const name = Joi.string().min(1).max(100).trim();

const description = Joi.string().max(500).allow("").trim();

const subscriptionId = Joi.string().hex().length(24);

const userIds = Joi.array()
  .items(Joi.string().guid({ version: ["uuidv4"] }))
  .min(1)
  .unique();

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

const workspaceSchema = Joi.object({
  name: Joi.string().required().min(3).max(100).trim(),

  description: Joi.string().max(500).trim().allow("", null),

  subscriptionId: Joi.string().required(),

  owner: Joi.string().min(1).required(),

  members: Joi.array().items(Joi.string()).default([]),

  memberRoles: Joi.object().pattern(Joi.string(), Joi.string()).default({}),

  settings: Joi.object().pattern(Joi.string(), Joi.any()).default({}),

  subscriptionId: Joi.string().hex().length(24).required(),

  createdBy: Joi.string().required(),

  updatedBy: Joi.string().allow(null),
});


const schemas = {
  // GET /workspaces
  getAll: {
    query: Joi.object({
      ...pagination,
      includeSoftDeleted: Joi.boolean().default(false),
      subscriptionId: subscriptionId.required(),
    }),
  },

  // GET /workspaces/my
  getMyWorkspaces: {
    query: Joi.object({
      ...pagination,
      includeSoftDeleted: Joi.boolean().default(false),
      subscriptionId: subscriptionId.required(),
      ownerOnly: Joi.boolean().default(false),
    }),
  },

  // GET /workspaces/:id
  getById: {
    params: Joi.object({
      id: id.required(),
    }),
    query: Joi.object({
      includeSoftDeleted: Joi.boolean().default(false),
    }),
  },

  // GET /workspaces/subscription/:subscriptionId
  getBySubscription: {
    params: Joi.object({
      subscriptionId: subscriptionId.required(),
    }),
    query: Joi.object({
      ...pagination,
      includeSoftDeleted: Joi.boolean().default(false),
    }),
  },

  // POST /workspaces
  create: {
    body: Joi.object({
      name: name.required(),
      description,
      subscriptionId: subscriptionId.required(),
    }),
  },

  // PUT /workspaces/:id
  update: {
    params: Joi.object({
      id: id.required(),
    }),
    body: Joi.object({
      name,
      description,
    }).min(1),
  },

  // DELETE /workspaces/:id
  delete: {
    params: Joi.object({
      id: id.required(),
    }),
  },

  // POST /workspaces/:id/restore
  restore: {
    params: Joi.object({
      id: id.required(),
    }),
  },

  // PUT /workspaces/:id/progress
  updateProgress: {
    params: Joi.object({
      id: id.required(),
    }),
    body: Joi.object({
      state: Joi.string()
        .valid(...Object.values(WorkspaceProgressState))
        .required(),
    }),
  },

  // POST /workspaces/:id/users
  addUsers: {
    params: Joi.object({
      id: id.required(),
    }),
    body: Joi.object({
      userIds: userIds.required(),
    }),
  },

  // DELETE /workspaces/:id/users
  removeUsers: {
    params: Joi.object({
      id: id.required(),
    }),
    body: Joi.object({
      userIds: userIds.required(),
    }),
  },

  // PATCH /workspaces/:id/ready-status
  updateReadyStatus: {
    params: Joi.object({
      id: id.required(),
    }),
    body: Joi.object({
      isReady: Joi.boolean().required(),
    }),
  },
};

module.exports = {
  schemas,
};
