---
name: frontend-api-client-governance
description: "Gobernanza de integraciones API y lógica de negocio bajo Clean Architecture: contratos en ports/, lógica en application/, mappers y adaptadores en infrastructure/. Usar al crear o modificar endpoints, mappers, servicios, casos de uso, tipos, auth o flujos de mensajería/solicitudes."
---

# Frontend API Client Governance (Clean Architecture)

## Arquitectura esperada

- **Contratos/Interfaces**: Definidos exclusivamente en `ports/` (ej. `ports/conversation-repository.ts`).
- **Lógica de Negocio/Casos de Uso**: Definidos en `application/` (ej. `application/messaging/get-conversations.ts`), orquestando llamadas a las interfaces de `ports/` y aplicando reglas del dominio (`domain/`).
- **Implementación Concreta/Infraestructura**: Definida en `infrastructure/` (ej. `infrastructure/repositories/api-conversation-repository.ts`), realizando las llamadas a la red/base de datos y transformando DTOs a modelos de dominio mediante mappers.
- **Autenticación**: Interfaces en `ports/auth-service.ts` y adaptadores (como Auth0 y de desarrollo) en `infrastructure/auth/`.
- **Mensajería en Tiempo Real**: WebSocket en `infrastructure/websocket/` e integraciones API correspondientes.

## Flujo de Integración

1. **Definir el Contrato**: Identificar el endpoint/servicio a consumir y crear su interfaz TypeScript en `ports/`.
2. **Definir Tipos del Dominio**: Asegurarse de que los modelos de negocio estén en `domain/`. No usar tipos de DTO crudos de la API en los componentes de UI.
3. **Crear o Modificar Caso de Uso**: Añadir funciones en `application/` que orquesten la operación utilizando el puerto correspondiente.
4. **Implementar el Adaptador en Infraestructura**: Escribir la llamada de red o persistencia real en `infrastructure/`. Implementar mappers en el mismo adaptador para convertir la respuesta JSON del servidor a las interfaces puras de `domain/`.
5. **Escribir Pruebas**: Crear tests unitarios en inglés para el caso de uso (`application/**/*.test.ts`) mockeando sus dependencias en `ports/`, y para los mappers en `infrastructure/**/*.test.ts`.
6. **Conectar con la UI**: Consumir el caso de uso en componentes o Server Actions inyectando el adaptador adecuado de `infrastructure/`.

## Reglas Críticas

- **Sin Acoplamiento Inverso**: Las carpetas `domain/` y `ports/` no deben importar nada de capas externas bajo ninguna circunstancia.
- **Sin fetch ad-hoc**: No duplicar llamadas `fetch` ni armar encabezados de autorización ad-hoc. Utilizar el cliente centralizado en la infraestructura.
- **Errores Amigables**: Normalizar los errores provenientes del backend a mensajes genéricos legibles por el usuario en español.
- **Sin Secretos**: Nunca hardcodear secretos, tokens ni URLs de servidores; usar siempre variables de entorno.

## Validación

1. `npm run test -- <archivo-de-test>` para verificar unitariamente la lógica nueva o modificada.
2. `npm run test:e2e` para validar la paridad de flujos funcionales completos.
3. `npm run lint` y `npm run build` para asegurar la integridad de tipos y compilación limpia del proyecto.
