# Delivery runner

El delivery runner convierte el snapshot staged en una decisión y una ejecución determinísticas y reproducibles. Su núcleo es neutral y no depende de Codex ni de un proveedor específico de agentes.

## Política versionada

La política formal en `.delivery/policy.v1.json` es la **única fuente autoritativa** que decide:
- Clasificación de archivos (`classification.rules` y `fallback`).
- Composición y orden de gates (`NONE`, `0`, `A`, `B`, `C`, `D`).
- Catálogo de checks permitidos y timeouts (`checkCatalog`).
- Límites de tamaño de diff, número de archivos y líneas de diagnósticos (`limits`).

## Entradas principales

```bash
npm run delivery:inspect -- --intent prepare_commit --message '<mensaje>'
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje>'
npm run delivery:ci -- --sha <commit-sha>
npm run delivery:finalize -- --intent close_us --scope features/<feature>.feature
```

- `delivery:inspect`: clasifica archivos, selecciona el gate y audita señales de mantenibilidad sin ejecutar comandos pesados.
- `delivery:prepare`: repite la inspección sobre el snapshot staged exacto y ejecuta el gate en fail-fast.
- `delivery_inspect`, `delivery_prepare` y `delivery_ci_inspect` están disponibles en el servidor MCP (`tools/delivery-mcp/server.mjs`).
- Los agentes consumen únicamente respuestas estructuradas y normalizadas; **no deben calcular gates ni procesar tracebacks completos**.

Intents válidos: `prepare_commit`, `close_scenario`, `close_batch`, `close_us`.
Gate B requiere o infiere exactamente un archivo de feature (`--feature`). Gate D verifica la ausencia total de `@wip` en el alcance (`--scope`).

## Evidencia, caché y ledger

- **Ligadura criptográfica**: Cada ejecución genera una `runKey` basada en diff staged, árbol (`stagedTreeSha`), HEAD, política, gate, parámetros y archivos staged.
- **Caché determinística**: Cubre tanto éxitos como fallos idénticos sobre el mismo snapshot (registrando `attemptCount`).
- **Forzado explícito**: `--force` evita la caché y ejecuta nuevamente todos los checks del gate.
- **Ledger local**: Al commitear, `post-commit` asocia el `commitSha` con la evidencia preparada (`snapshotHash`, `treeSha`, `runKey`) en `.delivery/runtime/ledger/`.
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
- **Protección principal**: Los hooks de Git (`pre-commit`, `commit-msg`, `post-commit`, `pre-push`) son la barrera principal del repositorio local. El hook de Codex (`.codex/hooks.json`) es opcional y anticipatorio (advisory).
- **Mecanismos de bypass**: Ningún hook local se describe como imposible de omitir; Git permite omisiones deliberadas (`--no-verify`). La seguridad final del repositorio depende de CI remoto y la protección de ramas en GitHub.
- **Pre-push y CI**: El hook `pre-push` hace cumplir "un commit, un push", verifica que el commit posea evidencia válida en el ledger y comprueba que commits anteriores no tengan CI fallido. El flag de degradación offline (`DELIVERY_SKIP_CI_CHECK=1`) permite continuar sin red en commits previos, pero **no convierte un CI fallido o desconocido en exitoso**.
- **Finalización de US**: `delivery:finalize` solamente acepta `status: passed` en CI para autorizar el cierre.
