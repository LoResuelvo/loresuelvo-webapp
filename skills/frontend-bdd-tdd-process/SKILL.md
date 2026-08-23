---
name: frontend-bdd-tdd-process
description: "Definir escenarios Gherkin y desarrollar Lo Resuelvo con BDD, TDD y cierre E2E escenario por escenario."
---

# Frontend BDD/TDD Process

Usar cuando la tarea cambia comportamiento observable, criterios de aceptación, tests de regresión o lógica/componentes con riesgo relevante.

## Escenarios

- Definir todos los escenarios de la US antes de implementar y obtener aprobación funcional.
- Cada escenario tiene exactamente un `When`: una única acción principal del usuario.
- Los `Given` preparan contexto; los `Then` verifican resultados observables, no detalles internos.
- Cubrir happy path, loading, empty, error y edge/partial cuando sean estados aplicables al flujo.
- Implementar y cerrar un escenario antes de empezar el siguiente.

## Double-Loop TDD

1. Crear o ajustar el escenario Gherkin y ejecutarlo en RED por la razón observable correcta.
2. Si faltan frases, agregar step definitions mínimos antes de la implementación.
3. Para cada pieza interna, escribir un test unitario o de componente pequeño en RED.
4. Implementar lo mínimo para GREEN y refactorizar sin perderlo.
5. Integrar y ejecutar el E2E del archivo de feature. Eliminar `@wip` solo en GREEN.

## Selección de pruebas

- BDD/Cucumber para flujos que cruzan rutas, roles, formularios, auth, búsqueda, solicitudes, chat o dashboards.
- Vitest/Testing Library para lógica local, helpers, mappers, Server Actions y estados de un componente.
- Usar ambos cuando la feature tiene flujo observable y lógica interna no trivial.
- Los títulos y descripciones de tests se escriben en inglés.

## Steps y datos de prueba

- Los steps son pegamento declarativo y breve; usar `CustomWorld`, `this.page`, factories y helpers de soporte.
- No usar `page` global, hooks locales, JSON extenso ni rutas absolutas locales.
- Reutilizar steps equivalentes antes de crear otros.

Al agregar o modificar steps, leer [convenciones de Cucumber](references/cucumber-conventions.md). Antes del cierre de una feature con tests nuevos, leer [checklist BDD/TDD](references/checklist-bdd-tdd.md).
