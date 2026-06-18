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

## Validacion por fase

- BDD/TDD: cargar `frontend-bdd-tdd-process` cuando se creen o ajusten features, steps o tests.
- Unit/RTL: `npm run test -- <patron>`.
- E2E Gherkin si cambia un flujo en `features/`.
- Cierre robusto: `npm run test`, `npm run lint`, `npm run build`, y `npm run test:e2e` si corresponde.
