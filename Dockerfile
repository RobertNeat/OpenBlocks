# defines how to build the OpenBlocks image
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.29-alpine

RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/open-blocks/browser /usr/share/nginx/html

EXPOSE 80
