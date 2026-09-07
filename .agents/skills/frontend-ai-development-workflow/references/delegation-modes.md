# Contratos de delegación

Leer al preparar o revisar un handoff entre orquestador y developer. El contrato debe ser compacto pero suficiente para ejecutar el batch sin redescubrir su contexto. No copiar reglas generales que el developer ya recibe desde `AGENTS.md` y las skills obligatorias.

## Modelo de lifecycle de subagentes por batch

Para evitar la acumulación excesiva de contexto en sesiones prolongadas, una User Story no mantiene un único subagente durante toda su ejecución:

```text
Orquestador conserva plan completo y estado compacto de la US
             |
             +-> Developer A: Batch 1 -> GREEN -> reporte compacto -> termina
             +-> Developer B: Batch 2 -> GREEN -> reporte compacto -> termina
             +-> Developer C: Batch 3 -> GREEN -> reporte compacto -> termina
```

Reglas del lifecycle:
1. **Un subagente limpio por batch**: cada batch inicia con un developer nuevo dotado del contrato de bootstrap autosuficiente y concluye con un handoff de cierre compacto que termina la intervención de ese agente.
2. **Persistencia acotada intra-grupo**: un developer puede persistir durante 2–3 escenarios consecutivos dentro de un `SCENARIO_GROUP` aprobado o a través de microcommits de la misma frontera funcional.
3. **Fronteras seguras de rotación**: la rotación ocurre exclusivamente en fronteras estables (escenario o batch en GREEN, commit desplegable o escalación). Jamás se rota a mitad de un gate ni para evadir o reiniciar un diagnóstico causal.
4. **Continuidad causal de CI**: un incidente remoto de CI no se "resetea" rotando de subagente. La firma causal, los SHAs afectados y la evidencia diagnóstica pasan en el contrato al siguiente subagente.
5. **Sin esperas ni polling de CI**: ningún subagente permanece inactivo esperando CI ni realiza loops de polling. Implementa, valida vía MCP (`delivery_test`, `delivery_prepare`), commitea, pushea inmediatamente y entrega el handoff.

## Cómo construir el contrato

1. Usar el **contrato de bootstrap autosuficiente** para cada nuevo batch o developer nuevo. Usar el **contrato delta** únicamente cuando el mismo developer persista entre escenarios dentro de un `SCENARIO_GROUP`.
2. Declarar conducción (`USER_GUIDED` | `AGENT_ORCHESTRATED`) y granularidad (`MICROSTEP` | `SCENARIO` | `SCENARIO_GROUP`) como ejes independientes.
3. Incluir hechos específicos del batch y la próxima frontera segura.
4. Agregar únicamente los anexos técnicos que aplican.
5. Confirmar acceso del developer al MCP de delivery (`delivery_test`, `delivery_prepare`, `delivery_job_wait`) antes de autorizar ediciones.

El contrato define resultados, límites, invariantes y ownership. No calcula gates, prescribe comandos crudos de test ni fija archivos o líneas salvo que una restricción de seguridad, una evidencia ya confirmada o una frontera prohibida lo requiera.

## Contrato de bootstrap autosuficiente por batch

Usar al iniciar cada batch con un developer nuevo, al rotar subagente, al recuperar contexto o ante una dependencia arquitectónica nueva:

```text
Identificación y modo:
- US y batch:
- Conducción: USER_GUIDED | AGENT_ORCHESTRATED
- Granularidad: MICROSTEP | SCENARIO | SCENARIO_GROUP

Estado base y plataforma:
- HEAD y rama:
- Estado del working tree:
- CI conocido devuelto por la plataforma:
- Receipts y SHAs relevantes (sin volcados de logs):

Escenarios:
- Escenarios activos (criterios observables completos):
- Escenarios ya cerrados (solo lista/títulos, sin historiales pesados):

Contexto funcional y contratos:
- Decisiones e invariantes materiales:
- Contratos/tipos y rutas o símbolos relevantes:
- Evidencia procesada de Codebase Memory y cobertura confirmada:

Fronteras y gobernanza:
- Alcance permitido:
- Prohibiciones estrictas:
- Condiciones de escalación:
- Skills obligatorias y adicionales aplicables:

Próxima frontera funcional:
- Comportamiento observable:
- Intent de delivery y mensaje de commit tentativo:
- Artefactos mínimos esperados:

Ownership y cierre:
- Owners de edición, staging, commit y push:
- Exclusividad del worktree:
- Riesgos abiertos:
- Condición de cierre del batch:
```

Los “artefactos mínimos esperados” orientan la frontera; no convierten una lista provisional de archivos en permiso para ignorar dependencias cohesionadas ni en obligación de modificar todo lo enumerado.

## Contrato delta (intra-batch o intra-grupo persistente)

Usar exclusivamente con el mismo developer persistente cuando continúa entre 2–3 escenarios consecutivos dentro de un `SCENARIO_GROUP` aprobado y el contexto general sigue vigente:

```text
Estado heredado: HEAD / árbol / CI conocido
Escenarios cerrados desde el último handoff:
Batch y escenarios activos:
Granularidad actual:

Cambios de objetivo, alcance, prohibiciones o invariantes:
Skills nuevas obligatorias:
Evidencia o riesgos nuevos:

Próxima frontera atómica:
- Comportamiento:
- Intent de delivery:
- Commit tentativo:

Cambios de owners o worktree:
Condiciones nuevas de continuación, escalamiento y cierre:
```

Si se rota el subagente para el siguiente batch o se pierde contexto, enviar obligatoriamente el contrato de bootstrap autosuficiente.

## Anexos condicionales

### Codebase Memory

Agregar solo cuando la delegación depende de arquitectura, callers, dependencias o impacto:

```text
Graph project / generation:
Evidence tier / bounded scope:
Queries and pagination:
Qualified symbols and relevant paths:
Material traces:
Coverage result and source fallback:
Unresolved structural questions:
```

Entregar hallazgos, no una transcripción de consultas. El developer no repite la exploración; si no tiene herramientas de grafo, usa la evidencia recibida y lee directamente solo las fuentes necesarias.

### API o contrato externo

```text
Fuente y versión del contrato:
Endpoint u operación existente:
Campos públicos requeridos:
Transformaciones y validaciones:
Datos que no deben cruzar la frontera:
Comportamiento de errores:
```

### UI, responsive y accesibilidad

```text
Jerarquía y estados visibles:
Primitivas existentes que deben reutilizarse:
Interacciones y nombres accesibles:
Viewports o estados que requieren comprobación:
Decisiones visuales ya aprobadas:
```

### Mantenibilidad

```text
Mapa de responsabilidades:
Contratos públicos que deben permanecer mínimos:
Recursos y lifecycle con owner:
Señales ya detectadas:
Decisiones o justificaciones pendientes:
```

### Concurrencia del worktree

Agregar si otra persona o agente puede operar sobre el mismo checkout:

```text
Owner actual de staging y commit:
Cambios externos conocidos:
Protocolo: pausar ante HEAD o staging inesperado, preservar cambios ajenos,
volver a inspeccionar y regenerar delivery_prepare antes del commit.
```

## Reglas por granularidad

### `MICROSTEP`

- Declarar un solo comportamiento observable.
- El developer se detiene después de validarlo y no commitea ni pushea.
- El orquestador recibe el árbol y la evidencia necesaria para decidir la siguiente frontera.

### `SCENARIO`

- Incluir un escenario aprobado y sus criterios observables.
- Autorizar los commits atómicos necesarios dentro del escenario, no una cantidad predeterminada.
- Detenerse al dejarlo GREEN o cuando aparezca una condición de escalamiento.

### `SCENARIO_GROUP`

- Incluir 2–3 escenarios consecutivos y explicar por qué comparten contexto y riesgo.
- Exigir que cada escenario quede GREEN antes del siguiente.
- Declarar qué evidencia permite continuar automáticamente entre escenarios.
- Degradar a `SCENARIO` o `MICROSTEP` si aparece acoplamiento, ambigüedad o alcance nuevo.

## Delivery y cierre

Durante el ciclo RED/GREEN se utiliza exclusivamente `delivery_test`. En cada frontera atómica con commit, el developer realiza stage exacto e invoca `delivery_prepare` (con soporte de jobs `delivery_job_wait` ante gates largos); el MCP selecciona el gate. No incluir listas de comandos, scripts crudos ni gates “esperados” en el contrato.

Al completar el último escenario de una US y encontrarse el árbol limpio en HEAD, invocar `delivery_verify_head({ intent: "close_us", scopeFiles })` para validar Gate D sobre HEAD sin crear commits artificiales ni vacíos.

`delivery_finalize(close_batch)` se usa solo si los feature files declarados para ese batch están completos y sin `@wip`. Cuando una feature conserva escenarios futuros con `@wip`, cerrar los escenarios implementados, emitir el reporte del batch y continuar sin formalizar `close_batch` sobre esa feature.

La US solo puede declararse terminada cuando `delivery_finalize(close_us)` devuelve `finalized: true` y `status: passed`.

## Escalación

Ante una falla persistente, usar el [protocolo de diagnóstico](../../frontend-testing-gates/references/failure-diagnostics.md). El contrato solo agrega sus condiciones específicas de escalamiento; no copia el protocolo completo ni fija una cuota universal de intentos.

## Handoff de cierre compacto

Al culminar el batch (o detenerse por escalación o incidente de CI), el developer emite un reporte estructurado y compacto, finalizando su ejecución:

```text
Escenarios GREEN:
SHAs y receipts relevantes:
Contratos o decisiones que cambiaron:
Archivos productivos materiales modificados:
Riesgos o diagnóstico causal todavía activo (si existe incidente CI):
Estado del árbol:
Estado de CI conocido devuelto por la plataforma:
Siguiente acción permitida:
```

### Prohibiciones estrictas del handoff
- **Cero logs verdes o de ejecución**: prohibido incluir salidas de pruebas, logs de build ni transcripciones de comandos exitosos.
- **Cero tracebacks crudos**: los fallos se reportan por su firma causal y ubicación exacta, sin volcar pantallas ni stacktraces extensos.
- **Cero diffs completos**: enumerar únicamente rutas modificadas materiales y cambios de contrato; el árbol y Git ya contienen el diff.
- **Cero transcripts MCP**: omitir payloads crudos, tool calls de depuración o respuestas JSON voluminosas.
- El ledger y `.delivery/runtime/` preservan la evidencia histórica detallada; el handoff comunica únicamente la señal indispensable para la continuidad del orquestador o del siguiente developer.
- Una estimación de commits es únicamente una señal de coordinación y nunca una cuota, mínimo o máximo.
