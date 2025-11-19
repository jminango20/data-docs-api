import { Request, Response, NextFunction } from 'express';
import {
  addDocumentSchema,
  deleteDocumentsSchema,
  searchByIdDocumentSchema,
  updateDocumentsSchema,
  searchByAssetIdSchema,
  searchByTxHashSchema,
} from '../schemas';
import logger from '../utils/logger';

/**
 * HELPER
 */
const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      logger.warn(`Validation error: ${error.details.map((d: any) => d.message).join(', ')}`);
      
      res.status(400).json({
        code: 400,
        message: 'Validation error',
        errors: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return;
    }
    
    next();
  };
};

/**
 * MIDDLEWARES DE VALIDAÇÃO
 * 
 * Cada um usa um schema específico da pasta /schemas
 */
export const validateAddDocument = validate(addDocumentSchema);
export const validateDeleteDocuments = validate(deleteDocumentsSchema);
export const validateSearchDocument = validate(searchByIdDocumentSchema);
export const validateUpdateDocuments = validate(updateDocumentsSchema);
export const validateSearchByAssetId = validate(searchByAssetIdSchema);
export const validateSearchByTxHash = validate(searchByTxHashSchema);