---
name: frontend-commit-governance
description: "Preparar commits atómicos y seguros en main, preservando dependencias, gates y la convención de Lo Resuelvo."
---

# Frontend Commit Governance

Usar al preparar un commit o push.

## Ownership

- `MICROSTEP`: el desarrollador implementa y valida; el orquestador revisa, commitea, pushea y monitorea CI.
- `SCENARIO`: el desarrollador implementa, valida, commitea, pushea y monitorea los SHAs del escenario aprobado.
- `SCENARIO_GROUP`: el desarrollador hace lo mismo para 2–3 escenarios consecutivos, cerrando cada uno en GREEN antes de avanzar.

La conducción `USER_GUIDED` o `AGENT_ORCHESTRATED` define quién guía la US, no cambia por sí sola el ownership de commits. El contrato debe declarar ambos ejes y sus owners. Sin granularidad explícita, usar `MICROSTEP`.

## Commit atómico

Un commit representa un único cambio lógico completo. Puede modificar varios archivos y capas si son necesarios para el micro-paso.

Debe:

- dejar el repositorio compilable y testeable;
- incluir dependencias necesarias;
- excluir refactors, limpieza o funcionalidad futura no requerida;
- ser reversible sin afectar cambios no relacionados.

No dividir por archivo ni por cantidad de líneas. Si el diff es grande, buscar un corte vertical independiente; si no existe, conservar el cambio coherente.

Antes de cada commit, invocar la herramienta MCP `delivery_inspect` con el `intent` aplicable (`prepare_commit`, `close_scenario`, `close_batch`, `close_us`) y el mensaje propuesto. El inspector selecciona el gate correspondiente y audita la mantenibilidad de los archivos productivos modificados.

Registrar en el handoff o reporte la evidencia compacta generada por la herramienta:

```text
snapshotHash: <sha256>
status: <ready | review_required | blocked | needs_input | no_changes>
gate: <NONE | 0 | A | B | C | D>
señales pendientes: <ninguna | detalle y justificaciones>
```

Si el estado es `review_required`, resolver cada señal mediante una extracción cohesionada o una justificación explícita; un test verde no cierra esa revisión. Si se modifican hooks o adaptadores React, preservar las directrices de `references/react-hooks.md`; si se crean, mueven o dividen carpetas o archivos, respetar `references/module-boundaries.md`.

## Mensajes

- Con User Story: `<type>[XX]: descripción en inglés imperativa`.
- Sin User Story: `<type>: descripción en inglés imperativa`.
- No usar scopes entre paréntesis.
- Tipos válidos: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.

Ejemplos:

```text
feat[54]: add provider search loading state
test[54]: add provider search step definitions
refactor: simplify provider card composition
docs: clarify local E2E setup
```

## Dependencias y push

No pushear un commit intermedio que requiera archivos aún no presentes en `main`. Validar el gate indicado por `frontend-testing-gates`, crear el commit y pushearlo inmediatamente; no acumular varios commits locales para un único push. CI se sigue por SHA dentro de la ventana de commits en vuelo.

En `SCENARIO` y `SCENARIO_GROUP`, el desarrollador registra cada SHA y continúa sin reportes ordinarios mientras respete la ventana de CI. Cualquier estimación de commits por reporte es orientativa, no una cuota, mínimo ni máximo. No fusionar cambios independientes ni agrandar commits para ajustarse a una cifra; si el batch requiere más o menos fronteras, continuar con el siguiente commit atómico y registrar la desviación al llegar a una frontera segura. Si CI falla, detener nuevos pushes y escalar según `frontend-ai-development-workflow`.
