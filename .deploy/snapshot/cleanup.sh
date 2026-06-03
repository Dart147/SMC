#!/usr/bin/env bash
# Tear down the per-PR snapshot stack on PR close
# Wipes the project's postgres volume too

set -euo pipefail
cd "$(dirname "$0")"

: "${PR_NUMBER:?PR_NUMBER must be set}"
SMC_ENV_FILE="${SMC_ENV_FILE:?SMC_ENV_FILE must be set on the host}"
ENV_FILE="../../.env"
export PR_NUMBER

if [[ -f "$SMC_ENV_FILE" ]]; then
  src_real="$(readlink -f "$SMC_ENV_FILE")"
  dst_real="$(readlink -f "$ENV_FILE" 2>/dev/null || true)"
  if [[ "$src_real" != "$dst_real" ]]; then
    cp "$SMC_ENV_FILE" "$ENV_FILE"
  fi
fi

PROJECT="smc-pr-${PR_NUMBER}"
docker compose -p "$PROJECT" --env-file "$ENV_FILE" down -v
echo "==> snapshot stack torn down: $PROJECT"
