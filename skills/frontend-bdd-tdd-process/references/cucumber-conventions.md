# Convenciones de Cucumber y Playwright

Leer esta referencia al crear o modificar step definitions.

## Aislamiento

- Todo step usa `async function (this: CustomWorld, ...)` y opera mediante `this.page`.
- No declarar `let page: Page` ni otro estado de escenario a nivel de módulo.
- Los hooks de browser, context y page se mantienen exclusivamente en `features/support/hooks.ts`.
- El estado temporal del escenario vive en `CustomWorld`.

## Datos y steps

- Mantener cada step como pegamento declarativo y breve.
- Reutilizar factories de `features/support/factories.ts` y helpers de `CustomWorld`.
- No pegar payloads JSON extensos en steps. Usar factories con los overrides mínimos.
- Usar `ROUTES` de `@/lib/routes` para navegar.

## Mocks E2E y protección de producción

- La sesión y los stubs se inyectan por escenario mediante cookies `__e2e_session` y `__e2e_api_stubs_*`.
- Usar los helpers del proyecto que crean esas cookies; no introducir flags `NEXT_PUBLIC_*` para activar mocks en build time.
- `APP_ENV=production`, configurado en `compose.prod.yml`, debe desactivar cualquier bypass de mocks para usuarios reales.
- Mantener el aislamiento por petición y escenario; no usar mocks globales compartidos.

## Hidratación de controles interactivos

En tabs o filtros de componentes cliente, el HTML puede ser visible antes de que React termine de hidratar y conecte handlers. Cuando exista ese riesgo, esperar mediante polling o reintentos a que un estado controlado por el cliente, como `aria-selected`, refleje la interacción antes de buscar elementos hijos.

No usar sleeps arbitrarios ni aplicar esta espera a todas las interacciones: es una protección específica contra carreras de hidratación observadas o previsibles.

## Imágenes en E2E

- Previews o galerías con imágenes mockeadas o dinámicas deben usar `unoptimized` en `<Image />` o declarar el dominio correspondiente en `next.config.ts`.
- Verificar esto cuando una imagen externa pueda disparar el Error Boundary de Next.js durante E2E.
- No commitear rutas absolutas locales como fuentes o fixtures.

## Factories disponibles

- Auth: `aCurrentUser()`, `aConsumer()`, `aProvider()`, `aSession()`.
- Pagos: `aPaymentAccount()`, `aConnectedPaymentAccount()`, `aPaymentAuthorization()`, `aPaymentIntent()`, `aCheckoutSession()`.
- Trabajo: `aWorkOrder()`, `aJobRequest()`, `aCategory()`, `aProposal()`, `aBookingTerms()`.
- Mensajería: `aConversation()`, `aConversationDetail()`, `aConversationMessage()`, `aCounterpart()`, `aMessageImage()`.
- IA y API: `aAiConversation()`, `aAiConversationDetail()`, `anAiMessage()`, `anApiError()`, `aWsTicket()`, `aPresignedUpload()`, `aConfirmedFile()`.

## Patrón preferido

```ts
Given("que soy un consumidor autenticado con una propuesta de servicio", async function (this: CustomWorld) {
  await this.setSession("consumer");
  await this.stubGet("/service-proposals", [aProposal("consumer", { id: 42 })]);
});
```

Evitar bloques de payloads crudos y configuración repetida. Si varios steps requieren la misma preparación, extraer un helper privado en el archivo de steps.
