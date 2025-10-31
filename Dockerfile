# Multi-stage Dockerfile for PandaBot v6

# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production Stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package.json first for better caching
COPY --from=builder /app/package.json ./

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user and set ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bot -u 1001 && \
    chown -R bot:nodejs /app

# Set user
USER bot

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start both bot and worker
CMD ["sh", "-c", "node dist/index.js & node dist/workers/alerts-worker.js & node dist/workers/reminders-worker.js & wait"]
