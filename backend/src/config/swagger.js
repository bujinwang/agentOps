const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Real Estate CRM API',
    version: '1.0.0',
    description: 'A comprehensive API for managing real estate leads, clients, and properties',
    contact: {
      name: 'Real Estate CRM Team',
      email: 'support@realestatecrm.com',
      url: 'https://realestatecrm.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.realestatecrm.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Error status'
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message'
              },
              code: {
                type: 'string',
                description: 'Error code'
              },
              details: {
                type: 'array',
                items: {
                  type: 'object'
                }
              },
              timestamp: {
                type: 'string',
                format: 'date-time'
              }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          user_id: {
            type: 'integer',
            description: 'User ID'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          firstName: {
            type: 'string',
            description: 'First name'
          },
          lastName: {
            type: 'string',
            description: 'Last name'
          },
          phone: {
            type: 'string',
            description: 'Phone number'
          },
          role: {
            type: 'string',
            enum: ['admin', 'agent', 'user'],
            description: 'User role'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation date'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update date'
          }
        }
      },
      Lead: {
        type: 'object',
        properties: {
          lead_id: {
            type: 'integer',
            description: 'Lead ID'
          },
          firstName: {
            type: 'string',
            description: 'First name'
          },
          lastName: {
            type: 'string',
            description: 'Last name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address'
          },
          phone: {
            type: 'string',
            description: 'Phone number'
          },
          status: {
            type: 'string',
            enum: ['New', 'Contacted', 'Qualified', 'Showing Scheduled', 'Offer Made', 'Closed Won', 'Closed Lost', 'Archived'],
            description: 'Lead status'
          },
          priority: {
            type: 'string',
            enum: ['High', 'Medium', 'Low'],
            description: 'Lead priority'
          },
          propertyType: {
            type: 'string',
            enum: ['Condo', 'House', 'Townhouse', 'Land', 'Commercial', 'Multi-Family'],
            description: 'Property type'
          },
          source: {
            type: 'string',
            enum: ['Website Form', 'Facebook Ad', 'Google Ad', 'Referral', 'Walk-in', 'Phone Call', 'Email', 'Social Media', 'Manual Entry'],
            description: 'Lead source'
          },
          budgetMin: {
            type: 'number',
            format: 'float',
            description: 'Minimum budget'
          },
          budgetMax: {
            type: 'number',
            format: 'float',
            description: 'Maximum budget'
          },
          notes: {
            type: 'string',
            description: 'Additional notes'
          },
          assignedTo: {
            type: 'integer',
            description: 'User ID assigned to this lead'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Lead creation date'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update date'
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Success message'
          },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'JWT access token'
              },
              refreshToken: {
                type: 'string',
                description: 'JWT refresh token'
              },
              user: {
                $ref: '#/components/schemas/User'
              }
            }
          }
        }
      },
      PaginationResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object'
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                description: 'Current page'
              },
              limit: {
                type: 'integer',
                description: 'Items per page'
              },
              total: {
                type: 'integer',
                description: 'Total items'
              },
              totalPages: {
                type: 'integer',
                description: 'Total pages'
              },
              hasNext: {
                type: 'boolean',
                description: 'Has next page'
              },
              hasPrev: {
                type: 'boolean',
                description: 'Has previous page'
              }
            }
          }
        }
      }
    },
    responses: {
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      403: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      404: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      500: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'] // Path to the API routes
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerDefinition);

// Serve swagger docs
const swaggerDocs = (app, port) => {
  // Serve swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Real Estate CRM API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  // Serve swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`📚 API Documentation available at http://localhost:${port}/api-docs`);
};

module.exports = {
  swaggerSpec,
  swaggerDocs
};