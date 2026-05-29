# deps: install Node dependencies once and reuse them across later stages
FROM node:22-alpine AS depends
WORKDIR /frontend
# Copy package metadata for better cache reuse when source changes
COPY package.json package-lock.json ./
RUN npm ci

# source: add the full app source on top of deps
FROM depends AS source
COPY . .

# lint: ESLint (no-op until a `lint` script is added to package.json)
FROM source AS lint
RUN npm run lint --if-present

# test: optional tests (no-op if no test script)
FROM source AS test
RUN npm test --if-present

# build: produce the static bundle under /frontend/dist
FROM source AS build
RUN npm run build

# format check
FROM source AS format
RUN npm run format:check --if-present

# runtime: serve the static bundle via nginx
FROM nginx:1.30-alpine-slim AS runtime
# APK_CACHE_BUST changes per build so this layer never caches; ensures `apk upgrade` gets latest fixes.
ARG APK_CACHE_BUST=unset
RUN echo "apk-cache-bust=${APK_CACHE_BUST}" \
    && apk update \
    && apk upgrade \
    && apk add --no-cache --upgrade \
         openssl \
         libssl3 \
         libcrypto3 \
         expat \
         libxml2 \
         libpng \
    && rm -rf /var/cache/apk/*
COPY --from=build /frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80