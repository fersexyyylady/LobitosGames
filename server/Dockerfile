# server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias primero para aprovechar cache de capas
COPY package*.json ./
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Crear carpeta de logs
RUN mkdir -p logs

# Usuario no-root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "index.js"]