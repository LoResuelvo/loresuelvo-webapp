---
name: frontend-us-delivery
description: "Entregar una User Story de Lo Resuelvo de punta a punta, desde escenarios aprobados hasta integración validada en main."
---

# Frontend US Delivery

Usar para implementar una User Story o feature completa. Esta skill define el ciclo de entrega; no duplica reglas de BDD, arquitectura, testing ni commits.

## Preparación

1. Confirmar `git status --short --branch`, alcance funcional, rol y rutas afectadas.
2. Escribir todos los escenarios Gherkin de aceptación antes de cambiar código. Cada escenario tiene exactamente un `When`.
3. Mostrar los escenarios al usuario y esperar su aprobación funcional.
4. Crear `docs[XX]: define acceptance scenarios for <feature>`.

## Desarrollo

1. Declarar la conducción de la US y elegir un batch activo: un micro-paso, un escenario o 2–3 escenarios consecutivos aprobados.
2. Avanzar Outside-In: steps en RED; presentación mínima aislada con props o mocks; dominio/contratos; infraestructura/aplicación; conexión de ruta o Server Action e integración E2E.
3. Cada micro-paso agrega un único comportamiento observable. No conectar la presentación a rutas, fetch, repositorios o Server Actions antes del paso de integración correspondiente.
4. Agregar solamente el código requerido por el escenario actual dentro del batch. No preparar capas completas para escenarios futuros ni saltar al siguiente antes de cerrar el actual en GREEN.
5. Revisar el código productivo no trivial con `frontend-maintainability-governance` y resolver sus señales sin introducir alcance ajeno.
6. Realizar stage exacto de la frontera atómica y ejecutar `delivery_prepare` (el runner selecciona y ejecuta el gate automáticamente); con `status: passed`, commitear y pushear según la granularidad de delegación declarada.
7. Retirar `@wip` solo cuando el E2E del escenario esté en GREEN.
8. Continuar con el siguiente escenario solo si pertenece al batch aprobado y se cumplen sus condiciones de continuación; de lo contrario, cerrar el batch y reportar.

## Cierre

- Formalizar `close_batch` solo cuando todos los feature files declarados para ese batch estén completos y sin `@wip`. Si una feature conserva escenarios futuros, reportar el batch tras cerrar sus escenarios y reservar Gate D para una frontera cuyo scope esté completo.
- Cerrar la User Story mediante MCP `delivery_finalize(close_us)`. Solo `finalized: true` con `status: passed` demuestra cierre: Gate D aprobado en `HEAD`, scope sin `@wip`, commits pusheados, ledger íntegro y CI passed en todos los commits relevantes.
- Informar alcance entregado, validaciones, señales de mantenibilidad, decisiones y riesgos residuales.

## Routing

- Escenarios, steps y TDD: `frontend-bdd-tdd-process`.
- Código productivo, hooks, tamaño y límites de módulos: `frontend-maintainability-governance`.
- Gates locales y CI: `frontend-testing-gates`.
- Commits: `frontend-commit-governance`.
- API, dominio, diseño, responsive, accesibilidad, query o motion: cargar solo la skill específica que aplique.

Antes del handoff final, leer [checklist de calidad](references/checklist-calidad.md) y [checklist de seguridad](references/checklist-seguridad.md).
