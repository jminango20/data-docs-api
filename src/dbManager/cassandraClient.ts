import * as cassandra from 'cassandra-driver';
import { datacenter, ipsCluster } from '../config';
import logger from '../utils/logger';

// Cliente SEM autenticação (para desenvolvimento)
export const client = new cassandra.Client({
  contactPoints: ipsCluster.split(',').map(ip => ip.trim()),
  localDataCenter: datacenter,
  encoding: {
    map: Map,
    set: Set,
  },
});

// Usar o mesmo cliente para tudo
export const clientFirstAccess = client;

/**
 * Conexão Cassandra (com retry)
 */
let tries = 0;
export const connectCassandra = async (): Promise<void> => {
  try {
    logger.info('Connecting to Cassandra...');
    await client.connect();
    logger.info('Connected to Cassandra (no auth)');
  } catch (error: any) {
    if (error instanceof cassandra.errors.NoHostAvailableError) {
      tries++;
      if (tries < 10) {
        logger.warn(`Cassandra connection failed, retrying... (${tries}/10)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return await connectCassandra();
      }
    }
    logger.error('Failed to connect to Cassandra');
    throw error;
  }
};

/**
 * KEYSPACE: trace_tracker
 */
export const createKeyspace = async (): Promise<void> => {
  const query = `
    CREATE KEYSPACE IF NOT EXISTS trace_tracker
    WITH replication = {
      'class': 'SimpleStrategy',
      'replication_factor': 1
    }
  `;
  await client.execute(query);
  logger.info(' Keyspace trace_tracker created/verified');
};

/**
 * Criar usuário blockchain - SKIP em dev (sem auth)
 */
export const addUserBlockchain = async (): Promise<void> => {
  logger.info('Skipping user creation (no auth in dev mode)');
  return Promise.resolve();
};

/**
 * TABELA: documents
 */
export const createTable = async (): Promise<void> => {
  const query = `
    CREATE TABLE IF NOT EXISTS trace_tracker.documents (
      id_document text PRIMARY KEY,
      id_asset text,
      asset_id_blockchain text,
      id_evaluation text,
      
      amount decimal,
      init_amount decimal,
      owner text,
      operation text,
      status text,
      id_local text,
      id_external list<text>,
      
      id_owner text,
      ext_id_owner text,
      org_owner text,
      org_target text,
      org_origin text,
      
      process_id text,
      nature_id text,
      stage_id text,
      
      data text,
      data_hash text,
      
      grouped_by list<text>,
      grouped_assets list<text>,
      
      target_person text,
      target_local text,
      quantity_moved decimal,
      ext_target_person text,
      ext_target_local text,
      ext_new_asset_id text,
      
      channel_name text,
      tx_hash text,
      block_number text,
      
      timestamp timestamp,
      created_at timestamp
    )
  `;
  await client.execute(query);  // SEM values!
  logger.info('Table documents created/verified');
};
/**
 * Mapper para insert/delete
 */
const UnderscoreCqlToCamelCaseMappings = cassandra.mapping.UnderscoreCqlToCamelCaseMappings;
const Uuid = cassandra.types.Uuid;

export const mapperDocument = new cassandra.mapping.Mapper(client, {
  models: {
    MetaTblDoc: {
      columns: {
        id_document: 'id_document',
      },
      keyspace: 'trace_tracker',
      mappings: new UnderscoreCqlToCamelCaseMappings(),
      tables: ['documents'],
    },
  },
});

/**
 * INSERT DOCUMENT
 */
export const insertDocument = async (document: any): Promise<any> => {
  // Gerar UUID e converter para STRING
  const uuid = Uuid.random();
  document.idDocument = uuid.toString();
  document.createdAt = new Date();
  
  const metaTblMapperDoc = mapperDocument.forModel('MetaTblDoc');
  
  logger.debug('Inserting document into Cassandra');
  const result = await metaTblMapperDoc.insert(document);
  
  logger.info(` Document inserted: ${document.idDocument}`);
  return result;
};

/**
 * DELETE DOCUMENT
 */
export const deleteDocument = async (idDocument: string): Promise<void> => {
  const metaTblMapperDoc = mapperDocument.forModel('MetaTblDoc');
  
  await metaTblMapperDoc.remove({ idDocument });
  logger.info(`Document deleted: ${idDocument}`);
};

/**
 * SEARCH BY ID_DOCUMENT
 */
export const searchByDocumentId = async (idDocument: string): Promise<any> => {
  const query = 'SELECT * FROM trace_tracker.documents WHERE id_document = ?';
  const result = await client.execute(query, [idDocument], { prepare: true });
  
  logger.debug(`searchByDocumentId - Found ${result.rowLength} results`);
  return result;
};

/**
 * SEARCH BY ID_ASSET
 */
export const searchByAssetId = async (idAsset: string): Promise<any> => {
  const query = 'SELECT * FROM trace_tracker.documents WHERE id_asset = ? ALLOW FILTERING';
  const result = await client.execute(query, [idAsset], { prepare: true });
  
  logger.debug(`searchByAssetId - Found ${result.rowLength} results`);
  return result;
};

/**
 * UPDATE DOCUMENT (para atualizar txHash, blockNumber após blockchain)
 */
export const updateDocument = async (
  idDocument: string,
  updates: Record<string, any>
): Promise<void> => {
  
  const setFields: string[] = [];
  const values: any[] = [];
  
  const fieldMapping: Record<string, string> = {
    txHash: 'tx_hash',
    blockNumber: 'block_number',
    status: 'status',
    amount: 'amount',
    idLocal: 'id_local',
    dataHash: 'data_hash',
  };
  
  for (const [key, value] of Object.entries(updates)) {
    const dbField = fieldMapping[key] || key;
    setFields.push(`${dbField} = ?`);
    values.push(value);
  }
  
  if (setFields.length === 0) {
    logger.warn(`No valid fields to update for document ${idDocument}`);
    return;
  }
  
  // WHERE clause
  values.push(idDocument);
  
  const query = `
    UPDATE trace_tracker.documents 
    SET ${setFields.join(', ')}
    WHERE id_document = ?
  `;
  
  logger.debug(`Updating document ${idDocument} with fields: ${Object.keys(updates).join(', ')}`);
  
  await client.execute(query, values, { prepare: true });
  
  logger.info(`Document updated: ${idDocument}`);
};