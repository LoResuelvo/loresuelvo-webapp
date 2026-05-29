# Usage: make help | make dev | make test | make test-e2e

.DEFAULT_GOAL := help

COMPOSE_DEV  ?= compose.dev.yml
BASE_URL     ?= http://localhost:3000
LOCAL_NODE_BIN := $(CURDIR)/.tools/node/bin

export BASE_URL

ifneq ($(wildcard $(LOCAL_NODE_BIN)/node),)
export PATH := $(LOCAL_NODE_BIN):$(PATH)
endif

.PHONY: help install dev build start lint test test-e2e test-e2e-wip test-e2e-report \
	docker-dev docker-dev-down

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
	@echo "  Docker"
	@echo "    make docker-dev       compose dev (hot reload, port according to compose)"
	@echo "    make docker-dev-down  Stop compose dev"

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

docker-dev:
	docker compose -f $(COMPOSE_DEV) up --build

docker-dev-down:
	docker compose -f $(COMPOSE_DEV) down
