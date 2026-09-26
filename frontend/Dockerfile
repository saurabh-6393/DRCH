# ============================================================
# Phase 5 Step 5 — Production Frontend Dockerfile
# Multi-stage build with ephemeral asset-sync exporter
# ============================================================

# Stage 1: Build React/Vite production bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Ensure relative same-origin API URLs in production
ENV VITE_API_URL=""

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Compile TypeScript and Vite production bundle to /app/dist
RUN npm run build

# Stage 2: Ephemeral asset exporter container
FROM alpine:latest AS exporter

WORKDIR /

# Copy compiled SPA bundle into temporary image layer
COPY --from=builder /app/dist /dist

# On startup, synchronize compiled assets into the shared volume and exit cleanly
CMD ["sh", "-c", "cp -r /dist/* /usr/share/nginx/html/ && echo 'Frontend assets synchronized successfully'"]
