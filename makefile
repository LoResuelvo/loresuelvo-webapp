# Usage: make help | make dev | make test | make test-e2e
#        make test-e2e-file FILE=features/login.feature
#        make docker-dev | make docker-dev-d | make docker-dev-down

.DEFAULT_GOAL := help

COMPOSE_DEV  ?= compose.dev.yml
LOCAL_NODE_BIN := $(CURDIR)/.tools/node/bin

ifneq ($(wildcard $(LOCAL_NODE_BIN)/node),)
export PATH := $(LOCAL_NODE_BIN):$(PATH)
endif

.PHONY: help install dev build start lint test test-e2e test-e2e-file test-e2e-wip test-e2e-report test-all-once \
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
	@echo "    make test-e2e         Gherkin + Playwright (toda la suite)"
	@echo "    make test-e2e-file    Gherkin de un solo archivo (ej: make test-e2e-file FILE=features/login.feature)"
	@echo "    make test-e2e-wip     Gherkin con tag @wip"
	@echo "    make test-e2e-report  Gherkin con reporte HTML en reports/"
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
	npm run test:e2e

test-e2e-file:
	@if [ -z "$(FILE)" ]; then \
		echo "Uso: make test-e2e-file FILE=features/login.feature"; \
		exit 1; \
	fi
	NEXT_PUBLIC_USE_MOCK_ASSISTANT=true TS_NODE_PROJECT=tsconfig.cucumber.json npx cucumber-js $(FILE)

test-e2e-wip:
	npm run test:e2e:wip

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
