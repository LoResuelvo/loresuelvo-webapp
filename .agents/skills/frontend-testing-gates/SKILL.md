---
name: frontend-testing-gates
description: "Ejecutar gates explícitos de calidad en Lo Resuelvo: RED BDD, tests, typechecks, lint, build, E2E y CI."
---

# Frontend Testing Gates

Usar como referencia semántica durante el desarrollo. Antes de cada commit, el ejecutor canónico es `delivery_prepare`; quien cambia el diff es responsable de obtener `status: passed`, pero no de calcular el gate ni encadenar sus comandos.

Los gates verifican comportamiento y salud técnica, no legibilidad por sí solos. `delivery_prepare` también ejecuta la auditoría de `frontend-maintainability-governance`; sus umbrales son señales de revisión, no nuevos tests rígidos.

## Ejecución canónica

Con MCP disponible, invocar `delivery_prepare`. En cualquier otro entorno:

```bash
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje propuesto>'
```

La política versionada en `.delivery/policy.v1.json` es la única fuente de clasificación, selección y orden de checks. La CLI y MCP comparten exactamente el mismo núcleo. Los comandos de las secciones siguientes documentan qué protege cada gate y sirven para diagnóstico focalizado; no deben ejecutarse manualmente como una lista pre-commit.

El runner ejecuta en fail-fast, reutiliza evidencia determinística del mismo snapshot (tanto éxitos como fallos idénticos, con `--force` para forzar una ejecución nueva) y devuelve diagnósticos acotados sin tracebacks completos. Conserva el log completo y el ledger local en `.delivery/runtime/`, fuera de Git. La evidencia queda ligada a HEAD, árbol staged, política, intent y alcance. El control `ci_green` pertenece al estado posterior al push y nunca se presenta como aprobado por el gate local. Los hooks de Git (`.githooks/`, instalados mediante `npm run delivery:hooks:install`) son deliberadamente livianos y nunca ejecutan suites de tests; solo verifican formato, receipts existentes y estado previo de CI. Para los agentes, `delivery_prepare` es la entrada canónica obligatoria previa a cada commit, respaldada por la denegación estricta del hook de Codex ante cualquier intento de commit sin receipt válido. La seguridad final del repositorio depende de CI remoto y protección de rama.

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

El runner local verifica que no queden tags `@wip` en los feature files del alcance terminado. Después del push todavía corresponde verificar:

- commits coherentes, pusheados individualmente y registrados por SHA;
- los SHAs relevantes no tienen CI roja; un `rerun_pending` autorizado puede permanecer al cierre de batch o escenario, pero debe estar verde antes del cierre de la US;
- working tree sin artefactos accidentales.

## Fail-fast y reparación

- No commitear ni pushear mientras el gate requerido falle.
- Corregir autónomamente la causa directa dentro del alcance y repetir el comando fallido solo si cambió código, configuración o evidencia relevante.
- No reportar RED esperado ni intentos locales que terminen en GREEN.
- Escalar si la falla persiste, parece ajena, exige archivos fuera del alcance o cambia el plan.

### Presupuesto de iteración

- Definir la firma de falla como comando, exit code, primer error normalizado y archivo/línea cuando exista.
- El presupuesto es global para esa firma y se conserva entre developer, orquestador, subagentes, handoffs y compactaciones.
- El developer puede formular como máximo 2 hipótesis, cada una con hasta 2 intentos de corrección. Si ambas fallan, pasa a `ESCALATE_ORCHESTRATOR` con el paquete compacto.
- El orquestador dispone de una única intervención: revisar evidencia focalizada, realizar como máximo una consulta de triage y formular como máximo una tercera hipótesis global, con hasta 2 intentos de corrección ejecutados por el developer.
- Si la misma firma aparece dos veces consecutivas dentro de una hipótesis, esa hipótesis se considera agotada. No repetir una tool call fallida sin cambios de código, configuración o evidencia.
- Agotada la tercera hipótesis, pasar obligatoriamente a `STOP_USER`. Quedan prohibidas una cuarta hipótesis, las cadenas de subagentes y cualquier nuevo comando de reparación, cambio, commit o push hasta recibir instrucciones del usuario.
- Una firma causal materialmente distinta abre un diagnóstico nuevo. Cambios cosméticos del log, líneas desplazadas o ejecutar desde otro agente no crean una firma nueva. El RED esperado del ciclo TDD no consume presupuesto.

### Paquete de diagnóstico

No cargar logs crudos completos por defecto. `delivery_prepare` ya devuelve `checkId`, exit code, primer error normalizado, líneas causales acotadas y `logPath`. Usar esa respuesta como paquete inicial y abrir el log local solo si una hipótesis concreta necesita más contexto:

```text
Command:
Exit code:
Failure signature:
Hypotheses attempted:
Files changed:
20 lines around first error:
Last 40 lines:
Developer hypotheses used: <0-2>/2
Orchestrator hypotheses used: <0-1>/1
Triage calls used: <0-1>/1
State: ACTIVE | ESCALATE_ORCHESTRATOR | STOP_USER
```

Ampliar el log únicamente si el diagnóstico lo requiere. En ejecuciones verdes, conservar solo el resumen del comando; no adjuntar logs completos de build, E2E o CI.

El ledger viaja con toda delegación o resumen relacionado con la falla. En `STOP_USER`, el orquestador informa firma, hipótesis, evidencia, alcance que sería necesario ampliar y alternativas; pedir ayuda no cambia por sí solo `AGENT_ORCHESTRATED` a `USER_GUIDED`.

## CI remoto

- Monitorear cada push por SHA, con ventana inicial máxima recomendada de 2 a 3 commits pendientes.
- La consulta de CI se realiza de forma compacta mediante `delivery_ci_inspect` o `npm run delivery:ci -- --sha <sha>`, sin emitir comandos crudos de `gh` ni tracebacks masivos.
- Mientras haya menos de tres SHAs pendientes, continuar el trabajo local. Ante CI fallido (`failed` o `timed_out`), los hooks de Git bloquean nuevos pushes hasta resolver la causa.
- En `close_us`, `npm run delivery:finalize` comprueba de forma automática que todos los commits de la US (incluyendo commits previos registrados como `not_run`) estén en verde con `status: passed` en CI, y que HEAD cuente con Gate D aprobado sin `@wip`. Estados `not_found`, `cancelled`, `timed_out` o `provider_error`, así como evidencia corrupta o faltante, bloquean el cierre. El bypass offline de pre-push no convierte CI desconocido o fallido en éxito.

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
