FROM golang:1.24-alpine AS deps

# dependency for backend workflows: sqlc, mockery, and golangci-lint
RUN apk add --no-cache git make
# sqlc
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.0
# mockery
RUN go install github.com/vektra/mockery/v3@v3.7.0
# golangci-lint
RUN apk add --no-cache curl \
   && curl -sSfL https://golangci-lint.run/install.sh \
      | sh -s -- -b $(go env GOPATH)/bin v2.12.0

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

FROM deps AS source
COPY . .

# lint
FROM source AS lint
RUN golangci-lint run ./...

# format
FROM source AS format
RUN test -z "$(gofmt -l . | tee /dev/stderr)"

# test
FROM source AS test
RUN make gen
RUN go test ./...

# build
FROM source AS build
ARG GIT_SHA=dev
ARG BUILD_VERSION=dev
RUN make gen
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-X 'main.CommitHash=${GIT_SHA}' -X 'main.Version=${BUILD_VERSION}'" \
    -o /out/api ./cmd/api

# runtime
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates python3 nodejs

WORKDIR /app

COPY --from=build /out/api ./bin/api
COPY --from=build /app/configs ./configs
COPY --from=build /app/api ./api

EXPOSE 8081

CMD ["./bin/api"]
