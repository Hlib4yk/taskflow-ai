# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
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
RUN pnpm --filter @taskflow/gateway prisma:generate
RUN pnpm turbo run build --filter=@taskflow/gateway

# ---------------------------------------------------------------------------
# 3. Minimal runtime image
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=installer /app .
USER nestjs

EXPOSE 3000
CMD ["node", "apps/gateway/dist/main.js"]
