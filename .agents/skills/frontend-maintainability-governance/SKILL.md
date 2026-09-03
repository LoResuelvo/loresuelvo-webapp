---
name: frontend-maintainability-governance
description: "Revisar, diseñar o refactorizar código productivo TypeScript/React de Lo Resuelvo para mantener funciones, hooks, módulos, APIs y carpetas legibles y cohesionados. Usar en todo cambio productivo no trivial, especialmente hooks con efectos o callbacks, archivos que crecen, extracciones y reorganizaciones; no reemplaza BDD ni los gates de testing."
---

# Frontend Maintainability Governance

## Propósito

Tratar la legibilidad humana como criterio de aceptación del código cambiado. Aplicar estas reglas al alcance de la tarea; no iniciar limpiezas ajenas ni refactors preventivos.

Considerar no trivial cualquier cambio que altere lógica, estado, efectos, asincronía, contratos, reglas de negocio o estructura de módulos. Omitir esta skill solo en cambios puramente textuales, de assets o de estilos sin lógica.

## Antes de editar

1. Leer completos los símbolos que se modificarán y ubicar sus consumidores materiales.
2. Declarar un mapa breve de responsabilidades:
   - propósito del módulo o símbolo en una oración;
   - razones independientes por las que podría cambiar;
   - contrato público e invariantes que deben preservarse;
   - recursos externos que posee: timers, streams, listeners, requests, URLs o suscripciones.
3. Identificar el comportamiento observable y las pruebas que lo protegen. Un refactor no agrega escenarios ni funcionalidad.
4. Si se toca un hook, Client Component, timer, suscripción o API del navegador, leer [hooks y adaptadores React](references/react-hooks.md).
5. Si se crea, mueve o divide un archivo o una carpeta, leer [límites de módulos y carpetas](references/module-boundaries.md).

## Reglas de implementación

- Mantener una razón de cambio dominante por función, hook, componente y módulo.
- Mantener un nivel de abstracción por función. La orquestación debe leerse como una secuencia de operaciones con nombres de intención.
- Preferir guard clauses y funciones pequeñas con nombres del dominio frente a condicionales anidados o comentarios narrativos.
- Extraer lógica determinista a funciones puras o reducers; dejar en React únicamente estado, sincronización y composición.
- Exportar la API mínima requerida por consumidores actuales. No agregar opciones, callbacks, clases, factories, barrels ni extensibilidad hipotética.
- Dar un único dueño al ciclo de vida de cada recurso externo y a cada error visible. El cleanup debe ser idempotente y no debe haber dos superficies mostrando el mismo fallo por accidente.
- Desestructurar de hooks colaboradores solo las operaciones o valores necesarios; evitar depender de objetos completos cuya identidad pueda cambiar.
- Comentar decisiones, invariantes o restricciones no evidentes; no traducir línea por línea lo que el código ya expresa.
- Mantener código específico de una feature junto a su dueño. No esconder responsabilidades en archivos genéricos llamados `utils`, `helpers`, `manager` o `service`.

## Señales de revisión

Los umbrales cuantitativos de auditoría están definidos en `.delivery/policy.v1.json`. Son señales de atención, no prohibiciones. Cuando aparezca una señal, refactorizar si existe una frontera con nombre y contrato claros; si no, conservar la solución cohesionada y registrar una justificación de una oración.

| Dimensión | Revisión obligatoria |
| --- | --- |
| Longitud física de función, método o callback | Buscar más de una responsabilidad, niveles mezclados o una operación extraíble. |
| Cuerpo principal de hook o componente | Escribir el mapa de responsabilidades y evaluar composición, reducer o núcleo puro. |
| Tamaño total de archivo productivo | Revisar si contiene más de un concepto o razón de cambio. |
| Concentración de estado y efectos en hook (`useState`, `useRef`, `useCallback`, `useEffect`) | Revisar estados imposibles, lifecycle disperso y necesidad de reducer o adaptador. |
| API pública con miembros excesivos o combinaciones complejas | Reducir el contrato o representar variantes explícitamente. |
| Profundidad de anidación o ramas condicionales combinadas | Introducir guard clauses, decisiones con nombre o una transición explícita. |

No dividir por cumplir una cifra. Un algoritmo cohesionado puede superar un umbral; mover bloques a archivos vagos o crear una clase solo para bajar líneas empeora el diseño.

## Elegir la extracción

Aplicar la opción más pequeña que cree una frontera real:

1. helper privado cuando solo aclara un paso local;
2. función pura para cálculo, validación o transformación;
3. reducer y unión discriminada cuando varias transiciones deben preservar invariantes;
4. hook específico cuando coordina estado React con un sistema externo;
5. componente cuando existe una responsabilidad visual propia;
6. módulo por subdominio cuando tiene contrato y consumidores reconocibles;
7. controller o clase con estado solo cuando posee un lifecycle imperativo real y aporta valor fuera de React.

Una clase no es el patrón predeterminado para hacer legible un hook. Preferir normalmente un núcleo funcional puro, un hook adaptador fino y el componente consumidor.

## Auditoría antes del gate

Para revisar antes de ejecutar tests, invocar `delivery_inspect`; clasifica de forma automática los archivos productivos staged, ejecuta el auditor y reporta las señales. Antes del commit, `delivery_prepare` repite esa inspección sobre el snapshot exacto y solo entonces ejecuta el gate seleccionado.

Si MCP no está disponible, usar las entradas neutrales equivalentes:

```bash
npm run delivery:inspect -- --intent prepare_commit
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje propuesto>'
```

Para una revisión focalizada sobre archivos concretos:

```bash
git diff --name-only --diff-filter=ACMR HEAD
node .agents/skills/frontend-maintainability-governance/scripts/audit-changed-code.mjs <rutas-productivas>
```

Para revisar un commit ya creado o un archivo específico:

```bash
node .agents/skills/frontend-maintainability-governance/scripts/audit-changed-code.mjs hooks/audio/useAudioRecorder.ts
```

No usar sustituciones de shell opacas para construir la lista: inspeccionarla y excluir tests, archivos generados y documentación. El auditor emite señales y finaliza correctamente aunque existan; la decisión sigue siendo humana. Resolver cada señal mediante refactor o una justificación explícita ligada al `snapshotHash`; `delivery_prepare` conserva esa decisión en la evidencia local.

## Evidencia de cierre

Incluir en el handoff o reporte la evidencia generada por `delivery_prepare`:

```text
snapshotHash: <sha256>
status: <passed | failed | review_required | blocked | needs_input | no_changes>
gate: <NONE | 0 | A | B | C | D>
señales pendientes: <ninguna | detalle y justificaciones>
```

No declarar “código limpio” solo porque compila o pasa tests. La evidencia debe describir por qué el próximo lector puede entender y modificar el cambio con seguridad.
