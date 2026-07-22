# Server Dockerfile
FROM node:20-slim

WORKDIR /app

# Install production deps only (we'll run build in CI)
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server source
COPY server/ .

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "index.js"]
