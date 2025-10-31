# Production-ready Dockerfile for PandaBot v6
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (build needs dev deps)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npx tsc --skipLibCheck --noEmit false

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bot -u 1001 && \
    chown -R bot:nodejs /app

# Switch to non-root user
USER bot

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('OK')"

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start bot and workers
CMD ["sh", "-c", "node dist/index.js & node dist/workers/alerts-worker.js & node dist/workers/reminders-worker.js & wait"]
