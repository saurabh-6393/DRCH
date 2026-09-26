# ============================================================
# Phase 5 Step 5 — Production Backend Dockerfile
# Multi-stage build targeting single-server deployment
# ============================================================

# Stage 1: Build TypeScript application
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies for compilation
COPY package.json package-lock.json ./
RUN npm ci

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript into /app/dist
RUN npm run build

# Stage 2: Minimal production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create wrapper script for tsx so `npm run db:init` executes `node dist/db/init.js`
RUN echo '#!/bin/sh' > /usr/local/bin/tsx && \
    echo 'exec node dist/db/init.js "$@"' >> /usr/local/bin/tsx && \
    chmod +x /usr/local/bin/tsx

# Execute as non-root user (UID 10001) for security hardening
RUN addgroup -g 10001 -S nodeuser && \
    adduser -u 10001 -S nodeuser -G nodeuser && \
    chown -R nodeuser:nodeuser /app

USER nodeuser

# Internal container port
EXPOSE 5000

# Start server
CMD ["node", "dist/index.js"]
