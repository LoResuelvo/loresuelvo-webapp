---
name: frontend-ai-development-workflow
description: "Coordinar una User Story de Lo Resuelvo con conducción y granularidad independientes, un desarrollador persistente, commits en main y CI asíncrono."
---

# Frontend AI Development Workflow

Usar para coordinar agentes durante una User Story. Las reglas de BDD, tests y commits viven en sus skills específicas.

## Dos ejes independientes

### Conducción de la US

- `USER_GUIDED`: la persona usuaria aprueba decisiones y fronteras relevantes; el orquestador propone y coordina.
- `AGENT_ORCHESTRATED`: el orquestador conduce el plan aprobado como un senior disponible, sin solicitar intervención ordinaria.

La conducción se declara al planificar la US y puede cambiar solamente con aprobación del usuario. Una escalación puntual, el routing de modelos o una recalibración de granularidad no cambian la conducción.

### Granularidad de la delegación

- `MICROSTEP`: un comportamiento observable; el desarrollador se detiene al validarlo y no commitea ni pushea.
- `SCENARIO`: todos los micro-pasos Outside-In de un escenario aprobado.
- `SCENARIO_GROUP`: 2–3 escenarios consecutivos, aprobados, similares y de bajo acoplamiento; cada uno debe quedar GREEN antes de avanzar al siguiente.

Elegir `MICROSTEP` ante ambigüedad, riesgo alto o una única validación; `SCENARIO` para un escenario con dependencias conocidas; y `SCENARIO_GROUP` solo para escenarios consecutivos, de bajo acoplamiento y gates previsibles. Un escenario puede requerir varios commits atómicos y un grupo puede requerir pocos: la granularidad no determina el número de commits.

La granularidad se elige por batch y puede recalibrarse durante la US únicamente en una frontera segura: commit desplegable, escenario GREEN o detención explícita antes de introducir alcance nuevo.

## Planificación y presupuesto de coordinación

Al inicio, el orquestador:

1. entiende contrato, escenarios, dependencias y riesgos;
2. declara la conducción de la US;
3. propone una partición provisional en batches, cada uno con granularidad, escenarios ordenados, fronteras Outside-In, intents de delivery, owners y condiciones de continuación;
4. declara, si aporta valor de coordinación, una estimación de commits atómicos para el batch en `SCENARIO` o `SCENARIO_GROUP`.

La estimación de commits es una señal para coordinar reportes y CI, no una cuota, mínimo ni máximo. No fusionar cambios independientes, omitir gates ni demorar escalaciones para ajustarse a ella. La atomicidad, los gates y el push inmediato prevalecen. Si la evidencia exige más o menos fronteras, continuar con el siguiente commit atómico y registrar la desviación al llegar a una frontera segura.

Se puede promover `SCENARIO` a `SCENARIO_GROUP` cuando la evidencia muestra que los escenarios siguientes comparten riesgo y gates previsibles. Se debe degradar a `SCENARIO` o `MICROSTEP` si aparece ambigüedad, riesgo, una contradicción o una integración que necesita control más estrecho.

## Responsabilidades estables

- El orquestador mantiene alcance, escenarios aprobados, plan de batches y conversación con el usuario.
- Antes de delegar trabajo estructural, el orquestador consulta Codebase Memory, verifica cobertura y entrega un handoff compacto; no delega una exploración que ya realizó.
- El orquestador declara la próxima frontera atómica prevista, su intent de delivery y condiciones de continuación, pero no prescribe normalmente archivos o líneas exactas ni calcula gates (`delivery_prepare` selecciona y ejecuta el gate automáticamente). Solo especifica archivos ante una restricción de seguridad, un bug ya diagnosticado, cobertura parcial conocida o una frontera que no debe tocarse.
- El desarrollador persistente trabaja únicamente sobre el batch activo y no crea subagentes descartables.
- El desarrollador usa la evidencia de grafo recibida y solo abre una consulta estructural nueva si el batch descubre una pregunta no resuelta. Si no dispone de las herramientas MCP, usa la evidencia entregada y lectura focalizada sin afirmar acceso al grafo.
- Dentro del alcance permitido, el desarrollador decide los archivos y líneas necesarios para una implementación cohesionada, valida, commitea, pushea y monitorea CI. Escala antes de cruzar una prohibición o cambiar el contrato.
- Cada micro-paso introduce un único comportamiento observable; una delegación puede contener varios sin convertirlos en un solo commit.
- Ninguna combinación de conducción y granularidad autoriza funcionalidad futura, refactors no requeridos o escenarios fuera del batch.

## Rol del orquestador

Antes del batch, actúa como senior: define el contrato, evalúa afinidad y riesgo, selecciona granularidad y modelo, y deja explícitas las condiciones de continuación y escalamiento.

Antes de delegar, realiza un preflight compacto: escenarios aprobados y sus
criterios, contrato público y tipos que deben fluir, capas y pruebas de valor
esperadas, atajos prohibidos (casts inseguros, DTOs en UI y escenarios
reescritos), mapa de responsabilidades y señales de mantenibilidad esperables,
y archivos materiales que revisará al cierre.

Durante un batch autónomo permanece disponible, pero no duplica tests, inspecciones de logs ni monitoreo de SHAs que pertenecen al desarrollador. Interviene ante una escalación o una decisión fuera del contrato.

Ante una firma de falla escalada, dispone de una única intervención senior: revisar evidencia focalizada, opcionalmente realizar una consulta de triage y formular como máximo la tercera hipótesis global. No puede reiniciar el presupuesto, encadenar subagentes ni continuar reparando después de `STOP_USER`.

Después del batch consume un reporte compacto, verifica de forma agregada commits, CI y diff en proporción al riesgo, y decide el siguiente batch. Confirma trazabilidad escenario → comportamiento → prueba y revisa los archivos materiales por atajos peligrosos (`as any`, `as never`, `@ts-ignore`, `TODO`, DTOs en UI), con mayor profundidad en tipos públicos, privacidad, auth, API, rutas y componentes compartidos. No reproduce rutinariamente gates ni carga logs verdes sin nueva evidencia.

En código productivo no trivial también comprueba la evidencia de `frontend-maintainability-governance`: responsabilidades, señales resueltas o justificadas, API mínima y dueño de lifecycle, concurrencia, cleanup y errores visibles.

## Contrato de delegación

Antes de editar, declarar:

```text
Conducción de la US:
Granularidad del batch:
US y escenarios ordenados del batch:
Objetivo observable:
Alcance y archivos permitidos:
Archivos y comportamiento prohibidos:
Secuencia Outside-In y fronteras de commit previstas:
Presupuesto de commits / reporte:
Gates aplicables: Automático: delivery_prepare selecciona el gate según intent, staged snapshot y política.
Commit owner / push owner / CI owner:
Condiciones de continuación entre escenarios:
Condiciones de escalamiento:
Graph project / generation:
Evidence tier / bounded scope:
Graph queries, pagination and qualified symbols:
Relevant paths, traces and coverage:
Source fallback already performed / unresolved questions:
Responsibility map / expected maintainability signals:
```

El desarrollador debe leer `AGENTS.md` y las skills obligatorias antes de actuar. Si el contrato contiene requisitos contradictorios o una frontera necesita dependencias prohibidas, debe escalar antes de editar.

## Contratos sucesivos y skills nuevas

El primer batch de una US requiere el contrato completo. Para el mismo developer
persistente, los batches siguientes usan un contrato delta: HEAD y estado de
CI heredados, escenarios ya cerrados, granularidad, escenarios activos,
objetivo, alcance, prohibiciones o riesgos nuevos, próxima frontera y
condiciones de continuación. No repetir las reglas generales ni el handoff que
siga vigente.

Si el nuevo batch activa skills que no eran aplicables antes, el contrato delta
debe listarlas como `Skills nuevas obligatorias` y el developer debe leerlas
completas antes de editar. Reenviar un contrato completo cuando se reemplaza al
developer, se perdió contexto o surge una dependencia arquitectónica nueva.

El contrato puede expresar una estimación de commits, pero debe declarar que no es una cuota, mínimo ni máximo. Debe describir la próxima frontera atómica prevista —comportamiento, archivos mínimos esperados, intent de delivery y mensaje de commit tentativo— y exigir `delivery_prepare status: passed → commit → push` antes de iniciar otra frontera lógica. No usar el contrato para imponer líneas exactas salvo las excepciones de seguridad, diagnóstico o cobertura ya declaradas.

## Gates y reparación autónoma

- El desarrollador persistente ejecuta explícitamente `delivery_prepare` sobre el snapshot staged antes de cada commit; los hooks de Git son deliberadamente livianos y **nunca ejecutan suites de tests**. El hook de Codex deniega cualquier commit de agente sin receipt previo coincidente.
- Un RED esperado de TDD es evidencia del ciclo, no un gate roto.
- Si un gate falla por el cambio actual y la corrección permanece dentro del alcance, diagnosticar, corregir y repetirlo sin reportar cada intento.
- Aplicar el presupuesto de iteración y el paquete compacto de `frontend-testing-gates`; no repetir la misma llamada sin nueva evidencia.
- No crear ni pushear un commit con su gate requerido en rojo.
- Escalar si la falla parece ajena o preexistente, persiste al agotar el presupuesto, exige ampliar alcance, cambia el comportamiento aprobado o altera una frontera de commit.
- `STOP_USER` obliga a detener cambios, comandos de reparación, commits y pushes, y a pedir instrucciones al usuario con el ledger y la evidencia compacta.

## CI asíncrono

- Cada commit se pushea inmediatamente y se monitorea por su SHA exacto.
- La política permite hasta cuatro commits totales en vuelo, incluido el commit que se está pusheando. Consultar cada SHA de forma estructurada y compacta mediante `delivery_ci_inspect` (o `npm run delivery:ci -- --sha <sha>`); los agentes no deben administrar manualmente comandos de CI ni descargar logs masivos. Continuar trabajo local mientras la ventana lo permita.
- Si CI falla, los hooks de Git bloquean nuevos pushes. Detener nuevos commits, revisar la respuesta procesada de `delivery_ci_inspect` (que incluye el error causal normalizado y extracto acotado) y escalar con SHA, stage, firma y causa probable.
- En `close_batch`, `delivery_finalize` acepta CI `queued`, `in_progress` o todavía `not_found`, devuelve `passed_pending_ci` y permite iniciar el siguiente batch. El estado describe cierre local con verificación remota pendiente, no CI verde.
- En `close_us`, MCP `delivery_finalize` —o `npm run delivery:finalize` sin MCP— comprueba de forma automática que todos los commits de la US (incluyendo commits previos registrados como `not_run`) tengan `status: passed` en CI y que HEAD cuente con Gate D aprobado sin `@wip`. El bypass offline del pre-push (`DELIVERY_SKIP_CI_CHECK=1`) permite avanzar ante commits previos sin red, pero no convierte CI desconocido o fallido en éxito.
- Si un run permanece `in_progress` más de 2 veces su duración habitual sin error causal ni progreso sostenido, registrar la evidencia compacta. Si su SHA sucesor inmediato ya está en CI y pasa los mismos checks sin tocar el área afectada, clasificar el caso como degradación probable del proveedor. El reintento debe resolverse antes del cierre de la US.
- Un fallo remoto puede revelar diferencias de entorno; nunca asumir que los gates locales hacen imposible una falla de CI.

## Monitoreo pasivo de la delegación

Durante una delegación activa, el orquestador no hace polling narrado ni
interrumpe gates por falta de mensajes. Como heurística de atención, puede
esperar inicialmente la duración esperada del micro-paso en `MICROSTEP`, o
`4 minutos × commits estimados` en `SCENARIO` y `SCENARIO_GROUP`. La estimación
no es una cuota ni una duración máxima.

Al vencer esa ventana, realizar solo una consulta read-only: estado del
developer, HEAD y, cuando la granularidad permita commits, commits nuevos desde
el SHA inicial de la delegación, mensajes de commit vinculados a la US y estado
del árbol. No enviar un mensaje al developer si figura `running`: puede estar
implementando, validando o reparando dentro del contrato. Si está `idle` sin
reporte de cierre, pedir un estado compacto.

Los commits nuevos son una señal de avance, no prueba suficiente de autoría en
un workspace compartido; correlacionarlos con la US, los SHAs esperados y el
estado del developer. El vencimiento de la ventana nunca autoriza a cancelar
un comando, interrumpir una gate ni asumir un bloqueo. Si el developer sigue
activo, esperar otra ventana corta antes de una nueva consulta pasiva.

## Reportes

- `MICROSTEP`: reportar al terminar el micro-paso o al escalar.
- `SCENARIO`: un reporte ordinario al cerrar el escenario.
- `SCENARIO_GROUP`: un reporte ordinario al cerrar el grupo; no reportar entre escenarios si se cumplen las condiciones de continuación.
- Toda escalación se reporta inmediatamente y no cuenta contra la estimación de commits.
- El reporte final incluye escenarios, commits/SHAs, gates, CI, hipótesis agotadas si existieron y riesgos residuales.

## Protocolo de respuestas

El developer no reporta cada commit ni cada resultado verde de `delivery_prepare`; registra esos datos y
los incluye en el cierre que corresponda. Al recibir un contrato, responde solo
si detecta un bloqueo o contradicción:

```text
Bloqueo/contradicción:
Regla o alcance afectado:
Decisión requerida:
```

Una escalación usa el paquete de diagnóstico de `frontend-testing-gates`. Un
cierre de `MICROSTEP`, `SCENARIO` o `SCENARIO_GROUP` informa:

```text
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

El orquestador responde al cierre con el siguiente contrato delta, un contrato
completo si corresponde, o una decisión de escalamiento.

## Loops, contexto y routing de modelos

- Mantener un desarrollador persistente para conservar contexto y evitar handoffs repetidos.
- No cargar logs crudos completos: usar `rtk`, salidas focalizadas y el paquete de diagnóstico de `frontend-testing-gates`.
- El desarrollador consume como máximo las dos primeras hipótesis. El orquestador puede usar una sola consulta de triage para sustentar la tercera y última hipótesis global.
- `gpt-5.6-luna` puede implementar batches acotados cuando el contrato, las prohibiciones y la evidencia de cierre son explícitos; no limitarlo a triage si el usuario o el orquestador lo seleccionan para desarrollo.
- Usar un modelo rápido como `gpt-5.6-luna` para triage estrecho y repetible; `gpt-5.6-terra` para lectura o análisis auxiliar; reservar el modelo más capaz y razonamiento alto para ambigüedad arquitectónica o cambios transversales cuando no exista una elección explícita.
- No usar razonamiento extra alto por defecto para ahorrar tokens, salvo selección explícita del usuario o riesgo que lo justifique. La consulta de triage no ejecuta reparaciones, no crea más agentes y no reinicia ningún contador.

Antes de delegar una US con agentes, leer [orquestación, granularidad y ejemplos](references/delegation-modes.md).
