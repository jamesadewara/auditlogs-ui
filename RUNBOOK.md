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

## Development

```bash
bun run dev
```

## Troubleshooting

See the main project RUNBOOK.md for common troubleshooting procedures.
