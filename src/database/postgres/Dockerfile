# ===================================================
#	Adding an additonal initialisation script to 
#	PostgreSQL's official image, so that it uses
#	Vault to retrieve credentials.
# ===================================================

FROM	docker.io/library/postgres:16-alpine3.24

RUN	apk add --no-cache curl && apk add --no-cache curl jq

COPY	tools/init_postgres.sh /usr/local/bin/init_postgres.sh
RUN	chmod +x /usr/local/bin/init_postgres.sh

ENTRYPOINT	["/usr/local/bin/init_postgres.sh"]
