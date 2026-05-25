# StockScan Web Portal - Enterprise Deployment

Deploy the StockScan web portal as a Docker container alongside your StockScan API.

## Prerequisites

- Docker and Docker Compose installed
- StockScan API already running (via `stockscan-standalone` or similar)

## Quick Start

### 1. Create a directory for the portal

```bash
mkdir -p ~/stockscan-portal
cd ~/stockscan-portal
```

### 2. Download the deployment files

You need three files: `docker-compose.yml`, `.env.enterprise.example`, and `deploy.sh`.

### 3. Configure environment

```bash
cp .env.enterprise.example .env
nano .env
```

Update these values:

| Variable | Description | Example |
|---|---|---|
| `BACKEND_API_URL` | Your StockScan API URL | `http://host.docker.internal:3000` |
| `NEXTAUTH_URL` | Public URL for this portal | `http://your-server-ip:3100` |
| `NEXTAUTH_SECRET` | Random secret string | `openssl rand -base64 32` |

### 4. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

The portal will be available at the URL you set in `NEXTAUTH_URL` (default: `http://localhost:3100`).

## Commands

| Command | Description |
|---|---|
| `./deploy.sh` | Pull image and start |
| `./deploy.sh --update` | Pull latest image and restart |
| `./deploy.sh --stop` | Stop the portal |
| `./deploy.sh --logs` | View container logs |
| `./deploy.sh --status` | Check if portal is running |

## Backend API Connection

- **Same server**: Use `BACKEND_API_URL=http://host.docker.internal:3000`
- **Different server**: Use `BACKEND_API_URL=http://192.168.1.x:3000` (replace with API server IP)
- **Docker network**: If API and portal share a Docker network, use the container name: `BACKEND_API_URL=http://stockscan-api:3000`

## Updating

To pull the latest portal version:

```bash
./deploy.sh --update
```

## Troubleshooting

### Portal shows but API calls fail (500 errors)
- Check `BACKEND_API_URL` in `.env` points to your running API
- Verify API is reachable: `curl http://host.docker.internal:3000/api/auth/login`
- Check portal logs: `./deploy.sh --logs`

### Cannot connect to portal
- Verify the container is running: `docker compose ps`
- Check firewall allows port 3100: `ufw allow 3100` or equivalent
- Verify `NEXTAUTH_URL` matches how you access the server

### Container won't start
- Check Docker is running: `docker info`
- Check logs: `docker compose logs stockscan-frontend`
- Ensure port 3100 isn't already in use: `ss -tlnp | grep 3100`
