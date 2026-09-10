#!/usr/bin/env bash
#
# Build the Sphero Tournament app as a linux/amd64 (x86_64) Docker image
# and push it to Docker Hub.
#
# Usage:
#   DOCKERHUB_USER=yourname ./scripts/docker-build-push.sh            # tags :latest and :<git-sha>
#   DOCKERHUB_USER=yourname ./scripts/docker-build-push.sh v1.2.0     # tags :latest and :v1.2.0
#
# Env vars:
#   DOCKERHUB_USER   Docker Hub account/org  (required)
#   IMAGE_NAME       Repository name         (default: sphero-tournament)
#   PLATFORM         Target platform         (default: linux/amd64)
#   PUSH             Set to 0 to build only  (default: 1)

set -euo pipefail

DOCKERHUB_USER="${DOCKERHUB_USER:?Set DOCKERHUB_USER to your Docker Hub username}"
IMAGE_NAME="${IMAGE_NAME:-sphero-tournament}"
PLATFORM="${PLATFORM:-linux/amd64}"
PUSH="${PUSH:-1}"

REPO="${DOCKERHUB_USER}/${IMAGE_NAME}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Version tag: first arg, else short git sha, else timestamp
VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
fi

echo "==> Repository : ${REPO}"
echo "==> Tags       : latest, ${VERSION}"
echo "==> Platform   : ${PLATFORM}"
echo

# 1. Authenticate (no-op if a valid session already exists)
if ! docker system info 2>/dev/null | grep -q "Username: ${DOCKERHUB_USER}"; then
  echo "==> Logging in to Docker Hub as ${DOCKERHUB_USER}"
  # Non-interactive: export DOCKERHUB_TOKEN (an access token from
  # hub.docker.com > Account Settings > Personal access tokens)
  if [[ -n "${DOCKERHUB_TOKEN:-}" ]]; then
    printf '%s' "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
  else
    docker login -u "$DOCKERHUB_USER"
  fi
fi

# 2. Make sure a buildx builder exists (needed to cross-build amd64 on Apple Silicon)
BUILDER="sphero-builder"
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  echo "==> Creating buildx builder '${BUILDER}'"
  docker buildx create --name "$BUILDER" --driver docker-container --use
else
  docker buildx use "$BUILDER"
fi
docker buildx inspect --bootstrap >/dev/null

# 3. Build (and push in the same pass, which buildx does natively)
BUILD_ARGS=(
  buildx build
  --platform "$PLATFORM"
  --tag "${REPO}:${VERSION}"
  --tag "${REPO}:latest"
  --cache-from "type=registry,ref=${REPO}:buildcache"
  --file Dockerfile
  .
)

if [[ "$PUSH" == "1" ]]; then
  BUILD_ARGS+=(--cache-to "type=registry,ref=${REPO}:buildcache,mode=max" --push)
else
  # --load only supports a single platform; keeps the image in the local daemon
  BUILD_ARGS+=(--load)
fi

echo "==> docker ${BUILD_ARGS[*]}"
docker "${BUILD_ARGS[@]}"

echo
if [[ "$PUSH" == "1" ]]; then
  echo "✅ Pushed ${REPO}:${VERSION} and ${REPO}:latest (${PLATFORM})"
  echo
  echo "Run it on the x86 Linux host with:"
  echo "  docker run -d --name sphero-tournament -p 8080:80 ${REPO}:${VERSION}"
else
  echo "✅ Built ${REPO}:${VERSION} locally (not pushed)"
  echo "  docker run --rm -p 8080:80 ${REPO}:${VERSION}"
fi
