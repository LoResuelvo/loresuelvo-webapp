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

## Flujo Double-Loop TDD (Bucle Doble de Desarrollo)

El desarrollo se realiza en dos bucles sincronizados:

1. **Bucle Externo (BDD / Aceptación):** Un escenario Gherkin define el criterio observable de negocio (inicia en RED).
2. **Bucle Interno (TDD / Unidades y Componentes):** Se implementan las piezas necesarias (dominio, use case, mapper, UI) en micro-ciclos RED -> GREEN -> REFACTOR con Vitest.
3. **Cierre de Bucle:** El escenario E2E pasa a GREEN y se refactoriza.

## Regla de Oro: Un Escenario y un Micro-Paso (Step) a la vez

- **Prohibido implementar múltiples escenarios de golpe:** Avanzar estrictamente escenario por escenario (Escenario 1 -> GREEN -> Escenario 2 -> GREEN...).
- **Entrega por Micro-Paso (Step) Outside-In:** Cada escenario se construye en pasos atómicos individuales de afuera hacia adentro (1 commit por micro-paso):
  1. `UI TSX inicial` con lo mínimo indispensable y props/mocks para renderizar (+ screenshot).
  2. `Aplicación & Dominio` (use case, types, ports) guiado por unit tests RED -> GREEN.
  3. `Infraestructura` (DTOs, mapper, repo, server action).
  4. `Integración & E2E` (conexión de TSX con server action, confirmación de E2E GREEN y retiro de `@wip`).
- **Por cada paso completado, el agente DEBE:**
  1. Indicar brevemente los cambios realizados y archivos tocados.
  2. Sugerir o ejecutar el comando de commit correspondiente (`git add <archivos>` y `git commit -m "<type>[<issue>]: <descripción>"`), sin descripciones redundantes (ej: sin "and i18n keys").
  3. Si se agrega o modifica código TSX visual, proveer feedback visual inmediato (screenshot o previsualización).
  4. Nunca commitear rutas de archivos del sistema local en step definitions (asegurar portabilidad en CI).

## Matriz Obligatoria de los 5 Estados de UI (Definición de Escenarios)

Al escribir o revisar un `.feature`, se deben cubrir obligatoriamente los 5 estados canónicos:

1. **Ideal State (Happy Path):** Flujo principal con datos válidos.
2. **Loading State:** Spinner / estado deshabilitado durante peticiones asíncronas.
3. **Empty State:** Listas vacías, primera visita o sin resultados.
4. **Error State:** Validaciones (400), duplicados (409), no encontrado (404) y servidor caído (500).
5. **Partial / Edge State:** Textos extensos (truncamiento con `line-clamp`), desbordes y límites.

## Flujo BDD recomendado (Bucle Externo)

1. Leer o crear el `.feature` en `features/` cubriendo los estados de la matriz.
2. Escribir escenarios desde el punto de vista del usuario, no desde componentes internos.
3. Mantener escenarios cortos: Given contexto, When acción, Then resultado observable.
4. Ejecutar el escenario y confirmar RED:

```bash
make test-e2e-file FILE=features/<feature>.feature
```

5. Avanzar por el bucle interno (TDD) para implementar las piezas mínimas.
6. Confirmar GREEN en el escenario E2E.
7. Refactorizar y verificar regresiones en toda la suite: `make test-e2e`.

## Flujo TDD recomendado (Bucle Interno)

1. Crear o ajustar test cerca del código afectado (`*.test.ts` / `*.test.tsx`).
2. Escribir una prueba unitaria pequeña (10-20 líneas) que falle por el comportamiento faltante (RED).
3. Ejecutar RED focalizado:

```bash
npm run test -- <patron>
```

4. Implementar el mínimo código de producción para pasar a GREEN.
5. Refactorizar manteniendo la suite verde.
6. Repetir hasta completar las piezas del escenario actual.

## Buenas prácticas Gherkin

- **Estructura Modular por Dominios en `features/`:**
  - Los archivos `.feature` y sus step definitions `*_steps.ts` se co-localizan dentro de carpetas temáticas de dominio:
    - `features/auth-onboarding/`: Autenticación, registro de perfiles y conexión con Mercado Pago.
    - `features/diagnosis-ia/`: Diagnóstico por IA, asistente conversacional y adjuntos.
    - `features/messaging/`: Chat en tiempo real, solicitudes de trabajo y mensajería entre partes.
    - `features/search-discovery/`: Landing pages, búsqueda por categoría y perfiles de prestadores.
    - `features/proposals-payments/`: Envío/visualización de propuestas de servicio y pago de seña.
    - `features/work-orders/`: Detalle de órdenes de trabajo y reporte de finalización.
    - `features/support/`: Soporte común (`world.ts`, `factories.ts`, `hooks.ts`, `stubs-helper.ts`).
  - _(La carpeta `features/step-definitions/` está deprecada y eliminada)._

- **Exactamente 1 `When` por escenario (Principio de Acción Única):** Cada escenario valida una única acción clave. Los preparativos y estados previos van en `Given` y sus `And`; las consecuencias observables van en `Then` y sus `And`.
- **Escribir pasos en español claro y declarativo:** Centrados en la intención de negocio del usuario, evitando detalles de implementación interna.
- **Reutilizar steps existentes:** Antes de crear una frase nueva, verificar si ya existe un step equivalente en los dominios de `features/`.
- **Datos de prueba explícitos y concisos:** Solo incluir en el texto del step los datos que alteran el resultado del test.

## Buenas prácticas Cucumber Step Definitions (Arquitectura Limpia y Paralelización)

- **`CustomWorld` obligatorio**: Todo step definition **DEBE** tipar su contexto con `this: CustomWorld` (importado de `../support/world`) y acceder al browser mediante `this.page`:
  ```ts
  Given("estoy en la página de inicio", async function (this: CustomWorld) {
    await this.page.goto(APP_URL);
  });
  ```
- **Prohibido `let page: Page` a nivel de módulo**: Nunca declarar variables de `page` globales o singletons en archivos de steps. Rompe el aislamiento en paralelo.
- **Hooks centralizados**: Toda la inicialización y cierre de navegadores/contextos se maneja exclusivamente en `features/support/hooks.ts`. Nunca definir hooks locales en step files.
- **Regla de las 3 a 5 líneas por Step (Legibilidad Humana y Cero JSONs en Crudo):**
  - Un step definition **solo es pegamento de orquestación**: debe ser declarativo y conciso (guía de 3 a 5 líneas).
  - **PROHIBIDO pegar bloques de JSON crudo dentro de un step:** Toda la data de prueba debe delegarse obligatoriamente a las funciones de `features/support/factories.ts` y a los helpers fluent de `CustomWorld` (`this.stubGet(...)`, `this.stubPost(...)`, `this.setSession(...)`).

### Catálogo Centralizado de Factories (`features/support/factories.ts`)

Siempre utilizar las factories predefinidas, pasando únicamente los overrides `Partial<T>` estrictamente necesarios para el escenario:

- **Usuarios y Auth**: `aCurrentUser()`, `aConsumer()`, `aProvider()`, `aSession()`
- **Cuentas de Pago**: `aPaymentAccount()`, `aConnectedPaymentAccount()`, `aPaymentAuthorization()`
- **Propuestas y Pagos**: `aProposal()`, `aBookingTerms()`, `aPaymentIntent()`, `aCheckoutSession()`
- **Órdenes y Solicitudes**: `aWorkOrder()`, `aJobRequest()`, `aCategory()`
- **Mensajería**: `aConversation()`, `aConversationDetail()`, `aConversationMessage()`, `aCounterpart()`, `aMessageImage()`
- **Diagnóstico IA**: `aAiConversation()`, `aAiConversationDetail()`, `anAiMessage()`
- **Utilidades API**: `anApiError()`, `aWsTicket()`, `aPresignedUpload()`, `aConfirmedFile()`

### Golden Example: Step Definitions Limpios vs. Prohibidos

```ts
// PROHIBIDO PARA AGENTES: Bloques de 30 líneas de JSON crudo dentro del step
Given("que soy un consumidor autenticado con una propuesta de servicio", async function (this: CustomWorld) {
  await this.addApiStub({
    method: "GET",
    endpoint: "/service-proposals",
    status: 200,
    body: [{ id: 42, amount_cents: 1500000, description: "...", counterpart: { id: 1, ... } }]
  });
});

// OBLIGATORIO PARA AGENTES: Usar Factory + Fluent Helper (Declarativo y legible)
Given("que soy un consumidor autenticado con una propuesta de servicio", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.stubGet("/service-proposals", [aProposal("consumer", { id: 42 })]);
});
```

- **Mocks dinámicos vía cookies**: Usar `addApiStub` y `setMockSession` que inyectan cookies `__e2e_*` por escenario de forma aislada.

## Disciplina de Commits y Pipeline (Regla 1 Commit = 1 Push)

1. **1 Commit = 1 Push Inmediato**: En tareas de reorganización, refactor y features, cada commit atómico debe ser probado y pusheado de inmediato para no acumular deuda en local.
2. **Formato de Commits Limpio**:
   - En tareas de feature / US: `feat[XX]: descripción`
   - En tareas de refactor arquitectónico o BDD transversal: `refactor: <descripción clara sin corchetes de US ni paréntesis>` (ej: `refactor: organize search and discovery bdd features and steps`).
3. **Quality Gates Obligatorios antes de Push**:
   - `npm run lint` (0 errores, 0 warnings)
   - `npx tsc --noEmit && npx tsc --project tsconfig.cucumber.json --noEmit` (0 errores de tipos)
   - `npm run test` (todos los tests unitarios en verde)
   - `make build` (compilación exitosa)
   - `make test-e2e` (todos los escenarios E2E pasando con servidor en puerto 3001)

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
