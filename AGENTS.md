# AGENTS.md — Lo Resuelvo Webapp

Fuente canónica de reglas globales y de routing. Cargar solo las skills necesarias para la tarea; no leer todas por defecto.

## Stack y arquitectura

- Next.js App Router, React y TypeScript strict.
- Tailwind, shadcn/Radix y CVA para UI.
- Vitest/Testing Library para unitarios y componentes; Cucumber + Playwright para E2E en `features/`.
- Next standalone y Docker para desarrollo y producción.

```text
components/ + app/        Presentación y rutas
application/              Casos de uso
ports/                    Contratos
domain/                   Tipos y reglas de negocio
infrastructure/           Adaptadores, API, auth, repositorios y mappers
```

Las capas internas no dependen de las externas. `domain/` y `ports/` no importan desde `application/`, `infrastructure/`, `components/` ni `app/`.

## Invariantes globales

- El dominio y los puertos usan `camelCase`; los DTOs `snake_case` viven solo en `infrastructure/api/types.ts`.
- Los mappers en `infrastructure/repositories/` transforman DTOs a modelos de dominio antes de exponerlos a aplicación o UI.
- Los use cases propagan errores; las Server Actions o la UI los traducen a resultados y estados visibles.
- Todo texto visible va en `infrastructure/i18n/translations.ts`; la UI está en español.
- Usar las primitivas existentes antes de crear UI ad hoc. Los modales usan `Modal` basado en Radix.
- No hardcodear secretos ni commitear archivos de entorno. No mostrar datos sensibles en logs.
- No convertir Server Components en Client Components sin una necesidad concreta.
- Un componente principal por archivo; separar responsabilidades cuando mejore la cohesión.

## Principios de ingeniería

- Buscar alta cohesión y bajo acoplamiento; cada módulo debe tener una responsabilidad reconocible.
- Preferir soluciones simples y directas. No crear abstracciones, capas o configuraciones para necesidades hipotéticas.
- Mantener un solo nivel de abstracción dentro de una función o componente cuando sea razonable.
- Expresar decisiones de negocio mediante funciones o módulos del dominio en vez de inspeccionar y combinar estados repetidamente desde la UI.
- Evitar cadenas profundas de conocimiento entre objetos; usar mappers, selectores o APIs pequeñas cuando mejoren el límite entre módulos.
- Usar nombres que expresen intención y lenguaje del negocio; evitar nombres genéricos cuando oculten el significado.
- Mejorar el código tocado dentro del alcance de la tarea, sin convertir la US en un refactor no relacionado.
- No entregar `TODO`, funciones vacías ni placeholders en el flujo implementado.

## Flujo de una User Story

1. Revisar estado del repositorio y entender alcance, rol y rutas afectadas.
2. Escribir todos los escenarios de aceptación antes de implementar. Cada escenario tiene exactamente un `When`.
3. Esperar la aprobación funcional del usuario y crear `docs[XX]: ...`.
4. Definir la conducción de la US (`USER_GUIDED` o `AGENT_ORCHESTRATED`) y particionar provisionalmente el plan en delegaciones `MICROSTEP`, `SCENARIO` o `SCENARIO_GROUP`.
5. Una delegación tiene un único batch activo. Puede abarcar un micro-paso, un escenario o un grupo aprobado de 2–3 escenarios consecutivos; dentro de un grupo, cada escenario se cierra en GREEN antes de iniciar el siguiente.
6. La presentación inicial se implementa aislada con props o mocks y sin anticipar rutas, fetch, repositorios, Server Actions ni integración. Esas dependencias se incorporan al avanzar hacia adentro.
7. Ownership, commits, push, reportes y escalamiento se rigen por la granularidad declarada en `frontend-ai-development-workflow`. En `SCENARIO` y `SCENARIO_GROUP`, el desarrollador persistente puede completar, commitear, pushear y monitorear únicamente el batch aprobado.
8. Cada commit debe ser coherente, compilable y testeable. Se hace push a `main` tras pasar el gate local aplicable.
9. CI se monitorea por SHA en paralelo. Se permite una ventana acotada de commits pendientes; ante una falla se detienen nuevos pushes y se corrige la causa.
10. Un escenario pierde `@wip` solo al pasar su E2E. La US se cierra con sus gates completos y CI verde.

Los escenarios aprobados son inmutables: no resumir, reescribir ni eliminar `Given`, `When` o `Then` sin una nueva aprobación funcional explícita.

La estimación de commits por reporte es orientativa, no una cuota, mínimo ni máximo. No agrupar cambios no relacionados, dividir dependencias relacionadas ni omitir escalaciones para ajustarse a una cifra; atomicidad, gates y push inmediato prevalecen.

El presupuesto de reparación pertenece a la firma de falla y se comparte entre todos los agentes: los handoffs, subagentes y compactaciones no lo reinician. Al alcanzar `STOP_USER`, quedan prohibidos nuevos intentos, cambios, commits y pushes hasta recibir instrucciones del usuario.

## Commits

- Con User Story: `<type>[XX]: descripción en inglés imperativa`.
- Sin User Story: `<type>: descripción en inglés imperativa`.
- No usar paréntesis para scopes.
- El tamaño del diff es una señal para revisar el alcance, no un límite rígido. Nunca dividir dependencias relacionadas para cumplir una métrica.

## Routing de skills

Para una US, cargar `frontend-us-delivery`, `frontend-ai-development-workflow`, `frontend-bdd-tdd-process`, `frontend-testing-gates` y `frontend-commit-governance`.

Cargar además, solo si aplica:

- Exploración estructural, callers, dependencias o impacto: `codebase-memory`.
- API, auth, Server Actions o mappers: `frontend-api-client-governance`.
- Reglas de negocio o tipos de dominio: `frontend-domain-governance`.
- Diseño o nuevas pantallas: `frontend-design`.
- Componentes React complejos: `frontend-component-governance`.
- Formularios, modales o teclado: `frontend-accessibility-gates`.
- Breakpoints: `frontend-mobile-responsive`.
- React Query: `frontend-query-governance`.
- Animaciones: `frontend-motion-effects`.
- Documentación operativa: `frontend-doc-governance`.

Las referencias de una skill se leen únicamente cuando la tarea coincide con su propósito indicado.

## Codebase Memory

- Para arquitectura, símbolos, callers, dependencias e impacto, cargar `codebase-memory` y usar primero el grafo.
- Al iniciar una exploración estructural o después de una compactación, comprobar `list_projects` o `index_status` y declarar el tier `Scout`, `Verify` —predeterminado— o `Auditor`.
- Después de descubrir rutas relevantes, ejecutar una sola verificación de `check_index_coverage` para todas ellas. Para afirmaciones negativas o exhaustivas, incluir además el scope investigado.
- Usar búsqueda textual o lectura focalizada para literales, configuración, archivos no-code y rangos con cobertura parcial, omitida, stale o desconocida.
- Antes de delegar, el orquestador pasa proyecto/generación, tier, scope, queries y paginación, símbolos calificados, rutas, trazas, cobertura, fallback ya realizado y preguntas abiertas. El developer no repite esa exploración salvo que aparezca una pregunta estructural nueva.
- Un resultado vacío o `indexed_no_recorded_gap` no demuestra por sí solo ausencia ni completitud.

## E2E y calidad

- Los steps usan `CustomWorld` y `this.page`; no usar estado global de módulo.
- Los hooks de Playwright viven en `features/support/hooks.ts`.
- Reutilizar factories y helpers de `features/support/`; no pegar JSON extenso en steps.
- Usar `ROUTES` de `@/lib/routes` en E2E; no commitear rutas absolutas locales.
- La matriz de gates y CI vive en `frontend-testing-gates`.

## Comandos habituales

```bash
npm run test
npm run lint
npm run build
make test-e2e-managed
make test-e2e-wip-file-managed FILE=features/<feature>.feature NAME='<scenario>'
make test-e2e-file-managed FILE=features/<feature>.feature NAME='<scenario>'
```

Los targets `*-managed` son el camino canónico para agentes en ejecución local: administran el puerto 3001, el build, el servidor, readiness, Cucumber y cleanup. Los targets sin `-managed` se reservan para ejecución contra un servidor ya levantado por la persona desarrolladora. CI mantiene pasos separados para distinguir fallas de build, arranque, readiness y Cucumber.

`make test-e2e-file-managed` requiere siempre `FILE` y `NAME`. Para ejecutar
todos los escenarios normales de un feature con el entorno gestionado, usar:

```bash
make test-e2e-managed E2E_FILE=features/<feature>.feature
```
