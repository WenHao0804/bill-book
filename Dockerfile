# syntax=docker/dockerfile:1

# ---- frontend build ----
FROM node:22-alpine AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# ---- backend build ----
FROM golang:1.25-alpine AS go-build
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web-build /app/web/dist ./web/dist
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/bill-book .

# ---- runtime ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=go-build /out/bill-book ./bill-book
COPY conf ./conf

ENV MODE_ENV=prod
EXPOSE 8800
ENTRYPOINT ["./bill-book"]
