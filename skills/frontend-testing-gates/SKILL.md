---
name: frontend-testing-gates
description: "Elegir y ejecutar los gates de calidad de Lo Resuelvo: tests focalizados, E2E, lint, build y monitoreo de CI."
---

# Frontend Testing Gates

Usar durante el desarrollo y antes de cada commit. Esta es la fuente canónica de la matriz de validación.

## Ownership

- El desarrollador ejecuta el gate focalizado tras cada cambio y reporta el resultado.
- El orquestador revisa el diff y reutiliza ese resultado si no hubo cambios posteriores.
- No repetir el mismo comando entre agentes salvo que el resultado sea dudoso, el diff haya cambiado o haga falta un gate más amplio.

## Matriz de gates

| Cambio | Gate local antes de commit |
|---|---|
| Código aislado: helper, dominio, mapper, componente aún no integrado | `npm run test -- <patrón>` y `npx tsc --noEmit` |
| Integración del escenario activo | `make test-e2e-file FILE=features/...feature` |
| Componente, layout, API client o action compartida | `npm run lint`, typecheck, `npm run test`, `npm run build` y `make test-e2e` |
| Cierre de la US | `npm run lint`, typecheck de app y Cucumber, `npm run test`, `npm run build` y `make test-e2e` |

Si un comando falla, corregir la causa raíz y repetir el gate fallido. No crear el commit mientras el gate requerido falle.

## CI remoto

- Tras cada push, registrar el SHA y el run asociado.
- CI se monitorea en paralelo; se pueden preparar y validar nuevos micro-pasos localmente.
- Mantener una ventana configurable de commits pendientes de CI; por defecto, no superar 3.
- Antes de superar la ventana, esperar el run del commit más antiguo.
- Si un run falla, detener nuevos pushes, consultar los logs fallidos y corregir el SHA afectado.

Usar estado resumido para seguimiento y `gh run view <run-id> --log-failed` solo al diagnosticar una falla.

## Seguridad antes de commit

- Sin secretos, tokens ni `.env`.
- Sin logs de datos sensibles.
- Errores de usuario genéricos y en español.
- Actualizar `.env.example` si cambian variables públicas o privadas.
