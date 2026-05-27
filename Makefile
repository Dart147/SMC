GREEN = \033[0;32m
BLUE  = \033[0;34m
RED   = \033[0;31m
NC    = \033[0m

LOCAL_COMPOSE  = docker-compose.yaml
LOCAL_ENV_FILE = backend/.env
DEV_DEPLOY     = .deploy/dev

COMPOSE_LOCAL = docker compose --env-file $(LOCAL_ENV_FILE) -f $(LOCAL_COMPOSE)

.PHONY: help \
	smc-up smc-down smc-restart \
	deploy deploy-frontend deploy-backend deploy-down \
	logs ps healthz

## Show help message
help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' Makefile | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[0;32m%-18s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Local dev (no Traefik, no DNS, no TLS). Frontend on http://localhost:8080,
# backend reachable only via nginx /api/* proxy from the frontend.
# ---------------------------------------------------------------------------

smc-up: ## Bring up the local stack on http://localhost:8080
	@echo -e ":: $(GREEN)Starting SMC local stack...$(NC)"
	@$(COMPOSE_LOCAL) up -d --build --wait
	@$(MAKE) --no-print-directory healthz

smc-down: ## Stop the local stack (keeps the postgres volume)
	@echo -e ":: $(GREEN)Stopping SMC local stack...$(NC)"
	@$(COMPOSE_LOCAL) down

smc-restart: smc-down smc-up ## Stop then start the local stack

# ---------------------------------------------------------------------------
# Operator targets (run on S2 against .deploy/dev). Joins smc-traefik so
# Traefik fronts the frontend on https://${DOMAIN}.
# ---------------------------------------------------------------------------

deploy: ## Rebuild + roll all SMC services on S2 (dev env)
	@$(DEV_DEPLOY)/deploy.sh

deploy-frontend: ## Rebuild + roll only the frontend (dev env)
	@$(DEV_DEPLOY)/deploy.sh frontend

deploy-backend: ## Rebuild + roll only the backend (dev env)
	@$(DEV_DEPLOY)/deploy.sh backend

deploy-down: ## Stop the dev env stack on S2 (keeps the postgres volume)
	@$(DEV_DEPLOY)/cleanup.sh

# ---------------------------------------------------------------------------
# Inspection (works for whichever compose file is up; pass FILE= to scope)
# ---------------------------------------------------------------------------

logs: ## Tail logs (use SERVICE=backend|frontend|postgres to scope)
	@$(COMPOSE_LOCAL) logs -f $(SERVICE)

ps: ## Show container status (local stack)
	@$(COMPOSE_LOCAL) ps

healthz: ## Probe /api/healthz from the host via the published frontend port
	@echo -e ":: $(GREEN)Probing http://localhost:8080/api/healthz...$(NC)"
	@for i in 1 2 3 4 5; do \
		curl -fs -o /dev/null http://localhost:8080/api/healthz \
			&& echo -e "==> $(BLUE)healthz ok$(NC)" && exit 0; \
		echo "  attempt $$i/5 failed, retrying in 2s..."; sleep 2; \
	done; \
	echo -e "==> $(RED)healthz failed after 5 attempts$(NC)"; exit 1
