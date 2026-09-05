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

## Responsabilidades

- El orquestador conserva el contrato funcional, el plan de batches, las decisiones de alcance y la comunicación con el usuario.
- Antes de delegar trabajo estructural, consulta Codebase Memory, verifica cobertura y entrega la evidencia relevante sin pedir al developer que repita la exploración.
- El developer persistente trabaja únicamente sobre el batch activo, no vuelve a delegar la implementación salvo autorización expresa, decide la solución cohesionada dentro del alcance y escala antes de cambiar comportamiento aprobado o cruzar una prohibición.
- En `SCENARIO` y `SCENARIO_GROUP`, el developer valida, commitea, pushea y consulta CI. En `MICROSTEP`, esos owners pertenecen al orquestador salvo contrato explícito distinto.
- La granularidad no determina el número de commits. Cada commit representa una frontera lógica completa según `frontend-commit-governance`.
- Después del reporte, el orquestador revisa trazabilidad, diff y riesgos en proporción al cambio sin volver a ejecutar gates verdes ni reconstruir logs.

Antes de delegar, comprobar que el developer tenga acceso a `delivery_prepare`. Los adaptadores y la propagación de herramientas son responsabilidad del cliente local, no del contrato compartido. Un agente autónomo sin el MCP requerido debe detenerse; la CLI neutral queda para humanos o para un entorno sin MCP aprobado explícitamente.

## Handoff suficiente

El contrato transmite hechos específicos del batch, no vuelve a copiar reglas estables. Debe permitir que el developer conozca:

- estado inicial, escenarios activos y objetivo observable;
- contratos, tipos, invariantes y decisiones ya confirmadas;
- alcance permitido, prohibiciones y condiciones de ampliación;
- evidencia estructural disponible y preguntas abiertas;
- próxima frontera atómica, intent de delivery y owners;
- condiciones de continuación, escalamiento y cierre.

Usar el contrato completo para el primer batch, un developer nuevo, contexto perdido o una dependencia arquitectónica nueva. Con el mismo developer persistente, usar un contrato delta que incluya solo cambios materiales. Los templates y anexos condicionales viven en [contratos de delegación](references/delegation-modes.md); leer esa referencia solamente al preparar o revisar un handoff.

## Ejecución del batch

En `SCENARIO` y `SCENARIO_GROUP`, el developer recorre cada escenario Outside-In y trabaja una frontera atómica por vez:

1. implementar el comportamiento mínimo del escenario activo;
2. aplicar las skills técnicas que correspondan;
3. realizar stage exacto;
4. invocar MCP `delivery_prepare` con el intent y mensaje propuesto;
5. con `status: passed`, commitear y pushear antes de iniciar otra frontera lógica.

En `MICROSTEP`, se detiene después de validar el comportamiento y entrega el estado al owner de commit; no stagea ni prepara evidencia salvo que el contrato le asigne expresamente esa responsabilidad.

El agente no calcula gates ni ejecuta manualmente `make`, lint, typecheck o suites como flujo ordinario. Los comandos directos son diagnóstico focalizado excepcional cuando el resultado procesado no alcanza.

En un worktree compartido existe un solo owner del staging y commit a la vez. Un commit externo modifica `HEAD` e invalida contexto y receipts preparados; el developer debe detener el commit, volver a inspeccionar el árbol y ejecutar `delivery_prepare` sobre el nuevo snapshot. Nunca asumir autoría por observar un commit nuevo.

## Reparación y escalamiento

Aplicar el protocolo de `frontend-testing-gates` por firma causal. No repetir una falla idéntica sin un cambio relevante ni reiniciar el diagnóstico mediante handoffs o subagentes.

El developer prueba solo hipótesis distintas y sustentadas por evidencia; cuando deja de haber progreso razonable, escala con la respuesta compacta del runner. El orquestador puede realizar un único triage senior y decide si existe una hipótesis nueva justificada, si hace falta ampliar alcance o si corresponde declarar `STOP_USER`. No existe una cuota universal que obligue a abandonar una corrección que muestra progreso real.

Una vez declarado `STOP_USER`, se detienen reparaciones, cambios, commits y pushes hasta recibir instrucciones. La transición no cambia por sí sola `AGENT_ORCHESTRATED` a `USER_GUIDED`.

## CI y cierres

- Pushear cada commit inmediatamente y consultar su SHA mediante `delivery_ci_inspect`; continuar mientras la ventana configurada permita otro push.
- Ante CI fallido, detener nuevos pushes y usar el diagnóstico estructurado. No descargar logs completos sin una hipótesis concreta.
- `delivery_finalize(close_batch)` solo corresponde cuando todos los feature files declarados como scope del batch están completos y sin `@wip`. Si el batch cierra algunos escenarios de una feature que aún conserva otros `@wip`, reportar el batch y continuar mediante cierres de escenario; no invocar `close_batch` sobre esa feature incompleta.
- Un cierre de batch puede devolver `passed_pending_ci`; habilita el siguiente batch dentro de la ventana, pero no representa CI verde.
- Una US termina únicamente cuando `delivery_finalize(close_us)` devuelve `finalized: true` y `status: passed`. Esto exige Gate D válido en `HEAD`, scope sin `@wip`, commits pusheados, ledger íntegro y CI verde para todos los commits relevantes.

## Reportes y monitoreo

- `MICROSTEP`: reportar al detenerse o escalar.
- `SCENARIO`: reportar al cerrar el escenario.
- `SCENARIO_GROUP`: reportar al cerrar el grupo, sin checkpoints ordinarios entre escenarios.
- Una escalación siempre se reporta inmediatamente.

El cierre resume escenarios, commits/SHAs, gates devueltos por MCP, CI, cambios de contratos, archivos productivos materiales, mantenibilidad y riesgos. No reproducir logs verdes ni reconstruir información ya registrada por el runner.

El orquestador espera sin polling narrado. Si necesita comprobar avance, realiza una consulta read-only del estado, `HEAD` y árbol; un developer `running` puede estar implementando o validando. Una estimación de commits o duración sirve para coordinar, nunca como cuota ni autorización para interrumpir un gate.

## Routing de capacidad

Respetar una selección explícita del usuario. En ausencia de ella, elegir la capacidad de menor costo y latencia que pueda cumplir el contrato: rápida para tareas acotadas y repetibles, intermedia para implementación ordinaria y la mayor disponible para ambigüedad arquitectónica o cambios transversales. Las equivalencias concretas de cada cliente pertenecen a configuración local.
