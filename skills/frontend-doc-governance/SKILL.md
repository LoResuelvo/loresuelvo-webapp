---
name: frontend-doc-governance
description: "Gobernanza documental y de instrucciones para agentes en Lo Resuelvo: AGENTS.md, CLAUDE.md, skills locales, README, políticas compactas y limpieza de documentación redundante. Usar al crear o mantener documentación operativa para agentes."
---

# Frontend Doc Governance

## Objetivo

Mantener documentación útil, compacta y lazy-load friendly.

## Reglas

1. `AGENTS.md` es la fuente canónica para agentes.
2. `CLAUDE.md` debe referenciar `AGENTS.md` y no duplicar reglas extensas.
3. Skills locales viven en `skills/<nombre>/SKILL.md`.
4. El índice de skills en `AGENTS.md` debe resumir cuándo cargar cada skill.
5. Evitar walkthroughs y documentación narrativa extensa sin valor operativo.
6. Preferir bullets accionables, comandos exactos y rutas reales del repo.

## Flujo

1. Revisar estructura actual y scripts de `package.json`/`makefile` antes de documentar comandos.
2. Actualizar primero la fuente canónica; evitar duplicar la misma regla en múltiples archivos.
3. Si una regla es específica de una tarea, ponerla en una skill; si aplica siempre, en `AGENTS.md`.
4. Validar Markdown con revisión manual y, si hay formatter configurado, ejecutarlo.
