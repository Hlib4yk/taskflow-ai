# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune @taskflow/tasks-service --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @taskflow/tasks-service prisma:generate
RUN pnpm turbo run build --filter=@taskflow/tasks-service

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=installer /app .
USER nestjs

EXPOSE 3001
CMD ["node", "--require", "./apps/tasks-service/dist/tracing.js", "apps/tasks-service/dist/main.js"]
