# Contratos de delegación

Leer al preparar o revisar un handoff entre orquestador y developer. El contrato debe ser compacto pero suficiente para ejecutar el batch sin redescubrir su contexto. No copiar reglas generales que el developer ya recibe desde `AGENTS.md` y las skills obligatorias.

## Cómo construir el contrato

1. Elegir contrato completo o delta.
2. Declarar conducción y granularidad como ejes independientes.
3. Incluir hechos específicos del batch y la próxima frontera segura.
4. Agregar únicamente los anexos técnicos que aplican.
5. Confirmar acceso del developer a `delivery_prepare` antes de autorizar ediciones.

El contrato define resultados, límites, invariantes y ownership. No calcula gates, prescribe comandos de test ni fija archivos o líneas salvo que una restricción de seguridad, una evidencia ya confirmada o una frontera prohibida lo requiera.

## Contrato completo

Usar para el primer batch, un developer nuevo, contexto perdido o una dependencia arquitectónica nueva:

```text
Conducción: USER_GUIDED | AGENT_ORCHESTRATED
Granularidad: MICROSTEP | SCENARIO | SCENARIO_GROUP
US / batch / escenarios ordenados:

Estado inicial:
- HEAD y rama:
- Estado del árbol:
- Escenarios ya cerrados:
- CI pendiente o fallida:

Objetivo observable y criterios de aceptación:

Contexto funcional y técnico:
- Flujo existente que se extiende:
- Contratos y tipos relevantes:
- Invariantes y decisiones aprobadas:

Alcance permitido:
Prohibido:
Ampliaciones que requieren escalación:

Skills obligatorias:

Handoff estructural: <anexo Codebase Memory | no aplica>
Otros anexos técnicos: <API | UI/accesibilidad | mantenibilidad | concurrencia | ninguno>

Próxima frontera atómica:
- Comportamiento:
- Artefactos mínimos esperados:
- Intent de delivery:
- Mensaje de commit tentativo:

Owners:
- Implementación y validación:
- Staging / commit / push:
- Consulta de CI:
- Exclusividad del worktree:

Condiciones para continuar:
Condiciones para escalar o detenerse:
Condición de cierre del batch:
```

Los “artefactos mínimos esperados” orientan la frontera; no convierten una lista provisional de archivos en permiso para ignorar dependencias cohesionadas ni en obligación de modificar todo lo enumerado.

## Contrato delta

Usar con el mismo developer persistente cuando el contexto general continúa vigente:

```text
Estado heredado: HEAD / árbol / CI
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

Enviar nuevamente el contrato completo si se reemplaza al developer, se perdió contexto o el delta ya no permite comprender el batch por sí mismo.

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

En cada frontera con commit, el developer realiza stage exacto e invoca `delivery_prepare`; el MCP selecciona el gate. No incluir listas de comandos ni gates “esperados” en el contrato.

`delivery_finalize(close_batch)` se usa solo si los feature files declarados para ese batch están completos y sin `@wip`. Cuando una feature conserva escenarios futuros con `@wip`, cerrar los escenarios implementados, emitir el reporte del batch y continuar sin formalizar `close_batch` sobre esa feature.

La US solo puede declararse terminada cuando `delivery_finalize(close_us)` devuelve `finalized: true` y `status: passed`.

## Escalación

Ante una falla persistente, usar el [protocolo de diagnóstico](../../frontend-testing-gates/references/failure-diagnostics.md). El contrato solo agrega sus condiciones específicas de escalamiento; no copia el protocolo completo ni fija una cuota universal de intentos.

## Reporte de cierre

```text
Escenarios GREEN:
Commits / SHAs:
Gates y receipts:
CI por SHA:
Cambios de contratos o tipos:
Archivos productivos materiales:
Mantenibilidad y decisiones:
Escalaciones / riesgos residuales:
Estado del árbol:
Siguiente acción permitida:
```

No reproducir logs verdes ni detalles que ya estén en el ledger. Una estimación de commits es únicamente una señal de coordinación y nunca una cuota, mínimo o máximo.
