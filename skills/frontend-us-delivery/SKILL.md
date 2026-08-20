---
name: frontend-us-delivery
description: "Flujo para implementar User Stories o features completas en Lo Resuelvo con TDD, fases pequeñas, pruebas focalizadas, UI/UX profesional y validación final. Usar cuando se pida desarrollar registro, login, búsqueda, solicitud, mensajería, dashboard consumidor/prestador u otra feature de punta a punta."
---

# Frontend US Delivery

## Flujo base

1. Confirmar rama y estado: `git status --short --branch`.
2. Entender alcance funcional, rol afectado (visitante/consumidor/prestador) y rutas implicadas.
3. Planificar fases pequeñas: tipos/API, lógica, UI, estados, pruebas, polish.
4. Aplicar TDD donde sea viable: RED -> GREEN -> REFACTOR.
5. Durante desarrollo, ejecutar pruebas focalizadas del área tocada.
6. Integrar skills específicas:
   - BDD/TDD consistente: `frontend-bdd-tdd-process`.
   - UI visual: `frontend-design`.
   - Responsive: `frontend-mobile-responsive`.
   - Formularios/overlays: `frontend-accessibility-gates`.
   - API/actions/auth/realtime: `frontend-api-client-governance`.
   - React Query: `frontend-query-governance`.
7. Cerrar con `frontend-testing-gates`.

## Reglas de calidad

- Alta cohesion y baja duplicacion.
- **Un componente principal por archivo.** Componentes presentacionales separados de lógica de datos cuando crezcan.
- User-facing text en español, **centralizado en `infrastructure/i18n/translations.ts`** — nunca hardcodeado.
- Estados loading/error/empty/success diseñados, no improvisados.
- No degradar Server Components convirtiendo todo a client.
- Mantener rutas centralizadas en `lib/routes.ts` cuando aplique.

## Reglas de tipos y datos

- Tipos de dominio en `domain/` siempre en **camelCase** — nunca snake_case.
- DTOs del backend (snake_case) se definen exclusivamente en `infrastructure/api/types.ts`.
- Mappers en `infrastructure/repositories/` transforman `ApiXxx → DomainXxx`.
- Los use cases en `application/` **no tragan errores silenciosamente** — propagan excepciones.

## Reglas de componentes UI

- Usar primitivas existentes (`Button`, `Card`, `Avatar`, `Modal`, `DetailPanel`, `InfoBanner`) con sus variantes CVA.
- Modales **siempre** con `<Modal>` (Radix Dialog) — nunca `div fixed inset-0` casero.
- No sobreescribir masivamente clases de primitivas — si el patrón se repite, crear una variante CVA.
- Funciones utilitarias puras (como `shouldShowExpandButton`) van en `lib/` (ej: `lib/text-utils.ts`), no inline en componentes.

## Reglas de razonamiento y conducta

1. **Pensar paso a paso antes de codificar:** Diseñar mentalmente la solución técnica, validar impacto y confirmar antes de tocar código.
2. **Cero conjeturas (Anti-Alucinación):** Si no sabés la respuesta o un requisito es ambiguo, indicalo explícitamente y hacé preguntas en vez de adivinar. Si creés que no hay una única respuesta correcta, planteá alternativas.
3. **Completitud absoluta (Zero Placeholders):** Prohibido dejar `// TODO`, funciones vacías o código truncado. Todo flujo debe quedar terminado de punta a punta.
4. **Concisión técnica:** Respuestas breves, técnicas y directas. Minimizar prosa introductoria o explicaciones obvias.

## Convención oficial de commits

La estructura de todo commit en los repositorios debe ser:

```text
<type>[optional scope]: <description>
[optional body]
[optional footer(s)]
```

### Tipos de commit válidos:
* **`feat`**: Para agregar nuevas features o funcionalidades.
* **`fix`**: Para solucionar bugs reales que causan comportamientos incorrectos en código productivo.
* **`refactor`**: Para mejoras estructurales del código sin alterar su comportamiento externo.
* **`style`**: Para cambios cosméticos o de formato que no afectan la lógica del código.
* **`test`**: Para agregar, modificar, arreglar o mejorar tests (unitarios, integración o E2E).
* **`docs`**: Para cambios en documentación, comentarios o descripciones de APIs.
* **`build`**: Para cambios que impactan el proceso de build o dependencias de producción/despliegue.
* **`ci`**: Para cambios en configuraciones o flujos de trabajo de CI/CD.
* **`chore`**: Para tareas administrativas o de soporte que no impactan código productivo (mover carpetas, etc.).
* **`revert`**: Para revertir un commit anterior.

### Reglas de formato de commit:
- Formato obligatorio: `<type>[optional issue/scope]: <description>` (ej: `feat[54]: implement ProposalTimelineCard with role-based alignment` o `fix[26]: resolve work order completion state`).
- Descripción en **inglés** y en **modo imperativo**.
- No terminar la línea de asunto con punto final.

## Ejecución Incremental y Reporte por Micro-Paso (Step)

El desarrollo no se entrega como un bloque monolítico, sino en **micro-pasos atómicos (steps)**:
*(Un "step" es un avance puntual: crear tipos de dominio, implementar un use-case con su test, crear un componente TSX, etc., avanzando incrementalmente hacia completar el escenario).*

Por cada micro-paso (step) completado, el agente **DEBE**:
1. **Explicar brevemente los cambios realizados:** Archivos modificados y justificación técnica concisa.
2. **Sugerir el comando de commit exacto:** Proporcionar el comando listo para copiar con formato canónico:
   ```bash
   git add <archivos-modificados>
   git commit -m "<type>[<issue>]: <descripción>"
   ```
3. **Feedback Visual Inmediato (Screenshots):** Apenas se agrega o modifica código TSX que renderiza un componente o vista, generar una captura con Playwright o embeber la previsualización para que el usuario valide la UI en 1 segundo sin tener que navegarla manualmente.

## Integración con BDD y Testing

- **Definición de Escenarios y TDD:** Cargar `skills/frontend-bdd-tdd-process` para la Matriz Obligatoria de los 5 Estados de UI, el ciclo Double-Loop TDD y las reglas de `CustomWorld` / Step Definitions.
- **Validación final:** Cargar `skills/frontend-testing-gates` antes de handoff o PR.

## Validación por fase

- BDD/TDD: cargar `frontend-bdd-tdd-process` cuando se creen o ajusten features, steps o tests.
- Unit/RTL: `npm run test -- <patron>`.
- E2E Gherkin si cambia un flujo en `features/`:
  - **En Node local:** `make build && make start-test` (puerto 3001) y `make test-e2e` (o `make test-e2e-file FILE=...`).
  - **En Docker:** `make docker-test-e2e` (automatizado con imagen de producción).
- Cierre robusto: `npm run test`, `npm run lint`, `npm run build`, y `make test-e2e` si corresponde.
