---
name: frontend-ai-development-workflow
description: "Coordinar una User Story de Lo Resuelvo entre orquestador y developer, con batches acotados, handoffs suficientes, delivery MCP y CI asíncrono."
---

# Frontend AI Development Workflow

Usar al delegar una User Story o un batch a otro agente. Esta skill gobierna coordinación y handoff; BDD, gates, commits y criterios técnicos viven en sus skills específicas.

## Conducción y granularidad

Declarar dos decisiones independientes:

- `USER_GUIDED`: el usuario aprueba decisiones y fronteras relevantes.
- `AGENT_ORCHESTRATED`: el orquestador conduce un plan ya aprobado y consulta al usuario solo ante una escalación real.

La conducción se declara al planificar y solo cambia con aprobación del usuario; una escalación puntual o un cambio de granularidad no la modifica.

Y una granularidad por batch:

- `MICROSTEP`: un comportamiento observable; el developer valida y se detiene sin commit ni push.
- `SCENARIO`: completa un escenario aprobado y sus fronteras atómicas.
- `SCENARIO_GROUP`: completa 2–3 escenarios consecutivos, similares y de bajo acoplamiento; cierra cada escenario en GREEN antes del siguiente.

Usar `MICROSTEP` ante ambigüedad o riesgo alto, `SCENARIO` como opción ordinaria y `SCENARIO_GROUP` solo cuando dependencias, alcance y condiciones de continuación sean previsibles. Recalibrar únicamente en una frontera segura: commit desplegable, escenario GREEN o detención previa a alcance nuevo.

## Responsabilidades y ciclo de vida de subagentes por batch

Para evitar la acumulación excesiva de contexto en sesiones prolongadas, una User Story no mantiene un único subagente durante toda su ejecución:

```text
Orquestador conserva plan completo y estado compacto de la US
             |
             +-> Developer A: Batch 1 -> GREEN -> reporte compacto -> termina
             +-> Developer B: Batch 2 -> GREEN -> reporte compacto -> termina
             +-> Developer C: Batch 3 -> GREEN -> reporte compacto -> termina
```

- **Orquestador**: conserva el contrato funcional global, el plan maestro de batches, las decisiones de alcance, el estado agregado compacto y la interlocución con el usuario. Crea un subagente developer nuevo por batch con su bootstrap autosuficiente.
- **Developer por batch**: trabaja exclusivamente sobre su batch activo. Decide la solución cohesionada dentro del alcance, no vuelve a delegar sin autorización y escala antes de cambiar comportamiento aprobado o cruzar prohibiciones.
- **Rotación en fronteras seguras**: el developer puede persistir durante 2–3 escenarios consecutivos dentro de un `SCENARIO_GROUP` aprobado o a través de microcommits de la misma frontera, pero se rota al cerrar el batch en GREEN o ante escalación. Queda prohibido rotar a mitad de un gate o para evadir un diagnóstico causal.
- **Continuidad causal de CI**: un incidente de CI remoto no se "resetea" rotando developer; la firma causal y la evidencia pasan al siguiente contrato de delegación.
- **Owners en ejecución**: en `SCENARIO` y `SCENARIO_GROUP`, el developer valida mediante `delivery_test`, prepara con `delivery_prepare`, commitea y pushea inmediatamente a `main`. La ventana de CI y los incidentes se evalúan automáticamente por el core y hooks; queda estrictamente prohibida la retención de developers inactivos esperando CI o realizando polling manual. Al completar su batch, emite el handoff de cierre compacto y termina su turno. En `MICROSTEP`, esos owners pertenecen al orquestador salvo contrato explícito distinto.
- **La granularidad no determina el número de commits**: cada commit representa una frontera lógica completa según `frontend-commit-governance`.
- **Revisión sin re-ejecución**: tras recibir el handoff, el orquestador revisa trazabilidad, diff y riesgos en proporción al cambio sin volver a ejecutar gates verdes ni reconstruir logs.

Antes de delegar, comprobar que el developer tenga habilitado el MCP de delivery con acceso completo a `delivery_test`, `delivery_prepare` y `delivery_job_wait`. Los adaptadores y la propagación de herramientas son responsabilidad del cliente local, no del contrato compartido. Un agente autónomo sin el MCP requerido debe detenerse; la CLI neutral queda para humanos o para un entorno sin MCP aprobado explícitamente.

## Handoff suficiente y contratos

El contrato transmite hechos específicos del batch, no vuelve a copiar reglas estables ni incluye comandos crudos ni cálculo manual de gates. Debe permitir que el developer conozca:

- identificación, US, batch, conducción y granularidad;
- estado base: HEAD, rama, working tree, CI conocido y receipts relevantes (sin logs);
- escenarios activos con criterios observables completos y lista de escenarios ya cerrados;
- decisiones e invariantes materiales, contratos/tipos y rutas o símbolos relevantes;
- alcance permitido, prohibiciones estrictas y condiciones de escalación;
- evidencia estructural procesada de Codebase Memory y cobertura confirmada;
- próxima frontera funcional, intent de delivery, owners y condición de cierre del batch.

Usar el **contrato de bootstrap autosuficiente** para cada nuevo batch o subagente nuevo. Con el mismo developer persistente dentro de un `SCENARIO_GROUP`, usar el **contrato delta** que incluye únicamente cambios materiales. Al concluir, el developer emite el **handoff de cierre compacto** (prohibiendo logs verdes, tracebacks, diffs completos y transcripts MCP). Los templates y anexos condicionales viven en [contratos de delegación](references/delegation-modes.md); leer esa referencia solamente al preparar o revisar un handoff.

## Ejecución del batch

En `SCENARIO` y `SCENARIO_GROUP`, el developer recorre cada escenario Outside-In y trabaja una frontera atómica por vez:

1. implementar el comportamiento mínimo del escenario activo usando el ciclo TDD focalizado con `delivery_test` (sin ejecutar el gate completo ni comandos de test crudos como bucle interactivo);
2. aplicar las skills técnicas que correspondan (resolviendo señales de mantenibilidad con acknowledgement estructurado si aplica);
3. retirar el tag `@wip` en el mismo cambio funcional que deja el escenario GREEN y realizar stage exacto;
4. invocar MCP `delivery_prepare` con el intent y mensaje propuesto (aguardando con `delivery_job_wait` si la ejecución es asíncrona en modo job);
5. con `status: passed`, commitear y pushear antes de iniciar otra frontera lógica.

En `MICROSTEP`, se detiene después de validar el comportamiento y entrega el estado al owner de commit; no stagea ni prepara evidencia salvo que el contrato le asigne expresamente esa responsabilidad.

El agente no calcula gates ni ejecuta manualmente `make`, lint, typecheck o suites como flujo ordinario. Los comandos directos son diagnóstico focalizado excepcional cuando el resultado procesado no alcanza.

En un worktree compartido existe un solo owner del staging y commit a la vez. Un commit externo modifica `HEAD` e invalida contexto y receipts preparados; el developer debe detener el commit, volver a inspeccionar el árbol y ejecutar `delivery_prepare` sobre el nuevo snapshot. Nunca asumir autoría por observar un commit nuevo.

## Reparación y escalamiento

Aplicar el protocolo de `frontend-testing-gates` por firma causal. No repetir una falla idéntica sin un cambio relevante ni reiniciar el diagnóstico mediante handoffs o subagentes.

### Protocolo ante CI fallido (repair_ci)
1. Ante un fallo en CI remoto reportado por `delivery_ci_inspect`, detener de inmediato nuevos pushes.
2. Queda prohibido cualquier bypass ambiental (`DELIVERY_SKIP_CI_CHECK` es rechazado fail-closed con `DEPRECATED_CI_BYPASS_REJECTED`) o el uso de `--no-verify`.
3. Analizar la causa con el diagnóstico estructurado de CI.
4. Preparar la corrección atómica y hacer stage exacto de los archivos modificados.
5. Invocar MCP `delivery_prepare({ intent: "repair_ci", repairsSha: "<failed-sha>", proposedCommitMessage: "fix: ..." })`.
6. Gate R reproduce exhaustivamente los checks de CI asignados a agentes (`delivery_unit`, `lint`, `typecheck_app`, `typecheck_cucumber`, `unit`, `e2e_full` y `build`; excluyendo Docker build) y genera un receipt de reparación de uso único.
7. Si el fallo remoto en CI ocurre en un job de Docker o involucra archivos de contenedor/pipeline (`Dockerfile`, `.dockerignore`, `compose*.yml`, cualquier archivo bajo `.github/workflows/**`), pertenece exclusivamente a desarrolladores humanos (`HUMAN_ONLY`); detenerse con `HUMAN_ONLY_CI_FAILURE` o `HUMAN_ONLY_CHANGE` y escalar a `STOP_USER`.
8. Con `status: passed`, crear el commit y realizar `git push origin main`.
9. El hook `pre-push` consume la autorización de reparación y el ledger actualiza el registro resolviendo la subsanación del SHA fallido.

El developer prueba solo hipótesis distintas y sustentadas por evidencia; cuando deja de haber progreso razonable, escala con la respuesta compacta del runner. El orquestador puede realizar un único triage senior y decide si existe una hipótesis nueva justificada, si hace falta ampliar alcance o si corresponde declarar `STOP_USER`. No existe una cuota universal que obligue a abandonar una corrección que muestra progreso real.

Una vez declarado `STOP_USER`, se detienen reparaciones, cambios, commits y pushes hasta recibir instrucciones. La transición no cambia por sí sola `AGENT_ORCHESTRATED` a `USER_GUIDED`.

## CI y cierres

- Pushear cada commit inmediatamente. La ventana continua (hasta 4 commits en vuelo) y los incidentes activos se evalúan automáticamente en `delivery_prepare` y `pre-push`; no se requiere polling ni monitoreo manual periódico por parte del developer.
- Si un push es bloqueado por CI fallido previo, detener nuevos pushes e iniciar el flujo de reparación auditable (`repair_ci` / Gate R con soporte de `delivery_job_wait`). Para diagnóstico puntual de la falla, usar `delivery_ci_inspect({ sha })`.
- `delivery_finalize(close_batch)` solo corresponde cuando todos los feature files declarados como scope del batch están completos y sin `@wip`. Si el batch cierra algunos escenarios de una feature que aún conserva otros `@wip`, reportar el batch y continuar mediante cierres de escenario; no invocar `close_batch` sobre esa feature incompleta.
- Un cierre de batch puede devolver `passed_pending_ci`; habilita el siguiente batch dentro de la ventana, pero no representa CI verde.

### Protocolo de cierre de User Story
Una US termina únicamente cuando se verifican todos los escenarios, gates y CI:
1. **Último escenario completado**: El último commit atómico que retira `@wip` del feature file se prepara con `delivery_prepare`, se commitea y se pushea a `main`.
2. **Verificación sobre HEAD**: Con el árbol limpio y posicionado en `HEAD`, invocar MCP `delivery_verify_head({ intent: "close_us", scopeFiles: ["features/<feature>.feature"] })` (o CLI `npm run delivery:verify-head -- --intent close_us --scope features/<feature>.feature`). Esto ejecuta Gate D sobre el commit HEAD y asocia la evidencia al ledger sin requerir commits artificiales ni vacíos.
3. **Finalización formal**: Invocar MCP `delivery_finalize({ intent: "close_us", scopeFiles: ["features/<feature>.feature"], waitForCi: true })`. `waitForCi: true` aguarda de forma acotada a que los runs de CI en vuelo completen en verde. La US queda formalizada cuando devuelve `finalized: true` y `status: passed`.

## Reportes y monitoreo

- `MICROSTEP`: reportar al detenerse o escalar.
- `SCENARIO`: reportar al cerrar el escenario.
- `SCENARIO_GROUP`: reportar al cerrar el grupo, sin checkpoints ordinarios entre escenarios.
- Una escalación siempre se reporta inmediatamente.

El cierre resume escenarios, commits/SHAs, receipts devueltos por MCP, CI conocido, cambios de contratos, archivos productivos materiales, mantenibilidad y riesgos, bajo la estructura del **handoff de cierre compacto** (con estricta prohibición de logs verdes, tracebacks, diffs completos y transcripts MCP). Al emitir el handoff, el developer finaliza inmediatamente su ejecución y no queda en espera inactiva.

El orquestador espera sin polling narrado ni retiene subagentes inactivos. Si necesita comprobar avance mientras una ejecución corre, realiza una consulta read-only del estado, `HEAD` y árbol; un developer `running` puede estar implementando o validando. Una estimación de commits o duración sirve para coordinar, nunca como cuota ni autorización para interrumpir un gate.

## Routing de capacidad

Respetar una selección explícita del usuario. En ausencia de ella, elegir la capacidad de menor costo y latencia que pueda cumplir el contrato: rápida para tareas acotadas y repetibles, intermedia para implementación ordinaria y la mayor disponible para ambigüedad arquitectónica o cambios transversales. Las equivalencias concretas de cada cliente pertenecen a configuración local.
