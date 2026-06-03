#!/usr/bin/env bash
# Pulls the latest :dev images from Docker Hub and re-creates the stack.
#
# Runs inside an temp clone (SMC-CD ssh.go re-clones the repo per
# deploy and wipes it afterwards)
#
# Usage:
#   ./deploy.sh                  # pull + recreate all services
#   ./deploy.sh frontend         # pull + recreate only the frontend
#   ./deploy.sh backend          # pull + recreate only the backend
#
# Env (required):
#   SMC_ENV_FILE  path to the stable .env on the host

set -euo pipefail

cd "$(dirname "$0")"

SMC_ENV_FILE="${SMC_ENV_FILE:?SMC_ENV_FILE must be set on the host}"
ENV_FILE="../../.env"

if [[ ! -f "$SMC_ENV_FILE" ]]; then
  echo "==> missing stable env file: $SMC_ENV_FILE" >&2
  exit 1
fi

# Copy the host .env into the repo for Compose, unless it’s already the same file (cp rejects it)
src_real="$(readlink -f "$SMC_ENV_FILE")"
dst_real="$(readlink -f "$ENV_FILE" 2>/dev/null || true)"
if [[ "$src_real" != "$dst_real" ]]; then
  cp "$SMC_ENV_FILE" "$ENV_FILE"
fi

COMPOSE="docker compose --env-file $ENV_FILE"
COMPONENT="${1:-}"

if [[ -n "$COMPONENT" ]]; then
  echo ":: Pulling latest $COMPONENT image..."
  $COMPOSE pull "$COMPONENT"
  echo ":: Recreating $COMPONENT..."
  $COMPOSE up -d --no-deps --wait "$COMPONENT"
else
  echo ":: Pulling latest images..."
  $COMPOSE pull
  echo ":: Recreating services with changed images..."
  $COMPOSE up -d --wait
fi

echo "==> deploy complete"
