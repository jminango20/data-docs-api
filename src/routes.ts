import express, { Request, Response } from 'express';
import { 
  addDocument, 
  removeDocuments,
  updateDocuments, 
  searchDocument,
  searchByAssetId,
  searchByTxHash
} from './controllers/document/documentBase';
import { prefixAPI } from './config';

// Middlewares
import { securityHeaders, rateLimiter } from './middlewares/security';
import { 
  validateAddDocument,
  validateDeleteDocuments,
  validateSearchDocument,
  validateUpdateDocuments,
  validateSearchByAssetId,
  validateSearchByTxHash
} from './middlewares/validation';

const routes = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     description: Verifica se o servidor está rodando
 *     responses:
 *       200:
 *         description: Servidor está OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: data-docs-api
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
routes.get(`${prefixAPI}/health`, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'data-docs-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @openapi
 * /addDocument:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Adiciona documentos
 *     description: Insere um ou múltiplos documentos no Cassandra
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Document'
 *     responses:
 *       200:
 *         description: Documentos criados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docsCreatedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["uuid-1", "uuid-2"]
 *                 message:
 *                   type: string
 *                   example: "2 document(s) created successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
routes.post(
  `${prefixAPI}/addDocument`,
  rateLimiter,
  validateAddDocument,
  addDocument
);

/**
 * @openapi
 * /deleteDocuments:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Remove documentos
 *     description: Deleta um ou múltiplos documentos do Cassandra
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - docsId
 *             properties:
 *               docsId:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["uuid-1", "uuid-2"]
 *     responses:
 *       200:
 *         description: Documentos deletados com sucesso
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
routes.post(
  `${prefixAPI}/deleteDocuments`,
  rateLimiter,
  validateDeleteDocuments,
  removeDocuments
);

/**
 * @openapi
 * /searchByIdDocument:
 *   post:
 *     tags:
 *       - Search
 *     summary: Busca documento por ID
 *     description: Retorna um documento específico pelo seu UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idDocument
 *             properties:
 *               idDocument:
 *                 type: string
 *                 example: "4a2d61f5-997b-4fe0-9eca-0b0f8e69a5d2"
 *     responses:
 *       200:
 *         description: Documento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
routes.post(
  `${prefixAPI}/searchByIdDocument`,
  rateLimiter,
  validateSearchDocument,
  searchDocument
);

/**
 * @openapi
 * /updateDocuments:
 *   patch:
 *     tags:
 *       - Documents
 *     summary: Atualiza documentos
 *     description: |
 *       Atualiza campos de um ou múltiplos documentos.
 *       Útil para atualizar txHash e blockNumber após confirmação blockchain.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - docsId
 *               - updates
 *             properties:
 *               docsId:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["uuid-1", "uuid-2"]
 *               updates:
 *                 type: object
 *                 properties:
 *                   txHash:
 *                     type: string
 *                   blockNumber:
 *                     type: string
 *                   status:
 *                     type: string
 *                   txStatus:
 *                     type: string
 *                 example:
 *                   txHash: "0xabc123"
 *                   blockNumber: "12345"
 *                   status: "CONFIRMED"
 *     responses:
 *       200:
 *         description: Documentos atualizados
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
routes.patch(
  `${prefixAPI}/updateDocuments`,
  rateLimiter,
  validateUpdateDocuments,
  updateDocuments
);

/**
 * @openapi
 * /searchByAssetId:
 *   post:
 *     tags:
 *       - Search
 *     summary: Busca por Asset ID
 *     description: |
 *       Busca documentos por ID do asset (único ou múltiplos)
 *       
 *       **Modo Singular (com paginação):**
 *       - Busca 1 asset
 *       - Suporta paginação
 *       - Ideal para assets com muitos documentos
 *       
 *       **Modo Array (sem paginação):**
 *       - Busca até 50 assets
 *       - Queries paralelas
 *       - Sem paginação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idAsset:
 *                 type: string
 *                 description: ID único do asset (com paginação)
 *                 example: "0xabc123"
 *               idAssets:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 50
 *                 description: Array de IDs (máximo 50)
 *                 example: ["0xabc123", "0xdef456"]
 *               pageSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 100
 *                 description: Resultados por página (só para singular)
 *               pageState:
 *                 type: string
 *                 description: Token da página anterior (só para singular)
 *     responses:
 *       200:
 *         description: Documentos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
routes.post(
  `${prefixAPI}/searchByAssetId`,
  rateLimiter,
  validateSearchByAssetId,
  searchByAssetId
);

/**
 * @openapi
 * /searchByTxHash:
 *   post:
 *     tags:
 *       - Search
 *     summary: Busca por Transaction Hash
 *     description: |
 *       Busca documentos por hash de transação blockchain (único ou múltiplos)
 *       
 *       Funciona igual ao searchByAssetId:
 *       - Singular: com paginação
 *       - Array: até 50 hashes, sem paginação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               txHash:
 *                 type: string
 *                 example: "0xtxhash123"
 *               txHashes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 50
 *                 example: ["0xtxhash123", "0xtxhash456"]
 *               pageSize:
 *                 type: integer
 *                 default: 100
 *               pageState:
 *                 type: string
 *     responses:
 *       200:
 *         description: Documentos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
routes.post(
  `${prefixAPI}/searchByTxHash`,
  rateLimiter,
  validateSearchByTxHash,
  searchByTxHash
);

export default routes;