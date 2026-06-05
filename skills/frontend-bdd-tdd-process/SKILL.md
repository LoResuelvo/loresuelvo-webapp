---
name: frontend-bdd-tdd-process
description: "Proceso BDD/TDD para Lo Resuelvo: escribir o ajustar features Gherkin, steps Cucumber/Playwright, tests Vitest/Testing Library y ciclo RED-GREEN-REFACTOR. Usar al implementar features, corregir bugs con regresión, agregar criterios de aceptación o cuando se necesite alinear comportamiento observable con pruebas automatizadas."
---

# Frontend BDD/TDD Process

Usar esta skill cuando el trabajo deba partir de comportamiento esperado, criterios de aceptación, una feature Gherkin, un bug reproducible o una nueva lógica de frontend.

## Objetivo

1. Alinear implementación con comportamiento observable por usuario.
2. Evitar tests frágiles acoplados a detalles internos.
3. Mantener un ciclo consistente: BDD para flujos, TDD para lógica/componentes.
4. Detectar y corregir desviaciones de buenas prácticas aunque el proyecto todavía no las cumpla en todas las áreas.

## Cuándo usar BDD vs TDD

### Usar BDD con Gherkin/Cucumber cuando

- Cambia un flujo completo de usuario en `features/`.
- Hay criterios de aceptación de negocio.
- El comportamiento cruza rutas, roles, formularios, auth, búsqueda, solicitudes, chat o dashboard.
- El bug solo se entiende desde una secuencia de usuario.

### Usar TDD con Vitest/Testing Library cuando

- Cambia lógica local, helpers, clientes API, server actions o componentes.
- El comportamiento puede aislarse sin navegar todo el flujo.
- Se necesita cubrir estados de UI: loading, empty, error, disabled, success.
- Se agrega una regresión pequeña para un bug específico.

### Usar ambos cuando

- Una feature completa requiere confianza de punta a punta y también lógica interna no trivial.
- El flujo BDD valida el camino principal y los tests unit/component cubren bordes.

## Flujo BDD recomendado

1. Leer o crear el `.feature` en `features/` antes de implementar.
2. Escribir escenarios desde el punto de vista del usuario, no desde componentes internos.
3. Mantener escenarios cortos: Given contexto, When acción, Then resultado observable.
4. Ejecutar el escenario y confirmar RED:

```bash
npm run test:e2e -- --name "texto del escenario"
```

Si el runner no acepta filtro por nombre en el entorno actual, ejecutar:

```bash
npm run test:e2e
```

5. Implementar el mínimo cambio para GREEN.
6. Refactorizar sin cambiar el comportamiento esperado.
7. Re-ejecutar el escenario afectado o toda la suite E2E si no hay filtro confiable.

## Flujo TDD recomendado

1. Crear o ajustar test cerca del código afectado (`*.test.ts` / `*.test.tsx`).
2. Escribir una prueba que falle por el comportamiento faltante, no por detalles de implementación.
3. Ejecutar RED focalizado:

```bash
npm run test -- <patron>
```

4. Implementar el mínimo cambio para GREEN.
5. Refactorizar manteniendo la prueba verde.
6. Agregar casos borde solo si representan riesgo real.

## Buenas prácticas Gherkin

- Escribir pasos en español claro y estable.
- Evitar mencionar nombres de componentes, clases CSS o estructura DOM.
- Preferir resultados visibles: textos, roles, navegación, mensajes, cambios de estado.
- Reutilizar steps existentes antes de crear duplicados.
- Mantener datos de prueba explícitos y pequeños.
- No depender de orden accidental si la UI no lo garantiza.

## Buenas prácticas Testing Library

- Consultar por rol, label, texto visible o placeholder cuando tenga sentido.
- Evitar `data-testid` salvo que no exista una consulta accesible estable.
- Probar comportamiento del usuario con `userEvent`, no llamadas internas.
- No testear clases Tailwind salvo que el objetivo sea una regresión responsive o visual específica.
- Evitar snapshots amplios; preferir aserciones intencionales.
- Cubrir estados async con `findBy*`, `waitFor` o mocks controlados.

## Buenas prácticas de mocks

1. Mockear fronteras externas: API, auth, websocket, timeouts o navegación.
2. No mockear el componente bajo prueba ni la lógica que se quiere validar.
3. Mantener fixtures pequeñas y legibles.
4. Si un mock replica demasiada lógica de producción, extraer un helper o probar en un nivel superior.
5. Para API clients, validar payload, headers relevantes y manejo de errores sin exponer secretos.

## Anti-patrones a corregir

- Implementar primero y escribir tests solo para cubrir líneas.
- Escenarios Gherkin que describen clicks sobre CSS o componentes internos.
- Tests que pasan aunque el usuario no pueda completar el flujo.
- Mocks globales que ocultan regresiones de contrato.
- `waitFor` usado para tapar race conditions sin entender la causa.
- Assertions sobre detalles visuales no críticos en tests de negocio.
- Duplicar steps con nombres distintos para el mismo comportamiento.

## Integración con otras skills

- Para feature completa, usar también `frontend-us-delivery`.
- Para UI profesional, usar `frontend-design`.
- Para formularios, modales o navegación por teclado, usar `frontend-accessibility-gates`.
- Para API/auth/realtime, usar `frontend-api-client-governance`.
- Para cache/mutaciones, usar `frontend-query-governance`.
- Para cierre robusto, usar `frontend-testing-gates`.

## Checklist de cierre

1. El test falla sin la implementación nueva o sin el fix.
2. El test valida comportamiento observable o contrato público.
3. No hay duplicación innecesaria de steps, fixtures o mocks.
4. Se ejecutó la prueba focalizada correspondiente.
5. Si cambió un flujo Gherkin, se ejecutó `npm run test:e2e` o se explicó por qué no.
6. Antes de handoff/PR, ejecutar validación robusta según `frontend-testing-gates`.

## Consultar referencias

Leer `references/checklist-bdd-tdd.md` antes de cerrar una feature o bugfix con pruebas nuevas.
