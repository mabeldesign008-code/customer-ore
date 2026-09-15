# Ore Delivery — single Dockerfile for any service (Nx monorepo, pnpm).
# Build:  docker build --build-arg APP=order -t ore-order .
ARG NODE_VERSION=20-alpine
FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY libs ./libs
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN node node_modules/nx/dist/bin/post-install.js || true

FROM deps AS build
ARG APP
ENV APP=${APP}
RUN pnpm nx run ${APP}:build --skip-nx-cache

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps ./apps
# dist output lands under apps/<app>/dist after tsc-alias
ARG APP
ENV APP=${APP}
EXPOSE 4000
CMD ["sh", "-c", "node apps/${APP}/dist/main.js"]
