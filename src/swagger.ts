import swaggerJsdoc from 'swagger-jsdoc';
import { appPort } from './config';

/**
 * CONFIGURAÇÃO SWAGGER / OPENAPI
 * 
 * Documentação automática da API
 * Acesso: http://localhost:3300/api-docs
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Data Docs API',
      version: '1.0.0',
      description: `
API para persistência de documentos de rastreabilidade em Cassandra.

**Funcionalidades:**
- Gerenciamento de documentos (CRUD)
- Busca por Asset ID
- Busca por Transaction Hash
- Paginação para grandes volumes
- Rate limiting (100 req/15min)

**Tecnologias:**
- Node.js + TypeScript
- Express.js
- Cassandra (Apache)
- Joi (validação)
      `,
      contact: {
        name: 'API Support',
        email: '@cpqd.com.br',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${appPort}`,
        description: 'Development server',
      },
      {
        url: 'https://data-docs-api-production.run.app',
        description: 'Production server (Cloud Run)',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Documents',
        description: 'Document management operations',
      },
      {
        name: 'Search',
        description: 'Search operations with pagination',
      },
    ],
    components: {
      schemas: {
        Document: {
          type: 'object',
          required: ['idAsset', 'owner', 'operation', 'processId', 'natureId', 'stageId', 'data', 'dataHash', 'channelName', 'timestamp'],
          properties: {
            idAsset: {
              type: 'string',
              description: 'Asset ID in blockchain',
              example: '0xabc123456789',
            },
            owner: {
              type: 'string',
              description: 'Wallet address',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            },
            operation: {
              type: 'string',
              description: 'Operation type',
              enum: ['CREATE', 'REGISTER','TRANSFER', 'GROUP', 'UNGROUP', 'SPLIT', 'TRANSFORM', 'INACTIVE'],
              example: 'CREATE',
            },
            processId: {
              type: 'string',
              example: 'process1',
            },
            natureId: {
              type: 'string',
              example: 'nature1',
            },
            stageId: {
              type: 'string',
              example: 'stage1',
            },
            data: {
              type: 'array',
              items: { type: 'object' },
              example: [{ field: 'value', quantity: 100 }],
            },
            dataHash: {
              type: 'string',
              example: '0xhash123456',
            },
            channelName: {
              type: 'string',
              example: 'channel1',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-19T10:00:00Z',
            },
            amount: {
              type: 'number',
              example: 1000,
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              example: 'ACTIVE',
            },
            txHash: {
              type: 'string',
              example: '0xtxhash789456',
            },
            blockNumber: {
              type: 'string',
              example: '12345',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Validation error',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            pageState: {
              type: 'string',
              description: 'Token to retrieve the next page',
              example: 'base64encodedstring...',
            },
            hasMore: {
              type: 'boolean',
              example: true,
            },
            pageSize: {
              type: 'integer',
              example: 100,
            },
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                code: 404,
                message: 'Document not found',
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                code: 500,
                message: 'Internal server error',
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                code: 429,
                message: 'Too many requests from this IP, please try again later.',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes.ts'], // Arquivos onde estão os comentários @openapi
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);