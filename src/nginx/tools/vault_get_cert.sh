# **************************************************************
#
# Script executed when the NGINX container starts (before NGINX itself)
# to authenticate with Vault and retrieve
# TLS certificate freshly issued by Vault's PKI engine.
#
# **************************************************************

#!/bin/sh
set -e

# Variables
VAULT_ADDR="https://vault:8200"
VAULT_CACERT="/vault/nginx/vault.crt"
ROLE_ID_FILE="/vault/nginx/.role-id"
SECRET_ID_FILE="/vault/nginx/.secret-id"
CERT_DIR="${CERT_DIR:-/etc/nginx/certs}"


# Waiting for credentials : Wait until the three required files are available on the shared volume, to establish the TLS trust
echo "[~] Waiting for Vault credentials.."
until [ -f "$ROLE_ID_FILE" ] && [ -f "$SECRET_ID_FILE" ] && [ -f "$VAULT_CACERT" ]; do
	sleep 1
done

ROLE_ID=$(cat "$ROLE_ID_FILE")
SECRET_ID=$(cat "$SECRET_ID_FILE")


# AppRole authentication by exchanging the secrets_if and role id pair for a temporary token
echo "[~] Authenticating to Vault via AppRole.."
VAULT_TOKEN=$(curl -s --cacert "$VAULT_CACERT" \
	--request POST \
	--data "{\"role_id\":\"${ROLE_ID}\",\"secret_id\":\"${SECRET_ID}\"}" \
	"${VAULT_ADDR}/v1/auth/approle/login" | jq -r '.auth.client_token')

if [ -z "$VAULT_TOKEN" ] || [ "$VAULT_TOKEN" = "null" ]; then
	echo "[!] Failed to authenticate to Vault" >&2
	exit 1
fi

# Certificate request : Vault generates a fresh key/certificate pair on every startup,
echo "[~] Requesting certificate from Vault PKI.."
RESPONSE=$(curl -s --cacert "$VAULT_CACERT" \
	--header "X-Vault-Token: ${VAULT_TOKEN}" \
	--request POST \
	--data '{"common_name":"transcendence.local"}' \
	"${VAULT_ADDR}/v1/pki/issue/nginx")

# ADDED
if echo "$RESPONSE" | jq -e '.errors' >/dev/null 2>&1; then
    echo "[!] Vault PKI error: $(echo "$RESPONSE" | jq -r '.errors[0]')" >&2
    exit 1
fi

echo "$RESPONSE" | jq -r '.data.certificate' > "${CERT_DIR}/nginx.crt"
echo "$RESPONSE" | jq -r '.data.private_key' > "${CERT_DIR}/nginx.key"
echo "$RESPONSE" | jq -r '.data.issuing_ca'  > "${CERT_DIR}/ca.crt"

chmod 600 "${CERT_DIR}/nginx.key"
chmod 644 "${CERT_DIR}/nginx.crt" "${CERT_DIR}/ca.crt"

echo "[+] Certificate written to ${CERT_DIR}"