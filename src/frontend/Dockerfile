# ===========================================================
#	This Dockerfile is only used to compile React.
#	It serves as a mini server-side service using Node. 
#		- Stage [0]: build the React project (run build)
#		- Stage [1]: send the result to the web server
# ============================================================

# Stage [0]
FROM	node:22-alpine AS build
WORKDIR	/app
COPY	package.json package-lock.json ./

RUN	npm ci
COPY . .
RUN npm run build

# Stage [1]
FROM alpine:3.23
COPY	--from=build /app/dist /frontend-dist
ENTRYPOINT ["sh", "-c", "cp -r /frontend-dist/* /output/"]