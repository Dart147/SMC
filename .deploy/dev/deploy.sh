#!/usr/bin/env bash
# Rolling deploy for the SMC dev environment on S2.
# Usage:
#   ./deploy.sh                  # rebuild + roll all services
#   ./deploy.sh frontend         # rebuild + roll only the frontend container
#   ./deploy.sh backend          # rebuild + roll only the backend container
# Idempotent. Preserves the smc-postgres-data volume.

set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE="../../backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> missing $ENV_FILE — copy backend/.env to this host before deploying" >&2
  exit 1
fi

COMPOSE="docker compose --env-file $ENV_FILE"
COMPONENT="${1:-}"

if [[ -n "$COMPONENT" ]]; then
  echo ":: Rolling SMC $COMPONENT..."
  $COMPOSE up -d --no-deps --build --wait "$COMPONENT"
else
  echo ":: Rolling all SMC services..."
  $COMPOSE up -d --build --wait
fi

echo "==> deploy complete"
