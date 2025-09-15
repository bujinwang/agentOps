# Multi-stage Dockerfile for Real Estate CRM

# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY frontend/ ./

# Build the application
RUN npm run build

# Stage 2: Backend Build
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY backend/ ./

# Build the application
RUN npm run build

# Stage 3: Production Image
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built frontend
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/public /app/frontend/public
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/package*.json /app/frontend/

# Copy built backend
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist /app/backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package*.json /app/backend/

# Install production dependencies
WORKDIR /app/frontend
RUN npm ci --only=production && npm cache clean --force

WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node /app/backend/dist/health-check.js

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "/app/backend/dist/server.js"]