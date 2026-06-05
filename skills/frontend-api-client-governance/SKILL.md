---
name: frontend-api-client-governance
description: "Gobernanza de integraciones API/frontend en Lo Resuelvo: clientes en lib, contratos TypeScript, Auth0/dev auth, server actions, manejo de errores, websocket tickets y compatibilidad con backend. Usar al crear o modificar endpoints, actions, clients, tipos, auth o flujos de mensajeria/solicitudes."
---

# Frontend API Client Governance

## Arquitectura esperada

- Clientes y tipos compartidos en `lib/` y `lib/api/`.
- Auth en `lib/auth/` y compatibilidad legacy en `lib/auth0.ts`.
- Server Actions cerca de la ruta/componente cuando coordinan UI con backend.
- WebSocket/tickets en `lib/websocket/`, `lib/ws-tickets-client.ts` y `app/api/ws-tickets/route.ts`.

## Flujo

1. Identificar contrato real: endpoint, payload, errores, auth requerida y consumidor UI.
2. Definir/actualizar tipos TypeScript antes de propagar cambios a componentes.
3. Centralizar fetch/base URL/autenticación en cliente existente; no duplicar `fetch` con headers ad hoc.
4. Normalizar errores a mensajes de usuario genéricos en español y detalles técnicos solo para pruebas/logs seguros.
5. Agregar tests del cliente/action antes o junto con cambios de UI.
6. Evitar acoplar componentes a shape crudo del backend: mapear a modelos de vista si la UI lo necesita.

## Reglas

- Nunca hardcodear secretos/tokens/URLs privadas; usar `.env`/`.env.example`.
- No imprimir payloads sensibles en consola.
- Validar inputs de usuario antes de enviarlos.
- Mantener server/client boundary claro: no usar APIs server-only en Client Components.
- Para mensajeria/realtime, manejar reconexión, estados pendientes y fallos de ticket.

## Validacion

1. `npm run test -- <cliente-o-action>` para lógica afectada.
2. `npm run test:e2e` si cambia una feature Gherkin de registro, login, busqueda, solicitud, chat o prestador.
3. `npm run lint` y `npm run build` al cierre de integración significativa.
