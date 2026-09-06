# Delivery runner

El delivery runner convierte el snapshot staged en una decisión y una ejecución determinísticas y reproducibles. Su núcleo es neutral y no depende de Codex ni de un proveedor específico de agentes.

## Política versionada

La política formal en `.delivery/policy.v1.json` es la **única fuente autoritativa** que decide:
- Clasificación de archivos (`classification.rules` y `fallback`).
- Selección de gates por impacto real (índice de Cucumber steps y AST de dependencias TypeScript).
- Composición y orden de gates (`NONE`, `0`, `A`, `B`, `C`, `D`, `R`).
- Catálogo de checks permitidos y timeouts (`checkCatalog`).
- Límites de tamaño de diff, número de archivos y líneas de diagnósticos (`limits`).
- Ventana máxima de commits totales en vuelo (`ci.maxInFlightCommits`).

## Entradas principales

```bash
npm run delivery:inspect -- --intent prepare_commit --message '<mensaje>'
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje>'
npm run delivery:prepare -- --intent repair_ci --repairs-sha <sha-fallido> --message 'fix: ...'
npm run delivery:verify-head -- --intent close_us --scope features/<feature>.feature
npm run delivery:ci -- --sha <commit-sha>
npm run delivery:finalize -- --intent close_batch --scope features/<feature>.feature
npm run delivery:finalize -- --intent close_us --scope features/<feature>.feature --wait-for-ci
```

- `delivery:inspect`: clasifica archivos, selecciona el gate por impacto real y audita señales de mantenibilidad sin ejecutar comandos pesados.
- `delivery:prepare`: repite la inspección sobre el snapshot staged exacto y ejecuta el gate en fail-fast.
- `delivery:verify-head`: valida Gate D directamente sobre el commit HEAD actual y almacena la evidencia en el ledger para el cierre de US o batch sin requerir commits vacíos.
- `delivery:ci`: inspecciona el estado de CI para un commit específico.
- `delivery:finalize`: valida la integridad de la entrega para batch o US; soporta `--wait-for-ci` para espera acotada.
- Las 5 herramientas MCP correspondientes (`delivery_inspect`, `delivery_prepare`, `delivery_verify_head`, `delivery_ci_inspect` y `delivery_finalize`) están disponibles en el servidor MCP (`tools/delivery-mcp/server.mjs`).
- Los agentes consumen únicamente respuestas estructuradas y normalizadas; **no deben calcular gates ni procesar tracebacks completos**.

Intents válidos: `prepare_commit`, `close_scenario`, `close_batch`, `close_us`, `repair_ci`.
- Gate B requiere o infiere exactamente un archivo de feature (`--feature`).
- Gate D verifica la ausencia total de `@wip` en el alcance (`--scope`).
- Gate R reproduce exhaustivamente el pipeline de CI para reparación de un solo uso ante CI fallido (`--repairs-sha`).

## Flujo de trabajo: Agente vs Humano

```text
Agente Codex
desarrollar → stage → MCP delivery_prepare → receipt passed
→ git commit → push

Humano
desarrollar → stage → git commit → push → CI
                  └─ delivery_prepare opcional
```

- **Agente**: la invocación de `delivery_prepare` sobre el snapshot staged es obligatoria antes de `git commit`. El hook de Codex deniega el commit si no existe un receipt válido.
- **Humano**: puede commitear y pushear directamente, apoyándose en la suite manual o en CI. El commit se registra como `not_run` en el ledger local.

## Evidencia, caché y ledger

- **Ligadura criptográfica**: Cada ejecución genera una `runKey` basada en diff staged, árbol (`stagedTreeSha`), HEAD, política, gate, parámetros y archivos staged.
- **Caché determinística**: Cubre tanto éxitos como fallos idénticos sobre el mismo snapshot (registrando `attemptCount`).
- **Forzado explícito**: `--force` evita la caché y ejecuta nuevamente todos los checks del gate.
- **Ledger local**: Al commitear, `post-commit` registra el `commitSha` en `.delivery/runtime/ledger/`. Distingue cuatro estados de evidencia:
  - `verified`: commit con evidencia de gate ejecutada localmente y validada criptográficamente contra el árbol y commit de Git.
  - `not_run`: commit creado sin receipt local previo (commits humanos). Contiene los metadatos de Git preservando trazabilidad sin haber corrido el gate local.
  - `corrupt`: commit cuyo registro en ledger o archivo de evidencia fue alterado, tiene discrepancia de hash o digest, o no coincide con Git. Bloquea pushes y cierres.
  - `missing`: commit sin ninguna entrada en el ledger local. Bloquea pushes y cierres.
- Todos los logs crudos, caches y locks se guardan en `.delivery/runtime/`, ignorados por Git.

## Auditoría de mantenibilidad

Ante `review_required`, cada señal detectada debe ser revisada y justificada individualmente:
```bash
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje>' \
  --acknowledge-snapshot <snapshotHash> \
  --acknowledge-decision '<signal-id>=<justificación de al menos 12 caracteres>'
```
No se admite bypass genérico. Señales truncadas por exceder los límites de política bloquean el commit hasta reducir el alcance.

## Matriz de gates y selección determinística

El runner selecciona el gate evaluando el impacto real del snapshot staged:
- **Gate NONE**: cambios exclusivos en documentación, estilos puros o configuración no ejecutable.
- **Gate 0**: compatibilidad de steps Cucumber (validación estática, compilación de steps y chequeo de ambigüedad sin levantar Next.js ni Playwright). Seleccionado para step definitions nuevos no consumidos.
- **Gate A**: código nuevo aislado en dominio, helpers, mappers, use cases o delivery tooling aislado (`npm test` y typechecks de tsconfig).
- **Gate B**: integración de bajo riesgo del escenario activo sobre una feature unívoca (suite de Vitest y suite E2E de esa feature específica). Seleccionado si un step es consumido exclusivamente por una sola feature.
- **Gate C**: cambio compartido o de riesgo transversal (routing, layouts, Server Actions, providers globales, API, hooks globales de soporte `features/support/hooks.ts`, steps compartidos por múltiples features o componentes importados por múltiples flujos según el AST de TypeScript). Ejecuta lint, typechecks (app y cucumber), unit tests y suite E2E integral gestionada.
- **Gate D**: cierre de batch (`close_batch`), cierre de User Story (`close_us`) o escenario de alto riesgo. Ejecuta la batería de Gate C y verifica de forma estricta la ausencia total de `@wip` en el alcance declarado.
- **Gate R**: reproducción exhaustiva local de los checks de CI asignados a agentes (`delivery_unit`, `lint`, `typecheck_app`, `typecheck_cucumber`, `unit`, `e2e_full` y `build`; excluyendo Docker build, reservado para GitHub Actions y humanos) para reparación auditable de un solo uso ante fallas remotas de CI (`intent: "repair_ci"` con `--repairs-sha <sha>`).

### Superficie Docker reservada a humanos (HUMAN_ONLY)

Los archivos y scripts relacionados con Docker y la construcción de imágenes de contenedores (`Dockerfile`, `Dockerfile.*`, `.dockerignore`, `docker/**`, `compose*.yml`, `compose*.yaml`, workflows de Docker en `.github/workflows/**` y scripts exclusivos de construcción de imágenes) están reservados exclusivamente a desarrolladores humanos (`HUMAN_ONLY`).
- Si un agente modifica estas rutas, `delivery_inspect` y `delivery_prepare` bloquean la ejecución con diagnóstico `HUMAN_ONLY_CHANGE`, requiriendo escalación a `STOP_USER`.
- Si el fallo remoto en CI ocurre en un job de Docker, `repair_ci` bloquea con `HUMAN_ONLY_CI_FAILURE`, escalando igualmente a `STOP_USER`. Los agentes no reparan incidencias de contenedores ni ejecutan Docker build localmente.

## Flujo de reparación de CI (`repair_ci`)

Cuando un commit falla en CI remoto, `pre-push` bloquea cualquier push ordinario subsiguiente:
1. El desarrollador o agente diagnostica el fallo a partir del reporte compacto de `delivery_ci_inspect` o `npm run delivery:ci`.
2. Queda prohibido cualquier intento de elusión por bypass; `DELIVERY_SKIP_CI_CHECK` es rechazado de inmediato de forma fail-closed.
3. Se implementa la corrección atómica, se realiza stage exacto y se invoca:
   `delivery_prepare({ intent: "repair_ci", repairsSha: "<failed-sha>", proposedCommitMessage: "fix: ..." })`
   (o en CLI `npm run delivery:prepare -- --intent repair_ci --repairs-sha <failed-sha> --message 'fix: ...'`).
4. Gate R ejecuta exhaustivamente todos los checks equivalentes a CI. Al pasar, emite un receipt de reparación ligado al snapshot y al SHA fallido.
5. El commit se realiza y se pushea (`git push origin main`).
6. El hook `pre-push` valida el receipt de Gate R, comprueba que el SHA objetivo coincida con el fallo activo y consume la autorización (de uso único).
7. Pre-push actualiza el ledger registrando la subsanación del SHA fallido; una vez pusheado con éxito, el fallo previo queda resuelto y se rehabilitan los pushes normales.

## Verificación sobre HEAD (`delivery:verify-head` / `delivery_verify_head`)

Para cerrar formalmente una User Story o batch cuando HEAD ya contiene el código definitivo y sin tags `@wip`, no se deben realizar commits artificiales o vacíos. Se invoca:
```bash
npm run delivery:verify-head -- --intent close_us --scope features/<feature>.feature
```
(o MCP `delivery_verify_head({ intent: "close_us", scopeFiles: [...] })`), lo que ejecuta Gate D sobre el árbol de HEAD y registra la evidencia en el ledger para habilitar `delivery_finalize`.

## Hooks de Git y Codex

- **Instalación**: Los hooks versionados (`.githooks/`) se configuran manualmente una vez por clon mediante `npm run delivery:hooks:install`. **No se instalan ni activan automáticamente al correr npm install**.
- **Hooks de Git livianos**: `pre-commit`, `commit-msg`, `post-commit` y `pre-push` **nunca ejecutan suites de tests**.
  - `pre-commit`: lectura exclusiva. Verifica si existe un receipt válido para el árbol staged. Si existe, pasa; si no existe, avisa y permite el commit como `not_run` (bloqueando únicamente si `DELIVERY_REQUIRE_EVIDENCE=1`).
  - `post-commit`: si hubo un receipt coincidente, lo consume y registra el commit como `passed`; si no hubo receipt, lo registra como `not_run` sin consumir contexto.
  - `pre-push`: valida atomicidad estricta ("un commit, un push"), mensajes, evidencia en ledger (`verified` y `not_run` permitidos por defecto; `corrupt` o `missing` bloqueados siempre; `not_run` bloqueado si `DELIVERY_REQUIRE_EVIDENCE=1`), valida autorizaciones de reparación de un solo uso en flujos `repair_ci` (consumiéndolas y marcando subsanación), y comprueba que commits anteriores no tengan CI fallido ni superen la ventana de pendientes.
- **Hook de Codex estricto**: `.codex/delivery-guard.mjs` es la barrera preventiva para agentes Codex. Intercepta `git commit` y deniega estrictamente la acción si no existe un receipt válido y coincidente en `.delivery/runtime/last-prepared.json`. No corre suites por sí mismo: orienta al agente a invocar `delivery_prepare`.
- **Prohibición total y rechazo fail-closed de bypass ambiental**: Ningún hook local se describe como imposible de omitir mediante flags de Git (`--no-verify`), los cuales están prohibidos para agentes. La seguridad final del repositorio depende de CI remoto y la protección de ramas en GitHub. La variable ambiental `DELIVERY_SKIP_CI_CHECK` está totalmente obsoleta y prohibida; cualquier intento de definirla es rechazado inmediatamente de forma fail-closed con `DEPRECATED_CI_BYPASS_REJECTED` en `pre-commit`, `commit-msg` y `pre-push`. La única vía legítima y auditable para reparar un fallo de CI es el flujo `repair_ci` con Gate R.
- **Ventana continua de CI**: `pre-push` cuenta el commit actual junto con los anteriores en `queued`, `in_progress` o todavía `not_found`. Permite hasta `ci.maxInFlightCommits` —cuatro por defecto— y bloquea el siguiente push si lo excedería o si detecta una falla previa.
- **Cierre de batch**: `delivery:finalize -- --intent close_batch` autoriza el cierre local si HEAD cuenta con Gate D aprobado, el scope no contiene `@wip`, los commits fueron pusheados y el ledger es válido. Puede devolver `passed_pending_ci` para continuar con el siguiente batch sin esperar el último run.
- **Finalización de US**: `delivery:finalize -- --intent close_us` verifica además que todos los commits de la US tengan `status: passed` en CI (incluyendo los `not_run`, reportados en `unverifiedCommits`). Commits corruptos, faltantes o con CI pendiente bloquean el cierre. Soporta `--wait-for-ci` (`waitForCi: true` en MCP) para realizar una espera acotada con sondeo automático hasta que todos los checks remotos completen exitosamente.
