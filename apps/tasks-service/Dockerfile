# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
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
# turbo prune --docker doesn't trace tsconfig.json's "extends" reference,
# so the shared base config never makes it into out/full/ on its own.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
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
