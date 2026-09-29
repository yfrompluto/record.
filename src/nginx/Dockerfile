# **************************************************************
#
# Builds the NGINX+ModSecurity+CRS image and sets up integration 
# with Vault (retrieving the TLS certificate at startup).
#
# With an Image that already contains :
# Nginx compiled with the ModSecurity module,
# the OWASP Core Rule Set (CRS) pre-installed,
# and a configuration system based on environment variables 
#
# **************************************************************
FROM	docker.io/owasp/modsecurity-crs:4.27.0-nginx-alpine-202606261106

# CRS configuration system based on environment variables
ENV MODSEC_RULE_ENGINE=On 
ENV MODSEC_AUDIT_ENGINE=On
ENV BLOCKING_PARANOIA=2
ENV ANOMALY_INBOUND=4
ENV ALLOWED_METHODS="GET HEAD POST PATCH DELETE OPTIONS PUT"

# The base image runs as a non-root user (nginx) by default, following a "least privilege" security policy consistent with a hardened WAF.
# however, certain build operations (installing APK packages, creating directories) require root privileges.
USER root

# curl + jq: required to communicate with the Vault API in Shell (no Vault CLI client here), jq parses the JSON responses.
RUN apk add --no-cache curl jq

# tls - to retrieve the certificate from Vault at startup
# CERT_DIR ; (or the certificate/key) issued by Vault will be written here
ENV CERT_DIR=/etc/nginx/certs

COPY tools/vault_get_cert.sh /usr/local/bin/vault_get_cert.sh
RUN chmod +x /usr/local/bin/vault_get_cert.sh

# configuration NGINX
COPY conf/default.conf /etc/nginx/templates/conf.d/default.conf.template
COPY html/             /usr/share/nginx/html/

# Disable the base image's own self-signed cert generator: we use Vault's PKI instead
RUN mv /docker-entrypoint.d/10-generate-certificate.sh /docker-entrypoint.d/10-generate-certificate.sh.disabled

# Permissions: everything nginx needs to write to at runtime, in one block
RUN mkdir -p "$CERT_DIR" && \
   chown -R nginx:nginx /etc/nginx /etc/modsecurity.d /opt/owasp-crs "$CERT_DIR" && \
   chmod -R u+w /etc/nginx /etc/modsecurity.d /opt/owasp-crs

# switch back to the nginx USER before the ENTRYPOINT so that the final process runs with the minimum privileges.
# USER nginx

EXPOSE 8080 8443

# retrieving the certificate BEFORE launching the image's actual entrypoint (nginx + modsec)
ENTRYPOINT ["/bin/sh", "-c", "/usr/local/bin/vault_get_cert.sh && /docker-entrypoint.sh nginx -g 'daemon off;'"]