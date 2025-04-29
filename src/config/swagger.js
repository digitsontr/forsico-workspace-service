const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Workspace Service API',
      version: '1.0.0',
      description: 'API documentation for the Workspace Service',
    },
    servers: [
      {
        url: '/api',
        description: 'API server',
      },
    ],
    components: {
      schemas: {
        WorkspaceProgressState: {
          type: 'string',
          enum: ['INITIAL', 'WAITING_TASKS', 'TASKS_CREATED', 'COMPLETE'],
        },
        Workspace: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the workspace',
            },
            name: {
              type: 'string',
              description: 'Name of the workspace',
            },
            description: {
              type: 'string',
              description: 'Description of the workspace',
            },
            boards: {
              type: 'array',
              items: {
                type: 'string',
                description: '.NET GUID',
              },
            },
            members: {
              type: 'array',
              items: {
                type: 'string',
                description: '.NET GUID of workspace members',
              },
            },
            owner: {
              type: 'array',
              items: {
                type: 'string',
                description: '.NET GUID of workspace owners',
              },
            },
            subscriptionId: {
              type: 'string',
              description: 'ID of the associated subscription',
            },
            progress: {
              type: 'object',
              properties: {
                state: {
                  $ref: '#/components/schemas/WorkspaceProgressState',
                },
                lastUpdated: {
                  type: 'string',
                  format: 'date-time',
                },
                history: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      state: {
                        type: 'string',
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                      },
                    },
                  },
                },
              },
            },
            isDeleted: {
              type: 'boolean',
              description: 'Soft delete flag',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of deletion',
            },
            deletionId: {
              type: 'string',
              description: 'Unique identifier for the deletion',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
          },
        },
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs; 