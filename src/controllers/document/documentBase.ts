import { Request, Response } from 'express';
import { 
  insertDocument, 
  deleteDocument, 
  updateDocument,
  searchByDocumentId,
  searchByAssetId as searchByAssetIdDb,   
  searchByTxHash as searchByTxHashDb      
} from '../../dbManager/cassandraClient';
import logger from '../../utils/logger';
import { 
  Document,
  AddDocumentRequest,
  AddDocumentResponse,
  DeleteDocumentsRequest,
  DeleteDocumentsResponse,
  SearchDocumentRequest,
  UpdateDocumentsRequest,
  UpdateDocumentsResponse,
  SearchByAssetIdRequest,
  SearchByTxHashRequest,
  SearchResponse
} from '../../models/document';

/**
 * Adiciona documentos no Cassandra
 * 
 * POST /addDocument
 * Body: { documents: Document[] }
 * 
 * Implementa rollback automático em caso de erro
 */
export const addDocument = async (
  req: Request<{}, AddDocumentResponse, AddDocumentRequest>,
  res: Response<AddDocumentResponse | { code: number; message: string }>
) => {
  const createdDocIds: string[] = [];
  
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'Documents array is required and must not be empty',
      });
    }
    
    logger.info(`Recebidos ${documents.length} documento(s) para inserir`);
    
    // Processar cada documento
    for (const doc of documents) {
      const treatedDoc = await treatDocument(doc);
      await insertDocument(treatedDoc);
      createdDocIds.push(treatedDoc.idDocument.toString());
      
      logger.info(`Documento inserido: ${treatedDoc.idDocument}`);
    }
    
    return res.status(200).json({
      docsCreatedIds: createdDocIds,
      message: `${createdDocIds.length} document(s) created successfully`,
    });
    
  } catch (error: any) {
    logger.error(`Erro em addDocument: ${error.message}`);
    
    // ROLLBACK: remover documentos criados
    if (createdDocIds.length > 0) {
      logger.warn(`Executando rollback de ${createdDocIds.length} documento(s)`);
      for (const id of createdDocIds) {
        try {
          await deleteDocument(id);
          logger.info(`Documento ${id} removido no rollback`);
        } catch (rollbackError: any) {
          logger.error(`Falha no rollback do documento ${id}: ${rollbackError.message}`);
        }
      }
    }
    
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error creating documents',
    });
  }
};

/**
 * Remove múltiplos documentos do Cassandra
 * 
 * POST /deleteDocuments
 * Body: { docsId: string[] }
 * 
 * Retorna erro se algum documento não for encontrado
 */
export const removeDocuments = async (
  req: Request<{}, DeleteDocumentsResponse, DeleteDocumentsRequest>,
  res: Response<DeleteDocumentsResponse | { code: number; message: string }>
) => {
  try {
    const { docsId } = req.body;
    
    if (!docsId || !Array.isArray(docsId)) {
      return res.status(400).json({
        code: 400,
        message: 'docsId array is required and must not be empty',
      });
    }
    
    logger.info(`Removendo ${docsId.length} documento(s)`);
    
    // Verifica existência e remove cada documento
    for (const id of docsId) {
      const doc = await searchByDocumentId(id);
      
      if (doc.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: `Document ${id} not found`,
        });
      }
      
      await deleteDocument(id);
      logger.info(`Documento ${id} removido`);
    }
    
    return res.status(200).json({
      removedDocuments: docsId.length,
      message: `${docsId.length} document(s) deleted successfully`,
    });
    
  } catch (error: any) {
    logger.error(`Erro em removeDocuments: ${error.message}`);
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error deleting documents',
    });
  }
};

/**
 * Busca documento por ID único
 * 
 * POST /searchByIdDocument
 * Body: { idDocument: string }
 */
export const searchDocument = async (
  req: Request<{}, Document[], SearchDocumentRequest>,
  res: Response<Document[] | { code: number; message: string }>
) => {
  try {
    const { idDocument } = req.body;
    
    if (!idDocument) {
      return res.status(400).json({
        code: 400,
        message: 'idDocument is required and must not be empty',
      });
    }
    
    const result = await searchByDocumentId(idDocument);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Document not found',
      });
    }
    
    return res.status(200).json(result.rows);
    
  } catch (error: any) {
    logger.error(`Erro em searchDocument: ${error.message}`);
    
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error searching document',
    });
  }
};


/**
 * Atualiza campos de múltiplos documentos
 * 
 * PATCH /updateDocuments
 * Body: { 
 *   docsId: string[], 
 *   updates: { txHash?, blockNumber?, status? } 
 * }
 * 
 * Retorna erro se algum documento não for encontrado
 */export const updateDocuments = async (
  req: Request<{}, UpdateDocumentsResponse, UpdateDocumentsRequest>,
  res: Response<UpdateDocumentsResponse | { code: number; message: string }>
) => {
  try {
    const { docsId, updates } = req.body;
    
    // Valida docsId
    if (!docsId || !Array.isArray(docsId) || docsId.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'docsId array is required and must not be empty',
      });
    }
    
    // Valida updates
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'updates object is required and must not be empty',
      });
    }
    
    logger.info(`Atualizando ${docsId.length} documento(s) - Campos: ${Object.keys(updates).join(', ')}`);
    
    // Atualiza cada documento
    for (const id of docsId) {
      const doc = await searchByDocumentId(id);
      
      if (doc.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: `Document ${id} not found`,
        });
      }
      
      // Atualizar
      await updateDocument(id, updates);
      logger.info(`Documento ${id} atualizado`);
    }
    
    return res.status(200).json({
      updatedDocuments: docsId.length,
      message: `${docsId.length} document(s) updated successfully`,
    });
    
  } catch (error: any) {
    logger.error(`Error in updateDocuments: ${error.message}`);
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error updating documents',
    });
  }
};

/**
 * Prepara documento para inserção no Cassandra
 * 
 * Converte campos complexos (data, idExternal, groupedBy, groupedAssets) 
 * para JSON string conforme schema do Cassandra
 */
const treatDocument = async (document: Document): Promise<any> => {
  return {
    ...document,
    timestamp: new Date(document.timestamp),
    data: JSON.stringify(document.data),
    idExternal: document.idExternal ? JSON.stringify(document.idExternal) : null,
    groupedBy: document.groupedBy ? JSON.stringify(document.groupedBy) : null,
    groupedAssets: document.groupedAssets ? JSON.stringify(document.groupedAssets) : null,
  };
};

/**
 * Busca documentos por ID do asset
 * 
 * POST /searchByAssetId
 * 
 * Busca única com paginação:
 * Body: { 
 *   idAsset: string, 
 *   pageSize?: number,    // Padrão: 100
 *   pageState?: string    // Token para próxima página
 * }
 * 
 * Busca múltipla sem paginação (máximo 50):
 * Body: { idAssets: string[] }
 */
export const searchByAssetId = async (
  req: Request<{}, SearchResponse, SearchByAssetIdRequest>,
  res: Response<SearchResponse | { code: number; message: string }>
) => {
  try {
    const { idAsset, idAssets, pageSize, pageState } = req.body;
    
    // Aceita busca única ou múltipla
    const searchValue = idAssets || idAsset;
    
    if (!searchValue) {
      return res.status(400).json({
        code: 400,
        message: 'idAsset or idAssets is required',
      });
    }
    
    // Paginação só funciona para busca única
    const options = (pageSize || pageState) ? { pageSize, pageState } : undefined;
    
    const result = await searchByAssetIdDb(searchValue, options);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'No documents found',
      });
    }
    
    // Monta resposta com metadados de paginação
    const response: any = {
      count: result.rows.length,
      documents: result.rows
    };
    
    // Adiciona info de paginação se houver próxima página
    if (result.pageState) {
      response.pagination = {
        pageState: result.pageState,
        hasMore: true,
        pageSize: pageSize || 100
      };
    }
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    logger.error(`Erro em searchByAssetId: ${error.message}`);
    
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error searching documents',
    });
  }
};

/**
 * Busca documentos por hash da transação blockchain
 * 
 * POST /searchByTxHash
 * 
 * Busca única com paginação:
 * Body: { 
 *   txHash: string, 
 *   pageSize?: number, 
 *   pageState?: string 
 * }
 * 
 * Busca múltipla sem paginação (máximo 50):
 * Body: { txHashes: string[] }
 */
export const searchByTxHash = async (
  req: Request<{}, SearchResponse, SearchByTxHashRequest>,
  res: Response<SearchResponse | { code: number; message: string }>
) => {
  try {
    const { txHash, txHashes, pageSize, pageState } = req.body;
    
    // Aceita busca única ou múltipla
    const searchValue = txHashes || txHash;
    
    if (!searchValue) {
      return res.status(400).json({
        code: 400,
        message: 'txHash or txHashes is required',
      });
    }
    
    /// Paginação só funciona para busca única
    const options = (pageSize || pageState) ? { pageSize, pageState } : undefined;
    
    const result = await searchByTxHashDb(searchValue, options);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'No documents found',
      });
    }
    
    // Monta resposta com metadados de paginação
    const response: any = {
      count: result.rows.length,
      documents: result.rows
    };
    
    // Adiciona info de paginação se houver próxima página
    if (result.pageState) {
      response.pagination = {
        pageState: result.pageState,
        hasMore: true,
        pageSize: pageSize || 100
      };
    }
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    logger.error(`Error in searchByTxHash: ${error.message}`);
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error searching documents',
    });
  }
};