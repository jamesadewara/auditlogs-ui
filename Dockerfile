# syntax=docker/dockerfile:1
#
# Multi-stage build - build TanStack Start app with Bun, run the production server

FROM oven/bun:1 AS builder

WORKDIR /build

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

FROM oven/bun:1 AS runtime

WORKDIR /app

# Copy built application from builder
COPY --from=builder /build /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bun

USER bun:bun

ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

CMD ["bun", "run", "dist/server/index.js"]
