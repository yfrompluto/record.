# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: speters <speters@student.42.fr>            +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/07/05 03:26:43 by speters           #+#    #+#              #
#    Updated: 2026/08/01 13:32:17 by speters          ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

# ==========================================================-=========== Context
DOCKER_COMPOSE = docker compose --file src/docker-compose.yml
GREEN := \033[1;32m
YELLOW := \033[1;33m
PURPLE := \033[1;35m
RESET := \033[0m

# ============================================= Starting & stopping the containers
#	- up: build images if needed and start the stack
#	- down: stop and remove the running con
#	- no-cache: force rebuild without Docker build cache
# ================================================================================
up:
	@$(DOCKER_COMPOSE) up --build -d
	@printf "$(GREEN)[$(YELLOW)✔$(GREEN)]$(RESET) Stack has been succesfully compiled. $(YELLOW)'make man'$(RESET) for additional information."

down:
	@$(DOCKER_COMPOSE) down
	@printf "$(PURPLE)[$(YELLOW)✔$(PURPLE)] Stack has been succesfully shut down.$(RESET)"

no-cache:
	@$(DOCKER_COMPOSE) build --no-cache

# =========================================================== Cleaning the project
#	- clean: stop & delete containers + networks BUT keeps volumes
#	- fclean: total cleanup of the stack
#	- re: total clean up, rebuild and start everything
# ================================================================================
clean:
	@$(DOCKER_COMPOSE) down --remove-orphans

fclean:
	@$(DOCKER_COMPOSE) down --rmi all --volumes --remove-orphans
	@docker builder prune --force
	@printf "$(PURPLE)[$(YELLOW)✔$(PURPLE)] Stack has been succesfully cleaned.$(RESET)"

re: fclean up

# ======================================================================== Add-ons
#	- ps: display the status of running processes (containers)
#	- logs: display logs of running processes
#	- inside-vault: open a shell inside the Vault container
#	- inside-backend open a shell inside the Backend container
#	- inside-postgres open a shell inside the PostgreSQL container
#	- inside-frontend: open a shell inside the Frontend container
#	- inside-nginx: open a shell inside the nginx container
#	- frontend-edit: launch the frontend server to make edits
# ================================================================================
ps:
	@$(DOCKER_COMPOSE) ps

logs:
	@$(DOCKER_COMPOSE) logs -f

inside-vault:
	@docker exec -it vault sh

inside-backend:
	@docker exec -it backend sh

inside-postgres:
	@docker exec -it postgres sh

inside-frontend:
	@docker exec -it frontend sh

inside-nginx:
	@docker exec -it nginx sh

man:
	@echo "[ ft_transcendence's Makefile manual ]\n"
	@echo "make up       - start containers & networks"
	@echo "make down     - stop and remove the running containers"
	@echo "make re       - full cleanup, rebuild and restart the stack"
	@echo "make clean    - remove all containers & their data"
	@echo "make fclean   - full project cleanup"
	@echo "make logs     - display output from containers"
	@echo "make ps	   	- show running containers"
	@echo "make inside-" - execute a shell inside a running container (vault/backend/postgres/frontend/nginx)"

demo:
	@bash scripts/demo/demo_all.sh

# ==========================================================-=========== Config
.PHONY: up all down no-cache re clean fclean ps logs inside-vault inside-backend \
		inside-postgres inside-frontend inside-nginx man demo
