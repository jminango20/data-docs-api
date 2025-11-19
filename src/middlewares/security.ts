import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * HELMET para headers de segurança HTTP
 */
export const securityHeaders = helmet();

/**
 * RATE LIMITER para requisições por IP
 * 
 * Configuração atual:
 * - Janela: 15 minutos
 * - Máximo: 100 requisições por IP nessa janela
 * - Se ultrapassar: retorna erro 429 (Too Many Requests)
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos em milissegundos
  max: 100, // Máximo de 100 requisições por IP
  message: {
    code: 429,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, 
  legacyHeaders: false,
});