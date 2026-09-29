#!/bin/sh
set -e

# =====================================================================
#   Runs any Prisma CLI command inside the backend container, with
#   DATABASE_URL automatically built from Vault credentials.
#   Usage:
#     ./scripts/prisma.sh migrate dev --name <name>
#     ./scripts/prisma.sh migrate reset
#     ./scripts/prisma.sh migrate status
#     ./scripts/prisma.sh studio
# =====================================================================

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR/../src"
 
if [ "$#" -eq 0 ]; then
	echo "Usage: ./scripts/prisma.sh <prisma command> [args...]"
	echo "Examples:"
	echo "	./scripts/prisma.sh migrate dev --name add feature"
	echo "	./scripts/prisma.sh migrate reset"
	echo "	./scripts/prisma.sh migrate status"
	exit 1
 
fi
 
echo "[~] Waiting for backend container to be available..."
ATTEMPTS=0
until docker compose exec -T backend echo "ready" >/dev/null 2>&1; do
	ATTEMPTS=$((ATTEMPTS + 1))
	if [ "$ATTEMPTS" -ge 15 ]; then
		echo "[!] Backend container did not become ready in time."
		echo "[!] Check its status with: docker compose ps"
		exit 1
	fi
	sleep 2
done
 
echo "[~] Fetching Vault root token..."
VAULT_TOKEN=$(docker compose exec -T vault cat /vault/data/secrets/vault-root-token)
if [ -z "$VAULT_TOKEN" ]; then
	echo "[!] Failed to fetch Vault root token."
	exit 1
fi
 
echo "[~] Fetching Postgres credentials from Vault..."
POSTGRES_USER=$(docker compose exec -T -e VAULT_TOKEN="$VAULT_TOKEN" vault vault kv get -mount=secret -field=postgres_user backend)
POSTGRES_PASSWORD=$(docker compose exec -T -e VAULT_TOKEN="$VAULT_TOKEN" vault vault kv get -mount=secret -field=postgres_password backend)
POSTGRES_DB="transcendence"
 
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
	echo "[!] One or more Postgres credentials are empty. Aborting."
	exit 1;
fi
 
echo "[~] Building DATABASE_URL..."
DATABASE_URL=$(docker compose exec -T backend node -e "
const u = encodeURIComponent('$POSTGRES_USER');
const p = encodeURIComponent('$POSTGRES_PASSWORD');
console.log(\`postgresql://\${u}:\${p}@postgres:5432/$POSTGRES_DB?schema=public\`);
")
 
echo "[~] Running npx prisma $*"
docker compose exec -e DATABASE_URL="$DATABASE_URL" backend npx prisma "$@"
 
echo "[~] Done!"