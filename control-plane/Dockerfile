FROM golang:1.24-alpine AS builder

WORKDIR /app

# Download dependencies first (layer caching)
COPY go.mod go.sum* ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o control-plane .

# Minimal runtime image
FROM alpine:3.20

RUN apk --no-cache add ca-certificates curl

WORKDIR /app
COPY --from=builder /app/control-plane .

EXPOSE 8080

CMD ["./control-plane"]
