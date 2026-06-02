#!/usr/bin/env bash
# Stop the SMC dev stack on S2. Keeps the smc-postgres-data volume.

set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE="../../.env"
docker compose --env-file "$ENV_FILE" down
echo "==> SMC dev stack stopped"
