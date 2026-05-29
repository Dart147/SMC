#!/usr/bin/env bash
# Pulls the latest :dev images from Docker Hub
# Usage:
#   ./deploy.sh                  # pull + recreate all services
#   ./deploy.sh frontend         # pull + recreate only the frontend
#   ./deploy.sh backend          # pull + recreate only the backend

set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE="../../.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> missing $ENV_FILE — copy .env to this host before deploying" >&2
  exit 1
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
