/**
 * SCRIPT: Reset Database
 * 
 * Limpa TODOS os dados do Cassandra (Astra ou Local)
 * 
 * USO:
 * npm run db:reset
 * 
 * CUIDADO: Isso deleta TODOS os dados!
 */

import * as readline from 'readline';
import { client, connectCassandra } from '../src/dbManager/cassandraClient';
import { cassandraMode, astraKeyspace } from '../src/config';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function resetDatabase() {
  try {
    console.log('\n AVISO: Este script vai DELETAR TODOS OS DADOS!\n');
    console.log(`Modo: ${cassandraMode}`);
    console.log(`Keyspace: ${cassandraMode === 'astra' ? astraKeyspace : 'trace_tracker'}\n`);
    
    const confirm = await question('Tem certeza que quer continuar? (digite "SIM" para confirmar): ');
    
    if (confirm !== 'SIM') {
      console.log('Operação cancelada.');
      process.exit(0);
    }
    
    console.log('\n Conectando ao Cassandra...');
    await connectCassandra();
    console.log('Conectado!\n');
    
    const keyspace = cassandraMode === 'astra' ? astraKeyspace : 'trace_tracker';
    
    // Opção 1: TRUNCATE (mantém estrutura, deleta dados)
    console.log('🧹 Limpando tabela documents...');
    await client.execute(`TRUNCATE ${keyspace}.documents`);
    console.log('Tabela documents limpa!\n');
    
    // Verificar
    const result = await client.execute(`SELECT COUNT(*) FROM ${keyspace}.documents`);
    const count = result.rows[0].count.low || result.rows[0].count;
    console.log(`Registros restantes: ${count}`);
    
    console.log('\n Database resetado com sucesso!\n');
    
  } catch (error: any) {
    console.error('Erro ao resetar database:', error.message);
    process.exit(1);
  } finally {
    await client.shutdown();
    rl.close();
    process.exit(0);
  }
}

resetDatabase();