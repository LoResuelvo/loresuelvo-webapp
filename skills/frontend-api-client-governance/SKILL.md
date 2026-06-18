---
name: frontend-api-client-governance
description: "Gobernanza de integraciones API y lógica de negocio bajo Clean Architecture: contratos en ports/, lógica en application/, mappers y adaptadores en infrastructure/. Usar al crear o modificar endpoints, mappers, servicios, casos de uso, tipos, auth o flujos de mensajería/solicitudes."
---

# Frontend API Client Governance (Clean Architecture)

## Arquitectura esperada

- **Contratos/Interfaces**: Definidos exclusivamente en `ports/` (ej. `ports/conversation-repository.ts`). Los tipos en ports deben usar tipos del dominio (camelCase), no DTOs de la API.
- **Lógica de Negocio/Casos de Uso**: Definidos en `application/` (ej. `application/messaging/get-conversations.ts`), orquestando llamadas a las interfaces de `ports/` y aplicando reglas del dominio (`domain/`).
- **Implementación Concreta/Infraestructura**: Definida en `infrastructure/` (ej. `infrastructure/repositories/api-conversation-repository.ts`), realizando las llamadas a la red/base de datos y transformando DTOs a modelos de dominio mediante mappers.
- **Autenticación**: Interfaces en `ports/auth-service.ts` y adaptadores (como Auth0 y de desarrollo) en `infrastructure/auth/`.
- **Mensajería en Tiempo Real**: WebSocket en `infrastructure/websocket/` e integraciones API correspondientes.

## Separación de DTOs vs Dominio

Esta es una regla estricta del proyecto:

1. **DTOs del backend** (snake_case): viven **exclusivamente** en `infrastructure/api/types.ts` (ej: `ApiProvider`, `ApiConversation`, `ApiConversationMessage`).
2. **Tipos de dominio** (camelCase): viven en `domain/` (ej: `Provider` con `categoryName`, `ConversationDetailInfo` con `updatedOn`).
3. **Mappers**: viven en `infrastructure/repositories/` (ej: `provider-mapper.ts`, `conversation-mapper.ts`) y transforman `ApiXxx → DomainXxx`.
4. **Nunca** consumir DTOs directamente en componentes UI ni en `application/`.

### Ejemplo de flujo correcto

```
API Backend (snake_case JSON)
  → infrastructure/api/types.ts (ApiProvider: category_name)
  → infrastructure/repositories/provider-mapper.ts (mapApiToProvider)
  → domain/provider/types.ts (Provider: categoryName)
  → ports/provider-repository.ts (contrato con tipo Provider)
  → application/consumer/search-providers.ts (use case)
  → components/ (UI)
```

## Flujo de Integración

1. **Definir el Contrato**: Identificar el endpoint/servicio a consumir y crear su interfaz TypeScript en `ports/` usando tipos de dominio (camelCase).
2. **Definir Tipos del Dominio**: Asegurarse de que los modelos de negocio estén en `domain/` con camelCase puro. Si el backend usa snake_case, definir el DTO correspondiente en `infrastructure/api/types.ts`.
3. **Crear o Modificar Caso de Uso**: Añadir funciones en `application/` que orquesten la operación utilizando el puerto correspondiente. **No atrapar errores silenciosamente** — propagar la excepción.
4. **Implementar el Adaptador en Infraestructura**: Escribir la llamada de red en `infrastructure/`. Crear o actualizar mappers para convertir la respuesta JSON del servidor (snake_case) a las interfaces puras de `domain/` (camelCase).
5. **Escribir Pruebas**: Crear tests unitarios en inglés para el caso de uso (`application/**/*.test.ts`) mockeando sus dependencias en `ports/`, y para los mappers en `infrastructure/**/*.test.ts`.
6. **Conectar con la UI**: Consumir el caso de uso en componentes o Server Actions inyectando el adaptador adecuado de `infrastructure/`.

## Manejo de Errores

- **Use cases NO deben tragar errores** con `console.error + return []`. Deben propagar la excepción.
- La decisión de mostrar un empty state vs error state es responsabilidad de la UI, no del use case.
- Excepciones permitidas: use cases que devuelven un tipo `Result` explícito (ej: `createWorkRequest` con `{ success: true, data }` o `{ success: false, errorCode, message }`).
- Usar `catch (error: unknown)` en vez de `catch (error: any)` — TypeScript strict.

## Reglas Críticas

- **Sin Acoplamiento Inverso**: Las carpetas `domain/` y `ports/` no deben importar nada de capas externas bajo ninguna circunstancia.
- **Sin DTOs en el dominio**: Nunca definir tipos con snake_case en `domain/` ni en `ports/`.
- **Sin fetch ad-hoc**: No duplicar llamadas `fetch` ni armar encabezados de autorización ad-hoc. Utilizar el cliente centralizado en la infraestructura.
- **Errores Amigables**: Normalizar los errores provenientes del backend a mensajes genéricos legibles por el usuario en español, usando claves de `infrastructure/i18n/translations.ts`.
- **Sin Secretos**: Nunca hardcodear secretos, tokens ni URLs de servidores; usar siempre variables de entorno.

## Mappers existentes (referencia)

| Mapper | Ubicación | Transforma |
|--------|-----------|------------|
| `mapApiToProvider` | `infrastructure/repositories/provider-mapper.ts` | `ApiProvider` → `Provider` |
| Conversation mapper | `infrastructure/repositories/conversation-mapper.ts` | `ApiConversation` → `ConversationContact` |
| Work request transform | `infrastructure/repositories/api-provider-home-repository.ts` | `ApiWorkRequest` → `ProviderWorkRequest` |

## Validación

1. `npm run test -- <archivo-de-test>` para verificar unitariamente la lógica nueva o modificada.
2. `npm run test:e2e` para validar la paridad de flujos funcionales completos.
3. `npm run lint` y `npm run build` para asegurar la integridad de tipos y compilación limpia del proyecto.
