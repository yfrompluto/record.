#!/bin/sh
set -e

# =====================================================================
#   Entrypoint: fetches DATABASE_URL from Vault via AppRole, applies
#   pending Prisma migrations, then starts the NestJS application.
# =====================================================================

VAULT_ADDR="https://vault:8200"
ROLE_ID_FILE=/vault/backend/.role-id
SECRET_ID_FILE=/vault/backend/.secret-id
CA_CERT=/vault/backend/ca.crt

echo "[~] Authenticating with Vault (AppRole)..."
ROLE_ID=$(cat "$ROLE_ID_FILE")
SECRET_ID=$(cat "$SECRET_ID_FILE")

CLIENT_TOKEN=$(curl -s --cacert "$CA_CERT" \
  --request POST \
  --data "{\"role_id\":\"$ROLE_ID\",\"secret_id\":\"$SECRET_ID\"}" \
  "$VAULT_ADDR/v1/auth/approle/login" | jq -r '.auth.client_token')

if [ -z "$CLIENT_TOKEN" ] || [ "$CLIENT_TOKEN" = "null" ]; then
  echo "[!] Failed to authenticate with Vault"
  exit 1
fi

echo "[~] Fetching backend secrets..."
SECRET_JSON=$(curl -s --cacert "$CA_CERT" \
  --header "X-Vault-Token: $CLIENT_TOKEN" \
  "$VAULT_ADDR/v1/secret/data/backend")

POSTGRES_USER=$(echo "$SECRET_JSON" | jq -r '.data.data.postgres_user')
POSTGRES_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.data.data.postgres_password')
POSTGRES_DB=$(echo "$SECRET_JSON" | jq -r '.data.data.postgres_db')

# URL-encode user & password to avoid breaking the connection string
ENCODED_USER=$(echo -n "$POSTGRES_USER" | jq -sRr @uri)
ENCODED_PASSWORD=$(echo -n "$POSTGRES_PASSWORD" | jq -sRr @uri)

export DATABASE_URL="postgresql://${ENCODED_USER}:${ENCODED_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"

echo "[~] Ensuring avatar directory exists before runtime..."
mkdir -p /avatars

echo "[~] Running Prisma migrations..."
npx prisma migrate deploy

echo "[~] Starting NestJS application..."
exec node dist/main.js