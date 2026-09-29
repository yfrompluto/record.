#!/bin/sh
set -e

# =====================================================================
#     Disaster recovery script. Restores the database from a given
#     backup file (or the most recent one if none specified).
#     Usage: restore.sh [backup_filename]
# =====================================================================

VAULT_ADDR="https://vault:8200"
BACKUP_CREDS_DIR="/vault/backup"
CA_CERT="$BACKUP_CREDS_DIR/ca.crt"
BACKUP_DIR="/backups"

if [ -n "$1" ]; then
    BACKUP_FILE="$BACKUP_DIR/$1"
else
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -n 1)
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "[!] Error: No backup file found (looked for: ${1:-most recent})"
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "  (none found)"
    exit 1
fi

echo "[~] Selected backup: $BACKUP_FILE"

# Authenticate with Vault (same pattern as backup.sh)
ROLE_ID=$(cat "$BACKUP_CREDS_DIR/.role-id")
SECRET_ID=$(cat "$BACKUP_CREDS_DIR/.secret-id")

echo "[~] Authenticating with Vault via AppRole"
APPROLE_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
    --request POST \
    --data "{\"role_id\":\"$ROLE_ID\",\"secret_id\":\"$SECRET_ID\"}" \
    "$VAULT_ADDR/v1/auth/approle/login")

VAULT_TOKEN=$(echo "$APPROLE_RESPONSE" | jq --raw-output '.auth.client_token')

if [ "$VAULT_TOKEN" = "null" ] || [ -z "$VAULT_TOKEN" ]; then
    echo "[!] Error: Restore failed to authenticate with Vault"
    exit 1
fi

SECRET_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/postgres")

POSTGRES_USER=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_user')
POSTGRES_PASSWORD=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_password')
POSTGRES_DB=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_db')

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "[!] WARNING: This will overwrite the current database '$POSTGRES_DB'."
echo "[!] Press Ctrl+C within 5 seconds to cancel..."
sleep 5

echo "[~] Restoring from $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[✔] Restore completed successfully"