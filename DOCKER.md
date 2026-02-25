# Docker Setup Guide 🐳

This project includes a complete Docker Compose setup for local development and production-like environments.

## Quick Start with Docker

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### 1. Clone and Setup

```bash
git clone <repo-url>
cd bullmq-file-processor
cp .env.example .env
```

### 2. Start All Services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **Node.js App** (port 3000)
- **Redis Commander** (port 8081) - GUI for Redis
- **pgAdmin** (port 5050) - GUI for PostgreSQL

### 3. Run Database Migrations

```bash
docker-compose exec app npm run db:migrate
```

### 4. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| API | `http://localhost:3000` | — |
| Bull UI | `http://localhost:3000/bullui` | admin / password |
| Redis Commander | `http://localhost:8081` | — |
| pgAdmin | `http://localhost:5050` | admin@example.com / admin |

---

## Development Workflow

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Run Commands in Container

```bash
# Run tests
docker-compose exec app npm test

# Run a specific test file
docker-compose exec app npm test -- test/upload_success.test.js

# Access Node shell
docker-compose exec app node

# Run worker directly
docker-compose exec app npm run worker:csv
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart postgres
```

### Stop Services

```bash
# Stop all (keeps data)
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop, remove, and delete data
docker-compose down -v
```

---

## Environment Variables

Edit `.env` to customize:

```env
# PostgreSQL
DB_PSQL_USERNAME=postgres
DB_PSQL_PASSWORD=postgres
DB_PSQL_DATABASE=file_processor
DB_PSQL_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket

# Bull UI
BULLUI_USER=admin
BULLUI_PASS=password

# pgAdmin
PGADMIN_PASSWORD=admin
```

---

## Building for Production

### Build Image

```bash
docker build -t bullmq-app:latest .
```

### Push to Registry

```bash
# Example with Docker Hub
docker tag bullmq-app:latest username/bullmq-app:latest
docker push username/bullmq-app:latest
```

### Run Production Container

```bash
docker run -d \
  --name bullmq-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_PG_PRIMARY=db-host \
  -e REDIS_HOST=redis-host \
  bullmq-app:latest
```

---

## Networking

All services communicate via the `bullmq-network` bridge network:

```
app → postgres:5432
app → redis:6379
redis-commander → redis:6379
pgadmin → postgres:5432
```

---

## Health Checks

Docker Compose monitors service health:

```bash
# View health status
docker-compose ps
```

Expected output:

```
NAME                      STATUS
bullmq-postgres           Up (healthy)
bullmq-redis              Up (healthy)
bullmq-app                Up
bullmq-redis-commander     Running
bullmq-pgadmin            Running
```

If a service is unhealthy, view logs:

```bash
docker-compose logs postgres
```

---

## Troubleshooting

### Port Already in Use

Change ports in `docker-compose.yml` or `docker-compose.override.yml`:

```yaml
services:
  app:
    ports:
      - "3001:3000"  # Changed from 3000:3000
```

### Database Connection Errors

Ensure migrations ran:

```bash
docker-compose exec app npm run db:migrate
```

### Redis Connection Issues

Verify Redis is running:

```bash
docker-compose exec redis redis-cli ping
# Expected output: PONG
```

### Out of Disk Space

Clean up Docker artifacts:

```bash
docker system prune -a --volumes
```

---

## Performance Tips

### Increase Resources

Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Use BuildKit

For faster builds:

```bash
DOCKER_BUILDKIT=1 docker build -t bullmq-app:latest .
```

### Development Optimization

Use volume mounts for hot reload:

```yaml
volumes:
  - .:/app                    # Source code
  - /app/node_modules         # Keep node_modules in container
```

---

## Advanced Usage

### Override Configuration

Create `docker-compose.override.yml`:

```yaml
version: '3.8'
services:
  app:
    ports:
      - "3001:3000"
    environment:
      DEBUG: "bullmq:*"
```

### Run Multiple Worker Instances

```bash
docker-compose up -d --scale app=3
```

### Monitor with Prometheus

Add to `docker-compose.yml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

---

## Clean Up

### Remove Everything (Keep Images)

```bash
docker-compose down
```

### Remove Everything Including Volumes

```bash
docker-compose down -v
```

### Remove Everything Including Images

```bash
docker-compose down -v --rmi all
```

---

## Further Reading

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Networking](https://docs.docker.com/network/)
