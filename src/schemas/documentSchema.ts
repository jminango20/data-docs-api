import Joi from 'joi';

/**
 * SCHEMA BASE: Document
 * 
 * Define estrutura completa de um documento
 * Usado em: addDocument, validações, Swagger
 */
export const documentSchema = Joi.object({

  // ========== CAMPOS OBRIGATÓRIOS ==========
  idAsset: Joi.string().required()
    .description('Asset ID in blockchain'),
  
  owner: Joi.string().required()
    .description('Wallet address'),
  
  operation: Joi.string().required()
    .description('Operation type: CREATE, TRANSFER, etc'),
  
  processId: Joi.string().required()
    .description('Processo ID'),
  
  natureId: Joi.string().required()
    .description('Nature ID'),
  
  stageId: Joi.string().required()
    .description('Stage ID'),
  
  data: Joi.array().items(Joi.object()).required()
    .description('Array de dados'),
  
  dataHash: Joi.string().required()
    .description('Data hash for integrity check'),
  
  channelName: Joi.string().required()
    .description('Channel name in blockchain'),
  
  timestamp: Joi.date().iso().required()
    .description('Operation timestamp'),
  
  // ========== CAMPOS OPCIONAIS ==========
  idDocument: Joi.string().optional()
    .description('Document UUID (Generated automatically)'),
  
  assetIdBlockchain: Joi.string().optional()
    .description('Asset ID in blockchain'),
  
  idEvaluation: Joi.string().optional()
    .description('Evaluation ID'),
  
  amount: Joi.number().optional()
    .description('Quantity'),
  
  initAmount: Joi.number().optional()
    .description('Initial quantity'),
  
  status: Joi.string().optional()
    .description('Asset status: ACTIVE, INACTIVE'),
  
  txStatus: Joi.string().optional()
    .description('Transaction blockchain status: PENDING, CONFIRMED'),
  
  idLocal: Joi.string().optional()
    .description('Asset localization ID'),
  
  idExternal: Joi.array().items(Joi.string()).optional()
    .description('Relationships with external IDs'),
  
  // Owner data
  idOwner: Joi.string().optional(),
  extIdOwner: Joi.string().optional(),
  orgOwner: Joi.string().optional(),
  orgTarget: Joi.string().optional(),
  orgOrigin: Joi.string().optional(),
  
  // Relationships
  groupedBy: Joi.array().items(Joi.string()).optional()
    .description('Asset ID that groups assets'),
  
  groupedAssets: Joi.array().items(Joi.string()).optional()
    .description('Asset IDs that are grouped'),
  
  // Partially Consume
  targetPerson: Joi.string().optional(),
  targetLocal: Joi.string().optional(),
  quantityMoved: Joi.number().optional(),
  extTargetPerson: Joi.string().optional(),
  extTargetLocal: Joi.string().optional(),
  extNewAssetId: Joi.string().optional(),
  
  // Blockchain
  txHash: Joi.string().allow('').optional()
    .description('Transaction hash in blockchain'),
  
  blockNumber: Joi.string().allow('').optional()
    .description('Block number in blockchain'),
  
  createdAt: Joi.date().optional()
    .description('Datetime of creation'),
});

/**
 * SCHEMA: POST /addDocument
 */
export const addDocumentSchema = Joi.object({
  documents: Joi.array().items(documentSchema).min(1).required()
    .description('Document array to be added')
});

/**
 * SCHEMA: POST /deleteDocuments
 */
export const deleteDocumentsSchema = Joi.object({
  docsId: Joi.array().items(Joi.string()).min(1).required()
    .description('Document array UUID to be deleted')
});

/**
 * SCHEMA: POST /searchByIdDocument
 */
export const searchByIdDocumentSchema = Joi.object({
  idDocument: Joi.string().required()
    .description('Document UUID to be searched')
});

/**
 * SCHEMA: PATCH /updateDocuments
 */
export const updateDocumentsSchema = Joi.object({
  docsId: Joi.array().items(Joi.string()).min(1).required()
    .description('Document array UUID to be updated'),
  
  updates: Joi.object({
    txHash: Joi.string().optional(),
    blockNumber: Joi.string().optional(),
    status: Joi.string().optional(),
    txStatus: Joi.string().optional(),
    amount: Joi.number().optional(),
    idLocal: Joi.string().optional(),
    dataHash: Joi.string().optional(),
  }).min(1).required()
    .description('Fields to be updated')
});

/**
 * SCHEMA: POST /searchByAssetId
 */
export const searchByAssetIdSchema = Joi.object({
  // Singular (com paginação)
  idAsset: Joi.string().optional()
    .description('Asset ID'),
  
  // Array (sem paginação, máx 50)
  idAssets: Joi.array().items(Joi.string()).min(1).max(50).optional()
    .description('Asset IDs (maximum 50)'),
  
  // Paginação (apenas para singular)
  pageSize: Joi.number().integer().min(1).max(1000).optional()
    .description('Results per page (default 100)'),
  
  pageState: Joi.string().optional()
    .description('Token of the previous page (default null)')
}).or('idAsset', 'idAssets');

/**
 * SCHEMA: POST /searchByTxHash
 */
export const searchByTxHashSchema = Joi.object({
  // Singular (com paginação)
  txHash: Joi.string().optional()
    .description('Transaction hash'),
  
  // Array (sem paginação, máx 50)
  txHashes: Joi.array().items(Joi.string()).min(1).max(50).optional()
    .description('Transaction hashes (maximum 50)'),
  
  // Paginação (apenas para singular)
  pageSize: Joi.number().integer().min(1).max(1000).optional()
    .description('Results per page (default 100)',),
  
  pageState: Joi.string().optional()
    .description('Token of the previous page (default null)')
}).or('txHash', 'txHashes');