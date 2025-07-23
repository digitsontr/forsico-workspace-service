const express = require('express');
const workspaceController = require('../controllers/workspace.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validateSubscription = require('../middleware/subscription.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const validate = require('../middleware/validation.middleware');
const workspaceValidation = require('../validations/workspace.validation');

const router = express.Router();

/**
 * @swagger
 * /workspaces:
 *   get:
 *     summary: Get all workspaces
 *     description: Retrieve a list of all workspaces the user has access to
 *     tags: [Workspaces]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: includeSoftDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft deleted workspaces
 *       - in: query
 *         name: subscriptionId
 *         schema:
 *           type: string
 *         description: Filter by subscription ID
 *     responses:
 *       200:
 *         description: List of workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/',
  requireAuth,
  validate(workspaceValidation.schemas.getAll),
  validateSubscription(),
  requirePermission('WORKSPACE.VIEW', 'workspace'),
  workspaceController.getAll
);

/**
 * @swagger
 * /workspaces/my:
 *   get:
 *     summary: Get user's workspaces
 *     description: Retrieve all workspaces where the user is a member or owner
 *     tags: [Workspaces]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of user's workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/my',
  requireAuth,
  validate(workspaceValidation.getMyWorkspaces),
  validateSubscription(),
  workspaceController.getMyWorkspaces
);

/**
 * @swagger
 * /workspaces/{id}:
 *   get:
 *     summary: Get workspace by ID
 *     description: Retrieve a workspace by its ID
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id',
  requireAuth,
  validate(workspaceValidation.getById),
  validateSubscription(),
  requirePermission('WORKSPACE.VIEW', 'workspace'),
  workspaceController.getById
);

/**
 * @swagger
 * /workspaces:
 *   post:
 *     summary: Create a new workspace
 *     description: Create a new workspace with the given details
 *     tags: [Workspaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subscriptionId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               subscriptionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 */
router.post('/',
  requireAuth,
  validate(workspaceValidation.schemas.create),
  validateSubscription(),
  requirePermission('SUBSCRIPTION.WORKSPACES.CREATE', 'subscription'),
  workspaceController.createWorkspace
);

/**
 * @swagger
 * /workspaces/{id}/users:
 *   post:
 *     summary: Add users to workspace
 *     description: Add one or more users to a workspace
 *     tags: [Workspace Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Users added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 */
router.post('/:id/users',
  requireAuth,
  validate(workspaceValidation.addUsers),
  validateSubscription(),
  requirePermission('WORKSPACE.USERS.MANAGE', 'workspace'),
  workspaceController.addUsers
);

/**
 * @swagger
 * /workspaces/subscription/{subscriptionId}:
 *   get:
 *     summary: Get workspaces by subscription
 *     description: Retrieve all workspaces for a specific subscription
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: includeSoftDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft deleted workspaces
 *     responses:
 *       200:
 *         description: List of workspaces in the subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/subscription/:subscriptionId',
  requireAuth,
  validate(workspaceValidation.getBySubscription),
  validateSubscription(),
  requirePermission('WORKSPACE.VIEW', 'workspace'),
  workspaceController.getBySubscription
);

/**
 * @swagger
 * /workspaces/{id}:
 *   put:
 *     summary: Update workspace
 *     description: Update an existing workspace's details
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id',
  requireAuth,
  validate(workspaceValidation.schemas.update),
  validateSubscription(),
  requirePermission('WORKSPACE.UPDATE', 'workspace'),
  workspaceController.updateWorkspace
);

/**
 * @swagger
 * /workspaces/{id}:
 *   delete:
 *     summary: Delete workspace
 *     description: Soft delete a workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletionId:
 *                   type: string
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id',
  requireAuth,
  validate(workspaceValidation.schemas.delete),
  validateSubscription(),
  requirePermission('WORKSPACE.DELETE', 'workspace'),
  workspaceController.delete
);

/**
 * @swagger
 * /workspaces/{id}/restore:
 *   post:
 *     summary: Restore workspace
 *     description: Restore a soft-deleted workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found or not deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/restore',
  requireAuth,
  validate(workspaceValidation.schemas.restore),
  validateSubscription(),
  requirePermission('WORKSPACE.RESTORE', 'workspace'),
  workspaceController.restore
);

/**
 * @swagger
 * /workspaces/{id}/progress:
 *   patch:
 *     summary: Update workspace progress
 *     description: Update the progress state of a workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - state
 *             properties:
 *               state:
 *                 $ref: '#/components/schemas/WorkspaceProgressState'
 *     responses:
 *       200:
 *         description: Workspace progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/progress',
  requireAuth,
  validate(workspaceValidation.schemas.updateProgress),
  validateSubscription(),
  requirePermission('WORKSPACE.UPDATE_PROGRESS', 'workspace'),
  workspaceController.updateProgress
);

/**
 * @swagger
 * /workspaces/{id}/progress:
 *   get:
 *     summary: Get workspace progress
 *     description: Get the progress state of a workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace progress
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/progress',
  requireAuth,
  validate(workspaceValidation.schemas.getById),
  validateSubscription(),
  requirePermission('WORKSPACE.VIEW', 'workspace'),
  workspaceController.getById
);

/**
 * @swagger
 * /workspaces/{id}/ready-status:
 *   patch:
 *     summary: Update workspace ready status
 *     description: Update the ready status of a workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isReady
 *             properties:
 *               isReady:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Workspace ready status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/ready-status',
  requireAuth,
  validate(workspaceValidation.schemas.updateReadyStatus),
  validateSubscription(),
  requirePermission('WORKSPACE.UPDATE', 'workspace'),
  workspaceController.update
);

/**
 * @swagger
 * /workspaces/{id}/users:
 *   delete:
 *     summary: Remove users from workspace
 *     description: Remove one or more users from a workspace
 *     tags: [Workspace Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to remove
 *     responses:
 *       200:
 *         description: Users removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id/users',
  requireAuth,
  validate(workspaceValidation.schemas.removeUsers),
  validateSubscription(),
  requirePermission('WORKSPACE.USERS.MANAGE', 'workspace'),
  workspaceController.removeUsers
);

module.exports = router; 