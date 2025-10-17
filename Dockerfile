# Base image - Node.js 22 Alpine
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install curl for health checks, mongodb-tools for backup
RUN apk add --no-cache libc6-compat curl mongodb-tools
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install MongoDB tools in runner stage
RUN apk add --no-cache mongodb-tools

# Copy production dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p logs backups uploads && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start the application
CMD ["node", "index.js"]