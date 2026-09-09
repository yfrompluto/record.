#!/bin/sh

set -e

# ====================================================================
#
#	This script is the Docker entrypoint for  Vault.
#	On first run, it initialises and unseals Vault, then loads
#	services policies and enables the PKI (Public Key Infrastructure)
#	and KV (key-value) secrets engine.
#	Then, it creates AppRole credentials for nginx, backend, and
#	postgres, allowing them to authenticate with Vault.
#	It also shares the CA certificate with backend & postgres,
#	as well as generates the initial app secrets.
#	It leaves Vault running.
#
# ====================================================================

# Variables
VAULT_DATA=/vault/data
VAULT_POLICIES=/vault/policies
VAULT_SECRETS="${VAULT_DATA}/secrets"

UNSEAL_KEY_FILE=${VAULT_SECRETS}/vault-unseal-key
TOKEN_FILE=${VAULT_SECRETS}/vault-root-token

# Creates the vault/data/secrets subdirectory
mkdir -p "$VAULT_SECRETS"

# Starting Vault in the background & getting its PID
vault server -config=/vault/config/vault.hcl &
VAULT_PID=$!

# Waiting for Vault to properly respond
# 	the /sys/health endpoint is used to check the health status of Vault
until vault status 2>&1 | grep -q "Initialized"; do
	echo "[~] Waiting for Vault server to start.."
	sleep 1
done

# Initialisation (only on first build & run)
#	- check if first init
#	- extracting unseal keys & root token
#	- reducing permissions to user read/write only
if [ ! -f $UNSEAL_KEY_FILE ] ; then
	echo "[~] Vault first initialisation, generating keys.."
	vault operator init -key-shares=1 -key-threshold=1 > /tmp/.vault-init
	grep 'Unseal' /tmp/.vault-init | awk '{ print $NF }' > "$UNSEAL_KEY_FILE"
	grep 'Root Token' /tmp/.vault-init | awk '{ print $NF }' > "$TOKEN_FILE"
	chmod 600 "$UNSEAL_KEY_FILE" "$TOKEN_FILE"
	rm -rf /tmp/.vault-init
fi

# Unsealing the key
vault operator unseal "$(cat "$UNSEAL_KEY_FILE")"

# Authentification for future operations
export VAULT_TOKEN
VAULT_TOKEN="$(cat "$TOKEN_FILE")"

# Vault policies
#	- creates policy if it doesn't exist
for policy_file in ${VAULT_POLICIES}/*.hcl ; do
	[ -e "$policy_file" ] || continue
	policy_name=$(basename "$policy_file" .hcl)

	if ! vault policy read "$policy_name" >/dev/null 2>&1; then
		echo "[vault policy] writing policy => $policy_name"
		vault policy write "$policy_name" "$policy_file"
	fi
done

# PKI secrets engine
#	- check if PKI is already enabled
#	- pki configuration
#	- configure CA urls - pointing to vault service name inside the Docker network
#	- configure the nginx role
if ! vault secrets list | grep -q "^pki/"; then
	echo "[~] Enabling PKI secrets engine.."
	vault secrets enable pki

	vault secrets tune -max-lease-ttl=60d pki
	vault write pki/root/generate/internal \
		common_name="transcendence Root CA" \
		ttl=50d

	vault write pki/config/urls \
		issuing_certificates="http://vault:8200/v1/pki/ca" \
		crl_distribution_points="http://vault:8200/v1/pki/crl"

	vault write pki/roles/nginx \
		allowed_domains="transcendence.local" \
		allow_subdomains=false \
		allow_bare_domains=true \
		max_ttl=1200h \
		key_type=rsa \
		key_bits=2048
fi

# Setup the AppRoles
#	- nginx's approle
#	- backend's approle
#	- postgres's approle
#	- redis' approle
#	- allow the tls ca to be read
NGINX_CREDS_DIR="/vault/nginx"
mkdir -p "$NGINX_CREDS_DIR"
chown 101:101 "$NGINX_CREDS_DIR"
chmod 755 "$NGINX_CREDS_DIR"

if ! vault auth list | grep -q "^approle/"; then
    vault auth enable approle
fi

if ! vault read auth/approle/role/nginx >/dev/null 2>&1; then
	echo "[vault approle] creating nginx role"
	vault write auth/approle/role/nginx \
		token_policies="nginx" \
		token_ttl=2h \
		token_max_ttl=5h \
		secret_id_ttl=0

	vault read -field=role_id auth/approle/role/nginx/role-id \
		> "$NGINX_CREDS_DIR/.role-id"

	vault write -f -field=secret_id auth/approle/role/nginx/secret-id \
		> "$NGINX_CREDS_DIR/.secret-id"
	chown 101:101 "$NGINX_CREDS_DIR/.role-id" "$NGINX_CREDS_DIR/.secret-id"
	chmod 600 "$NGINX_CREDS_DIR/.role-id" "$NGINX_CREDS_DIR/.secret-id"

	cp /vault/tls/vault.crt /vault/nginx/vault.crt
	chmod 644 /vault/nginx/vault.crt
fi

BACKEND_CREDS_DIR="/vault/backend"
mkdir -p "$BACKEND_CREDS_DIR"
chmod 700 "$BACKEND_CREDS_DIR"

if ! vault read auth/approle/role/backend >/dev/null 2>&1; then
	echo "[vault approle] creating backend role"
	vault write auth/approle/role/backend \
		token_policies="backend" \
		token_ttl=2h \
		token_max_ttl=5h \
		secret_id_ttl=0

	vault read -field=role_id auth/approle/role/backend/role-id \
		> "$BACKEND_CREDS_DIR/.role-id"
	vault write -f -field=secret_id auth/approle/role/backend/secret-id \
		> "$BACKEND_CREDS_DIR/.secret-id"
	chmod 600 "$BACKEND_CREDS_DIR/.role-id" "$BACKEND_CREDS_DIR/.secret-id"
fi

POSTGRES_CREDS_DIR="/vault/postgres"
mkdir -p "$POSTGRES_CREDS_DIR"
chmod 700 "$POSTGRES_CREDS_DIR"

if ! vault read auth/approle/role/postgres-bootstrap >/dev/null 2>&1; then
	echo "[vault approle] creating postgres-bootstrap role"
	vault write auth/approle/role/postgres-bootstrap \
		token_policies="postgres" \
		token_ttl=30m \
		token_max_ttl=1h \
		secret_id_ttl=0

	vault read -field=role_id auth/approle/role/postgres-bootstrap/role-id \
		> "$POSTGRES_CREDS_DIR/.role-id"
	vault write -f -field=secret_id auth/approle/role/postgres-bootstrap/secret-id \
		> "$POSTGRES_CREDS_DIR/.secret-id"
	chmod 600 "$POSTGRES_CREDS_DIR/.role-id" "$POSTGRES_CREDS_DIR/.secret-id"
fi

BACKUP_CREDS_DIR="/vault/backup"
mkdir -p "$BACKUP_CREDS_DIR"
chmod 700 "$BACKUP_CREDS_DIR"
if ! vault read auth/approle/role/backup >/dev/null 2>&1; then
	echo "[vault approle] creating backup role"
	vault write auth/approle/role/backup \
		token_policies="postgres" \
		token_ttl=30m \
		token_max_ttl=1h \
		secret_id_ttl=0
	vault read -field=role_id auth/approle/role/backup/role-id \
		> "$BACKUP_CREDS_DIR/.role-id"
	vault write -f -field=secret_id auth/approle/role/backup/secret-id \
		> "$BACKUP_CREDS_DIR/.secret-id"
	chmod 600 "$BACKUP_CREDS_DIR/.role-id" "$BACKUP_CREDS_DIR/.secret-id"
fi

REDIS_CREDS_DIR="/vault/redis"
mkdir -p "$REDIS_CREDS_DIR"
chmod 700 "$REDIS_CREDS_DIR"

if ! vault read auth/approle/role/redis-bootstrap >/dev/null 2>&1; then
	echo "[vault approle] creating redis-bootstrap role"
	vault write auth/approle/role/redis-bootstrap \
		token_policies="redis" \
		token_ttl=30m \
		token_max_ttl=1h \
		secret_id_ttl=0

	vault read -field=role_id auth/approle/role/redis-bootstrap/role-id \
		> "$REDIS_CREDS_DIR/.role-id"
	vault write -f -field=secret_id auth/approle/role/redis-bootstrap/secret-id \
		> "$REDIS_CREDS_DIR/.secret-id"
	chmod 600 "$REDIS_CREDS_DIR/.role-id" "$REDIS_CREDS_DIR/.secret-id"
fi

# Allowing backend & postgress to see the Vault's CA cert
echo "[vault tls] copying CA cert for backend"
cp /vault/tls/vault.crt "$BACKEND_CREDS_DIR/ca.crt"
chmod 644 "$BACKEND_CREDS_DIR/ca.crt"

echo "[vault tls] copying CA cert for postgres"
cp /vault/tls/vault.crt "$POSTGRES_CREDS_DIR/ca.crt"
chmod 644 "$POSTGRES_CREDS_DIR/ca.crt"

echo "[vault tls] copying CA cert for backup"
cp /vault/tls/vault.crt "$BACKUP_CREDS_DIR/ca.crt"
chmod 644 "$BACKUP_CREDS_DIR/ca.crt"

echo "[vault tls] copying CA cert for redis"
cp /vault/tls/vault.crt "$REDIS_CREDS_DIR/ca.crt"
chmod 644 "$REDIS_CREDS_DIR/ca.crt"

# Setup KV v2 secrets engine
#	- stores all application secrets (db credentials, api keys..)
#	- 🦎 creates random password on first use for backend services
#	- also stores postgres' credentials where only postgres has access
if ! vault secrets list | grep -q "^secret/"; then
	echo "[~] Enabling KV v2 secrets engine.."
	vault secrets enable -path=secret kv-v2
fi

if ! vault kv get -mount=secret backend >/dev/null 2>&1; then
	echo "[+] Writing initial backend & postgres secrets"
	POSTGRES_PASSWORD="$(head -c 32 /dev/urandom | base64)"
	JWT_SECRET="$(head -c 32 /dev/urandom | base64)"

	vault kv put -mount=secret backend \
		postgres_user="app_user" \
		postgres_password="$POSTGRES_PASSWORD" \
		postgres_db="transcendence" \
		jwt_secret="$JWT_SECRET"
	vault kv put -mount=secret postgres \
		postgres_user="app_user" \
		postgres_password="$POSTGRES_PASSWORD" \
		postgres_db="transcendence"
fi

if ! vault kv get -mount=secret redis >/dev/null 2>&1; then
	echo "[+] Writing initial redis secret"
	REDIS_PASSWORD="$(head -c 32 /dev/urandom | base64)"

	vault kv put -mount=secret redis \
		redis_password="$REDIS_PASSWORD"

	vault kv patch -mount=secret backend \
		redis_password="$REDIS_PASSWORD"
fi

#  Bring Vault back to the foreground & active
wait $VAULT_PID