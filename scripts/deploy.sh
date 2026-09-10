#!/usr/bin/env bash
#
# Pull the latest published image and restart the app on this host.
#
# Usage:
#   ./scripts/deploy.sh              # deploy the tag in .env (or latest)
#   ./scripts/deploy.sh v1.2.0       # deploy a specific tag
#
# Reads IMAGE / TAG / HOST_PORT / HOST_BIND from .env beside
# docker-compose.yml, the same as `docker compose` does. See
# deploy/.env.example.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f docker-compose.yml ]]; then
  echo "docker-compose.yml not found in ${ROOT_DIR}" >&2
  exit 1
fi

# An explicit tag argument wins over whatever .env says
if [[ -n "${1:-}" ]]; then
  export TAG="$1"
fi

echo "==> Current"
docker compose ps --format 'table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' || true
echo

echo "==> Pulling"
docker compose pull

echo
echo "==> Restarting"
# Compose recreates the container only if the image actually changed
docker compose up -d

echo
echo "==> Now running"
docker compose ps --format 'table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

echo
PORT="$(grep -E '^HOST_PORT=' .env 2>/dev/null | cut -d= -f2)"
PORT="${PORT:-8080}"
if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:${PORT}/"; then
  echo "✅ Responding on 127.0.0.1:${PORT}"
else
  echo "⚠️  No response on 127.0.0.1:${PORT} yet — check: docker compose logs" >&2
fi

echo
echo "Old images can be reclaimed with: docker image prune -f"
