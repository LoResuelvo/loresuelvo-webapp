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

Antes de cada commit del agente, dejar staged únicamente el cambio atómico e invocar `delivery_prepare` con el `intent` aplicable (`prepare_commit`, `close_scenario`, `close_batch`, `close_us`, `repair_ci`) y el mensaje propuesto. Esta herramienta inspecciona el snapshot, selecciona y ejecuta el gate local; el agente no calcula el gate ni reproduce sus comandos.

El repositorio distingue claramente el flujo humano del flujo de agente:
- **Agentes autónomos**: deben usar MCP `delivery_prepare` antes de commitear para obtener un receipt con `status: passed`. El guard anticipatorio disponible en el entorno intercepta `git commit` y deniega cualquier commit que no cuente con un receipt previo coincidente. Si el MCP requerido no está disponible, detenerse salvo aprobación explícita de otro entorno.
- **Humanos**: pueden desarrollar, hacer stage y commitear directamente de forma manual o apoyándose en CI; en ausencia de receipt, sus commits se registran en el ledger como `not_run`.

La CLI neutral usa el mismo núcleo y queda disponible para humanos, diagnóstico o un entorno sin MCP aprobado:

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

Registrar en el handoff o reporte solamente la evidencia compacta necesaria: `snapshotHash`, `runKey`, estado, gate, checks, caché y receipt. El runner define el schema; no reconstruirlo manualmente ni adjuntar logs verdes.

Si se modifican hooks o adaptadores React, o se crean, mueven o dividen módulos, aplicar `frontend-maintainability-governance` y leer allí la referencia condicional correspondiente.

## Concurrencia del worktree

El índice de Git y `HEAD` son compartidos por todas las personas y agentes que operan sobre el mismo worktree. Debe existir un único owner del staging y commit a la vez.

- Antes de stagear o commitear, comprobar que los cambios presentes pertenecen a la frontera activa y preservar cualquier edición ajena.
- Si aparece un commit externo, un staging inesperado o cambia `HEAD`, detener el commit y volver a inspeccionar el árbol.
- Todo receipt preparado antes de ese cambio se considera inválido; ejecutar nuevamente `delivery_prepare` sobre el snapshot actual.
- Un commit observado no demuestra autoría. Correlacionar mensaje, SHA, archivos y owner antes de incorporarlo al reporte.
- Si un commit externo queda sin push y luego se crea otro, el pre-push puede bloquear por la regla de un commit por push. Coordinar y pushear cada commit en su propia frontera.

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

No pushear un commit intermedio que requiera archivos aún no presentes en `main`. Para commits de agente, ejecutar `delivery_prepare`, crear el commit solo con evidencia `passed` y pushearlo inmediatamente; no acumular varios commits locales para un único push. CI se sigue por SHA dentro de la ventana de commits en vuelo. Los commits humanos sin receipt siguen la excepción `not_run` definida en `AGENTS.md`.

En `SCENARIO` y `SCENARIO_GROUP`, el desarrollador registra cada SHA y continúa sin reportes ordinarios mientras respete la ventana de CI. Cualquier estimación de commits por reporte es orientativa, no una cuota, mínimo ni máximo. No fusionar cambios independientes ni agrandar commits para ajustarse a una cifra; si el batch requiere más o menos fronteras, continuar con el siguiente commit atómico y registrar la desviación al llegar a una frontera segura. Si CI falla, detener nuevos pushes e iniciar el flujo de reparación auditable (`repair_ci`).

## Reparación de CI de un solo uso (`repair_ci` / Gate R)

Cuando un commit anterior falla en CI remoto, el hook `pre-push` bloquea cualquier push ordinario subsiguiente. Queda estrictamente prohibido intentar eludir este bloqueo con variables ambientales (`DELIVERY_SKIP_CI_CHECK` es rechazado de forma fail-closed con `DEPRECATED_CI_BYPASS_REJECTED`) o con `--no-verify`.

Para subsanar el fallo de forma auditable:
1. Inspeccionar el fallo con `delivery_ci_inspect({ sha: "<failed-sha>" })` o `npm run delivery:ci -- --sha <failed-sha>`.
2. Implementar la corrección atómica y dejarla staged (`git add`).
3. Invocar MCP `delivery_prepare` con `intent: "repair_ci"`, `repairsSha: "<failed-sha>"` y un mensaje propuesto con tipo `fix`, `test` o `chore`:
   ```text
   delivery_prepare({ intent: "repair_ci", repairsSha: "<failed-sha>", proposedCommitMessage: "fix: ..." })
   ```
   (o en CLI: `npm run delivery:prepare -- --intent repair_ci --repairs-sha <failed-sha> --message 'fix: ...'`).
4. Esta invocación selecciona y ejecuta obligatoriamente el **Gate R**, que reproduce exhaustivamente el pipeline de CI a nivel local (lint, typecheck de app y cucumber, unit tests y E2E gestionado).
5. Con `status: passed`, crear el commit (`git commit -m "fix: ..."`) y pushearlo inmediatamente (`git push origin main`).
6. El hook `pre-push` comprueba la correspondencia con el SHA fallido, valida el Gate R y consume la autorización de reparación (de uso único). En el ledger local se asocia la reparación y se marca como subsanado el fallo previo, habilitando nuevamente pushes normales.
