# -------------------------------------------------------------
# Base image: minimal OS + Node.js runtime
# -------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache tini
WORKDIR /app

# -------------------------------------------------------------
# Stage 1: Manifest Collector & Dependency Cache Layer
# -------------------------------------------------------------
FROM base AS deps
# Copy manifests only so the dependency install layer stays cached
COPY package.json pnpm-workspace.yaml turbo.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api/package.json ./services/api/

# -------------------------------------------------------------
# Stage 2: Builder & Pruner Stage
# -------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY packages/shared ./packages/shared
COPY services/api ./services/api

# -------------------------------------------------------------
# Stage 3: Production Runner (Non-Root UID 1001)
# -------------------------------------------------------------
FROM base AS runner
WORKDIR /app

# Create a dedicated non-root system user (UID 1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apprunner -u 1001 -G nodejs

# Atomic file ownership: Prevent root permission escalation and disk bloat
COPY --chown=apprunner:nodejs --from=builder /app/packages/shared ./packages/shared
COPY --chown=apprunner:nodejs --from=builder /app/services/api ./services/api
COPY --chown=apprunner:nodejs --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=5000

# Drop root privilege
USER apprunner

EXPOSE 5000

# Run tini as PID 1 for signal handling and zombie process reaping
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app/services/api
CMD ["node", "src/server.js"]
