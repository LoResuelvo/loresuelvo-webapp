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

Antes de cada commit del agente, dejar staged únicamente el cambio atómico e invocar `delivery_prepare` con el `intent` aplicable (`prepare_commit`, `close_scenario`, `close_batch`, `close_us`) y el mensaje propuesto. Esta herramienta inspecciona el snapshot, selecciona y ejecuta el gate local; el agente no calcula el gate ni reproduce sus comandos.

El repositorio distingue claramente el flujo humano del flujo de agente:
- **Agentes**: deben ejecutar `delivery_prepare` antes de commitear para obtener un receipt con `status: passed`. El hook de Codex intercepta `git commit` y deniega cualquier commit que no cuente con un receipt previo coincidente. Los hooks de Git son livianos y **nunca ejecutan suites de tests**.
- **Humanos**: pueden desarrollar, hacer stage y commitear directamente de forma manual o apoyándose en CI; en ausencia de receipt, sus commits se registran en el ledger como `not_run`.

Usar la herramienta MCP cuando esté disponible. Cualquier agente o colega sin ese adaptador usa el mismo núcleo mediante:

```bash
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje propuesto>'
```

`delivery_inspect` —o `npm run delivery:inspect`— se reserva para previsualizar la decisión sin ejecutar el gate. Un resultado `review_required` exige revisar las señales. Si la solución sigue siendo cohesionada, la aceptación se ata al hash exacto y se justifica por cada señal detectada (con al menos 12 caracteres por justificación):

```bash
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje>' \
  --acknowledge-snapshot <snapshotHash> \
  --acknowledge-decision '<signal-id>=<justificación>'
```

La caché determinística cubre tanto ejecuciones exitosas como fallos idénticos; `--force` evita la caché cuando se solicita expresamente. Solo `status: passed` autoriza el commit. `no_changes` significa que no existe un snapshot staged para commitear; los demás estados detienen el commit. Los logs completos quedan en `.delivery/runtime/`, ignorados por Git, y la respuesta devuelve únicamente diagnósticos acotados sin tracebacks completos.

Registrar en el handoff o reporte la evidencia compacta generada por la herramienta:

```text
snapshotHash: <sha256>
runKey: <sha256 | null>
status: <passed | failed | review_required | blocked | needs_input | no_changes>
gate: <NONE | 0 | A | B | C | D>
cached: <true | false>
checks: <pasados/fallidos/omitidos>
evidence: <recordPath | null>
```

Si se modifican hooks o adaptadores React, preservar las directrices de `references/react-hooks.md`; si se crean, mueven o dividen carpetas o archivos, respetar `references/module-boundaries.md`.

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

No pushear un commit intermedio que requiera archivos aún no presentes en `main`. Ejecutar `delivery_prepare`, crear el commit solo con evidencia `passed` y pushearlo inmediatamente; no acumular varios commits locales para un único push. CI se sigue por SHA dentro de la ventana de commits en vuelo.

En `SCENARIO` y `SCENARIO_GROUP`, el desarrollador registra cada SHA y continúa sin reportes ordinarios mientras respete la ventana de CI. Cualquier estimación de commits por reporte es orientativa, no una cuota, mínimo ni máximo. No fusionar cambios independientes ni agrandar commits para ajustarse a una cifra; si el batch requiere más o menos fronteras, continuar con el siguiente commit atómico y registrar la desviación al llegar a una frontera segura. Si CI falla, detener nuevos pushes y escalar según `frontend-ai-development-workflow`.
