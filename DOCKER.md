# Docker Image for AuditLogs UI

This service builds a Docker image for the React/TanStack Start frontend.

## Automatic Build

This image is automatically built and pushed to Docker Hub by GitHub Actions when code is pushed to the `main` branch.

## Image Name

```
<DOCKER_USERNAME>/auditlogs-ui:latest
```

## GitHub Actions

The workflow is defined in `.github/workflows/docker-build-push.yml`.

### Required Secrets

Configure these in GitHub repository settings (Settings → Secrets and variables → Actions):

- `DOCKER_USERNAME` - Your Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub access token (not your password)

## Manual Build

To build locally:

```bash
docker build -t auditlogs-ui .
```

To run locally:

```bash
docker run -p 3000:3000 \
  -e VITE_API_URL=http://localhost:8005 \
  auditlogs-ui
```

## Dockerfile Details

- **Base image**: `oven/bun:1`
- **Multi-stage build**: Separate build and runtime stages
- **Build process**: Uses Bun to build the TanStack Start application
- **Runtime**: Runs the production server with Bun
- **Security**: Runs as non-root user
- **Health check**: Built-in health check
- **Port**: 3000

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:8005)

## Using in Docker Compose

The root `docker-compose.yml` references this image. Set your Docker Hub username in the `.env` file:

```bash
DOCKER_USERNAME=your-dockerhub-username
```

Then run:

```bash
docker-compose up -d ui
```

## Accessing the UI

Once running, access the UI at:
- Local: http://localhost:3000
- Docker Compose: http://localhost:3000
