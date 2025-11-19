/**
 * Documento de rastreabilidade no Cassandra
 * 
 * Representa uma transação ou operação de asset registrada no blockchain
 * e armazenada no Cassandra para consulta rápida.
 */
export interface Document {
  // ====================================
  // IDENTIFICADORES
  // ====================================
  
  /** UUID único do documento (gerado automaticamente na inserção) */
  idDocument?: string;
  
  /** ID do asset no sistema legado */
  idAsset: string;
  
  /** ID do asset registrado no blockchain */
  assetIdBlockchain?: string;
  
  /** ID da avaliação associada (se aplicável) */
  idEvaluation?: string;
  
  // ====================================
  // DADOS DO ASSET
  // ====================================
  
  /** Quantidade/volume do asset */
  amount?: number;
  
  /** Quantidade inicial do asset (antes de operações) */
  initAmount?: number;
  
  /** Endereço Ethereum do proprietário atual */
  owner: string;
  
  /** Tipo de operação: CREATE_ASSET, UPDATE_ASSET, TRANSFER_ASSET, etc */
  operation: string;
  
  /** Status do asset: ACTIVE | INACTIVE */
  status?: string;
  
  /** Status da transação blockchain: PENDING | CONFIRMED | FAILED */
  txStatus?: string;
  
  /** Identificador local/físico do asset */
  idLocal?: string;
  
  /** IDs externos de sistemas integrados */
  idExternal?: string[];
  
  // ====================================
  // DADOS DE PROPRIEDADE
  // ====================================
  
  /** ID do proprietário no sistema */
  idOwner?: string;
  
  /** ID externo do proprietário */
  extIdOwner?: string;
  
  /** Organização proprietária */
  orgOwner?: string;
  
  /** Organização destino (em transferências) */
  orgTarget?: string;
  
  /** Organização de origem */
  orgOrigin?: string;
  
  // ====================================
  // DADOS DE PROCESSO (TRIPLA)
  // ====================================
  
  /** ID do processo (ex: "PRODUCAO_MEL") */
  processId: string;
  
  /** ID da natureza (ex: "COLHEITA") */
  natureId: string;
  
  /** ID do estágio (ex: "ARMAZENAMENTO") */
  stageId: string;
  
  // ====================================
  // DADOS JSON
  // ====================================
  
  /** Array de objetos com dados customizados da operação */
  data: object[];
  
  /** Hash SHA256 dos dados para verificação de integridade */
  dataHash: string;
  
  // ====================================
  // RELACIONAMENTOS
  // ====================================
  
  /** IDs dos assets que agruparam este asset (para GROUP_ASSET) */
  groupedBy?: string[];
  
  /** IDs dos assets que compõem este grupo (se for asset agrupado) */
  groupedAssets?: string[];
  
  // ====================================
  // CONSUMO PARCIAL
  // ====================================
  
  /** Pessoa destino em operações de consumo parcial */
  targetPerson?: string;
  
  /** Local destino em operações de consumo parcial */
  targetLocal?: string;
  
  /** Quantidade movida em operações de consumo parcial */
  quantityMoved?: number;
  
  /** ID externo da pessoa destino */
  extTargetPerson?: string;
  
  /** ID externo do local destino */
  extTargetLocal?: string;
  
  /** ID do novo asset criado (em operações de split/transform) */
  extNewAssetId?: string;
  
  // ====================================
  // BLOCKCHAIN
  // ====================================
  
  /** Nome do canal Hyperledger Fabric */
  channelName: string;
  
  /** Hash da transação blockchain (0x...) */
  txHash: string;
  
  /** Número do bloco onde a transação foi incluída */
  blockNumber: string;
  
  // ====================================
  // TIMESTAMPS
  // ====================================
  
  /** Data/hora da operação */
  timestamp: Date;
  
  /** Data/hora de criação do documento no Cassandra (gerado automaticamente) */
  createdAt?: Date;
}

/**
 * Request para adicionar documentos no Cassandra
 * 
 * POST /addDocument
 */
export interface AddDocumentRequest {
  /** Array de documentos a serem inseridos */
  documents: Document[];
}

/**
 * Response após inserção de documentos
 */
export interface AddDocumentResponse {
  /** IDs dos documentos criados com sucesso */
  docsCreatedIds: string[];
  
  /** Mensagem de sucesso */
  message: string;
}

/**
 * Request para remover documentos
 * 
 * POST /deleteDocuments
 */
export interface DeleteDocumentsRequest {
  /** IDs dos documentos a serem removidos */
  docsId: string[];
}

/**
 * Response após remoção de documentos
 */
export interface DeleteDocumentsResponse {
  /** Quantidade de documentos removidos */
  removedDocuments: number;
  
  /** Mensagem de sucesso */
  message: string;
}

/**
 * Request para buscar documento por ID
 * 
 * POST /searchByIdDocument
 */
export interface SearchDocumentRequest {
  /** ID do documento a buscar */
  idDocument: string;
}

/**
 * Request para atualizar documentos
 * 
 * PATCH /updateDocuments
 */
export interface UpdateDocumentsRequest {
  /** IDs dos documentos a atualizar */
  docsId: string[];
  
  /** Campos a atualizar e seus novos valores */
  updates: {
    /** Hash da transação blockchain (após confirmação) */
    txHash?: string;
    
    /** Número do bloco (após confirmação) */
    blockNumber?: string;
    
    /** Novo status do asset */
    status?: string;
    
    /** Novo status da transação */
    txStatus?: string;
    
    /** Nova quantidade */
    amount?: number;
    
    /** Novo ID local */
    idLocal?: string;
    
    /** Novo hash dos dados */
    dataHash?: string;
  };
}

/**
 * Response após atualização de documentos
 */
export interface UpdateDocumentsResponse {
  /** Quantidade de documentos atualizados */
  updatedDocuments: number;
  
  /** Mensagem de sucesso */
  message: string;
}

/**
 * Request para buscar por asset ID
 * 
 * POST /searchByAssetId
 */
export interface SearchByAssetIdRequest {
  /** ID único do asset (com paginação) */
  idAsset?: string;
  
  /** Array de IDs (sem paginação, máx 50) */
  idAssets?: string[];
  
  /** Tamanho da página (padrão: 100) - apenas para busca única */
  pageSize?: number;
  
  /** Token para próxima página - apenas para busca única */
  pageState?: string;
}

/**
 * Request para buscar por transaction hash
 * 
 * POST /searchByTxHash
 */
export interface SearchByTxHashRequest {
  /** Hash único (com paginação) */
  txHash?: string;
  
  /** Array de hashes (sem paginação, máx 50) */
  txHashes?: string[];
  
  /** Tamanho da página (padrão: 100) - apenas para busca única */
  pageSize?: number;
  
  /** Token para próxima página - apenas para busca única */
  pageState?: string;
}

/**
 * Response de buscas (por asset ID ou tx hash)
 */
export interface SearchResponse {
  /** Quantidade de documentos retornados */
  count: number;
  
  /** Documentos encontrados */
  documents: Document[];
  
  /** Informações de paginação (se aplicável) */
  pagination?: {
    /** Token para buscar próxima página */
    pageState: string;
    
    /** Indica se há mais resultados */
    hasMore: boolean;
    
    /** Tamanho da página atual */
    pageSize: number;
  };
}

/**
 * Tipos de operação de asset
 */
export enum AssetOperation {
  CREATE_ASSET = 'CREATE_ASSET',
  UPDATE_ASSET = 'UPDATE_ASSET',
  TRANSFER_ASSET = 'TRANSFER_ASSET',
  TRANSFORM_ASSET = 'TRANSFORM_ASSET',
  SPLIT_ASSET = 'SPLIT_ASSET',
  GROUP_ASSET = 'GROUP_ASSET',
  UNGROUP_ASSET = 'UNGROUP_ASSET',
  INACTIVATE_ASSET = 'INACTIVATE_ASSET',
}

/**
 * Status do asset
 */
export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Status da transação blockchain
 */
export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}