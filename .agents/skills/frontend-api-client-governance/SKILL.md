---
name: frontend-api-client-governance
description: "Integrar APIs, Server Actions y datos externos de Lo Resuelvo respetando Clean Architecture y fronteras tipadas."
---

# Frontend API Client Governance

Usar al crear o modificar endpoints, mappers, repositorios, casos de uso, auth, Server Actions o integraciones en tiempo real.

## Flujo de datos

```text
API DTO snake_case
→ infrastructure/api/types.ts
→ mapper en infrastructure/repositories/
→ modelo de dominio camelCase
→ port
→ application use case
→ Server Action o UI
```

- Los DTOs viven solo en `infrastructure/api/types.ts`.
- Los puertos usan tipos de dominio y no conocen DTOs.
- Los casos de uso orquestan puertos y propagan errores; no devuelven silenciosamente valores vacíos ante un fallo.
- La infraestructura implementa puertos, centraliza llamadas de red y transforma los datos externos.
- No consumir DTOs ni hacer `fetch` ad hoc desde componentes o casos de uso.

## Errores y Server Actions

- Una Server Action que cruza la frontera hacia el cliente captura excepciones y devuelve un resultado tipado, con mensaje seguro para el usuario.
- Usar `catch (error: unknown)`.
- La UI decide entre estados empty, error y retry; el caso de uso no oculta el error.
- Textos de error visibles usan claves de `infrastructure/i18n/translations.ts`.

## Validación

- Testear mappers y casos de uso de manera aislada.
- Ejecutar el gate que corresponda según `frontend-testing-gates`.
- Cargar `frontend-domain-governance` solo si el cambio introduce invariantes de negocio.

Leer [patrones de integración](references/integration-patterns.md) cuando se diseñen DTOs, mappers o resultados de Server Actions.
