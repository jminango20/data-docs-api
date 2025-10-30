FROM node:18-alpine

# Adicionar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --chown=nodejs:nodejs package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=nodejs:nodejs . .

RUN npm run build

USER nodejs

EXPOSE 3300

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3300/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]