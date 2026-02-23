# =============================================================================
# POS Next.js App — Production Multi-Stage Build
# =============================================================================
# Build: docker build -t pos-app .
# Run via Docker Compose with DATABASE_URL, POS_JWT_SECRET, REDIS_URL.
# =============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage: deps — production dependencies only
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# -----------------------------------------------------------------------------
# Stage: builder — Prisma generate + Next.js build
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env (no secrets; Prisma needs DATABASE_URL for generate but only for schema validation)
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

RUN npx prisma generate && npm run build

# -----------------------------------------------------------------------------
# Stage: runner — minimal production image
# -----------------------------------------------------------------------------
FROM base AS runner

# postgresql-client for in-app pg_dump when BACKUP_DIR is used
RUN apk add --no-cache postgresql-client

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy only production artifacts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./

# Directories for mounts (uploads, backups) — ensure writable by nextjs
RUN mkdir -p /app/public/pos-images /app/backups \
  && chown -R nextjs:nodejs /app/public/pos-images /app/backups

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "node_modules/next/dist/bin/next", "start"]
