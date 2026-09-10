---
name: frontend-testing-gates
description: "Ejecutar gates explícitos de calidad en Lo Resuelvo: RED BDD, tests, typechecks, lint, build, E2E y CI."
---

# Frontend Testing Gates

Usar como referencia semántica durante el desarrollo. Antes de cada commit de agente, el ejecutor canónico es `delivery_prepare`; quien cambia el diff es responsable de obtener `status: passed`, pero no de calcular el gate ni encadenar sus comandos. Un humano puede commitear sin receipt y dejar la verificación local como `not_run`, según `AGENTS.md`.

Los gates verifican comportamiento y salud técnica, no legibilidad por sí solos. `delivery_prepare` también ejecuta la auditoría de `frontend-maintainability-governance`; sus umbrales son señales de revisión, no nuevos tests rígidos.

## Ejecución canónica

Para TDD interactivo y comprobaciones rápidas durante el ciclo RED/GREEN, el agente invoca exclusivamente `delivery_test`:
```text
delivery_test({ mode: "affected" | "unit" | "scenario" | "diagnostic", ... })
```
La evidencia de TDD se conserva en `.delivery/runtime/tdd/` y **no es consumible por git hooks ni genera receipts de commit**.

Para fronteras staged previas a commit, el ejecutor canónico es `delivery_prepare`:
```text
delivery_prepare({ intent: "prepare_commit" | "close_scenario" | "close_batch" | "close_us" | "repair_ci", proposedCommitMessage: "..." })
```
En cualquier entorno sin MCP o para uso humano:
```bash
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje propuesto>'
```

La política versionada en `.delivery/policy.v1.json` es la única fuente de clasificación, selección y orden de checks. La CLI y MCP comparten exactamente el mismo núcleo. Los comandos de las secciones siguientes documentan qué protege cada gate y sirven para diagnóstico focalizado; no deben ejecutarse manualmente como una lista pre-commit.

### Evidencia de delivery, diagnósticos compactos y modo Jobs
- **Evidencia y ledger**: La evidencia autoritativa para autorizar commits se almacena en `.delivery/runtime/runs/` y se registra en el ledger de delivery (`.delivery/runtime/ledger.json`). Queda ligada criptográficamente a HEAD, árbol staged, política, intent y alcance.
- **Diagnóstico compacto**: El runner ejecuta en fail-fast y devuelve diagnósticos acotados y procesados, sin volcados masivos de stdout/stderr. Cada resultado incluye la propiedad `logPath` apuntando al log completo persistente en `.delivery/runtime/logs/`; dicho archivo se consulta únicamente de forma excepcional ante diagnósticos donde el resumen procesado no alcance.
- **Caché determinística**: Reutiliza evidencia idéntica (éxitos y fallos idénticos, con `force: true` para forzar re-ejecución).
- **Modo Jobs (`delivery_job_wait`)**: `delivery_test` usa `executionMode: "auto"` por defecto: mantiene unitarios focalizados síncronos y deriva escenarios, afectados o diagnósticos largos a jobs. Para gates largos (Gate C, D o R), verificación de HEAD y cierres con espera de CI, `delivery_prepare`, `delivery_verify_head` y `delivery_finalize` también admiten jobs. Toda operación larga retorna un `jobId`; el agente usa esperas acotadas con `delivery_job_wait({ jobId, timeoutMs })`, sin busy-polling. Un timeout de la espera no autoriza CLI ni bypass: se vuelve a consultar el mismo job o se escala. `delivery_job_cancel` se reserva para una cancelación explícita y auditable.
- **Hooks livianos**: Los hooks de Git (`.githooks/`, instalados mediante `npm run delivery:hooks:install`) nunca ejecutan suites de tests; solo verifican formato, receipts válidos existentes en el ledger y ventana de CI. Para los agentes, `delivery_prepare` es la entrada obligatoria previa a cada commit.

## Semántica de los gates

### Gate NONE — Documentación o configuración no funcional

- **Selección**: Cambios exclusivos en documentación, estilos puros o configuración que no altera el runtime.
- **Frontera semántica**: No requiere validación funcional local ni arranque de suites de test.

### Gate 0 — Compatibilidad de steps

- **Selección**: Features, step definitions o soporte Cucumber sin integración productiva.
- **Frontera semántica**: Comprueba exclusivamente que los steps compilen y resuelvan unívocamente sin colisiones ni ambigüedad con los steps existentes.
- **Alcance**: No levanta Next.js ni Playwright (usa análisis estático y dryRun sin `@wip`). No se exige demostrar un RED inicial.

### Gate A — Código nuevo aislado

- **Selección**: Dominio, helpers, mappers, use cases o tooling de delivery aislado.
- **Frontera semántica**: Verifica lógica de negocio unitaria y typechecks aplicables antes de su integración a la UI o rutas.

### Gate B — Integración de bajo riesgo del escenario activo

- **Selección**: Cierre de un escenario aislado de bajo riesgo con feature unívoca inferible o declarada (retirada de tag `@wip`).
- **Frontera semántica**: Valida el feature completo al que pertenece el escenario cerrado, comprobando que se integre a la suite normal sin regresiones en escenarios vecinos.

### Gate C — Cambio compartido o de riesgo alto

- **Selección**: Routing, layouts, navegación, componentes compartidos, API client, Server Actions o dependencias transversales.
- **Frontera semántica**: Cobertura amplia para cambios que pueden impactar múltiples flujos: lint, typechecks (app y cucumber), tests unitarios y suite E2E integral gestionada.

### Gate D — Cierre de batch, US o escenario de alto riesgo

- **Selección**: Cierre formal de User Story (`close_us`), cierre de batch (`close_batch`) o escenario de alto riesgo cerrado.
- **Frontera semántica**: Máxima cobertura local: ejecuta la batería de Gate C y verifica de forma estricta la ausencia total de tags `@wip` en el alcance de features declarado.
- **Soporte de Jobs**: Dada la extensión de la suite E2E completa, `delivery_prepare` puede ejecutarse o auto-promoverse a modo job (`delivery_job_wait({ jobId })`) para evitar timeouts de cliente.

### Gate R — Reproducción exhaustiva de CI para reparación de un solo uso

- **Selección**: Intent `repair_ci` con `repairsSha` indicando el commit fallido en CI remoto.
- **Frontera semántica**: Reproduce de forma exhaustiva los checks de CI asignados a agentes (`delivery_unit`, `lint`, `typecheck_app`, `typecheck_cucumber`, `unit`, `e2e_full` y `build`; excluyendo la construcción de imágenes Docker, reservada a humanos y GitHub Actions).
- **Soporte de Jobs**: Al igual que Gate D, soporta modo job recuperable con `delivery_job_wait`.
- **Autorización de un solo uso**: Emite un receipt de reparación consumible una única vez en `pre-push` para autorizar el push del fix y subsanar el SHA fallido en el ledger.

### Superficie Docker reservada a humanos (HUMAN_ONLY)

Los archivos y scripts de Docker (`Dockerfile`, `Dockerfile.*`, `.dockerignore`, `docker/**`, `compose*.yml`, `compose*.yaml`, cualquier archivo bajo `.github/workflows/**` y scripts de imágenes) pertenecen exclusivamente al desarrollador humano (`HUMAN_ONLY`).
- Si un agente los incluye en su snapshot staged, `delivery_inspect` y `delivery_prepare` bloquean con `HUMAN_ONLY_CHANGE` y escalan a `STOP_USER`.
- Un fallo observado en un job Docker puede usar `repair_ci` cuando la causa y el snapshot staged pertenecen a código no reservado. Si la reparación modifica Docker, workflows o scripts de imágenes, conserva `HUMAN_ONLY_CHANGE` y escala a `STOP_USER`.

### Elevación determinística por impacto real

La selección del gate no se guía por heurísticas superficiales de directorios, sino por el análisis estático de impacto:
- **Cucumber Steps**: Mapeo estático de definiciones de steps contra sus features consumidoras. Un step nuevo no usado selecciona Gate 0; un step consumido por una única feature selecciona Gate B; steps consumidos por múltiples features, cambios en soporte global (`features/support/hooks.ts`) o ambigüedad elevan determinísticamente a Gate C.
- **TypeScript AST**: Grafo de dependencias que analiza importaciones de componentes y módulos. Archivos o componentes consumidos por múltiples flujos, layouts o providers globales elevan a Gate C. Prevalece siempre el gate de mayor cobertura entre los impactos detectados.

El runner local verifica que no queden tags `@wip` en los feature files del alcance terminado. Después del push todavía corresponde verificar:

- commits coherentes, pusheados individualmente y registrados por SHA;
- la ventana de CI se valida automáticamente (hasta 4 commits en vuelo sin incidentes);
- working tree sin artefactos accidentales.

## Fail-fast y reparación

- No commitear ni pushear mientras el gate requerido falle.
- Corregir autónomamente la causa directa dentro del alcance y repetir el comando fallido solo si cambió código, configuración o evidencia relevante.
- No reportar RED esperado ni intentos locales que terminen en GREEN.
- Escalar si la falla persiste, parece ajena, exige archivos fuera del alcance o cambia el plan.

Cuando una falla no se resuelve con su causa directa, leer [diagnóstico y escalamiento](references/failure-diagnostics.md). Esa referencia define firma causal, evidencia compacta, señales de falta de progreso y `STOP_USER`; no cargarla durante ejecuciones verdes.

## CI remoto, verificación sobre HEAD y reparación

- **Cero polling de CI**: La ventana de hasta cuatro commits en vuelo (`queued`, `in_progress`, `not_found`) y los incidentes activos se evalúan automáticamente en `delivery_prepare` y `pre-push`. El desarrollador no debe realizar polling ni monitoreo periódico manual por SHA tras cada push.
- **Diagnóstico puntual de CI**: Si un commit falla en CI remoto, `pre-push` bloquea nuevos pushes ordinarios. En ese caso, se utiliza `delivery_ci_inspect({ sha: "<failed-sha>" })` para diagnóstico focalizado puntual sin emitir comandos crudos de `gh` ni tracebacks masivos.
- **Prohibición de bypass**: Queda terminantemente prohibido cualquier intento de bypass ambiental de CI: la variable `DELIVERY_SKIP_CI_CHECK` está obsoleta y es rechazada inmediatamente de forma fail-closed (`DEPRECATED_CI_BYPASS_REJECTED`). Tampoco se permite `--no-verify`.
- **Flujo de reparación (`repair_ci`)**: Los agentes ejecutan `delivery_prepare({ intent: "repair_ci", repairsSha: "<failed-sha>", proposedCommitMessage: "fix: ..." })`; Gate R genera el receipt de uso único. Un humano puede delegar los tests al CI registrando después del stage final `npm run delivery:context -- --intent repair_ci --repairs-sha <failed-sha> [--us-id <id>]`; queda `not_run`, se valida contra el snapshot exacto y sigue bloqueado cuando `DELIVERY_REQUIRE_EVIDENCE=1`.
- **Verificación sobre HEAD**: Para verificar Gate D sobre un commit HEAD ya existente sin crear commits vacíos ni artificiales, invocar `delivery_verify_head` con el mismo intent que el cierre posterior (`close_batch` o `close_us`) y `mode: "job"`, y aguardar mediante `delivery_job_wait`. Esto valida el árbol de HEAD y registra la evidencia para autorizar el cierre.
- `delivery_finalize` con `close_batch` se usa solamente cuando todos los feature files declarados como scope del batch están completos y sin `@wip`. Puede aceptar `queued`, `in_progress` o `not_found`, devolver `passed_pending_ci` y habilitar el siguiente batch. Si una feature conserva escenarios futuros con `@wip`, reportar el batch sin formalizar `close_batch` sobre ese archivo.
- En `close_us`, MCP `delivery_finalize` —o `npm run delivery:finalize` sin MCP— comprueba de forma automática que todos los commits de la US (incluyendo commits previos registrados como `not_run`) estén en verde con `status: passed` en CI, y que HEAD cuente con Gate D aprobado sin `@wip`. Estados `not_found`, `cancelled`, `timed_out` o `provider_error`, así como evidencia corrupta o faltante, bloquean el cierre. Admite `waitForCi: true` (con soporte de modo job mediante `delivery_job_wait`) para aguardar de forma acotada a que los checks de CI en vuelo completen en verde.

## Seguridad antes de commit

- Sin secretos, tokens, `.env` ni logs de datos sensibles.
- Errores de usuario genéricos y en español.
- Actualizar `.env.example` si cambian variables públicas o privadas.

## Integridad de fixtures y tipos de prueba

No usar `as any`, `as never` ni `@ts-ignore` en tests nuevos. Si una prueba de
frontera necesita representar un payload externo con campos no modelados, usar
`unknown` de forma localizada, documentar el motivo y validarlo en el mapper;
no inyectar datos inválidos mediante casts inseguros en componentes. Preferir
factories tipadas y assertions sobre el contrato público resultante.
