#!/usr/bin/env bash
# Deploy an isolated per-PR snapshot stack as Compose project
# `smc-pr-$PR_NUMBER`, reachable at pr-$PR_NUMBER.$DOMAIN via smc-traefik.
#
# Runs inside an temp clone (SMC-CD ssh.go re-clones the repo per
# deploy and wipes it afterwards)
#
# The SMC-CD SSH adapter passes the changed component, and each
# component deploys independently so a PR's frontend and backend webhooks
# never wait on each other's image:
#   ./deploy.sh backend    # postgres + backend (backend needs the DB)
#   ./deploy.sh frontend   # frontend only (nginx lazy-resolves backend)
#   ./deploy.sh            # whole stack (fallback)
#
# Env (required, injected by SMC-CD):
#   PR_NUMBER     PR number -> project name, image tag, hostname
#   SMC_ENV_FILE  path to the stable .env on the host (ssh.env_file)

set -euo pipefail
cd "$(dirname "$0")"

: "${PR_NUMBER:?PR_NUMBER must be set}"
SMC_ENV_FILE="${SMC_ENV_FILE:?SMC_ENV_FILE must be set on the host}"
ENV_FILE="../../.env"
export PR_NUMBER   # Compose interpolates ${PR_NUMBER} in compose.yaml

if [[ ! -f "$SMC_ENV_FILE" ]]; then
  echo "==> missing stable env file: $SMC_ENV_FILE" >&2
  exit 1
fi

# Copy the host .env into the repo for Compose, unless it's already the
# same file (cp rejects copying a file onto itself).
src_real="$(readlink -f "$SMC_ENV_FILE")"
dst_real="$(readlink -f "$ENV_FILE" 2>/dev/null || true)"
if [[ "$src_real" != "$dst_real" ]]; then
  cp "$SMC_ENV_FILE" "$ENV_FILE"
fi

PROJECT="smc-pr-${PR_NUMBER}"
COMPOSE="docker compose -p $PROJECT --env-file $ENV_FILE"
COMPONENT="${1:-}"

case "$COMPONENT" in
  backend)
    echo ":: [$PROJECT] pulling backend image..."
    $COMPOSE pull backend
    echo ":: [$PROJECT] starting postgres + backend..."
    $COMPOSE up -d --wait postgres backend
    ;;
  frontend)
    echo ":: [$PROJECT] pulling frontend image..."
    $COMPOSE pull frontend
    echo ":: [$PROJECT] starting frontend..."
    # --no-deps: don't drag in backend/postgres; nginx's lazy resolver
    # tolerates the backend being absent until its own webhook lands.
    $COMPOSE up -d --no-deps --wait frontend
    ;;
  *)
    echo ":: [$PROJECT] no component arg — pulling + starting full stack..."
    $COMPOSE pull
    $COMPOSE up -d --wait
    ;;
esac

echo "==> snapshot deploy complete: project $PROJECT (pr-${PR_NUMBER})"
