# Delivery runner

El delivery runner convierte el snapshot staged en una decisión y una ejecución determinísticas y reproducibles. Su núcleo es neutral y no depende de Codex ni de un proveedor específico de agentes.

## Política versionada

La política formal en `.delivery/policy.v1.json` es la **única fuente autoritativa** que decide:
- Clasificación de archivos (`classification.rules` y `fallback`).
- Composición y orden de gates (`NONE`, `0`, `A`, `B`, `C`, `D`).
- Catálogo de checks permitidos y timeouts (`checkCatalog`).
- Límites de tamaño de diff, número de archivos y líneas de diagnósticos (`limits`).
- Ventana máxima de commits totales en vuelo (`ci.maxInFlightCommits`).

## Entradas principales

```bash
npm run delivery:inspect -- --intent prepare_commit --message '<mensaje>'
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje>'
npm run delivery:ci -- --sha <commit-sha>
npm run delivery:finalize -- --intent close_batch --scope features/<feature>.feature
npm run delivery:finalize -- --intent close_us --scope features/<feature>.feature
```

- `delivery:inspect`: clasifica archivos, selecciona el gate y audita señales de mantenibilidad sin ejecutar comandos pesados.
- `delivery:prepare`: repite la inspección sobre el snapshot staged exacto y ejecuta el gate en fail-fast.
- `delivery_inspect`, `delivery_prepare`, `delivery_ci_inspect` y `delivery_finalize` están disponibles en el servidor MCP (`tools/delivery-mcp/server.mjs`).
- Los agentes consumen únicamente respuestas estructuradas y normalizadas; **no deben calcular gates ni procesar tracebacks completos**.

Intents válidos: `prepare_commit`, `close_scenario`, `close_batch`, `close_us`.
Gate B requiere o infiere exactamente un archivo de feature (`--feature`). Gate D verifica la ausencia total de `@wip` en el alcance (`--scope`).

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

## Hooks de Git y Codex

- **Instalación**: Los hooks versionados (`.githooks/`) se configuran manualmente una vez por clon mediante `npm run delivery:hooks:install`. **No se instalan ni activan automáticamente al correr npm install**.
- **Hooks de Git livianos**: `pre-commit`, `commit-msg`, `post-commit` y `pre-push` **nunca ejecutan suites de tests**.
  - `pre-commit`: lectura exclusiva. Verifica si existe un receipt válido para el árbol staged. Si existe, pasa; si no existe, avisa y permite el commit como `not_run` (bloqueando únicamente si `DELIVERY_REQUIRE_EVIDENCE=1`).
  - `post-commit`: si hubo un receipt coincidente, lo consume y registra el commit como `passed`; si no hubo receipt, lo registra como `not_run` sin consumir contexto.
  - `pre-push`: valida atomicidad estricta ("un commit, un push"), mensajes, evidencia en ledger (`verified` y `not_run` permitidos por defecto; `corrupt` o `missing` bloqueados siempre; `not_run` bloqueado si `DELIVERY_REQUIRE_EVIDENCE=1`), y comprueba que commits anteriores no tengan CI fallido ni superen la ventana de pendientes.
- **Hook de Codex estricto**: `.codex/delivery-guard.mjs` es la barrera preventiva para agentes Codex. Intercepta `git commit` y deniega estrictamente la acción si no existe un receipt válido y coincidente en `.delivery/runtime/last-prepared.json`. No corre suites por sí mismo: orienta al agente a invocar `delivery_prepare`.
- **Mecanismos de bypass**: Ningún hook local se describe como imposible de omitir; Git permite omisiones deliberadas (`--no-verify`). La seguridad final del repositorio depende de CI remoto y la protección de ramas en GitHub. La variable ambiental `DELIVERY_SKIP_CI_CHECK` está obsoleta y prohibida; cualquier intento de definirla es rechazado inmediatamente con `DEPRECATED_CI_BYPASS_REJECTED`. La remediación de fallos de CI debe realizarse mediante el flujo `repair_ci`.
- **Ventana continua de CI**: `pre-push` cuenta el commit actual junto con los anteriores en `queued`, `in_progress` o todavía `not_found`. Permite hasta `ci.maxInFlightCommits` —cuatro por defecto— y bloquea el siguiente push si lo excedería o si detecta una falla previa.
- **Cierre de batch**: `delivery:finalize -- --intent close_batch` autoriza el cierre local si HEAD cuenta con Gate D aprobado, el scope no contiene `@wip`, los commits fueron pusheados y el ledger es válido. Puede devolver `passed_pending_ci` para continuar con el siguiente batch sin esperar el último run.
- **Finalización de US**: `delivery:finalize -- --intent close_us` verifica además que todos los commits de la US tengan `status: passed` en CI (incluyendo los `not_run`, reportados en `unverifiedCommits`). Commits corruptos, faltantes o con CI pendiente bloquean el cierre.
