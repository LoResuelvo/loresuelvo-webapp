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

1. Elegir un único escenario activo.
2. Avanzar Outside-In: steps en RED, presentación mínima, dominio/contratos, infraestructura/aplicación e integración E2E.
3. En cada micro-paso agregar solamente el código requerido por ese escenario. No preparar capas completas para escenarios futuros.
4. Ejecutar el gate correspondiente antes del commit; el orquestador commitea y pushea.
5. Retirar `@wip` solo cuando el E2E del escenario esté en GREEN.
6. Repetir con el siguiente escenario.

## Cierre

- Ejecutar los gates integrales definidos en `frontend-testing-gates`.
- Confirmar que CI está verde para los commits de la US.
- Informar alcance entregado, validaciones ejecutadas y cualquier riesgo residual.

## Routing

- Escenarios, steps y TDD: `frontend-bdd-tdd-process`.
- Gates locales y CI: `frontend-testing-gates`.
- Commits: `frontend-commit-governance`.
- API, dominio, diseño, responsive, accesibilidad, query o motion: cargar solo la skill específica que aplique.

Antes del handoff final, leer [checklist de calidad](references/checklist-calidad.md) y [checklist de seguridad](references/checklist-seguridad.md).
