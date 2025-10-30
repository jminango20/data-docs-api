import express, { Application } from 'express';
import bodyParser from 'body-parser';
import { appHost, appPort } from './config';
import logger from './utils/logger';
import routes from './routes';
import {
  connectCassandra,
  createKeyspace,
  addUserBlockchain,
  createTable,
  client,
} from './dbManager/cassandraClient';

/**
 * Criar aplicação Express
 */
const createApp = (): Application => {
  const app: Application = express();
  
  app.set('trust proxy', true);
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  
  // Rotas
  app.use(routes);
  
  return app;
};

/**
 * Configurar banco de dados
 */
const setupDatabase = async (): Promise<void> => {
  try {
    logger.info('Setting up database...');
    
    // 1. Conectar Cassandra (sem auth)
    await connectCassandra();
    
    // 2. Criar keyspace
    await createKeyspace();
    
    // 3. Criar usuário (skip em dev)
    await addUserBlockchain();
    
    // 4. Criar tabela
    await createTable();
    
    logger.info('Database setup completed');
  } catch (error: any) {
    logger.error(`Database setup failed: ${error.message}`);
    throw error;
  }
};

/**
 * Inicializar servidor
 */
const initialize = async (): Promise<void> => {
  try {
    // Setup database
    await setupDatabase();
    
    // Criar app
    const app = createApp();
    
    // Iniciar servidor
    const server = app.listen(appPort, appHost, () => {
      logger.info(`Server running on http://${appHost}:${appPort}`);
      logger.info(`Health check: http://${appHost}:${appPort}/health`);
    });
    
    // Timeout longo para operações pesadas
    server.timeout = 300000; // 5 minutos
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing server...');
      server.close(async () => {
        await client.shutdown();
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error: any) {
    logger.error(`Server initialization failed: ${error.message}`);
    process.exit(1);
  }
};

// Start
initialize();