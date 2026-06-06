# go 1.26 for sqlc, mockery, and go-lint dependencies
FROM golang:1.26-alpine AS deps

# dependency for backend workflows: sqlc, mockery, and go-lint
RUN apk add --no-cache git make curl

# 1. sqlc generates type-safe Go DB code from .sql queries
COPY --from=sqlc/sqlc:1.31.1 /workspace/sqlc /usr/local/bin/sqlc

# 2. mockery (解決前一個 "Dependency versions are not predictable" 警告)
COPY --from=vektra/mockery:v3.7.0 /usr/local/bin/mockery /usr/local/bin/mockery

# 3. go-lint (解決目前的 "Avoid executing downloaded artifacts directly" 警告)
COPY --from=golangci/golangci-lint:latest /usr/bin/golangci-lint /usr/local/bin/golangci-lint
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

FROM deps AS source
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY configs/ ./configs/
COPY api/ ./api/

# lint
FROM source AS lint
RUN golangci-lint run ./...

# format
FROM source AS format
RUN test -z "$(gofmt -l . | tee /dev/stderr)"

# sqlc-verify: regenerate and diff against committed internal/db/ to ensure committed generated code is up-to-date
FROM source AS sqlc-verify
RUN cp -r internal/db /tmp/db.committed \
    && rm -rf internal/db \
    && sqlc generate \
    && diff -r /tmp/db.committed internal/db

# test
FROM source AS test
RUN go test ./...

# build
FROM source AS build
ARG GIT_SHA=dev
ARG BUILD_VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-X 'main.CommitHash=${GIT_SHA}' -X 'main.Version=${BUILD_VERSION}'" \
    -o /out/api ./cmd/api

# runtime
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates python3 nodejs gcc g++ musl-dev docker-cli

WORKDIR /app

COPY --from=build /out/api ./bin/api
COPY --from=build /app/configs ./configs
COPY --from=build /app/api ./api

EXPOSE 8081

CMD ["./bin/api"]