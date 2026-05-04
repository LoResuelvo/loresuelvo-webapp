# loresuelvo-webapp

Web app built with Next.js.

## Setup

```bash
cp .env.example .env.local
```

## Run with Docker (dev, hot reload)

```bash
docker compose -f compose.dev.yml up --build
```

App at `http://localhost:3001`.

## Production build

```bash
docker compose -f compose.prod.yml --env-file .env.production up -d --build
```
