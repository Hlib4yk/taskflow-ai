# syntax=docker/dockerfile:1
# Debian-based (not alpine): @xenova/transformers pulls in onnxruntime-node,
# whose prebuilt native binaries target glibc and are unreliable on musl.
FROM node:20-bookworm-slim AS base
RUN corepack enable

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune @taskflow/ai-service --docker

FROM base AS installer
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@taskflow/ai-service

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=installer /app .
USER nestjs

EXPOSE 3002
CMD ["node", "apps/ai-service/dist/main.js"]
