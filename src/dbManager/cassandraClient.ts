import * as cassandra from 'cassandra-driver';
import { 
  datacenter, 
  ipsCluster,
  cassandraMode,
  astraSecureBundlePath,
  astraClientId,
  astraClientSecret,
  astraKeyspace
} from '../config';
import logger from '../utils/logger';
import * as path from 'path';

/**
 * CLIENTE CASSANDRA
 * 
 * Suporta 2 modos:
 * - local: Cassandra local (docker) SEM autenticação
 * - astra: DataStax Astra (cloud) COM autenticação segura
 */
let client: cassandra.Client;

if (cassandraMode === 'astra') {
  // ========== MODO ASTRA (CLOUD - PRODUÇÃO) ==========
  logger.info('Configuração Cassandra client para Astra (cloud)');
  
  const bundlePath = path.resolve(astraSecureBundlePath);
  
  client = new cassandra.Client({
    cloud: {
      secureConnectBundle: bundlePath
    },
    credentials: {
      username: astraClientId,
      password: astraClientSecret
    },
    keyspace: astraKeyspace,
    encoding: {
      map: Map,
      set: Set,
    },
  });
  
  logger.info(`Astra mode enabled`);
  logger.info(`Bundle: ${bundlePath}`);
  logger.info(`Keyspace: ${astraKeyspace}`);
  
} else {
  // ========== MODO LOCAL (DEV) ==========
  logger.info('Configuração Cassandra client para LOCAL (dev)');
  
  client = new cassandra.Client({
    contactPoints: ipsCluster.split(',').map(ip => ip.trim()),
    localDataCenter: datacenter,
    encoding: {
      map: Map,
      set: Set,
    },
  });
  
  logger.warn('Rodando Cassandra local (dev) sem autenticação Docker/Compose');
}

export { client };

// Alias para compatibilidade
export const clientFirstAccess = client;

/**
 * Conecta ao cluster Cassandra com retry automático
 * 
 * Tenta até 10 vezes com intervalo de 5 segundos entre tentativas
 * 
 * @throws {Error} Se não conseguir conectar após 10 tentativas
 */
let tries = 0;
export const connectCassandra = async (): Promise<void> => {
  try {
    logger.info('Conectando ao Cassandra...');
    await client.connect();
    logger.info('Conectado ao Cassandra (sem autenticação)');
  } catch (error: any) {
    if (error instanceof cassandra.errors.NoHostAvailableError) {
      tries++;
      if (tries < 10) {
        logger.warn(`Falha na conexão Cassandra, tentando novamente... (${tries}/10)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return await connectCassandra();
      }
    }
    logger.error('Falha ao conectar no Cassandra após 10 tentativas');
    throw error;
  }
};

/**
 * KEYSPACE: trace_tracker
 * 
 * No Astra: keyspace já existe (criado no setup)
 * No Local: cria se não existir
 */
export const createKeyspace = async (): Promise<void> => {
  if (cassandraMode === 'astra') {
    logger.info(`Using existing Astra keyspace: ${astraKeyspace}`);
    return;
  }

  // Modo local: criar keyspace
  const query = `
    CREATE KEYSPACE IF NOT EXISTS trace_tracker
    WITH replication = {
      'class': 'SimpleStrategy',
      'replication_factor': 1
    }
  `;
  await client.execute(query);
  logger.info('Keyspace trace_tracker created/verified (local)');
};

/**
 * Criar usuário blockchain
 * 
 * No Astra: não aplicável (usa tokens)
 * No Local: skip (sem auth em dev)
 */
export const addUserBlockchain = async (): Promise<void> => {
  logger.info('Skipping user creation (not needed in current mode)');
  return Promise.resolve();
};

/**
 * Cria tabela documents no keyspace trace_tracker
 * 
 * Campos principais:
 * - id_document: Primary key (UUID)
 * - asset_id_blockchain: ID do asset (indexado)
 * - tx_hash: Hash da transação blockchain (indexado)
 * - data: JSON serializado com informações adicionais
 * - grouped_assets/grouped_by: Arrays para rastreamento de agrupamentos
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
      tx_status text,
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
  await client.execute(query);  
  logger.info('Tabela documents criada/verificada');
};

/**
 * Cria índices secundários para queries otimizadas
 * 
 * Índices criados:
 * - asset_id_blockchain: Para buscar documentos por asset ID
 * - tx_hash: Para buscar documentos por hash da transação blockchain
 */
export const createIndexes = async (): Promise<void> => {
  try {
    // Índice para id_asset
    const indexAsset = `
      CREATE INDEX IF NOT EXISTS idx_asset_id_blockchain
      ON trace_tracker.documents (asset_id_blockchain)
    `;
    await client.execute(indexAsset);
    
    // Índice para tx_hash (blockchain transaction hash)
    const indexTxHash = `
      CREATE INDEX IF NOT EXISTS idx_tx_hash 
      ON trace_tracker.documents (tx_hash)
    `;
    await client.execute(indexTxHash);
    
    // Futuro: adicionar outros índices se necessário
    
  } catch (error: any) {
    logger.error(`Falha ao criar índices: ${error.message}`);
    throw error;
  }
};


/**
 * Mapper Cassandra para operações de insert/delete
 * 
 * Usa UnderscoreCqlToCamelCase para conversão automática de campos
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
 * Insere documento no Cassandra
 * 
 * Gera UUID automático e timestamp de criação
 * Serializa campos complexos (data, arrays) antes da inserção
 * 
 * @param document - Documento a ser inserido
 * @returns Resultado da inserção
 */
export const insertDocument = async (document: any): Promise<any> => {
  // Gerar UUID e converter para STRING
  const uuid = Uuid.random();
  document.idDocument = uuid.toString();
  document.createdAt = new Date();

  const preparedDoc = prepareDocumentForCassandra(document);
  
  const metaTblMapperDoc = mapperDocument.forModel('MetaTblDoc');
  
  logger.debug(`Inserindo documento: ${preparedDoc.idDocument}`);
  const result = await metaTblMapperDoc.insert(preparedDoc);
  
  logger.info(`Documento inserido: ${preparedDoc.idDocument}`);
  return result;
};

/**
 * Remove documento do Cassandra por ID
 * 
 * @param idDocument - ID do documento a ser removido
 */
export const deleteDocument = async (idDocument: string): Promise<void> => {
  const metaTblMapperDoc = mapperDocument.forModel('MetaTblDoc');
  
  await metaTblMapperDoc.remove({ idDocument });
  logger.info(`Documento removido: ${idDocument}`);
};

/**
 * Busca documento por ID único
 * 
 * @param idDocument - ID do documento (primary key)
 * @returns Resultado da query com documento encontrado
 */
export const searchByDocumentId = async (idDocument: string): Promise<any> => {
  const query = 'SELECT * FROM trace_tracker.documents WHERE id_document = ?';
  const result = await client.execute(query, [idDocument], { prepare: true });
  
  logger.debug(`searchByDocumentId - Encontrados ${result.rowLength} resultado(s)`);
  return result;
};

/**
 * Busca documentos por ID do asset (único ou múltiplos)
 * 
 * Busca única com paginação:
 *   searchByAssetId('asset-123', { pageSize: 100, pageState: '...' })
 *   - Retorna até pageSize resultados
 *   - Usa pageState para buscar próxima página
 * 
 * Busca múltipla sem paginação:
 *   searchByAssetId(['asset-1', 'asset-2', ...])
 *   - Executa queries em paralelo
 *   - Retorna todos os resultados combinados
 * 
 * @param idAsset - ID único ou array de IDs
 * @param options - Opções de paginação (apenas para busca única)
 * @returns Objeto com rows, rowLength e pageState (se houver próxima página)
 */
export const searchByAssetId = async (
  idAsset: string | string[],
  options?: {
    pageSize?: number;
    pageState?: string;
  }
): Promise<any> => {
  
  // Busca única - COM PAGINAÇÃO
  if (!Array.isArray(idAsset)) {
    const query = 'SELECT * FROM trace_tracker.documents WHERE asset_id_blockchain = ?';
    
    const queryOptions: any = {
      prepare: true,
      fetchSize: options?.pageSize || 100, // Padrão: 100 docs por página
    };
    
    // Continua de onde parou se tiver pageState
    if (options?.pageState) {
      queryOptions.pageState = Buffer.from(options.pageState, 'base64');
    }
    
    const result = await client.execute(query, [idAsset], queryOptions);
    
    logger.debug(`searchByAssetId - Encontrados ${result.rowLength} resultado(s) (página)`);
    
    return {
      rows: result.rows,
      rowLength: result.rowLength,
      pageState: result.pageState 
        ? result.pageState.toString() 
        : null, // Token para próxima página
    };
  }
  
  // Busca múltipla - SEM PAGINAÇÃO (queries paralelas)
  logger.debug(`searchByAssetId - Executando ${idAsset.length} queries paralelas`);
  
  const query = 'SELECT * FROM trace_tracker.documents WHERE asset_id_blockchain = ?';
  
  const results = await Promise.all(
    idAsset.map(asset => 
      client.execute(query, [asset], { 
        prepare: true,
        fetchSize: 1000 // Limite interno para cada query
      })
    )
  );
  
  const allRows = results.flatMap(result => result.rows);
  
  logger.debug(`searchByAssetId - Encontrados ${allRows.length} resultado(s) total`);
  
  return {
    rows: allRows,
    rowLength: allRows.length,
    pageState: null, // Paginação não disponível em busca múltipla
  };
};

/**
 * Busca documentos por hash da transação blockchain (único ou múltiplos)
 * 
 * Busca única com paginação:
 *   searchByTxHash('0xabc123...', { pageSize: 100, pageState: '...' })
 * 
 * Busca múltipla sem paginação:
 *   searchByTxHash(['0xabc123...', '0xdef456...'])
 * 
 * @param txHash - Hash único ou array de hashes
 * @param options - Opções de paginação (apenas para busca única)
 * @returns Objeto com rows, rowLength e pageState (se houver próxima página)
 */
export const searchByTxHash = async (
  txHash: string | string[],
  options?: {
    pageSize?: number;
    pageState?: string;
  }
): Promise<any> => {
  
  // Busca única - COM PAGINAÇÃO
  if (!Array.isArray(txHash)) {
    const query = 'SELECT * FROM trace_tracker.documents WHERE tx_hash = ?';
    
    const queryOptions: any = {
      prepare: true,
      fetchSize: options?.pageSize || 100,
    };
    
    if (options?.pageState) {
      queryOptions.pageState = Buffer.from(options.pageState, 'base64');
    }
    
    const result = await client.execute(query, [txHash], queryOptions);
    
    logger.debug(`searchByTxHash - Encontrados ${result.rowLength} resultado(s) (página)`);

    
    return {
      rows: result.rows,
      rowLength: result.rowLength,
      pageState: result.pageState 
        ? result.pageState.toString() 
        : null,
    };
  }
  
  // Busca múltipla - SEM PAGINAÇÃO (queries paralelas)
  logger.debug(`searchByTxHash - Executando ${txHash.length} queries paralelas`);
  
  const query = 'SELECT * FROM trace_tracker.documents WHERE tx_hash = ?';
  
  const results = await Promise.all(
    txHash.map(hash => 
      client.execute(query, [hash], { 
        prepare: true,
        fetchSize: 1000
      })
    )
  );
  
  const allRows = results.flatMap(result => result.rows);
  
  logger.debug(`searchByTxHash - Encontrados ${allRows.length} resultado(s) total`);
 
  return {
    rows: allRows,
    rowLength: allRows.length,
    pageState: null,
  };
};

/**
 * Atualiza campos de um documento existente
 * 
 * Campos atualizáveis comuns:
 * - txHash / tx_hash
 * - blockNumber / block_number
 * - status
 * - txStatus / tx_status
 * - amount
 * - idLocal / id_local
 * - dataHash / data_hash
 * 
 * @param idDocument - ID do documento a atualizar
 * @param updates - Objeto com campos e valores a atualizar
 */
export const updateDocument = async (
  idDocument: string,
  updates: Record<string, any>
): Promise<void> => {
  
  const setFields: string[] = [];
  const values: any[] = [];
  
  // Mapeamento camelCase -> snake_case para compatibilidade
  const fieldMapping: Record<string, string> = {
    txHash: 'tx_hash',
    blockNumber: 'block_number',
    status: 'status',
    txStatus: 'tx_status',
    amount: 'amount',
    idLocal: 'id_local',
    dataHash: 'data_hash',
  };
  
  // Monta cláusula SET dinamicamente
  for (const [key, value] of Object.entries(updates)) {
    const dbField = fieldMapping[key] || key;
    setFields.push(`${dbField} = ?`);
    values.push(value);
  }
  
  if (setFields.length === 0) {
    logger.warn(`Nenhum campo válido para atualizar no documento ${idDocument}`);
    return;
  }
  
  // Adiciona ID para cláusula WHERE
  values.push(idDocument);
  
  const query = `
    UPDATE trace_tracker.documents 
    SET ${setFields.join(', ')}
    WHERE id_document = ?
  `;
  
  logger.debug(`Atualizando documento ${idDocument} - Campos: ${Object.keys(updates).join(', ')}`);
  
  await client.execute(query, values, { prepare: true });
  
  logger.info(`Documento atualizado: ${idDocument}`);
};

/**
 * Prepara documento para inserção no Cassandra
 * 
 * Conversões aplicadas:
 * - Arrays (groupedBy, groupedAssets, idExternal): Garantidos como list<text>
 * - Objetos (data): Serializados para JSON string
 * - Strings JSON: Parseadas para arrays se necessário
 * 
 * @param document - Documento bruto
 * @returns Documento preparado para Cassandra
 */
function prepareDocumentForCassandra(document: any): any {
  const prepared = { ...document };
  
  // Campos que devem ser arrays (list<text> no Cassandra)
  const listFields = ['groupedBy', 'groupedAssets', 'idExternal'];
  
  for (const field of listFields) {
    if (prepared[field] !== undefined && prepared[field] !== null) {
      
      if (typeof prepared[field] === 'string') {
        try {
          prepared[field] = JSON.parse(prepared[field]);
        } catch (e) {
          logger.warn(`Falha ao parsear ${field} como JSON, tratando como valor único`);
          prepared[field] = [prepared[field]];
        }
      }
      
      if (!Array.isArray(prepared[field])) {
        prepared[field] = [prepared[field]];
      }
      
      prepared[field] = prepared[field].map((item: any) => 
        typeof item === 'string' ? item : String(item)
      );
    }
  }
  
  // Serializa campo data se não for string
  if (prepared.data && typeof prepared.data !== 'string') {
    prepared.data = JSON.stringify(prepared.data);
  }
  
  return prepared;
}