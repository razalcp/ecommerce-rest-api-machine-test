import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import type { SwaggerUiOptions } from 'swagger-ui-express';
import { env } from './env';

type SwaggerOptions = NonNullable<Parameters<typeof swaggerJSDoc>[0]>;
type SwaggerDefinition = NonNullable<SwaggerOptions['definition']>;

const routeFileExtension = path.extname(__filename).replace('.', '') || 'js';
const modulesPath = path.resolve(__dirname, '../modules').replace(/\\/g, '/');

const definition: SwaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'E-commerce REST API',
    description:
      'A modular, layered REST API for an e-commerce platform. It provides health checks, customer registration and login, JWT access tokens, opaque refresh tokens, refresh-token rotation, logout, authenticated profile access, admin user management, public category browsing, admin category management, and admin product management.',
    version: '1.0.0',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/api/v1`,
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service availability',
    },
    {
      name: 'Auth',
      description: 'Registration, login, token refresh, and logout',
    },
    {
      name: 'Users',
      description: 'Authenticated profile access and admin user management',
    },
    {
      name: 'Categories',
      description: 'Public category browsing and admin category management',
    },
    {
      name: 'Products',
      description: 'Admin product management',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Enter a valid JWT access token. Public authentication and category-read endpoints do not require an existing access token.',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Operation successful',
          },
          data: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'message', 'error'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Readable error message',
          },
          error: {
            type: 'object',
            required: ['code'],
            properties: {
              code: {
                type: 'string',
                example: 'ERROR_CODE',
              },
            },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'E-commerce API is running',
          },
          data: {
            type: 'object',
            required: ['service'],
            properties: {
              service: {
                type: 'string',
                example: 'ecommerce-rest-api',
              },
            },
          },
        },
      },
      AuthUser: {
        type: 'object',
        required: ['id', 'fullName', 'email', 'role'],
        properties: {
          id: {
            type: 'string',
            example: '665f1b2c9a1b2c3d4e5f6789',
          },
          fullName: {
            type: 'string',
            example: 'Jane Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'jane@example.com',
          },
          role: {
            type: 'string',
            enum: ['ADMIN', 'CUSTOMER'],
            example: 'CUSTOMER',
          },
        },
      },
      AuthTokens: {
        type: 'object',
        required: [
          'accessToken',
          'refreshToken',
          'tokenType',
          'expiresIn',
          'refreshExpiresIn',
        ],
        properties: {
          accessToken: {
            type: 'string',
            description: 'Short-lived JWT access token.',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            description:
              'Opaque refresh token. Store securely and never expose it in logs.',
            example: '9s7fQ2m1Xk4p...',
          },
          tokenType: {
            type: 'string',
            enum: ['Bearer'],
            example: 'Bearer',
          },
          expiresIn: {
            type: 'integer',
            description: 'Access-token lifetime in seconds.',
            example: 900,
          },
          refreshExpiresIn: {
            type: 'integer',
            description: 'Refresh-token lifetime in seconds.',
            example: 604800,
          },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Authentication successful',
          },
          data: {
            type: 'object',
            required: ['user', 'tokens'],
            properties: {
              user: {
                $ref: '#/components/schemas/AuthUser',
              },
              tokens: {
                $ref: '#/components/schemas/AuthTokens',
              },
            },
          },
        },
      },
      RefreshResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Token refreshed successfully',
          },
          data: {
            type: 'object',
            required: ['tokens'],
            properties: {
              tokens: {
                $ref: '#/components/schemas/AuthTokens',
              },
            },
          },
        },
      },
      LogoutResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Logged out successfully',
          },
          data: {
            type: 'object',
            additionalProperties: false,
            example: {},
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Jane Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'jane@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            description: 'Must not exceed 72 UTF-8 bytes.',
            example: 'StrongPass123',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'jane@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'StrongPass123',
          },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: '9s7fQ2m1Xk4p...',
          },
        },
      },
      UserProfile: {
        type: 'object',
        required: [
          'id',
          'fullName',
          'email',
          'role',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: {
            type: 'string',
            example: '665f1b2c9a1b2c3d4e5f6789',
          },
          fullName: {
            type: 'string',
            example: 'Jane Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'jane@example.com',
          },
          role: {
            type: 'string',
            enum: ['ADMIN', 'CUSTOMER'],
            example: 'CUSTOMER',
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-01-01T10:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-01-01T10:00:00.000Z',
          },
        },
      },
      UserProfileResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Profile retrieved successfully',
          },
          data: {
            $ref: '#/components/schemas/UserProfile',
          },
        },
      },
      UserListResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Users retrieved successfully',
          },
          data: {
            type: 'object',
            required: ['users', 'pagination'],
            properties: {
              users: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/UserProfile',
                },
              },
              pagination: {
                type: 'object',
                required: ['page', 'limit', 'total', 'totalPages'],
                properties: {
                  page: {
                    type: 'integer',
                    example: 1,
                  },
                  limit: {
                    type: 'integer',
                    example: 10,
                  },
                  total: {
                    type: 'integer',
                    example: 42,
                  },
                  totalPages: {
                    type: 'integer',
                    example: 5,
                  },
                },
              },
            },
          },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        required: ['fullName'],
        properties: {
          fullName: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Jane Smith',
          },
        },
      },
      UpdateUserStatusRequest: {
        type: 'object',
        required: ['isActive'],
        properties: {
          isActive: {
            type: 'boolean',
            example: false,
          },
        },
      },
      Category: {
        type: 'object',
        required: ['id', 'name', 'parentId', 'ancestors', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            example: '665f1b2c9a1b2c3d4e5f6789',
          },
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Electronics',
          },
          parentId: {
            type: 'string',
            nullable: true,
            pattern: '^[a-fA-F0-9]{24}$',
            description: 'Parent category ID, or null for a root category.',
            example: null,
          },
          ancestors: {
            type: 'array',
            description:
              'Ancestor category IDs ordered from root to immediate parent.',
            items: {
              type: 'string',
              pattern: '^[a-fA-F0-9]{24}$',
              example: '665f1b2c9a1b2c3d4e5f6789',
            },
            example: [],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-01-01T10:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-01-01T10:00:00.000Z',
          },
        },
      },
      CategoryResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Category retrieved successfully',
          },
          data: {
            $ref: '#/components/schemas/Category',
          },
        },
      },
      CategoryListResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Categories retrieved successfully',
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Category',
            },
          },
        },
      },
      CategoryTreeNode: {
        type: 'object',
        required: ['id', 'name', 'parentId', 'children'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            example: '665f1b2c9a1b2c3d4e5f6789',
          },
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Electronics',
          },
          parentId: {
            type: 'string',
            nullable: true,
            pattern: '^[a-fA-F0-9]{24}$',
            description: 'Parent category ID, or null for a root category.',
            example: null,
          },
          children: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CategoryTreeNode',
            },
          },
        },
      },
      CategoryTreeResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Category hierarchy retrieved successfully',
          },
          data: {
            type: 'object',
            required: ['categories'],
            properties: {
              categories: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/CategoryTreeNode',
                },
              },
            },
          },
        },
      },
      CreateCategoryRequest: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Electronics',
          },
          parentId: {
            type: 'string',
            nullable: true,
            pattern: '^[a-fA-F0-9]{24}$',
            description:
              'Existing parent category ID. Omit or set to null to create a root category.',
            example: null,
          },
        },
      },
      UpdateCategoryRequest: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Consumer Electronics',
          },
          parentId: {
            type: 'string',
            nullable: true,
            pattern: '^[a-fA-F0-9]{24}$',
            description:
              'Existing parent category ID. Set to null to move the category to the root. Omit to keep the current parent.',
            example: null,
          },
        },
      },
      Product: {
        type: 'object',
        required: [
          'id',
          'name',
          'sku',
          'description',
          'price',
          'salePrice',
          'stock',
          'category',
          'status',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            example: '665f1b2c9a1b2c3d4e5f6795',
          },
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 150,
            example: 'Samsung Galaxy S24',
          },
          sku: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            example: 'SAMSUNG-S24',
          },
          description: {
            type: 'string',
            maxLength: 2000,
            example: 'Samsung smartphone',
          },
          price: {
            type: 'number',
            format: 'double',
            description: 'Regular product price in INR.',
            example: 79999.99,
          },
          salePrice: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Discounted sale price in INR, or null when not on sale.',
            example: 74999.99,
          },
          stock: {
            type: 'integer',
            minimum: 0,
            example: 25,
          },
          category: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            description: 'Category MongoDB ObjectId.',
            example: '665f1b2c9a1b2c3d4e5f6789',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE'],
            example: 'ACTIVE',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-11-11T10:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-11-11T10:00:00.000Z',
          },
        },
      },
      ProductResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Product retrieved successfully',
          },
          data: {
            $ref: '#/components/schemas/Product',
          },
        },
      },
      ProductListResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Products retrieved successfully',
          },
          data: {
            type: 'object',
            required: ['products', 'total', 'page', 'limit', 'totalPages'],
            properties: {
              products: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Product',
                },
              },
              total: {
                type: 'integer',
                example: 42,
              },
              page: {
                type: 'integer',
                example: 1,
              },
              limit: {
                type: 'integer',
                example: 10,
              },
              totalPages: {
                type: 'integer',
                example: 5,
              },
            },
          },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['name', 'sku', 'price', 'stock', 'category'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 150,
            example: 'Samsung Galaxy S24',
          },
          sku: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            example: 'SAMSUNG-S24',
          },
          description: {
            type: 'string',
            maxLength: 2000,
            example: 'Samsung smartphone',
          },
          price: {
            type: 'number',
            format: 'double',
            exclusiveMinimum: true,
            minimum: 0,
            description: 'Regular product price in INR with at most two decimal places.',
            example: 79999.99,
          },
          salePrice: {
            type: 'number',
            format: 'double',
            nullable: true,
            exclusiveMinimum: true,
            minimum: 0,
            description:
              'Optional sale price in INR. Must not exceed price. Omit or set to null when not on sale.',
            example: 74999.99,
          },
          stock: {
            type: 'integer',
            minimum: 0,
            example: 25,
          },
          category: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            description: 'Existing category MongoDB ObjectId.',
            example: '665f1b2c9a1b2c3d4e5f6789',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE'],
            default: 'ACTIVE',
            example: 'ACTIVE',
          },
        },
      },
      UpdateProductRequest: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 150,
            example: 'Samsung Galaxy S24 Ultra',
          },
          sku: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            example: 'SAMSUNG-S24-ULTRA',
          },
          description: {
            type: 'string',
            maxLength: 2000,
            example: 'Samsung flagship smartphone',
          },
          price: {
            type: 'number',
            format: 'double',
            exclusiveMinimum: true,
            minimum: 0,
            description: 'Regular product price in INR with at most two decimal places.',
            example: 78999.99,
          },
          salePrice: {
            type: 'number',
            format: 'double',
            nullable: true,
            exclusiveMinimum: true,
            minimum: 0,
            description:
              'Sale price in INR. Set to null to clear it. Omit to keep the current value.',
            example: null,
          },
          stock: {
            type: 'integer',
            minimum: 0,
            example: 30,
          },
          category: {
            type: 'string',
            pattern: '^[a-fA-F0-9]{24}$',
            description: 'Existing category MongoDB ObjectId.',
            example: '665f1b2c9a1b2c3d4e5f6790',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE'],
            example: 'INACTIVE',
          },
        },
      },
    },
  },
};

const options: SwaggerOptions = {
  definition,
  apis: [`${modulesPath}/**/*.routes.${routeFileExtension}`],
};

export const swaggerSpec = swaggerJSDoc(options) as Record<string, unknown>;

export const swaggerUiOptions: SwaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'E-commerce REST API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
};
