# Usage: make help | make dev | make test | make test-e2e
#        make docker-dev | make docker-dev-d | make docker-dev-down

.DEFAULT_GOAL := help

COMPOSE_DEV  ?= compose.dev.yml
BASE_URL     ?= http://localhost:3000
LOCAL_NODE_BIN := $(CURDIR)/.tools/node/bin

export BASE_URL

ifneq ($(wildcard $(LOCAL_NODE_BIN)/node),)
export PATH := $(LOCAL_NODE_BIN):$(PATH)
endif

.PHONY: help install dev build start lint test test-e2e test-e2e-wip test-e2e-report \
	docker-dev docker-dev-d docker-dev-down docker-build docker-sh docker-lint docker-test

help:
	@echo "Lo Resuelvo — commands"
	@echo ""
	@echo "  Project (Node on machine)"
	@echo "    make install          Install dependencies (npm install)"
	@echo "    make dev              Development server (npm run dev)"
	@echo "    make build            Build production (npm run build)"
	@echo "    make start            Server after build (npm run start)"
	@echo "    make lint             ESLint (npm run lint)"
	@echo ""
	@echo "  Tests"
	@echo "    make test             Unitarios con Vitest (npm run test)"
	@echo "    make test-e2e         Gherkin + Playwright"
	@echo "    make test-e2e-report  Same as test-e2e but with HTML report in reports/"
	@echo ""
	@echo "  Docker (Desarrollo containerizado)"
	@echo "    make docker-dev       Iniciar app en Docker con logs y hot reload"
	@echo "    make docker-dev-d     Iniciar app en Docker en background (-d)"
	@echo "    make docker-dev-down  Detener contenedores de Docker"
	@echo "    make docker-build     Reconstruir imagen de Docker dev"
	@echo "    make docker-sh        Abrir shell dentro del contenedor"
	@echo "    make docker-lint      Ejecutar linter dentro del contenedor"
	@echo "    make docker-test      Ejecutar tests unitarios dentro del contenedor"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

test:
	npm run test

test-e2e:
	@if curl -fsS "$(BASE_URL)" >/dev/null 2>&1; then \
		npm run test:e2e; \
	else \
		log_file="/tmp/loresuelvo-webapp-e2e-server.log"; \
		npm run dev > "$$log_file" 2>&1 & \
		server_pid=$$!; \
		trap 'kill $$server_pid 2>/dev/null || true' EXIT INT TERM; \
		for _ in $$(seq 1 60); do \
			if curl -fsS "$(BASE_URL)" >/dev/null 2>&1; then \
				break; \
			fi; \
			if ! kill -0 $$server_pid 2>/dev/null; then \
				cat "$$log_file"; \
				exit 1; \
			fi; \
			sleep 1; \
		done; \
		if ! curl -fsS "$(BASE_URL)" >/dev/null 2>&1; then \
			cat "$$log_file"; \
			exit 1; \
		fi; \
		npm run test:e2e; \
	fi

test-e2e-report:
	npm run test:e2e:report

test-all-once:
	npm run test
	npm run test:e2e

# Docker targets
ensure-env:
	@if [ ! -f .env.local ] && [ ! -f .env ]; then \
		cp .env.example .env.local; \
		echo "✓ Archivo .env.local creado automáticamente a partir de .env.example"; \
	fi

docker-dev: ensure-env
	docker compose -f $(COMPOSE_DEV) up --build

docker-dev-d: ensure-env
	docker compose -f $(COMPOSE_DEV) up -d --build
	@echo "✓ Frontend levantado en http://localhost:3000"

docker-dev-down:
	docker compose -f $(COMPOSE_DEV) down

docker-build:
	docker compose -f $(COMPOSE_DEV) build

docker-sh:
	docker compose -f $(COMPOSE_DEV) exec web sh

docker-lint:
	docker compose -f $(COMPOSE_DEV) exec web npm run lint

docker-test:
	docker compose -f $(COMPOSE_DEV) exec web npm run test
