# Orquestación, granularidad y ejemplos

Leer antes de delegar una User Story a un desarrollador persistente.

## Precedencia de contratos y anexos

Los templates de contrato completo y contrato delta son obligatorios y definen
la estructura del mensaje al developer. Los anexos de granularidad no son
contratos alternativos: se incorporan dentro del template elegido para precisar
ownership, secuencia, gates y condiciones de cierre.

Orden de uso:

1. Elegir contrato completo o delta.
2. Elegir `MICROSTEP`, `SCENARIO` o `SCENARIO_GROUP`.
3. Incorporar del anexo correspondiente únicamente las reglas específicas de
   esa granularidad.
4. Completar el contrato con el alcance y evidencia del batch activo.

## Decisión inicial y recalibración

La conducción de la US y la granularidad del batch son ejes distintos. El plan inicial declara ambas y agrupa provisionalmente los escenarios. La granularidad puede cambiar al terminar un commit desplegable o un escenario GREEN; no se renegocia durante un diff incompleto.

`SCENARIO_GROUP` conviene cuando 2–3 escenarios consecutivos comparten contexto, tienen dependencias conocidas y gates previsibles. No conviene si uno introduce routing compartido riesgoso, una decisión funcional pendiente o una dependencia todavía desconocida.

La granularidad no determina el número de commits: un escenario puede requerir varios y un grupo pocos. Cualquier estimación de commits es una señal de coordinación, no una cuota, mínimo ni máximo; no se fuerzan cortes ni se agrandan cambios para ajustarse a ella.

## Fronteras y ownership

El orquestador elige conducción, granularidad, alcance, prohibiciones, el intent de delivery y la próxima frontera atómica prevista; no calcula el gate, ya que `delivery_prepare` lo selecciona automáticamente según la política. No prescribe normalmente archivos o líneas exactas; hacerlo solo se justifica por seguridad, un diagnóstico preciso, cobertura parcial conocida o una frontera prohibida.

El developer decide los archivos y líneas dentro del alcance, y trabaja una frontera atómica por vez: stage exacto, MCP `delivery_prepare` con `status: passed`, commit y push antes de iniciar otra frontera lógica. El runner selecciona el gate; el developer no calcula ni encadena sus comandos. Un escenario no es una unidad de working tree y puede requerir varios commits atómicos.

## Template de contrato completo

Usar para el primer batch, un developer nuevo, contexto perdido o dependencia
arquitectónica nueva:

```text
Conducción:
Granularidad: MICROSTEP | SCENARIO | SCENARIO_GROUP
US y escenarios activos:
Estado inicial: SHA / árbol / CI pendiente
Objetivo observable:
Alcance permitido:
Prohibido:
Skills obligatorias:
Handoff técnico:
Mapa de responsabilidades / señales de mantenibilidad esperadas:
Próxima frontera atómica: comportamiento / archivos mínimos esperados / intent / commit tentativo
Gates aplicables: Automático: delivery_prepare selecciona el gate según intent, staged snapshot y política.
CI y ventana de SHAs:
Estimación de commits: señal de coordinación, no cuota, mínimo ni máximo
Escalamiento:
Formato de escalación:
SHA / escenario / frontera:
Comando y exit code:
Firma de falla:
Hipótesis usadas:
Archivos cambiados:
Extracto focalizado:
Estado: ACTIVE | ESCALATE_ORCHESTRATOR | STOP_USER
Formato de cierre:
Escenarios GREEN:
Commits / SHAs:
Gates: <resultados devueltos por delivery_prepare>
CI:
Árbol:
Escalaciones / riesgos:
Cambios de contrato/tipos:
Archivos productivos materiales:
Pruebas de valor ejecutadas:
Señales de mantenibilidad / decisiones / justificaciones:
Siguiente acción permitida:
```

## Template de contrato delta

Usar con el mismo developer al abrir un batch posterior:

```text
Estado heredado: HEAD / árbol / CI
Escenarios cerrados:
Granularidad: MICROSTEP | SCENARIO | SCENARIO_GROUP
Escenarios activos:
Objetivo, alcance y prohibiciones nuevas:
Skills nuevas obligatorias:
Delta de responsabilidades / señales de mantenibilidad esperadas:
Próxima frontera atómica e intent de delivery:
Condiciones de continuación y escalamiento:
Formato de escalación:
SHA / escenario / frontera:
Comando y exit code:
Firma de falla:
Hipótesis usadas:
Archivos cambiados:
Extracto focalizado:
Estado: ACTIVE | ESCALATE_ORCHESTRATOR | STOP_USER
Formato de cierre:
Escenarios GREEN:
Commits / SHAs:
Gates: <resultados devueltos por delivery_prepare>
CI:
Árbol:
Escalaciones / riesgos:
Cambios de contrato/tipos:
Archivos productivos materiales:
Pruebas de valor ejecutadas:
Señales de mantenibilidad / decisiones / justificaciones:
Siguiente acción permitida:
```

No repetir reglas generales ni handoff que sigan vigentes. Si una skill nueva
aplica, el developer debe leerla completa antes de editar.

## Handoff de Codebase Memory

Antes de delegar trabajo que dependa de arquitectura, callers, dependencias o impacto, agregar al contrato:

```text
Graph project / generation: <proyecto y freshness>
Evidence tier / bounded scope: <Scout | Verify | Auditor> / <scope>
Queries and pagination: <consultas y estado de páginas>
Qualified symbols and paths: <símbolos y archivos>
Traces and coverage: <hallazgos y check_index_coverage>
Source fallback: <rangos leídos o buscados fuera del grafo>
Unresolved questions: <ninguna o lista breve>
```

El developer consume este contexto sin repetir la exploración. Si no tiene herramientas MCP, no afirma usarlas: trabaja con la evidencia recibida y consulta directamente solo las fuentes necesarias.

## Anexo de granularidad: `USER_GUIDED` + `MICROSTEP`

```text
Conducción: USER_GUIDED
Granularidad: MICROSTEP
Escenario activo: 14.1
Micro-paso: agregar los step definitions mínimos y confirmar RED.
Owners: desarrollador implementa y valida; orquestador commitea, pushea y monitorea CI.

Implementá únicamente este micro-paso. No elijas el siguiente,
no hagas commit ni push y no modifiques el plan.
Invocá MCP `delivery_prepare` para el staged exacto y reportá su evidencia compacta.
```

## Anexo de granularidad: `AGENT_ORCHESTRATED` + `SCENARIO`

```text
Conducción: AGENT_ORCHESTRATED
Granularidad: SCENARIO
US: WEB US-14
Escenario activo: 14.1
Objetivo: completar únicamente la visualización del perfil público.

Alcance permitido:
- feature, steps y factories exclusivos de 14.1;
- presentación, contratos, acceso a datos e integración requeridos por 14.1;
- tests relacionados exclusivamente con 14.1.

Secuencia prevista:
1. Steps del escenario en RED observable.
2. Presentación mínima aislada con props o mocks.
3. Contratos y acceso a datos requeridos.
4. Revisión de mantenibilidad del código productivo y resolución de señales.
5. Página, route builder, link e integración E2E GREEN.

Gates esperables como referencia: 0 en steps, A en piezas aisladas, B al
integrar y C/D al cerrar. MCP `delivery_prepare` toma la decisión efectiva.
Owners: desarrollador valida, commitea, pushea y monitorea CI.

Podés validar, crear los commits atómicos que exijan las fronteras y pushear
cada uno inmediatamente. Toda estimación es orientativa, no una cuota, mínimo
ni máximo. No reportes ciclos internos.
No implementes 14.2, funcionalidad futura, links a rutas inexistentes,
wiring antes de su frontera ni refactors no requeridos.
Detenete al cerrar 14.1 o ante una condición de escalamiento.
```

## Anexo de granularidad: `AGENT_ORCHESTRATED` + `SCENARIO_GROUP`

```text
Conducción: AGENT_ORCHESTRATED
Granularidad: SCENARIO_GROUP
US: WEB US-14
Escenarios ordenados: 14.1, 14.2 y 14.3
Estimación de commits: orientativa para coordinación y CI; no es cuota, mínimo
ni máximo.
Owners: desarrollador valida, commitea, pushea y monitorea CI.
Presupuesto de reparación por firma: developer 2 hipótesis; orquestador 1 hipótesis final;
máximo 2 correcciones por hipótesis; 1 consulta de triage; luego STOP_USER.

Alcance permitido: solamente feature, steps, presentación, capas internas,
rutas e integración estrictamente requeridas por 14.1–14.3.
Prohibido: escenarios posteriores, preparación futura, refactors ajenos,
links a rutas inexistentes o wiring antes de su frontera Outside-In.

Completá exclusivamente estos escenarios en el orden indicado.
Para cada escenario recorré sus micro-pasos Outside-In, invocá `delivery_prepare`
en cada frontera staged sin calcular ni encadenar sus checks,
dejalo E2E GREEN y recién entonces continuá con el siguiente.
Usá el intent correspondiente; la política selecciona Gate 0/A/B/C/D según
`frontend-testing-gates` y el riesgo de cada frontera.
Antes del gate de cada frontera productiva no trivial, aplicá
`frontend-maintainability-governance` y resolvé o justificá sus señales.

Condiciones de continuación:
- el escenario actual está GREEN y sin @wip;
- las señales de mantenibilidad del código productivo están resueltas o justificadas;
- su commit es desplegable, fue pusheado y su SHA está registrado;
- CI respeta la ventana máxima de 3 commits pendientes;
- el siguiente escenario no exige cambiar alcance, arquitectura ni gates.

Tenés autorización para validar, commitear, pushear y monitorear CI dentro
del batch. No reportes checkpoints ni commits individuales. Hacé un único
reporte ordinario cuando los tres escenarios y sus SHAs estén GREEN.

Detenete y escalá inmediatamente si `delivery_prepare` o CI falla más allá del presupuesto
de reparación, aparece una contradicción, necesitás archivos fuera del alcance,
el siguiente cambio no sería desplegable o necesitás cambiar el plan.
No avances a 14.4. Si la evidencia exige más o menos fronteras que la
estimación, mantené la atomicidad y registrá la desviación al alcanzar una
frontera segura; no agrandes ni fuerces cortes artificialmente.
```

## Prompt prohibido

```text
Implementá todo 14.1: steps, vista, DTO, mapper, puerto, caso de uso,
repositorio, página, ruta, link y E2E. No crees todavía la página destino.
```

Es inválido porque agrupa trabajo sin fronteras ni preparación de delivery y exige un link mientras prohíbe su dependencia desplegable.

## Reporte compacto de batch

```text
Batch: 14.1–14.3 GREEN
Commits/SHAs: <lista breve de commits atómicos>
Gates: <resultados devueltos por delivery_prepare>
CI: <estado por SHA>
Escalaciones/hipótesis: <ninguna o resumen compacto>
Mantenibilidad: <señales, decisiones y justificaciones>
Riesgos residuales: <ninguno o lista breve>
```

Las escalaciones no cuentan como reportes ordinarios y nunca deben demorarse para sostener una estimación de commits.

## Escalación obligatoria por loop

```text
Failure signature: <comando + exit code + primer error causal + archivo/línea>
Developer hypotheses used: 2/2
Orchestrator hypotheses used: 1/1
Triage calls used: 1/1
State: STOP_USER

Hypotheses attempted: <tres resúmenes breves>
Evidence: <extracto focalizado>
Required scope or decision: <qué impide continuar>
Alternatives: <opciones seguras>
```

En `STOP_USER` ningún agente puede ejecutar otra reparación, formular una cuarta hipótesis o delegar para reiniciar el diagnóstico. Debe pedir instrucciones al usuario. Esta escalación puntual no cambia la conducción de la US.
