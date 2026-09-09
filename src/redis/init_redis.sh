#!/bin/sh
set -e

# Variables
VAULT_ADDR="https://vault:8200"
REDIS_CREDS_DIR="/vault/redis"
CA_CERT="$REDIS_CREDS_DIR/ca.crt"
ROLE_ID_FILE="$REDIS_CREDS_DIR/.role-id"
SECRET_ID_FILE="$REDIS_CREDS_DIR/.secret-id"

# Waiting for credentials : wait until the three required files are available on the shared volume
echo "[~] Waiting for Vault credentials.."
until [ -f "$ROLE_ID_FILE" ] && [ -f "$SECRET_ID_FILE" ] && [ -f "$CA_CERT" ]; do
	sleep 1
done

ROLE_ID=$(cat "$ROLE_ID_FILE")
SECRET_ID=$(cat "$SECRET_ID_FILE")

# AppRole authentication
echo "[~] Authenticating to Vault via AppRole.."
APPROLE_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
	--request POST \
	--data "{\"role_id\":\"$ROLE_ID\",\"secret_id\":\"$SECRET_ID\"}" \
	"$VAULT_ADDR/v1/auth/approle/login")

VAULT_TOKEN=$(echo "$APPROLE_RESPONSE" | jq --raw-output '.auth.client_token')
if [ "$VAULT_TOKEN" = "null" ] || [ -z "$VAULT_TOKEN" ]; then
	echo "[!] Error: Redis failed to authenticate with Vault" >&2
	exit 1
fi

# Get the Redis password
echo "[~] Fetching redis credentials from Vault KV"
SECRET_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
	--header "X-Vault-Token: $VAULT_TOKEN" \
	"$VAULT_ADDR/v1/secret/data/redis")

REDIS_PASSWORD=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.redis_password')

if [ "$REDIS_PASSWORD" = "null" ] || [ -z "$REDIS_PASSWORD" ]; then
	echo "[!] Error: missing redis_password in Vault's response" >&2
	exit 1
fi

# Writing the password to a file so the healthcheck (redis-cli) can read it
echo -n "$REDIS_PASSWORD" > "$REDIS_CREDS_DIR/redis_password"
chmod 600 "$REDIS_CREDS_DIR/redis_password"

# Launch redis-server
#  - let exec replace this process, redis-server gets PID 1
echo "[~] Starting redis.."
exec redis-server --requirepass "$REDIS_PASSWORD" --bind 0.0.0.0 --protected-mode yes