FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY meetmesh-core ./meetmesh-core
COPY meetmesh-api ./meetmesh-api

RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter meetmesh-core --filter meetmesh-api run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/meetmesh-api/dist ./dist
COPY --from=builder /app/meetmesh-api/package.json ./package.json

EXPOSE 3000
CMD ["node", "./dist/index.mjs"]
