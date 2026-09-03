# Delivery runner

El delivery runner convierte el snapshot staged en una decisión y una ejecución reproducibles. Su núcleo no depende de Codex ni de otro proveedor de agentes.

## Entradas

```bash
npm run delivery:inspect -- --intent prepare_commit --message '<mensaje>'
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje>'
```

- `delivery:inspect` calcula el gate y la revisión de mantenibilidad sin correr tests.
- `delivery:prepare` repite la inspección y ejecuta el gate local en fail-fast.
- El servidor de `tools/delivery-mcp/server.mjs` expone las mismas operaciones como `delivery_inspect` y `delivery_prepare`.
- `.codex/config.toml` solo registra el adaptador MCP para quienes usan Codex; no es necesario para usar la CLI.

Los intents válidos son `prepare_commit`, `close_scenario`, `close_batch` y `close_us`. Gate B puede requerir `--feature`; Gate D acepta uno o más `--scope` con feature files terminados.

## Evidencia

La salida estándar es JSON compacto. Un gate exitoso devuelve `status: passed`, su `runKey`, resumen por check y la ruta del ledger. Ante una falla devuelve únicamente un diagnóstico normalizado y hasta seis líneas causales. Los logs completos, locks, caché y records se guardan en `.delivery/runtime/`, que Git ignora.

La caché solo reutiliza una ejecución verde cuando coinciden el diff staged, HEAD, política, gate, parámetros y archivos staged, y no existen cambios unstaged o untracked visibles.

Una señal de mantenibilidad sigue requiriendo juicio. Después de revisarla, puede aceptarse solo para el hash exacto con `--acknowledge-snapshot` y `--acknowledge-reason`; la justificación queda en el record local.

## Límites

El runner local nunca crea commits, hace push ni declara CI verde. `ci_green` aparece como comprobación post-push pendiente en Gate D. La automatización remota debe consumir el SHA ya creado en una fase separada.
