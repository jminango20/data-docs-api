import express, { Request, Response } from 'express';
import { 
  addDocument, 
  removeDocuments,
  updateDocuments, 
  searchDocument 
} from './controllers/document/documentBase';
import { prefixAPI } from './config';  

const routes = express.Router();

/**
 * Health check
 */
routes.get(`${prefixAPI}/health`, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'data-docs-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /addDocument
 * Adiciona documentos no Cassandra
 * 
 * Body: { documents: Document[] }
 */
routes.post(`${prefixAPI}/addDocument`, addDocument);

/**
 * POST /deleteDocuments
 * Remove documentos do Cassandra
 * 
 * Body: { docsId: string[] }
 */
routes.post(`${prefixAPI}/deleteDocuments`, removeDocuments);

/**
 * POST /searchByIdDocument
 * Busca documento por ID
 * 
 * Body: { idDocument: string }
 */
routes.post(`${prefixAPI}/searchByIdDocument`, searchDocument);

/**
 * PATCH /updateDocuments
 * Atualiza documentos (txHash, blockNumber após blockchain)
 * 
 * Body: {
 *   docsId: string[],
 *   updates: {
 *     txHash?: string,
 *     blockNumber?: string,
 *     status?: string
 *   }
 * }
 */
routes.patch(`${prefixAPI}/updateDocuments`, updateDocuments);

export default routes;