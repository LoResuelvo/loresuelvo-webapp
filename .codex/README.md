# Adaptador opcional de Codex — Lo Resuelvo Webapp

Este directorio contiene el adaptador y el guard opcionales para entornos de desarrollo basados en Codex. El servidor MCP y la CLI de delivery son herramientas del proyecto; el registro del cliente en `config.toml` es local al clon y está ignorado por Git.

## Principios y delimitación

1. **Independencia total del equipo**:
   Los desarrolladores y agentes que no utilicen Codex **no necesitan activar este adaptador ni ninguna de sus herramientas**. Todo el ciclo de vida de desarrollo, inspección y entrega funciona de manera 100% autónoma mediante la CLI (`npm run delivery:*`) y los hooks estándar de Git (`.githooks/`).

2. **Herramientas canónicas y neutrales**:
   - Los hooks versionados en `.githooks/` (`pre-commit`, `commit-msg`, `post-commit`, `pre-push`) y la CLI pública son la interfaz canónica compartida por todo el proyecto.
   - Cualquier persona o agente sin Codex ejecuta `npm run delivery:prepare` y `npm run delivery:inspect` con exactamente las mismas garantías y políticas que el servidor MCP o las integraciones de Codex.
   - Un agente con MCP usa `delivery_inspect`, `delivery_prepare`, `delivery_verify_head`, `delivery_ci_inspect` y `delivery_finalize`; los comandos `npm run delivery:*` son el fallback neutral, no un segundo flujo que deba repetir.

3. **Sin secretos ni tokens**:
   Ningún archivo versionado en `.codex/` contiene ni debe contener credenciales, claves de API, tokens de autenticación ni secretos. `config.toml` es una configuración local ignorada por Git.

4. **El hook anticipatorio no es autoritativo**:
   - `.codex/hooks.json` define un hook opcional de `PreToolUse` para `Bash`; el guard lee `tool_input.command` por stdin y actúa únicamente ante `git commit`.
   - Su propósito es únicamente brindar **feedback temprano** antes de invocar a Git.
   - **No debe asumirse cobertura universal de `PreToolUse`**: el proyecto debe ser confiable y el hook debe aprobarse en `/hooks`. Los hooks de Git son la barrera predeterminada compartida (instalados una vez por clon mediante `npm run delivery:hooks:install`), pero ningún hook local es imposible de omitir deliberadamente en Git; el pre-push vuelve a validar mensaje y evidencia, y la seguridad final depende de CI y protección de rama.

## Contenido del directorio

- `config.toml`: Registro local del servidor MCP `loresuelvo-delivery` (`tools/delivery-mcp/server.mjs`). No se versiona.
- `hooks.json`: Declaración del hook `PreToolUse` para intercepción temprana de `git commit`.
- `delivery-guard.mjs`: Script read-only de verificación anticipada que consulta el mismo validador de receipts que los hooks de Git; nunca ejecuta gates ni tests.

## Activación en un clon nuevo

1. Instalar una sola vez los hooks de Git con `npm run delivery:hooks:install`.
2. Registrar el servidor MCP desde la raíz del repositorio:

   ```bash
   codex mcp add loresuelvo-delivery -- node tools/delivery-mcp/server.mjs
   ```

   Para que Codex apruebe automáticamente las llamadas de este servidor, configurar localmente:

   ```toml
   [mcp_servers.loresuelvo-delivery]
   default_tools_approval_mode = "approve"
   ```

3. Aprobar el hook local del proyecto en `/hooks`. Si cambia su definición, Codex puede requerir una nueva aprobación.
4. Configurar autenticación de GitHub (`gh auth` o `GITHUB_TOKEN`) para que `delivery_ci_inspect` y `delivery_finalize` puedan consultar CI.
