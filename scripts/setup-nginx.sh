#!/usr/bin/env bash
#
# Install the host nginx reverse proxy for Sphero Tournament, using the
# values in .env. Optionally obtain a Let's Encrypt certificate.
#
# Usage:
#   sudo ./scripts/setup-nginx.sh              # install the HTTP server block
#   sudo ./scripts/setup-nginx.sh --tls        # ...then run certbot for TLS
#
# Reads from .env (see deploy/.env.example):
#   DOMAIN       required, e.g. sphero.dannyslab.com
#   HOST_PORT    container's host port, default 8080
#   HOST_BIND    interface the container is bound to, default 127.0.0.1
#   LETSENCRYPT_EMAIL  used with --tls for expiry notices
#
# Run DNS first: DOMAIN must already resolve to this server, or certbot
# validation will fail. The script checks and warns.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TEMPLATE="deploy/nginx/site.conf.template"
WANT_TLS=0
[[ "${1:-}" == "--tls" ]] && WANT_TLS=1

# ---- load .env -------------------------------------------------------------

if [[ -f .env ]]; then
  set -a; . ./.env; set +a
else
  echo "No .env found. Copy the template first:" >&2
  echo "  cp deploy/.env.example .env" >&2
  exit 1
fi

DOMAIN="${DOMAIN:-}"
HOST_PORT="${HOST_PORT:-8080}"
HOST_BIND="${HOST_BIND:-127.0.0.1}"

if [[ -z "$DOMAIN" ]]; then
  echo "DOMAIN is not set in .env (e.g. DOMAIN=sphero.dannyslab.com)" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Template not found: ${TEMPLATE}" >&2
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0 ${1:-}" >&2
  exit 1
fi

# The proxy talks to the container over loopback regardless of how the
# container is bound; 0.0.0.0 still accepts connections on 127.0.0.1.
UPSTREAM="127.0.0.1:${HOST_PORT}"

echo "==> Domain   : ${DOMAIN}"
echo "==> Upstream : ${UPSTREAM}"
echo

# ---- sanity checks ---------------------------------------------------------

if [[ "$HOST_BIND" != "127.0.0.1" ]]; then
  echo "⚠️  HOST_BIND is '${HOST_BIND}', so the app is also reachable directly"
  echo "    at http://<server-ip>:${HOST_PORT}, bypassing TLS."
  echo "    Set HOST_BIND=127.0.0.1 in .env and run: docker compose up -d"
  echo
fi

RESOLVED="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1 || true)"
PUBLIC_IP="$(curl -4 -fsS --max-time 5 ifconfig.me 2>/dev/null || true)"
if [[ -z "$RESOLVED" ]]; then
  echo "⚠️  ${DOMAIN} does not resolve yet. Add the DNS A record first;"
  echo "    certbot validation will fail until it does."
  echo
elif [[ -n "$PUBLIC_IP" && "$RESOLVED" != "$PUBLIC_IP" ]]; then
  echo "⚠️  ${DOMAIN} resolves to ${RESOLVED}, but this host appears to be ${PUBLIC_IP}."
  echo
else
  echo "✅ ${DOMAIN} resolves to ${RESOLVED}"
  echo
fi

# ---- install nginx if missing ----------------------------------------------

if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Installing nginx"
  apt-get update -qq
  apt-get install -y nginx
fi

AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

# Never clobber a config certbot has already added TLS to
if [[ -f "$AVAILABLE" ]] && grep -q "listen 443" "$AVAILABLE"; then
  echo "==> ${AVAILABLE} already has a TLS block; leaving it alone."
  echo "    Delete it first if you want to regenerate from the template."
else
  echo "==> Writing ${AVAILABLE}"
  sed -e "s/__DOMAIN__/${DOMAIN}/g" -e "s|__UPSTREAM__|${UPSTREAM}|g" \
    "$TEMPLATE" > "$AVAILABLE"
fi

ln -sfn "$AVAILABLE" "$ENABLED"
rm -f /etc/nginx/sites-enabled/default

echo "==> Testing configuration"
nginx -t

echo "==> Reloading nginx"
systemctl reload nginx

# ---- firewall --------------------------------------------------------------

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  echo "==> Opening 80/443"
  ufw allow 'Nginx Full' >/dev/null
  ufw delete allow "${HOST_PORT}/tcp" >/dev/null 2>&1 || true
fi

# ---- TLS -------------------------------------------------------------------

if [[ $WANT_TLS -eq 1 ]]; then
  echo
  echo "==> Obtaining certificate for ${DOMAIN}"
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get install -y certbot python3-certbot-nginx
  fi

  CERTBOT_ARGS=(--nginx -d "$DOMAIN" --redirect --agree-tos --non-interactive)
  if [[ -n "${LETSENCRYPT_EMAIL:-}" ]]; then
    CERTBOT_ARGS+=(-m "$LETSENCRYPT_EMAIL")
  else
    CERTBOT_ARGS+=(--register-unsafely-without-email)
    echo "    LETSENCRYPT_EMAIL not set — registering without one."
    echo "    You will get no expiry warnings if renewal ever breaks."
  fi

  certbot "${CERTBOT_ARGS[@]}"

  echo
  echo "==> Renewal check"
  certbot renew --dry-run
fi

echo
echo "✅ Done."
if [[ $WANT_TLS -eq 1 ]]; then
  echo "   https://${DOMAIN}"
else
  echo "   http://${DOMAIN}"
  echo
  echo "   Add TLS once DNS resolves:  sudo $0 --tls"
fi
