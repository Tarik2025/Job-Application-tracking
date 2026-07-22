# Client Dockerfile (Next.js)
FROM node:20-slim AS builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install a minimal runtime (only dependencies)
COPY client/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next .next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
