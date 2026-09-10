# syntax=docker/dockerfile:1

# ---- Stage 1: build the static assets ----
# Pinned to BUILDPLATFORM so the bundle is compiled natively on the build host
# (e.g. arm64 Mac) instead of under QEMU emulation. Vite output is plain
# JS/CSS/HTML, so it is identical regardless of the architecture that built it.
FROM --platform=$BUILDPLATFORM oven/bun:1-alpine AS build

WORKDIR /app

# Install deps first so this layer caches until the lockfile changes
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the Vite bundle
COPY . .
RUN bun run build

# ---- Stage 2: serve with nginx (this is the stage that is linux/amd64) ----
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
