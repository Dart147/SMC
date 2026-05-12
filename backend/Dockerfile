FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o bin/api ./cmd/api

FROM golang:1.24-alpine
WORKDIR /app
COPY --from=builder /app/bin/api ./bin/api
COPY --from=builder /app/configs ./configs
COPY --from=builder /app/api ./api
EXPOSE 8081
CMD ["./bin/api"]
