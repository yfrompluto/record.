# =====================================================================
#     Lightweight image dedicated to automated PostgreSQL backups.
#     Authenticates with Vault via AppRole to get DB credentials,
#     then runs pg_dump on a schedule via cron.
# =====================================================================

FROM docker.io/library/postgres:16-alpine3.24

RUN apk add --no-cache curl jq dcron

COPY tools/backup.sh /usr/local/bin/backup.sh
COPY tools/restore.sh /usr/local/bin/restore.sh
COPY tools/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/backup.sh \
             /usr/local/bin/restore.sh \
             /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]