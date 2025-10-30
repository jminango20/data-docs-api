import { Request, Response } from 'express';
import { 
  insertDocument, 
  deleteDocument, 
  updateDocument,
  searchByDocumentId 
} from '../../dbManager/cassandraClient';
import logger from '../../utils/logger';
import { Document } from '../../models/document';

/**
 * POST /addDocument
 * 
 * Recebe documentos do tracker-api e persiste no Cassandra
 */
export const addDocument = async (req: Request, res: Response) => {
  const createdDocIds: string[] = [];
  
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'documents array is required',
      });
    }
    
    logger.info(`Received ${documents.length} document(s) to insert`);
    
    // Processar cada documento
    for (const doc of documents) {
      const treatedDoc = await treatDocument(doc);
      
      // Insert no Cassandra
      const result = await insertDocument(treatedDoc);
      createdDocIds.push(treatedDoc.idDocument.toString());
      
      logger.info(`Document inserted: ${treatedDoc.idDocument}`);
    }
    
    return res.status(200).json({
      docsCreatedIds: createdDocIds,
      message: `${createdDocIds.length} document(s) created successfully`,
    });
    
  } catch (error: any) {
    logger.error(`Error in addDocument: ${error.message}`);
    
    // ROLLBACK: remover documentos criados
    if (createdDocIds.length > 0) {
      logger.warn(`Rolling back ${createdDocIds.length} document(s)`);
      for (const id of createdDocIds) {
        try {
          await deleteDocument(id);
        } catch (rollbackError: any) {
          logger.error(`Failed to rollback document ${id}: ${rollbackError.message}`);
        }
      }
    }
    
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error adding documents',
    });
  }
};

/**
 * POST /deleteDocuments
 */
export const removeDocuments = async (req: Request, res: Response) => {
  try {
    const { docsId } = req.body;
    
    if (!docsId || !Array.isArray(docsId)) {
      return res.status(400).json({
        code: 400,
        message: 'docsId array is required',
      });
    }
    
    logger.info(`Deleting ${docsId.length} document(s)`);
    
    for (const id of docsId) {
      const doc = await searchByDocumentId(id);
      
      if (doc.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: `Document ${id} not found`,
        });
      }
      
      await deleteDocument(id);
    }
    
    return res.status(200).json({
      removedDocuments: docsId.length,
      message: `${docsId.length} document(s) deleted successfully`,
    });
    
  } catch (error: any) {
    logger.error(`Error in removeDocuments: ${error.message}`);
    
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error deleting documents',
    });
  }
};

/**
 * POST /searchByIdDocument
 */
export const searchDocument = async (req: Request, res: Response) => {
  try {
    const { idDocument } = req.body;
    
    if (!idDocument) {
      return res.status(400).json({
        code: 400,
        message: 'idDocument is required',
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
    logger.error(`Error in searchDocument: ${error.message}`);
    
    return res.status(500).json({
      code: 500,
      message: error.message || 'Error searching document',
    });
  }
};


/**
 * PATCH /updateDocuments
 * Atualiza documentos (txHash, blockNumber, status)
 */
export const updateDocuments = async (req: Request, res: Response) => {
  try {
    const { docsId, updates } = req.body;
    
    // Validações
    if (!docsId || !Array.isArray(docsId) || docsId.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'docsId array is required and must not be empty',
      });
    }
    
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'updates object is required and must not be empty',
      });
    }
    
    logger.info(`Updating ${docsId.length} document(s) with fields: ${Object.keys(updates).join(', ')}`);
    
    // Atualizar cada documento
    for (const id of docsId) {
      // Verificar se documento existe
      const doc = await searchByDocumentId(id);
      
      if (doc.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: `Document ${id} not found`,
        });
      }
      
      // Atualizar
      await updateDocument(id, updates);
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
 * Trata documento antes de inserir (igual Fabric)
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