# deps: install Node dependencies once and reuse them across later stages
FROM node:20-alpine AS depends
WORKDIR /app
# Copy package metadata for better cache reuse when source changes
COPY package.json package-lock.json ./
RUN npm ci

# source: add the full app source on top of deps
FROM depends AS source
COPY . .

# lint: optional lint + format checks (no-op if scripts missing)
FROM source AS lint
RUN npm run lint --if-present \
 && npm run format:check --if-present

# test: optional tests (no-op if no test script)
FROM source AS test
RUN npm test --if-present

# build: produce the static bundle under /app/dist
FROM source AS build
RUN npm run build

# runtime: serve the static bundle via nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80