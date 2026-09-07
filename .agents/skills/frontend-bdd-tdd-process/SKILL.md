---
name: frontend-bdd-tdd-process
description: "Definir escenarios Gherkin y desarrollar Lo Resuelvo con BDD, TDD y cierre E2E escenario por escenario."
---

# Frontend BDD/TDD Process

Usar cuando la tarea cambia comportamiento observable, criterios de aceptación, tests de regresión o lógica/componentes con riesgo relevante.

## Escenarios

- Definir todos los escenarios de la US antes de implementar y obtener aprobación funcional.
- Una vez aprobados, los escenarios son inmutables: no resumir, reescribir ni eliminar `Given`, `When` o `Then` sin escalación y aprobación funcional explícita.
- Cada escenario tiene exactamente un `When`: una única acción principal del usuario.
- Los `Given` preparan contexto; los `Then` verifican resultados observables, no detalles internos.
- Cubrir happy path, loading, empty, error y edge/partial cuando sean estados aplicables al flujo.
- Implementar y cerrar un escenario en GREEN antes de empezar el siguiente, incluso cuando ambos pertenezcan a un mismo `SCENARIO_GROUP`.
- Cada escenario, test interno y micro-paso debe verificar o introducir un único comportamiento observable. Separar persistencia, hidratación, autorización, validación y navegación cuando sean responsabilidades diferentes.

## Double-Loop TDD

1. Crear o ajustar el escenario Gherkin. El RED inicial se comprueba mediante `delivery_test({ mode: "scenario", featureFile: "features/<feature>.feature", scenarioName: "<Scenario Name>" })`. Gate 0 en prepare comprueba que los steps compilen y no rompan los existentes, pero para comprobar el fallo esperado en TDD se utiliza `delivery_test`. Un RED esperado no habilita commit.
2. Si faltan frases, agregar step definitions mínimos antes de la implementación.
3. Crear la presentación mínima aislada con props o mocks; no agregar ruta, fetch, repositorio, Server Action ni wiring todavía.
4. Para cada pieza interna, escribir un test unitario o de componente pequeño en RED, centrado solamente en el nuevo comportamiento, comprobándolo con `delivery_test({ mode: "unit", testFiles: ["<path-to-test>"] })`.
5. Implementar lo mínimo para GREEN y comprobarlo mediante `delivery_test` (mode `unit` para suites Vitest o mode `affected` para cambios de código). Refactorizar sin perderlo. En código productivo no trivial, resolver la revisión de `frontend-maintainability-governance` antes de cerrar el ciclo.
6. Agregar infraestructura/aplicación y luego el wiring de integración cuando el escenario activo lo requiera.
7. Queda estrictamente prohibido utilizar el gate completo de delivery (`delivery_prepare` o suites pesadas) como bucle rápido de TDD. La iteración interactiva RED/GREEN se realiza exclusivamente con `delivery_test` (cuya evidencia se guarda en `.delivery/runtime/tdd/` y no es consumible por git hooks). Al completar la implementación del escenario, retirar el tag `@wip` en el mismo cambio funcional. En la frontera atómica de cierre del escenario, el agente realiza stage exacto y valida y registra el cierre con `delivery_prepare` (`intent: "close_scenario"`). Solo el receipt `status: passed` autoriza el commit y push. Los comandos focalizados crudos son únicamente fallback humano o diagnóstico excepcional cuando la respuesta procesada no alcance.

## Selección de pruebas

- BDD/Cucumber para flujos que cruzan rutas, roles, formularios, auth, búsqueda, solicitudes, chat o dashboards.
- Vitest/Testing Library para lógica local, helpers, mappers, Server Actions y estados de un componente.
- Usar ambos cuando la feature tiene flujo observable y lógica interna no trivial.
- Los títulos y descripciones de tests se escriben en inglés.
- No repetir en una capa assertions ya cubiertas por otra salvo que formen parte del contrato observable de esa capa.

## Pruebas de valor

Cada prueba debe comprobar el contrato observable de su capa, no detalles de
implementación incidentales. Dominio prueba invariantes y reglas puras; mappers
prueban DTO válido a modelo público, validaciones y exclusión de campos no
públicos; use cases prueban delegación y propagación de errores; componentes
prueban estados visibles, accesibilidad e interacción.

No agregar tests que sólo afiancen clases CSS, estructura interna, funciones
privadas o estados de implementación si una refactorización válida podría
cambiarlos sin alterar el comportamiento. Antes del cierre, comprobar que cada
criterio aprobado tiene comportamiento verificable y la prueba adecuada.

## Steps y datos de prueba

- Los steps son pegamento declarativo y breve; usar `CustomWorld`, `this.page`, factories y helpers de soporte.
- No usar `page` global, hooks locales, JSON extenso ni rutas absolutas locales.
- Reutilizar steps equivalentes antes de crear otros.

Al agregar o modificar steps, leer [convenciones de Cucumber](references/cucumber-conventions.md). Antes del cierre de una feature con tests nuevos, leer [checklist BDD/TDD](references/checklist-bdd-tdd.md).
