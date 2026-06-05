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
- Componentes presentacionales separados de lógica de datos cuando crezcan.
- User-facing text en español.
- Estados loading/error/empty/success diseñados, no improvisados.
- No degradar Server Components convirtiendo todo a client.
- Mantener rutas centralizadas en `lib/routes.ts` cuando aplique.

## Validacion por fase

- BDD/TDD: cargar `frontend-bdd-tdd-process` cuando se creen o ajusten features, steps o tests.
- Unit/RTL: `npm run test -- <patron>`.
- E2E Gherkin si cambia un flujo en `features/`.
- Cierre robusto: `npm run test`, `npm run lint`, `npm run build`, y `npm run test:e2e` si corresponde.
