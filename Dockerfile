FROM node:20-alpine

# Adicionar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copiar package files
COPY --chown=nodejs:nodejs package*.json ./

# Instalar TODAS as dependências (incluindo dev para build)
RUN npm ci && npm cache clean --force

# Copiar código
COPY --chown=nodejs:nodejs . .

# Build TypeScript
RUN npm run build

# Remover devDependencies após build
RUN npm prune --production

USER nodejs

ENV PORT=8080
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8080; require('http').get('http://localhost:' + port + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]