# AGENTS.md — Lo Resuelvo Webapp

Última actualización: 2026-06-05

Fuente canónica para agentes. Leer este archivo primero y cargar skills locales solo cuando apliquen.

## Modo skills-first

1. Leer reglas globales de este archivo.
2. Elegir la skill adecuada del índice.
3. Cargar solo `skills/<skill>/SKILL.md` y referencias puntuales necesarias.
4. Evitar abrir documentación o código no relacionado con la tarea.

## Arquitectura resumida

- Framework: Next.js App Router + React + TypeScript strict.
- Estilos/UI: Tailwind CSS, shadcn/Radix primitives, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
- Datos/API: clientes y tipos en `lib/`; server actions junto a rutas/componentes cuando coordinan UI con backend.
- Auth: Auth0 y adaptadores en `lib/auth/`; compatibilidad legacy en `lib/auth0.ts`.
- Realtime/mensajería: `lib/websocket/`, `lib/ws-tickets-client.ts`, `app/api/ws-tickets/route.ts`, componentes en `app/components/messaging/` y `components/*/mensajes/`.
- Testing: Vitest/Testing Library para unit/component; Cucumber + Playwright para features E2E en `features/`.
- Deploy: Next `output: "standalone"`; Dockerfiles y compose para dev/prod.

## Estructura de carpetas

```txt
app/                         App Router: rutas, layouts, server actions y route handlers
app/components/messaging/    Componentes de mensajería compartidos por roles
components/                  Componentes UI y pantallas por dominio
components/ui/               Primitivas reutilizables de UI
components/consumidor/       Home, búsqueda y mensajes del consumidor
components/provider/         Home/dashboard y mensajes del prestador
components/onboarding/       Flujo de onboarding
components/registro/         Registro de cuentas
features/                    Features Gherkin y step definitions E2E
lib/                         Clientes API, auth, rutas, utils y dominio compartido
public/                      Assets públicos
reports/                     Reportes generados de Cucumber
skills/                      Skills locales para agentes, cargadas bajo demanda
```

## Índice de skills locales

- `skills/frontend-us-delivery`
  - Implementar User Stories/features completas con TDD por fases y validación final.
- `skills/frontend-bdd-tdd-process`
  - Guiar BDD con Gherkin/Cucumber y TDD con Vitest/Testing Library siguiendo buenas prácticas.
- `skills/frontend-design`
  - Diseñar/rediseñar pantallas con UI/UX profesional, jerarquía, estados y coherencia visual.
- `skills/frontend-mobile-responsive`
  - Corregir layouts mobile/tablet/desktop sin romper desktop.
- `skills/frontend-accessibility-gates`
  - Validar foco, teclado, semántica, formularios, modales y estados interactivos.
- `skills/frontend-motion-effects`
  - Agregar animaciones/microinteracciones con propósito, reduced motion y performance.
- `skills/frontend-api-client-governance`
  - Crear/modificar clientes API, server actions, auth, tipos, websocket tickets y manejo de errores.
- `skills/frontend-query-governance`
  - Gobernar React Query: keys, cache, invalidaciones, guards y requests redundantes.
- `skills/frontend-testing-gates`
  - Ejecutar validaciones de cierre: Vitest, lint, build y E2E cuando corresponda.
- `skills/frontend-doc-governance`
  - Mantener `AGENTS.md`, `CLAUDE.md`, skills y documentación operativa compacta.
- `skills/frontend-commit-governance`
  - Preparar commits seguros, coherentes y validados.

## Mapa rápido de decisión

- “Implementá una feature/US completa”: `frontend-us-delivery`.
- “Definí criterios, Gherkin, RED/GREEN/REFACTOR o tests primero”: `frontend-bdd-tdd-process`.
- “Mejorá el diseño/la landing/una pantalla”: `frontend-design`.
- “Se rompe en mobile/tablet”: `frontend-mobile-responsive`.
- “Formulario/modal/menu/accesibilidad”: `frontend-accessibility-gates`.
- “Agregá animaciones/transiciones”: `frontend-motion-effects`.
- “Cambió API/auth/server action/websocket”: `frontend-api-client-governance`.
- “Cache/refetch/mutación/React Query”: `frontend-query-governance`.
- “Validá todo antes de entregar”: `frontend-testing-gates`.
- “Documentación o instrucciones de agentes”: `frontend-doc-governance`.
- “Commit/PR/handoff”: `frontend-commit-governance`.

## Reglas críticas

### Calidad

- Alta cohesión, bajo acoplamiento y mínima duplicación.
- Preferir componentes pequeños y reutilizables.
- Mantener tipos explícitos en fronteras de API, auth y datos compartidos.
- No convertir Server Components en Client Components sin necesidad real.

### UI/UX

- UI visible en español.
- Cada pantalla debe contemplar estados `loading`, `empty`, `error`, `disabled` y `success` cuando apliquen.
- CTA principal claro y accesible.
- Mobile-first real; desktop no debe degradarse por fixes mobile.

### Seguridad

- Nunca hardcodear secretos, tokens, passwords ni URLs privadas.
- No commitear `.env` ni archivos con credenciales.
- Evitar logs de payloads sensibles.
- No usar `dangerouslySetInnerHTML` salvo sanitización explícita.
- Mantener errores de usuario genéricos; no filtrar detalles internos.

### Idioma y estilo

- Texto visible para usuarios: español.
- Respuestas al equipo: español, salvo que se pida otro idioma.
- Commits: inglés claro.
- En código nuevo, respetar el idioma predominante del archivo y nombres existentes.

## Comandos de validación

Comandos actuales del repo:

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

Equivalentes Make:

```bash
make test
make lint
make build
make test-e2e
```

Política:

1. Durante iteración, ejecutar pruebas focalizadas cuando sea posible.
2. Antes de handoff/PR/cierre robusto: `npm run test && npm run lint && npm run build`.
3. Ejecutar `npm run test:e2e` si cambia un flujo cubierto en `features/` o si el usuario pide paridad E2E.
4. Fail-fast: detenerse en la primera falla, corregir y re-ejecutar.

## Checklist final para agentes

1. Skill correcta cargada y aplicada.
2. Diff revisado; sin archivos generados accidentales.
3. Sin secretos ni logs sensibles.
4. Pruebas/validaciones relevantes ejecutadas o razón explícita si no se ejecutaron.
5. Resumen final conciso con archivos tocados, validación y riesgos residuales.
