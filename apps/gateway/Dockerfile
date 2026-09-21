# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
RUN corepack enable

# ---------------------------------------------------------------------------
# 1. Prune the monorepo down to what @taskflow/gateway actually needs
# ---------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune @taskflow/gateway --docker

# ---------------------------------------------------------------------------
# 2. Install deps for the pruned workspace, then build
# ---------------------------------------------------------------------------
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
# turbo prune --docker doesn't trace tsconfig.json's "extends" reference,
# so the shared base config never makes it into out/full/ on its own.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @taskflow/gateway prisma:generate
RUN pnpm turbo run build --filter=@taskflow/gateway

# ---------------------------------------------------------------------------
# 3. Minimal runtime image
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Prisma's query engine links against libssl at runtime; node:20-alpine
# doesn't ship it at all.
RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=installer /app .
# `prisma migrate deploy` (run at start) downloads its schema engine into
# this directory on first use, so the unprivileged user must own it.
RUN chown -R nestjs:nodejs /app/node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines
USER nestjs

EXPOSE 3000
# Apply committed Prisma migrations before booting, so a fresh clone is one
# `docker compose up` away from a working database schema.
CMD ["sh", "-c", "./apps/gateway/node_modules/.bin/prisma migrate deploy --schema apps/gateway/prisma/schema.prisma && exec node --require ./apps/gateway/dist/tracing.js apps/gateway/dist/main.js"]
