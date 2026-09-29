#!/bin/sh

set -e

# ==============================================================
# 	This script is a helper that runs before the official
#	PostgreSQL process starts from the image's entrypoint.
#	
#	It fetches the db credentials from Vault, using the CA
#	and AppRole auth system, then exports them into variables
#	that the official script will use for initialisation.
# ==============================================================

# Variables
VAULT_ADDR="https://vault:8200"
POSTGRES_CREDS_DIR="/vault/postgres"
CA_CERT="$POSTGRES_CREDS_DIR/ca.crt"	

# Read and retrieve the AppRole credentials for auth
#	- send a request to obtain credentials
#	- extract the temporary client token from the auth response
POSTGRES_ROLE_ID=$(cat "$POSTGRES_CREDS_DIR/.role-id")
POSTGRES_SECRET_ID=$(cat "$POSTGRES_CREDS_DIR/.secret-id")
echo "[~] Authentification with Vault via AppRole"
APPROLE_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
	--request POST \
	--data "{\"role_id\":\"$POSTGRES_ROLE_ID\",\"secret_id\":\"$POSTGRES_SECRET_ID\"}" \
	"$VAULT_ADDR/v1/auth/approle/login")

VAULT_TOKEN=$(echo "$APPROLE_RESPONSE" | jq --raw-output '.auth.client_token')
if [ "$VAULT_TOKEN" = "null" ] || [ -z "$VAULT_TOKEN" ]; then
	echo "[!] Error: Postgres failed to authenticate with Vault"
	exit 1
fi

# Get the PostgreSQL credentials
# 	- fetch the postgres creds from Vault KV
#	- let kv wrap the secret under "data.data"
#	- export the values as postgres will use them
echo "[~] Fetching postgres credentials from Vault KV"
SECRET_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
	--header "X-Vault-Token: $VAULT_TOKEN" \
	"$VAULT_ADDR/v1/secret/data/postgres")

export POSTGRES_USER=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_user')
export POSTGRES_PASSWORD=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_password')
export POSTGRES_DB=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_db')

if [ "$POSTGRES_USER" = "null" ] || [ "$POSTGRES_PASSWORD" = "null" ] || [ "$POSTGRES_DB" = "null" ]; then
	echo "[!] Error: missing postgres credentials in Vault's response"
	exit 1
fi

# Launch the official PostgreSQL entrypoint
#	- let exec replace the init_postgress process, postgres gets PID1
echo "[~] Starting postgres.."
exec docker-entrypoint.sh postgres