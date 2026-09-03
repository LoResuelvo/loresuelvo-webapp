# Adaptador opcional de Codex — Lo Resuelvo Webapp

Este directorio contiene la configuración y adaptadores opcionales para entornos de desarrollo basados en Codex.

## Principios y delimitación

1. **Independencia total del equipo**:
   Los desarrolladores y agentes que no utilicen Codex **no necesitan este directorio ni ninguna de sus herramientas**. Todo el ciclo de vida de desarrollo, inspección y entrega funciona de manera 100% autónoma mediante la CLI (`npm run delivery:*`) y los hooks estándar de Git (`.githooks/`).

2. **Herramientas canónicas y neutrales**:
   - Los hooks versionados en `.githooks/` (`pre-commit`, `commit-msg`, `post-commit`, `pre-push`) y la CLI pública son la interfaz canónica compartida por todo el proyecto.
   - Cualquier persona o agente sin Codex ejecuta `npm run delivery:prepare` y `npm run delivery:inspect` con exactamente las mismas garantías y políticas que el servidor MCP o las integraciones de Codex.

3. **Sin secretos ni tokens**:
   Ningún archivo en `.codex/` contiene ni debe contener credenciales, claves de API, tokens de autenticación ni secretos. Toda la configuración es estrictamente declarativa y segura para control de versiones.

4. **El hook anticipatorio no es autoritativo**:
   - `.codex/hooks.json` define un hook opcional de `PreToolUse` que ejecuta `.codex/delivery-guard.mjs` cuando un agente intenta ejecutar un comando bash con `git commit`.
   - Su propósito es únicamente brindar **feedback temprano** antes de invocar a Git.
   - **No debe asumirse cobertura universal de `PreToolUse`**: los hooks de Git (`.githooks/`) son la **única barrera autoritativa e infalible** del repositorio. Si un comando elude `PreToolUse` o si se commitea desde otra interfaz, Git pre-commit y commit-msg garantizan la ejecución estricta del gate.

## Contenido del directorio

- `config.toml`: Registro del servidor MCP local `loresuelvo-delivery` (`tools/delivery-mcp/server.mjs`).
- `hooks.json`: Declaración del hook `PreToolUse` para intercepción temprana de `git commit`.
- `delivery-guard.mjs`: Script de verificación anticipada que reutiliza la caché de `prepareDelivery` sin re-ejecutar tests si el snapshot ya cuenta con evidencia verde.
