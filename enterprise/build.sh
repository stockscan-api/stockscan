#!/bin/bash
# ──────────────────────────────────────────────────────────
# StockScan Frontend — Local Docker Build Script
# ──────────────────────────────────────────────────────────
# Usage:
#   ./build.sh                  # Build with 'latest' tag
#   ./build.sh 1.2.0            # Build with specific version
#   ./build.sh 1.2.0 --push     # Build and push to registry
# ──────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION="${1:-latest}"
IMAGE_NAME="stockscan-frontend"
PUSH_FLAG="${2:-}"

echo "══════════════════════════════════════════════════"
echo "  StockScan Frontend — Docker Build"
echo "══════════════════════════════════════════════════"
echo "  Version:  $VERSION"
echo "  Context:  $PROJECT_ROOT/nextjs_space"
echo "  Image:    $IMAGE_NAME:$VERSION"
echo "══════════════════════════════════════════════════"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Copy .dockerignore to build context
cp "$SCRIPT_DIR/.dockerignore" "$PROJECT_ROOT/nextjs_space/.dockerignore"

# Build the image
echo "🔨 Building Docker image..."
docker build \
    -f "$SCRIPT_DIR/Dockerfile.frontend" \
    -t "$IMAGE_NAME:$VERSION" \
    -t "$IMAGE_NAME:latest" \
    "$PROJECT_ROOT/nextjs_space"

# Clean up copied .dockerignore
rm -f "$PROJECT_ROOT/nextjs_space/.dockerignore"

echo ""
echo "✅ Build complete: $IMAGE_NAME:$VERSION"
echo ""

# Show image size
docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# Optional push
if [ "$PUSH_FLAG" = "--push" ]; then
    REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
    OWNER="${GITHUB_REPOSITORY_OWNER:-your-org}"
    FULL_IMAGE="$REGISTRY/$OWNER/$IMAGE_NAME"
    
    echo ""
    echo "📤 Pushing to $FULL_IMAGE..."
    docker tag "$IMAGE_NAME:$VERSION" "$FULL_IMAGE:$VERSION"
    docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE:latest"
    docker push "$FULL_IMAGE:$VERSION"
    docker push "$FULL_IMAGE:latest"
    echo "✅ Pushed successfully"
fi

echo ""
echo "── Quick Start ──────────────────────────────────"
echo "  docker run -d -p 3100:3000 \\"
echo "    -e BACKEND_API_URL=http://your-api:3000 \\"
echo "    -e NEXTAUTH_URL=http://your-server:3100 \\"
echo "    -e NEXTAUTH_SECRET=your-secret \\"
echo "    $IMAGE_NAME:$VERSION"
echo "─────────────────────────────────────────────────"
