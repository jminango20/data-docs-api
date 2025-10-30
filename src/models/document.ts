export interface Document {
  idDocument?: string; // UUID gerado pelo Cassandra
  idAsset: string;
  assetIdBlockchain?: string;
  idEvaluation?: string;
  
  // Asset data
  amount?: number;
  initAmount?: number;
  owner: string;
  operation: string;
  status?: string;
  idLocal?: string;
  idExternal?: string[];
  
  // Owner data
  idOwner?: string;
  extIdOwner?: string;
  orgOwner?: string;
  orgTarget?: string;
  orgOrigin?: string;
  
  // Process data (tripla)
  processId: string;
  natureId: string;
  stageId: string;
  
  // JSON data
  data: object[];
  dataHash: string;
  
  // Relationships
  groupedBy?: string[];
  groupedAssets?: string[];
  
  // Partially Consume
  targetPerson?: string;
  targetLocal?: string;
  quantityMoved?: number;
  extTargetPerson?: string;
  extTargetLocal?: string;
  extNewAssetId?: string;
  
  // Blockchain
  channelName: string;
  txHash: string;
  blockNumber: string;
  
  // Timestamps
  timestamp: Date;
  createdAt?: Date;
}

export interface AddDocumentRequest {
  documents: Document[];
}

export interface AddDocumentResponse {
  docsCreatedIds: string[];
  message: string;
}