# Usage: make help | make dev | make test | make test-e2e
#        make test-e2e-file FILE=features/login.feature
#        make docker-dev | make docker-dev-d | make docker-dev-down

.DEFAULT_GOAL := help

COMPOSE_DEV  ?= compose.dev.yml
LOCAL_NODE_BIN := $(CURDIR)/.tools/node/bin

ifneq ($(wildcard $(LOCAL_NODE_BIN)/node),)
export PATH := $(LOCAL_NODE_BIN):$(PATH)
endif

PORT ?= 3000
TEST_PORT ?= 3001
APP_URL ?= http://localhost:$(TEST_PORT)

DOCKER_TEST_IMAGE     ?= loresuelvo-webapp-test
DOCKER_TEST_CONTAINER ?= loresuelvo-webapp-test-container

.PHONY: help install dev build start start-test lint test test-e2e test-e2e-port test-e2e-file test-e2e-file-port test-e2e-wip test-e2e-report test-all-once \
	docker-dev docker-dev-d docker-dev-down docker-build docker-sh docker-lint docker-test \
	docker-start-test docker-stop-test docker-test-e2e

help:
	@echo "Lo Resuelvo — commands"
	@echo ""
	@echo "  Project (Node on machine)"
	@echo "    make install             Install dependencies (npm install)"
	@echo "    make dev                 Development server (npm run dev on port 3000)"
	@echo "    make build               Build production (npm run build)"
	@echo "    make start               Server after build (npm run start on PORT=$(PORT))"
	@echo "    make start-test          Server after build on test port (PORT=$(TEST_PORT))"
	@echo "    make lint                ESLint (npm run lint)"
	@echo ""
	@echo "  Tests (Node local contra puerto $(TEST_PORT))"
	@echo "    make test                Unitarios con Vitest (npm run test)"
	@echo "    make test-e2e            Gherkin + Playwright (contra $(APP_URL))"
	@echo "    make test-e2e-file       Gherkin de un solo archivo (ej: make test-e2e-file FILE=features/login.feature)"
	@echo "    make test-e2e-wip        Gherkin con tag @wip"
	@echo "    make test-e2e-report     Gherkin con reporte HTML en reports/"
	@echo ""
	@echo "  Docker (Desarrollo y Testing containerizado)"
	@echo "    make docker-dev          Iniciar app en Docker con logs y hot reload"
	@echo "    make docker-dev-d        Iniciar app en Docker en background (-d)"
	@echo "    make docker-dev-down     Detener contenedores de Docker dev"
	@echo "    make docker-build        Reconstruir imagen de Docker dev"
	@echo "    make docker-sh           Abrir shell dentro del contenedor"
	@echo "    make docker-lint         Ejecutar linter dentro del contenedor"
	@echo "    make docker-test         Ejecutar tests unitarios dentro del contenedor"
	@echo "    make docker-start-test   Levantar imagen de prod en contenedor Docker en puerto $(TEST_PORT)"
	@echo "    make docker-stop-test    Detener contenedor de test de Docker"
	@echo "    make docker-test-e2e     Ejecutar tests E2E contra el contenedor Docker de prod (auto start/stop)"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	PORT=$(PORT) npm run start

start-test:
	PORT=$(TEST_PORT) npm run start

lint:
	npm run lint

test:
	npm run test

test-e2e:
	APP_URL=$(APP_URL) npm run test:e2e

test-e2e-port:
	APP_URL=http://localhost:$(TEST_PORT) npm run test:e2e

test-e2e-file:
	@if [ -z "$(FILE)" ]; then \
		echo "Uso: make test-e2e-file FILE=features/login.feature"; \
		exit 1; \
	fi
	APP_URL=$(APP_URL) TS_NODE_PROJECT=tsconfig.cucumber.json npx cucumber-js $(FILE)

test-e2e-file-port:
	@if [ -z "$(FILE)" ]; then \
		echo "Uso: make test-e2e-file-port FILE=features/login.feature"; \
		exit 1; \
	fi
	APP_URL=http://localhost:$(TEST_PORT) TS_NODE_PROJECT=tsconfig.cucumber.json npx cucumber-js $(FILE)

test-e2e-wip:
	APP_URL=$(APP_URL) npm run test:e2e:wip

test-e2e-report:
	APP_URL=$(APP_URL) npm run test:e2e:report

test-all-once:
	npm run test
	APP_URL=$(APP_URL) npm run test:e2e

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

docker-start-test: ensure-env
	docker build -t $(DOCKER_TEST_IMAGE) .
	-docker rm -f $(DOCKER_TEST_CONTAINER) 2>/dev/null || true
	@ENV_FILE=$$(if [ -f .env.local ]; then echo .env.local; elif [ -f .env ]; then echo .env; else echo .env.example; fi); \
	docker run -d --name $(DOCKER_TEST_CONTAINER) --env-file $$ENV_FILE -p $(TEST_PORT):3000 -e APP_ENV=test -e PORT=3000 $(DOCKER_TEST_IMAGE)
	@echo "Esperando que el contenedor de test en http://localhost:$(TEST_PORT) esté listo..."
	@npx --yes wait-on http://localhost:$(TEST_PORT) --timeout 60000
	@echo "✓ Contenedor listo en http://localhost:$(TEST_PORT)"

docker-stop-test:
	-docker rm -f $(DOCKER_TEST_CONTAINER) 2>/dev/null || true
	@echo "✓ Contenedor de test detenido"

docker-test-e2e:
	@$(MAKE) docker-start-test
	@echo "Ejecutando tests E2E contra el contenedor Docker..."
	@trap '$(MAKE) docker-stop-test' EXIT; \
		APP_URL=http://localhost:$(TEST_PORT) npm run test:e2e
