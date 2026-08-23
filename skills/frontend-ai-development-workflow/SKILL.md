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

La granularidad se elige por batch y puede recalibrarse durante la US únicamente en una frontera segura: commit desplegable, escenario GREEN o detención explícita antes de introducir alcance nuevo.

## Planificación y presupuesto de coordinación

Al inicio, el orquestador:

1. entiende contrato, escenarios, dependencias y riesgos;
2. declara la conducción de la US;
3. propone una partición provisional en batches, cada uno con granularidad, escenarios ordenados, fronteras Outside-In, gates, owners y condiciones de continuación;
4. asigna hasta 6 commits atómicos por reporte ordinario en `SCENARIO` o `SCENARIO_GROUP`.

La relación 6:1 es un presupuesto máximo de coordinación, no una cuota. No fusionar cambios independientes, omitir gates ni demorar escalaciones para alcanzarla. Si hacen falta más de 6 commits, cerrar en una frontera segura, reportar y abrir otro batch.

Se puede promover `SCENARIO` a `SCENARIO_GROUP` cuando la evidencia muestra que los escenarios siguientes comparten riesgo y gates previsibles. Se debe degradar a `SCENARIO` o `MICROSTEP` si aparece ambigüedad, riesgo, una contradicción o una integración que necesita control más estrecho.

## Responsabilidades estables

- El orquestador mantiene alcance, escenarios aprobados, plan de batches y conversación con el usuario.
- Antes de delegar trabajo estructural, el orquestador consulta Codebase Memory, verifica cobertura y entrega un handoff compacto; no delega una exploración que ya realizó.
- El desarrollador persistente trabaja únicamente sobre el batch activo y no crea subagentes descartables.
- El desarrollador usa la evidencia de grafo recibida y solo abre una consulta estructural nueva si el batch descubre una pregunta no resuelta. Si no dispone de las herramientas MCP, usa la evidencia entregada y lectura focalizada sin afirmar acceso al grafo.
- Cada micro-paso introduce un único comportamiento observable; una delegación puede contener varios sin convertirlos en un solo commit.
- Ninguna combinación de conducción y granularidad autoriza funcionalidad futura, refactors no requeridos o escenarios fuera del batch.

## Rol del orquestador

Antes del batch, actúa como senior: define el contrato, evalúa afinidad y riesgo, selecciona granularidad y modelo, y deja explícitas las condiciones de continuación y escalamiento.

Durante un batch autónomo permanece disponible, pero no duplica tests, inspecciones de logs ni monitoreo de SHAs que pertenecen al desarrollador. Interviene ante una escalación o una decisión fuera del contrato.

Ante una firma de falla escalada, dispone de una única intervención senior: revisar evidencia focalizada, opcionalmente realizar una consulta de triage y formular como máximo la tercera hipótesis global. No puede reiniciar el presupuesto, encadenar subagentes ni continuar reparando después de `STOP_USER`.

Después del batch consume un reporte compacto, verifica de forma agregada commits, CI y diff en proporción al riesgo, y decide el siguiente batch. No reproduce rutinariamente trabajo ya validado sin nueva evidencia.

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
Gates aplicables:
Commit owner / push owner / CI owner:
Condiciones de continuación entre escenarios:
Condiciones de escalamiento:
Graph project / generation:
Evidence tier / bounded scope:
Graph queries, pagination and qualified symbols:
Relevant paths, traces and coverage:
Source fallback already performed / unresolved questions:
```

El desarrollador debe leer `AGENTS.md` y las skills obligatorias antes de actuar. Si el contrato contiene requisitos contradictorios o una frontera necesita dependencias prohibidas, debe escalar antes de editar.

## Gates y reparación autónoma

- Un RED esperado de TDD es evidencia del ciclo, no un gate roto.
- Si un gate falla por el cambio actual y la corrección permanece dentro del alcance, diagnosticar, corregir y repetirlo sin reportar cada intento.
- Aplicar el presupuesto de iteración y el paquete compacto de `frontend-testing-gates`; no repetir la misma llamada sin nueva evidencia.
- No crear ni pushear un commit con su gate requerido en rojo.
- Escalar si la falla parece ajena o preexistente, persiste al agotar el presupuesto, exige ampliar alcance, cambia el comportamiento aprobado o altera una frontera de commit.
- `STOP_USER` obliga a detener cambios, comandos de reparación, commits y pushes, y a pedir instrucciones al usuario con el ledger y la evidencia compacta.

## CI asíncrono

- Cada commit se pushea inmediatamente y se monitorea por su SHA exacto.
- La ventana inicial recomendada sigue siendo 3 commits pendientes; antes de superarla, esperar el más antiguo.
- Si CI falla, detener nuevos pushes, cargar solo los logs fallidos minificados y escalar con SHA, stage, firma y causa probable.
- Un fallo remoto puede revelar diferencias de entorno; nunca asumir que los gates locales hacen imposible una falla de CI.

## Reportes

- `MICROSTEP`: reportar al terminar el micro-paso o al escalar.
- `SCENARIO`: un reporte ordinario al cerrar el escenario.
- `SCENARIO_GROUP`: un reporte ordinario al cerrar el grupo; no reportar entre escenarios si se cumplen las condiciones de continuación.
- Toda escalación se reporta inmediatamente y no cuenta contra la relación 6:1.
- El reporte final incluye escenarios, commits/SHAs, gates, CI, hipótesis agotadas si existieron y riesgos residuales.

## Loops, contexto y routing de modelos

- Mantener un desarrollador persistente para conservar contexto y evitar handoffs repetidos.
- No cargar logs crudos completos: usar `rtk`, salidas focalizadas y el paquete de diagnóstico de `frontend-testing-gates`.
- El desarrollador consume como máximo las dos primeras hipótesis. El orquestador puede usar una sola consulta de triage para sustentar la tercera y última hipótesis global.
- Usar un modelo rápido como `gpt-5.6-luna` para triage estrecho y repetible; `gpt-5.6-terra` para lectura o análisis auxiliar; reservar el modelo más capaz y razonamiento alto para ambigüedad arquitectónica o cambios transversales.
- No usar razonamiento extra alto por defecto para ahorrar tokens. La consulta de triage no ejecuta reparaciones, no crea más agentes y no reinicia ningún contador.

Antes de delegar una US con agentes, leer [orquestación, granularidad y ejemplos](references/delegation-modes.md).
