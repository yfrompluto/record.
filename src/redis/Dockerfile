# ===========================================================
#	This Dockerfile sets up Redis as our cache solution
# ============================================================

FROM	docker.io/library/redis:8.2-alpine

RUN apk add --no-cache curl jq

COPY	init_redis.sh /usr/local/bin/init_redis.sh
RUN	chmod +x /usr/local/bin/init_redis.sh

ENTRYPOINT ["/usr/local/bin/init_redis.sh"]