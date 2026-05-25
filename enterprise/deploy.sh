#!/bin/bash
# StockScan Web Portal - Deploy Script
#
# Usage:
#   ./deploy.sh              # Pull latest image and start
#   ./deploy.sh --update     # Pull latest image and restart
#   ./deploy.sh --stop       # Stop the portal
#   ./deploy.sh --logs       # View logs
#   ./deploy.sh --status     # Check status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ACTION="${1:---start}"

case "$ACTION" in
    --stop)
        echo "Stopping StockScan portal..."
        docker compose down
        echo "Stopped."
        ;;
    --logs)
        docker compose logs -f stockscan-frontend
        ;;
    --status)
        echo "-- Container Status --"
        docker compose ps
        echo ""
        PORTAL_URL=$(grep NEXTAUTH_URL .env 2>/dev/null | cut -d= -f2 || echo "http://localhost:3100")
        echo "-- Health Check --"
        if curl -s -o /dev/null -w "%{http_code}" "$PORTAL_URL" | grep -q "200\|302"; then
            echo "Portal is reachable at $PORTAL_URL"
        else
            echo "Portal is not responding at $PORTAL_URL"
        fi
        ;;
    --update)
        echo "Updating StockScan portal..."
        docker compose pull
        docker compose up -d
        echo "Updated and restarted."
        docker compose ps
        ;;
    --start|*)
        # Check for .env
        if [ ! -f .env ]; then
            echo "No .env file found. Creating from template..."
            if [ -f .env.enterprise.example ]; then
                cp .env.enterprise.example .env
                echo "Please edit .env with your settings, then run this script again."
                echo "  nano .env"
                exit 1
            else
                echo "No .env.enterprise.example found. Please create a .env file."
                exit 1
            fi
        fi

        echo "=========================================="
        echo "  StockScan Web Portal - Deploy"
        echo "=========================================="
        echo ""

        # Show config
        echo "  Configuration:"
        grep -v '^#' .env | grep -v '^$' | while read line; do
            echo "    $line"
        done
        echo ""

        # Pull and start
        echo "Pulling latest image..."
        docker compose pull

        echo "Starting portal..."
        docker compose up -d

        echo ""
        docker compose ps

        PORTAL_URL=$(grep NEXTAUTH_URL .env | cut -d= -f2)
        echo ""
        echo "-- Access ------------------------------------"
        echo "  Web Portal: $PORTAL_URL"
        echo "  Logs:       ./deploy.sh --logs"
        echo "  Status:     ./deploy.sh --status"
        echo "  Update:     ./deploy.sh --update"
        echo "  Stop:       ./deploy.sh --stop"
        echo "----------------------------------------------"
        ;;
esac
