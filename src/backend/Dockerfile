FROM	node:26-alpine
WORKDIR	/app

# jq & curl needeed by entrypoint.sh to talk to Vault
RUN apk add --no-cache jq curl

# Allows cache for dependencies
COPY	package*.json ./
RUN	npm install

COPY . .

RUN npm run build
RUN npx prisma generate

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
