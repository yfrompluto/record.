FROM	docker.io/hashicorp/vault:1.17

RUN	mkdir -p /vault/tls && \
	apk add --no-cache openssl && \
	openssl req -x509 -newkey rsa:2048 -nodes \
		-keyout /vault/tls/vault.key \
		-out /vault/tls/vault.crt \
		-days 365 \
		-subj "/CN=vault" \
		-addext "subjectAltName=DNS:vault,DNS:localhost,IP:127.0.0.1" && \
	chmod 600 /vault/tls/vault.key && \
	chmod 644 /vault/tls/vault.crt

ENV	VAULT_ADDR=https://127.0.0.1:8200
ENV	VAULT_CACERT=/vault/tls/vault.crt

COPY	conf/vault.hcl /vault/config/vault.hcl
COPY	policies/      /vault/policies/

COPY	tools/init_vault.sh /usr/local/bin/init_vault.sh
RUN	chmod +x /usr/local/bin/init_vault.sh

# [VAULT] INFO DEV | For debugging
EXPOSE	8200

# This entrypoint will generate the certificate, create the services' credenitals,
# securely store them and launch Vault
ENTRYPOINT	["/usr/local/bin/init_vault.sh"]