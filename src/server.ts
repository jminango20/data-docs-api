import express, { Application } from 'express';
import bodyParser from 'body-parser';
import { appHost, appPort, nodeEnv, allowedOrigins } from './config';
import logger from './utils/logger';
import routes from './routes';
import {
  connectCassandra,
  createKeyspace,
  addUserBlockchain,
  createTable,
  createIndexes,
  client,
} from './dbManager/cassandraClient';
import { securityHeaders } from './middlewares/security';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

/**
 * Cria e configura aplicação Express
 * 
 * Configura:
 * - Trust proxy (para produção)
 * - Headers de segurança (Helmet)
 * - CORS com origins permitidas
 * - Swagger UI para documentação
 * - Body parser para JSON
 * - Rotas da aplicação
 * 
 * @returns Aplicação Express configurada
 */
const createApp = (): Application => {
  const app: Application = express();
  
  // Trust proxy - necessário para obter IP real do cliente em produção
  if (nodeEnv === 'production') {
    app.set('trust proxy', 1); 
  } else {
    app.set('trust proxy', false); 
  }

  // Headers de segurança via Helmet
  app.use(securityHeaders);

  // CORS - Controle de acesso entre origens
  const originsArray = allowedOrigins.split(',').map(origin => origin.trim());
  
  app.use(cors({
    origin: (origin, callback) => {
      // Permite requests sem origin (Postman, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      
      // Verifica se origin está na lista permitida
      if (originsArray.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Swagger UI - Documentação da API
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }', 
    customSiteTitle: 'Data Docs API - Documentation',
  }));

  // Body parser para requisições JSON
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  
  // Rotas da aplicação
  app.use(routes);
  
  return app;
};

/**
 * Configura e inicializa banco de dados Cassandra
 * 
 * Executa em sequência:
 * 1. Conecta ao cluster Cassandra
 * 2. Cria keyspace trace_tracker (se não existir)
 * 3. Cria usuário blockchain (skip em desenvolvimento)
 * 4. Cria tabela documents
 * 5. Cria índices secundários (asset_id_blockchain, tx_hash)
 * 
 * @throws {Error} Se alguma etapa falhar
 */
const setupDatabase = async (): Promise<void> => {
  try {
    logger.info('Iniciando configuração do banco de dados...');
    
    // 1. Conectar ao Cassandra (com retry automático)
    await connectCassandra();
    
    // 2. Criar keyspace
    await createKeyspace();
    
    // 3. Criar usuário (ignorado em dev sem autenticação)
    await addUserBlockchain();
    
    // 4. Criar tabela documents
    await createTable();

    // 5. Criar índices para queries otimizadas
    await createIndexes();
    
    logger.info('Configuração do banco de dados concluída com sucesso');
  } catch (error: any) {
    logger.error(`Falha na configuração do banco de dados: ${error.message}`);
    throw error;
  }
};

/**
 * Inicializa servidor Express
 * 
 * Fluxo de inicialização:
 * 1. Configura banco de dados (Cassandra)
 * 2. Cria aplicação Express
 * 3. Inicia servidor HTTP
 * 4. Configura graceful shutdown (SIGTERM)
 * 
 * Em caso de erro na inicialização, encerra processo com exit code 1
 */
const initialize = async (): Promise<void> => {
  try {
    // Configura e valida banco de dados
    await setupDatabase();
    
    // Cria aplicação Express
    const app = createApp();
    
    // Inicia servidor HTTP
    const server = app.listen(appPort, appHost, () => {
      logger.info(`Servidor rodando em http://${appHost}:${appPort}`);
      logger.info(`API Docs: http://${appHost}:${appPort}/api-docs`);
      logger.info(`Health check: http://${appHost}:${appPort}/health`);
      logger.info(`Ambiente: ${nodeEnv}`);
    });
    
    // Timeout generoso para operações de upload/processamento pesado
    server.timeout = 60000; // 60 segundos

    // Graceful shutdown - encerra conexões corretamente
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM recebido, encerrando servidor gracefully...');
      
      server.close(async () => {
        logger.info('Fechando conexão com Cassandra...');
        await client.shutdown();
        logger.info('Servidor encerrado com sucesso');
        process.exit(0);
      });
    });

    // Captura erros não tratados para evitar crash silencioso
    process.on('uncaughtException', (error: Error) => {
      logger.error(`Erro não capturado: ${error.message}`, error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error(`Promise rejeitada não tratada: ${reason}`, reason);
      process.exit(1);
    });
    
  } catch (error: any) {
    logger.error(`Falha na inicialização do servidor: ${error.message}`);
    process.exit(1);
  }
};

/// Inicia aplicação
initialize();