# Multi-stage production Dockerfile for MCP Kanban
FROM node:18-alpine AS base

# Install dependencies needed for building
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY shared/db/package.json ./shared/db/
COPY shared/errors/package.json ./shared/errors/
COPY shared/logging/package.json ./shared/logging/
COPY web-server/package.json ./web-server/
COPY web-ui/package.json ./web-ui/
COPY mcp-server/package.json ./mcp-server/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build all packages
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 kanban
RUN adduser --system --uid 1001 kanban

# Copy production files
COPY --from=builder --chown=kanban:kanban /app/web-server/dist ./web-server/dist
COPY --from=builder --chown=kanban:kanban /app/web-ui/dist ./web-ui/dist
COPY --from=builder --chown=kanban:kanban /app/shared/db/dist ./shared/db/dist
COPY --from=builder --chown=kanban:kanban /app/shared/errors/dist ./shared/errors/dist
COPY --from=builder --chown=kanban:kanban /app/shared/logging/dist ./shared/logging/dist
COPY --from=deps --chown=kanban:kanban /app/node_modules ./node_modules

# Copy package.json files for runtime
COPY --from=builder --chown=kanban:kanban /app/package.json ./
COPY --from=builder --chown=kanban:kanban /app/web-server/package.json ./web-server/
COPY --from=builder --chown=kanban:kanban /app/shared/db/package.json ./shared/db/
COPY --from=builder --chown=kanban:kanban /app/shared/errors/package.json ./shared/errors/
COPY --from=builder --chown=kanban:kanban /app/shared/logging/package.json ./shared/logging/

# Create directory for SQLite database
RUN mkdir -p /app/data && chown kanban:kanban /app/data

# Switch to non-root user
USER kanban

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8221
ENV DATABASE_URL=file:./data/kanban.db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8221/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 8221

# Start the application
CMD ["node", "web-server/dist/index.js"]