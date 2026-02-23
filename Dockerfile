# POS Next.js app — production image
# Build: docker build -t pos-app .
# Run with DATABASE_URL and POS_JWT_SECRET (e.g. via docker compose).

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Builder: prisma generate + next build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# Runner: full app for next start (Prisma + Next need full node_modules at runtime)
FROM base AS runner
# Install postgresql-client so in-app backup (pg_dump) works when BACKUP_DIR is used
RUN apk add --no-cache postgresql-client
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "node_modules/next/dist/bin/next", "start"]
