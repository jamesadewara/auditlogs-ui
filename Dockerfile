# syntax=docker/dockerfile:1
#
# Multi-stage build - build TanStack Start app with Bun, run the production server

FROM oven/bun:1 AS builder

WORKDIR /build

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_AUTH_API_URL
ARG VITE_AUDIT_API_URL
RUN test -n "$VITE_AUTH_API_URL" && test -n "$VITE_AUDIT_API_URL"
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL \
    VITE_AUDIT_API_URL=$VITE_AUDIT_API_URL
RUN bun run build

FROM oven/bun:1-slim AS runtime

WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home-dir /app app
COPY --from=builder --chown=app:app /build/package.json /build/bun.lock ./
RUN bun install --production --frozen-lockfile
COPY --from=builder --chown=app:app /build/dist ./dist

ENV PORT=3000
EXPOSE 3000

USER app
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + process.env.PORT + '/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["bun", "run", "dist/server/index.js"]
