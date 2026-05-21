#!/bin/bash
# ──────────────────────────────────────────────────────────
# StockScan Enterprise — One-Command Deploy
# ──────────────────────────────────────────────────────────
# Builds the frontend image and starts it alongside your API.
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - Your StockScan API running on the specified port
#   - .env file configured (copy from .env.enterprise.example)
#
# Usage:
#   ./deploy.sh              # Build + start
#   ./deploy.sh --rebuild    # Force rebuild from scratch
#   ./deploy.sh --stop       # Stop the frontend
#   ./deploy.sh --logs       # View logs
#   ./deploy.sh --status     # Check status
# ──────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ACTION="${1:---start}"

case "$ACTION" in
    --stop)
        echo "🛑 Stopping StockScan frontend..."
        docker-compose down
        echo "✅ Stopped"
        ;;
    --logs)
        docker-compose logs -f stockscan-frontend
        ;;
    --status)
        echo "── Container Status ──"
        docker-compose ps
        echo ""
        # Try to reach the frontend
        PORTAL_URL=$(grep NEXTAUTH_URL .env 2>/dev/null | cut -d= -f2 || echo "http://localhost:3100")
        echo "── Health Check ──"
        if curl -s -o /dev/null -w "%{http_code}" "$PORTAL_URL" | grep -q "200\|302"; then
            echo "✅ Frontend is reachable at $PORTAL_URL"
        else
            echo "❌ Frontend is not responding at $PORTAL_URL"
        fi
        ;;
    --rebuild)
        echo "🔨 Rebuilding from scratch..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        echo "✅ Rebuilt and started"
        docker-compose ps
        ;;
    --start|*)
        # Check for .env
        if [ ! -f .env ]; then
            echo "⚠️  No .env file found. Creating from template..."
            if [ -f .env.enterprise.example ]; then
                cp .env.enterprise.example .env
                echo "📝 Please edit .env with your settings, then run this script again."
                echo "   nano .env"
                exit 1
            else
                echo "❌ No .env.enterprise.example found either. Please create a .env file."
                exit 1
            fi
        fi
        
        echo "══════════════════════════════════════════════════"
        echo "  StockScan Enterprise — Frontend Deploy"
        echo "══════════════════════════════════════════════════"
        echo ""
        
        # Show config
        echo "  Configuration:"
        grep -v '^#' .env | grep -v '^$' | while read line; do
            echo "    $line"
        done
        echo ""
        
        # Build and start
        echo "🔨 Building frontend image..."
        docker-compose build
        
        echo "🚀 Starting frontend..."
        docker-compose up -d
        
        echo ""
        echo "✅ StockScan frontend is starting!"
        echo ""
        docker-compose ps
        
        PORTAL_URL=$(grep NEXTAUTH_URL .env | cut -d= -f2)
        echo ""
        echo "── Access ──────────────────────────────────────"
        echo "  Web Portal: $PORTAL_URL"
        echo "  Logs:       ./deploy.sh --logs"
        echo "  Status:     ./deploy.sh --status"
        echo "  Stop:       ./deploy.sh --stop"
        echo "─────────────────────────────────────────────────"
        ;;
esac
