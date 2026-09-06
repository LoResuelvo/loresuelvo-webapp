---
name: frontend-testing-gates
description: "Ejecutar gates explícitos de calidad en Lo Resuelvo: RED BDD, tests, typechecks, lint, build, E2E y CI."
---

# Frontend Testing Gates

Usar como referencia semántica durante el desarrollo. Antes de cada commit de agente, el ejecutor canónico es `delivery_prepare`; quien cambia el diff es responsable de obtener `status: passed`, pero no de calcular el gate ni encadenar sus comandos. Un humano puede commitear sin receipt y dejar la verificación local como `not_run`, según `AGENTS.md`.

Los gates verifican comportamiento y salud técnica, no legibilidad por sí solos. `delivery_prepare` también ejecuta la auditoría de `frontend-maintainability-governance`; sus umbrales son señales de revisión, no nuevos tests rígidos.

## Ejecución canónica

Con MCP disponible, invocar `delivery_prepare`. En cualquier otro entorno:

```bash
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje propuesto>'
```

La política versionada en `.delivery/policy.v1.json` es la única fuente de clasificación, selección y orden de checks. La CLI y MCP comparten exactamente el mismo núcleo. Los comandos de las secciones siguientes documentan qué protege cada gate y sirven para diagnóstico focalizado; no deben ejecutarse manualmente como una lista pre-commit.

El runner ejecuta en fail-fast, reutiliza evidencia determinística del mismo snapshot (tanto éxitos como fallos idénticos, con `--force` para forzar una ejecución nueva) y devuelve diagnósticos acotados sin tracebacks completos. Conserva el log completo y el ledger local en `.delivery/runtime/`, fuera de Git. La evidencia queda ligada a HEAD, árbol staged, política, intent y alcance. El control `ci_green` pertenece al estado posterior al push y nunca se presenta como aprobado por el gate local. Los hooks de Git (`.githooks/`, instalados mediante `npm run delivery:hooks:install`) son deliberadamente livianos y nunca ejecutan suites de tests; solo verifican formato, receipts existentes y estado previo de CI. Para los agentes, `delivery_prepare` es la entrada canónica obligatoria previa a cada commit; el guard anticipatorio disponible en el entorno deniega intentos de commit sin receipt válido. La seguridad final del repositorio depende de CI remoto y protección de rama.

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

### Gate R — Reproducción exhaustiva de CI para reparación de un solo uso

- **Selección**: Intent `repair_ci` con `repairsSha` indicando el commit fallido en CI remoto.
- **Frontera semántica**: Reproduce de forma exhaustiva la batería completa de CI local: lint, typecheck de app (`tsconfig.json`), typecheck de cucumber (`tsconfig.cucumber.json`), suite unitaria (`npm test`) y suite E2E gestionada (`make test-e2e-managed`).
- **Autorización de un solo uso**: Emite un receipt de reparación consumible una única vez en `pre-push` para autorizar el push del fix y subsanar el SHA fallido en el ledger.

### Elevación determinística por impacto real

La selección del gate no se guía por heurísticas superficiales de directorios, sino por el análisis estático de impacto:
- **Cucumber Steps**: Mapeo estático de definiciones de steps contra sus features consumidoras. Un step nuevo no usado selecciona Gate 0; un step consumido por una única feature selecciona Gate B; steps consumidos por múltiples features, cambios en soporte global (`features/support/hooks.ts`) o ambigüedad elevan determinísticamente a Gate C.
- **TypeScript AST**: Grafo de dependencias que analiza importaciones de componentes y módulos. Archivos o componentes consumidos por múltiples flujos, layouts o providers globales elevan a Gate C. Prevalece siempre el gate de mayor cobertura entre los impactos detectados.

El runner local verifica que no queden tags `@wip` en los feature files del alcance terminado. Después del push todavía corresponde verificar:

- commits coherentes, pusheados individualmente y registrados por SHA;
- los SHAs relevantes no tienen CI roja; `queued`, `in_progress` o un run todavía `not_found` pueden permanecer al cierre de batch, pero deben estar verdes antes del cierre de la US;
- working tree sin artefactos accidentales.

## Fail-fast y reparación

- No commitear ni pushear mientras el gate requerido falle.
- Corregir autónomamente la causa directa dentro del alcance y repetir el comando fallido solo si cambió código, configuración o evidencia relevante.
- No reportar RED esperado ni intentos locales que terminen en GREEN.
- Escalar si la falla persiste, parece ajena, exige archivos fuera del alcance o cambia el plan.

Cuando una falla no se resuelve con su causa directa, leer [diagnóstico y escalamiento](references/failure-diagnostics.md). Esa referencia define firma causal, evidencia compacta, señales de falta de progreso y `STOP_USER`; no cargarla durante ejecuciones verdes.

## CI remoto, verificación sobre HEAD y reparación

- Monitorear cada push por SHA, con una ventana máxima de cuatro commits totales en vuelo, incluido el commit que se está pusheando. La cifra vive en `ci.maxInFlightCommits` dentro de la política versionada.
- La consulta de CI se realiza de forma compacta mediante `delivery_ci_inspect` o `npm run delivery:ci -- --sha <sha>`, sin emitir comandos crudos de `gh` ni tracebacks masivos.
- Mientras el siguiente push no exceda cuatro SHAs en vuelo, continuar el trabajo local. Ante CI fallido, `timed_out` o `cancelled`, los hooks de Git bloquean nuevos pushes hasta resolver la causa.
- Queda terminantemente prohibido cualquier intento de bypass ambiental de CI: la variable `DELIVERY_SKIP_CI_CHECK` está obsoleta y es rechazada inmediatamente de forma fail-closed (`DEPRECATED_CI_BYPASS_REJECTED`).
- La resolución de fallos remotos de CI se realiza únicamente mediante el flujo de reparación auditable: preparar el fix y ejecutar `delivery_prepare({ intent: "repair_ci", repairsSha: "<failed-sha>", proposedCommitMessage: "fix: ..." })`. Esto corre el Gate R y genera un receipt de uso único que autoriza el push correctivo y subsana el fallo en el ledger.
- **Verificación sobre HEAD**: Para verificar Gate D sobre un commit HEAD ya existente sin crear commits vacíos ni artificiales, invocar `delivery_verify_head({ intent: "close_us", scopeFiles })` (o CLI `delivery:verify-head`). Esto valida el árbol de HEAD y registra la evidencia para autorizar el cierre.
- `delivery_finalize` con `close_batch` se usa solamente cuando todos los feature files declarados como scope del batch están completos y sin `@wip`. Puede aceptar `queued`, `in_progress` o `not_found`, devolver `passed_pending_ci` y habilitar el siguiente batch. Si una feature conserva escenarios futuros con `@wip`, reportar el batch sin formalizar `close_batch` sobre ese archivo.
- En `close_us`, MCP `delivery_finalize` —o `npm run delivery:finalize` sin MCP— comprueba de forma automática que todos los commits de la US (incluyendo commits previos registrados como `not_run`) estén en verde con `status: passed` en CI, y que HEAD cuente con Gate D aprobado sin `@wip`. Estados `not_found`, `cancelled`, `timed_out` o `provider_error`, así como evidencia corrupta o faltante, bloquean el cierre. Admite `waitForCi: true` (con `timeoutMs` y `pollIntervalMs` configurables) para aguardar de forma acotada a que los checks de CI en vuelo completen en verde.

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
