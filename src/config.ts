import dotenv from 'dotenv';

dotenv.config();

const getEnvParam = (param: string): string => process.env[param] || '';

// Server
export const appPort = parseInt(getEnvParam('PORT_API')) || 3300;
export const appHost = getEnvParam('APP_HOST') || '0.0.0.0';
export const nodeEnv = getEnvParam('NODE_ENV') || 'development';
export const logLevel = getEnvParam('LOG_LEVEL') || 'info';
export const prefixAPI = getEnvParam('PREFIX_API') || '';

// Cassandra
export const ipsCluster = getEnvParam('IPS_CLUSTER') || 'localhost';
export const datacenter = getEnvParam('DATACENTER') || 'datacenter1';
export const cassandraSuperUser = getEnvParam('CASSANDRA_SUPERUSER') || 'cassandra';
export const cassandraSuperUserPass = getEnvParam('CASSANDRA_SUPERUSER_PASSWORD') || 'cassandra';
export const blockchainUser = getEnvParam('BLOCKCHAIN_USERNAME') || 'blockchain';
export const blockchainPass = getEnvParam('BLOCKCHAIN_PASSWORD') || 'blockchainpass';

// Elasticsearch
export const elasticHost = getEnvParam('ELASTIC_HOST') || 'http://localhost:9200';
export const elasticIndex = getEnvParam('ELASTIC_INDEXNAME') || 'documents';
export const elasticPass = getEnvParam('ELASTIC_PASS') || '';
export const elasticHttpsMode = getEnvParam('ELASTIC_HTTPS_MODE') === 'true';

// MTLS (desabilitado por padrão)
export const mtls = getEnvParam('MTLS') === 'true';

// Cassandra Mode
export const cassandraMode = getEnvParam('CASSANDRA_MODE') || 'local';

// Astra Configuration
export const astraSecureBundlePath = getEnvParam('ASTRA_SECURE_BUNDLE_PATH') || './secure-connect-db-trace-tracker.zip';
export const astraClientId = getEnvParam('ASTRA_CLIENT_ID') || '';
export const astraClientSecret = getEnvParam('ASTRA_CLIENT_SECRET') || '';
export const astraKeyspace = getEnvParam('ASTRA_KEYSPACE') || 'trace_tracker';

// CORS
export const allowedOrigins = getEnvParam('ALLOWED_ORIGINS') || 'http://localhost:3000';