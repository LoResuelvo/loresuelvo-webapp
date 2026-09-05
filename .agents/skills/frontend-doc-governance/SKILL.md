---
name: frontend-doc-governance
description: "Gobernanza documental y de instrucciones para agentes en Lo Resuelvo: AGENTS.md, archivos de compatibilidad, skills locales, README, políticas compactas y limpieza de documentación redundante. Usar al crear o mantener documentación operativa para agentes."
---

# Frontend Doc Governance

## Objetivo

Mantener documentación útil, compacta y lazy-load friendly.

## Reglas

1. `AGENTS.md` contiene invariantes globales y routing; no debe convertirse en un manual de cada skill.
2. Cada skill compartida vive en `.agents/skills/<nombre>/SKILL.md`, tiene un único propósito y conserva en su entrada solo decisiones que cambian el trabajo.
3. Los procedimientos, schemas y templates condicionales viven en `references/` y se leen únicamente cuando aplican; la lógica repetible y determinística pertenece a política, MCP o scripts.
4. Los archivos específicos de un cliente deben referenciar la gobernanza compartida y no duplicarla. Preferencias personales, rutas absolutas y adaptadores usados por una sola persona permanecen locales e ignorados.
5. Versionar templates reutilizables; mantener contratos concretos de una delegación en el issue, plan o handoff salvo que exista una necesidad real de auditoría o continuidad histórica.
6. Ledger, caché, logs y estado de ejecución permanecen fuera de Git. Nunca documentar ni commitear secretos.
7. Evitar walkthroughs históricos, ejemplos redundantes y reglas que ya puede hacer cumplir una herramienta.

## Flujo

1. Revisar estructura actual y scripts de `package.json`/`Makefile` antes de documentar comandos.
2. Clasificar cada instrucción como invariante global, decisión de skill, detalle condicional, regla determinística, preferencia local o estado efímero, y actualizar su única fuente canónica.
3. Reemplazar duplicaciones por referencias breves y verificar que un agente conserve suficiente contexto para actuar sin redescubrimiento.
4. Validar Markdown con revisión manual y, si hay formatter configurado, ejecutarlo.
