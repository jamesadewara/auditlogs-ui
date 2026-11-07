# AuditLogs UI Runbook

This runbook provides operational procedures for the React dashboard.

## Service Status

```bash
docker ps
```

## Health Check

```bash
curl http://localhost:3000
```

## Logs

```bash
docker logs auditlogs-ui
```

## Configuration

All configuration is done via environment variables in `.env` file. See `.env.example` for all available options.

## Environment Variables

- `VITE_AUTH_API_URL` - Auth API base URL
- `VITE_AUDIT_API_URL` - Audit service base URL

## Build

```bash
bun run build
```

## Netlify Deployment

Install the TanStack Start adapter and commit the updated `package.json` and `bun.lock`:

```bash
bun add --dev @netlify/vite-plugin-tanstack-start
```

Netlify uses `bun run build` and publishes `dist/client`, as configured in `netlify.toml`.
Set `VITE_AUTH_API_URL` and `VITE_AUDIT_API_URL` in the Netlify environment variables before
deploying. After the adapter is installed, a successful deployment should serve application
routes such as `/login` instead of Netlify's static 404 page.

## Development

```bash
bun run dev
```

## Troubleshooting

See the main project RUNBOOK.md for common troubleshooting procedures.
