#!/bin/sh
set -e

# =====================================================================
#     Fetches Postgres credentials from Vault (same AppRole pattern as
#     init_postgres.sh), then runs pg_dump. Rotates backups older than
#     RETENTION_DAYS.
# =====================================================================

VAULT_ADDR="https://vault:8200"
BACKUP_CREDS_DIR="/vault/backup"
CA_CERT="$BACKUP_CREDS_DIR/ca.crt"
BACKUP_DIR="/backups"
RETENTION_DAYS=7

echo "[~] $(date '+%Y-%m-%d %H:%M:%S') Starting backup job"

# Authenticate with Vault via AppRole
ROLE_ID=$(cat "$BACKUP_CREDS_DIR/.role-id")
SECRET_ID=$(cat "$BACKUP_CREDS_DIR/.secret-id")

echo "[~] Authenticating with Vault via AppRole"
APPROLE_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
    --request POST \
    --data "{\"role_id\":\"$ROLE_ID\",\"secret_id\":\"$SECRET_ID\"}" \
    "$VAULT_ADDR/v1/auth/approle/login")

VAULT_TOKEN=$(echo "$APPROLE_RESPONSE" | jq --raw-output '.auth.client_token')

if [ "$VAULT_TOKEN" = "null" ] || [ -z "$VAULT_TOKEN" ]; then
    echo "[!] Error: Backup failed to authenticate with Vault"
    exit 1
fi

# Fetch Postgres credentials
echo "[~] Fetching postgres credentials from Vault KV"
SECRET_RESPONSE=$(curl --silent --cacert "$CA_CERT" \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/secret/data/postgres")

POSTGRES_USER=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_user')
POSTGRES_PASSWORD=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_password')
POSTGRES_DB=$(echo "$SECRET_RESPONSE" | jq -r '.data.data.postgres_db')

if [ "$POSTGRES_USER" = "null" ] || [ "$POSTGRES_PASSWORD" = "null" ] || [ "$POSTGRES_DB" = "null" ]; then
    echo "[!] Error: missing postgres credentials in Vault's response"
    exit 1
fi

export PGPASSWORD="$POSTGRES_PASSWORD"

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

echo "[~] Running pg_dump for database '$POSTGRES_DB'"
pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    echo "[✔] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    echo "[!] Error: Backup file is empty or was not created"
    exit 1
fi

# Rotation: delete backups older than RETENTION_DAYS
echo "[~] Rotating backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm -v {} \;

echo "[✔] $(date '+%Y-%m-%d %H:%M:%S') Backup job finished"