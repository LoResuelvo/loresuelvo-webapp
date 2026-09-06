# AGENTS.md — Lo Resuelvo Webapp

Fuente canónica de reglas globales y de routing. Las skills del repositorio viven en `.agents/skills/`; cargar solo las necesarias para la tarea y no leer todas por defecto.

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
- Todo cambio productivo no trivial debe cerrar la revisión de `frontend-maintainability-governance`; tests verdes no sustituyen evidencia de legibilidad.

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

Antes de planificar u orquestar una US, leer `.agents/local/README.md` si existe. Sus preferencias complementan la gobernanza compartida, pero no pueden contradecir las instrucciones del usuario, este archivo ni las skills aplicables.

1. Revisar estado del repositorio y entender alcance, rol y rutas afectadas.
2. Escribir todos los escenarios de aceptación antes de implementar. Cada escenario tiene exactamente un `When`.
3. Esperar la aprobación funcional del usuario y crear `docs[XX]: ...`.
4. Definir la conducción de la US (`USER_GUIDED` o `AGENT_ORCHESTRATED`) y particionar provisionalmente el plan en delegaciones `MICROSTEP`, `SCENARIO` o `SCENARIO_GROUP`.
5. Una delegación tiene un único batch activo. Puede abarcar un micro-paso, un escenario o un grupo aprobado de 2–3 escenarios consecutivos; dentro de un grupo, cada escenario se cierra en GREEN antes de iniciar el siguiente.
6. La presentación inicial se implementa aislada con props o mocks y sin anticipar rutas, fetch, repositorios, Server Actions ni integración. Esas dependencias se incorporan al avanzar hacia adentro.
7. Ownership, commits, push, reportes y escalamiento se rigen por la granularidad declarada en `frontend-ai-development-workflow`. En `SCENARIO` y `SCENARIO_GROUP`, el desarrollador persistente puede completar, commitear, pushear y monitorear únicamente el batch aprobado.
8. Cada commit debe ser coherente, compilable y testeable. Antes de cada commit de agente, con el cambio exacto staged, `delivery_prepare` selecciona y ejecuta el gate local; solo `status: passed` habilita al agente a commitear y pushear a `main`. El flujo humano se define más abajo.
9. CI se monitorea por SHA en paralelo. La política permite hasta cuatro commits totales en vuelo; ante una falla se detienen nuevos pushes y se corrige la causa mediante el flujo de reparación auditable (`repair_ci` / Gate R). Queda prohibido cualquier bypass de CI (`DELIVERY_SKIP_CI_CHECK` es rechazado fail-closed). Un batch puede cerrarse localmente y dar paso al siguiente con CI pendiente dentro de esa ventana.
10. Un escenario pierde `@wip` solo al pasar su E2E. La US se cierra sobre HEAD sin commits artificiales (`delivery_verify_head`), con sus gates completos y CI verde (`delivery_finalize` con `waitForCi`).

Los escenarios aprobados son inmutables: no resumir, reescribir ni eliminar `Given`, `When` o `Then` sin una nueva aprobación funcional explícita.

La estimación de commits por reporte es orientativa, no una cuota, mínimo ni máximo. No agrupar cambios no relacionados, dividir dependencias relacionadas ni omitir escalaciones para ajustarse a una cifra; atomicidad, gates y push inmediato prevalecen.

El diagnóstico pertenece a la firma causal y se comparte entre todos los agentes: los handoffs, subagentes y compactaciones no lo reinician. No repetir una falla idéntica sin cambios relevantes. El developer escala cuando deja de existir progreso razonable; el orquestador decide si una hipótesis adicional está sustentada o si corresponde `STOP_USER`. Una vez declarado `STOP_USER`, quedan prohibidos nuevos intentos, cambios, commits y pushes hasta recibir instrucciones del usuario.

## Commits

- Con User Story: `<type>[XX]: descripción en inglés imperativa`.
- Sin User Story: `<type>: descripción en inglés imperativa`.
- No usar paréntesis para scopes.
- El tamaño del diff es una señal para revisar el alcance, no un límite rígido. Nunca dividir dependencias relacionadas para cumplir una métrica.

## Routing de skills

Para una US, cargar `frontend-us-delivery`, `frontend-ai-development-workflow`, `frontend-bdd-tdd-process`, `frontend-testing-gates` y `frontend-commit-governance`.

Cargar además, solo si aplica:

- Exploración estructural, callers, dependencias o impacto: `codebase-memory`.
- Código productivo no trivial, hooks, refactors, archivos grandes o reorganización: `frontend-maintainability-governance`.
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

### Agente con MCP

```text
delivery_inspect({ intent, proposedCommitMessage, ... })       # previsualización opcional
delivery_prepare({ intent, proposedCommitMessage, ... })       # gate obligatorio sobre staged
delivery_prepare({ intent: "repair_ci", repairsSha, ... })     # Gate R: reparación de un solo uso ante CI rojo
delivery_verify_head({ intent: "close_us", scopeFiles, usId }) # verifica Gate D sobre HEAD sin commits artificiales
delivery_ci_inspect({ sha })                                   # CI compacto tras push
delivery_finalize({ intent: "close_batch", usId, scopeFiles })  # cierre local; CI pendiente permitido
delivery_finalize({ intent: "close_us", usId, scopeFiles, waitForCi: true }) # cierre con Gate D + CI verde (espera acotada opcional)
```

El agente edita y usa Git normalmente, pero no ejecuta manualmente `make`, lint, typecheck, suites ni comandos crudos de CI como flujo habitual. El servidor MCP elige y ejecuta los checks mediante el core compartido y devuelve resultados procesados.

### Humano, entorno sin MCP aprobado o diagnóstico manual

```bash
npm run delivery:hooks:install
npm run delivery:prepare -- --intent prepare_commit --message '<mensaje propuesto>'
npm run delivery:prepare -- --intent repair_ci --repairs-sha <sha-fallido> --message 'fix: ...'
npm run delivery:verify-head -- --intent close_us --scope features/<feature>.feature
npm run delivery:ci -- --sha <commit-sha>
npm run delivery:finalize -- --intent close_us --scope features/<feature>.feature --wait-for-ci
npm run test
npm run lint
npm run build
npm run delivery:inspect -- --intent prepare_commit
```

Los comandos de `make` (`make test-e2e-managed`, etc.) son de uso interno para la ejecución de checks dentro de los gates o para diagnóstico focalizado puntual; no forman parte del flujo habitual de trabajo de los agentes.

La política versionada en `.delivery/policy.v1.json` es la única fuente autoritativa que decide clasificación, gates, checks, límites y orden. La evidencia generada queda ligada criptográficamente a HEAD, árbol staged, política, intent y alcance. La caché cubre éxitos y fallos idénticos; `--force` fuerza una ejecución nueva.

La selección de gates se realiza por **impacto real** del diff:
- **Cucumber**: mapea definiciones de steps contra sus features consumidoras mediante índice estructural. Un step nuevo no usado clasifica en Gate 0; un step consumido por una sola feature selecciona Gate B; steps consumidos por múltiples features, modificaciones a soporte compartido (`features/support/hooks.ts`) o resolución ambigua se elevan determinísticamente a Gate C.
- **TypeScript**: analiza el grafo de dependencias e importaciones mediante AST. Componentes en carpetas no estándar se clasifican por su alcance real; archivos importados por múltiples flujos o layouts/providers globales se elevan a Gate C.

El flujo de entrega distingue claramente entre agente y humano:
- **Agentes autónomos**: MCP `delivery_prepare` es la entrada canónica obligatoria sobre el snapshot staged antes de cada commit. El guard anticipatorio disponible en el cliente deniega `git commit` si no existe un receipt válido y coincidente. Si el MCP requerido no está disponible, detenerse; la CLI neutral solo sustituye al MCP en un entorno aprobado explícitamente.
- **Humanos**: desarrollan, realizan stage y pueden commitear directamente ejecutando tests de forma manual o delegando la verificación a CI. En ausencia de receipt previo, el commit se registra en el ledger local como `not_run` y se permite tanto el commit como el push (salvo que se configure `DELIVERY_REQUIRE_EVIDENCE=1`).
- **Git hooks**: los hooks de Git (`pre-commit`, `commit-msg`, `post-commit`, `pre-push`) son deliberadamente livianos. **Nunca ejecutan suites de tests**. Solo validan formato de mensaje, presencia o correspondencia de receipt ya existente (sin re-ejecutar gates), atomicidad de push (un commit a la vez), una ventana máxima de cuatro commits totales en vuelo, CI previo no fallido y registro en el ledger. Se instalan una vez por clon con `npm run delivery:hooks:install`.
- **Prohibición total de bypass de CI**: La variable `DELIVERY_SKIP_CI_CHECK` está prohibida y cualquier intento de utilizarla es rechazado inmediatamente de forma fail-closed (`DEPRECATED_CI_BYPASS_REJECTED`). No existe ningún bypass ambiental para eludir las comprobaciones de CI.
- **Flujo de reparación de CI (`repair_ci` / Gate R)**: Ante una falla de CI, pre-push bloquea nuevos pushes ordinarios. La subsanación requiere crear un commit correctivo mediante `intent: "repair_ci"` indicando obligatoriamente `repairsSha` (el SHA del commit fallido). Esto ejecuta el **Gate R**, que reproduce exhaustivamente a nivel local los checks de CI asignados a agentes (`delivery_unit`, `lint`, `typecheck_app`, `typecheck_cucumber`, `unit`, `e2e_full` y `build`; excluyendo Docker build). Dicho receipt genera una autorización de un solo uso en `pre-push`; una vez consumida al pushear, el fallo previo queda marcado como subsanado en el ledger y no bloquea futuros pushes.
- **Superficie Docker reservada a humanos (HUMAN_ONLY)**: Modificaciones a `Dockerfile`, `.dockerignore`, `compose*.yml`, workflows de Docker o scripts de construcción de imágenes pertenecen exclusivamente a desarrolladores humanos. Los agentes se detienen con `HUMAN_ONLY_CHANGE` o `HUMAN_ONLY_CI_FAILURE` y escalan a `STOP_USER`.
- **Verificación sin commits artificiales (`delivery_verify_head`)**: Al finalizar una User Story o batch cuando HEAD ya contiene los cambios definitivos y no restan tags `@wip`, no se deben generar commits vacíos o artificiales. Se invoca `delivery_verify_head({ intent: "close_us", scopeFiles })` (o `delivery:verify-head`), lo que valida Gate D sobre HEAD y asocia la evidencia requerida para el cierre.
- **Concurrencia local**: en un worktree compartido existe un solo owner del staging y commit a la vez. Un commit externo invalida contexto y receipts ligados al `HEAD`; el agente vuelve a inspeccionar y ejecutar `delivery_prepare` antes de commitear.
- **Cierre de batch**: MCP `delivery_finalize` con `close_batch` exige Gate D, commits pusheados, ledger válido y que todos los feature files declarados estén completos y sin `@wip`. Permite `queued`, `in_progress` o `not_found` y puede devolver `passed_pending_ci`. Si una feature conserva escenarios futuros con `@wip`, reportar el batch tras cerrar sus escenarios sin invocar `close_batch` sobre esa feature incompleta.
- **Cierre de User Story**: la US termina únicamente cuando MCP `delivery_finalize` con `close_us` devuelve `finalized: true` y `status: passed`. Exige Gate D válido en `HEAD`, scope sin `@wip`, commits pusheados, ledger íntegro y CI `passed` para todos los commits relevantes, incluidos los registrados como `not_run`. Admite `waitForCi: true` para aguardar automáticamente la finalización de los jobs remotos en vuelo.

Los agentes consumen resultados estructurados y normalizados; no deben calcular gates, procesar tracebacks completos, administrar manualmente comandos de CI ni descargar logs masivos. Los comandos `npm run delivery:*` comparten el mismo núcleo y quedan como interfaz humana, diagnóstico o fallback expresamente aprobado. Los comandos individuales se reservan para TDD o diagnóstico focalizado.
