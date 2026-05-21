# StockScan Enterprise — Web Portal Deployment

This guide explains how to deploy the StockScan web portal alongside your existing standalone NestJS API, giving enterprise customers a full browser-based inventory management interface.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Enterprise Server                     │
│                                                         │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │  StockScan API   │    │  StockScan Web Portal     │  │
│  │  (NestJS)        │◄───│  (Next.js Frontend)       │  │
│  │  Port 3000       │    │  Port 3100                │  │
│  └──────────────────┘    └───────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ▲                          ▲
         │                          │
    Mobile App               Browser / Electron
    (direct API)             (via web portal)
```

- **API (Port 3000)**: Your existing NestJS backend Docker container — no changes needed
- **Web Portal (Port 3100)**: The frontend container serves the StockScan UI and proxies API calls to the backend

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Your StockScan API already running (e.g., on port 3000)

### 1. Build the frontend image

```bash
# From the enterprise/ directory
docker build -f Dockerfile.frontend -t stockscan-frontend ../nextjs_space
```

### 2. Configure environment

```bash
cp .env.enterprise.example .env
```

Edit `.env`:
```
# Point to your running API
BACKEND_API_URL=http://192.168.1.101:3000

# The URL users will access the portal on
NEXTAUTH_URL=http://192.168.1.101:3100

# Must match your API's JWT secret
NEXTAUTH_SECRET=your-jwt-secret-here
```

### 3. Start the frontend

```bash
# Using docker-compose (recommended)
docker-compose up -d

# Or run directly
docker run -d \
  --name stockscan-frontend \
  -p 3100:3000 \
  -e BACKEND_API_URL=http://192.168.1.101:3000 \
  -e NEXTAUTH_URL=http://192.168.1.101:3100 \
  -e NEXTAUTH_SECRET=your-jwt-secret-here \
  --add-host host.docker.internal:host-gateway \
  stockscan-frontend
```

### 4. Access the portal

Open `http://192.168.1.101:3100` in a browser and log in with your StockScan credentials.

## Desktop App (Electron)

When using the StockScan Desktop app with an enterprise setup:

1. Launch the app → Setup Wizard appears
2. Select **Enterprise Server**
3. Enter your **API URL**: `http://192.168.1.101:3000`
4. Enter your **Web Portal URL**: `http://192.168.1.101:3100`
5. Give it a name (e.g., "Office Server")
6. Click **Continue**

The desktop app will load your local web portal and route all API calls through it to your local API.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_API_URL` | Yes | URL of your NestJS API (e.g., `http://192.168.1.101:3000`) |
| `NEXTAUTH_URL` | Yes | Public URL of the web portal (e.g., `http://192.168.1.101:3100`) |
| `NEXTAUTH_SECRET` | Yes | JWT secret — must match your API's secret |

## Networking Notes

### API on the same machine
If the API runs on the same Docker host:
- Use `http://host.docker.internal:3000` as `BACKEND_API_URL`
- The `docker-compose.yml` includes `extra_hosts` for this

### API on a different machine
Use the API machine's IP directly:
- `BACKEND_API_URL=http://192.168.1.100:3000`

### API in the same Docker network
If you add both containers to the same Docker network:
- `BACKEND_API_URL=http://stockscan-api:3000` (using the service name)
- Uncomment the `networks` section in `docker-compose.yml`

## Helper Scripts

### `build.sh` — Build Docker image locally
```bash
./build.sh                  # Build with 'latest' tag
./build.sh 1.2.0            # Build with specific version
./build.sh 1.2.0 --push     # Build and push to registry
```

### `deploy.sh` — One-command deploy & manage
```bash
./deploy.sh                 # Build + start (first time creates .env from template)
./deploy.sh --rebuild       # Force rebuild from scratch
./deploy.sh --stop          # Stop the frontend
./deploy.sh --logs          # View live logs
./deploy.sh --status        # Check if frontend is running
```

## CI/CD — Automated Docker Builds

### GitHub Actions (recommended)

A workflow is provided at `.github/workflows/build-frontend.yml` that automatically builds and pushes the frontend Docker image to **GitHub Container Registry** (ghcr.io).

#### Setup

1. **Repository structure** — Your repo should look like:
   ```
   your-repo/
   ├── nextjs_space/          ← Frontend source code
   ├── enterprise/
   │   ├── Dockerfile.frontend
   │   ├── docker-compose.yml
   │   ├── .github/workflows/build-frontend.yml
   │   └── ...
   └── ...
   ```
   
   Copy the `.github/` folder from `enterprise/.github/` to your repo root:
   ```bash
   cp -r enterprise/.github .github
   ```

2. **Enable GitHub Packages** — Go to your repo → Settings → Actions → General → Workflow permissions → set to "Read and write permissions"

3. **Triggers**:
   - **Push to `main`** — Automatically builds and pushes `latest` tag
   - **Git tag `v*.*.*`** — Builds a versioned release (e.g., `v1.2.0` → tag `1.2.0`)
   - **Manual dispatch** — Click "Run workflow" in the Actions tab with optional version

4. **Pull on your enterprise server**:
   ```bash
   # First time: login to GHCR
   echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   
   # Pull and run
   docker pull ghcr.io/your-org/stockscan-frontend:latest
   docker-compose up -d
   ```

#### Using a pre-built image in docker-compose

Update `docker-compose.yml` to use the registry image instead of building locally:
```yaml
stockscan-frontend:
  image: ghcr.io/your-org/stockscan-frontend:latest
  # Remove the 'build' section
  ports:
    - "3100:3000"
  environment:
    - BACKEND_API_URL=http://host.docker.internal:3000
    - NEXTAUTH_URL=http://your-server:3100
    - NEXTAUTH_SECRET=your-secret
```

This means your enterprise servers only need Docker — no Node.js, no source code, no build step.

## Updating the Frontend

### Option A: Automated (CI/CD)
Push to `main` → GitHub Actions builds → Pull on enterprise server:
```bash
docker pull ghcr.io/your-org/stockscan-frontend:latest
docker-compose down && docker-compose up -d
```

### Option B: Manual
```bash
./build.sh 1.3.0
docker-compose down && docker-compose up -d
```

## Troubleshooting

### Portal loads but API calls fail
- Check `BACKEND_API_URL` is reachable from inside the container:
  ```bash
  docker exec stockscan-frontend wget -qO- http://your-api:3000/api/health
  ```
- Ensure the API's CORS settings allow requests from the portal URL

### "Unable to Connect" error
- Verify the API is running: `curl http://192.168.1.101:3000/api/health`
- Check Docker logs: `docker logs stockscan-frontend`

### Login fails
- Ensure `NEXTAUTH_SECRET` matches the JWT secret used by your API
- Check that the API's authentication endpoints are working
