---
name: frontend-query-governance
description: "Gobernanza de React Query en Lo Resuelvo: query keys, cache, invalidaciones, enabled guards, placeholders y prevención de requests redundantes. Usar al crear o modificar hooks de datos, mutaciones, refetch o sincronización cliente-servidor."
---

# Frontend Query Governance

## Objetivo

Mantener cache predecible e invalidaciones trazables con `@tanstack/react-query`.

## Reglas

1. Crear query keys canonicas en un módulo compartido si aparecen más de una vez; evitar arrays inline repetidos.
2. Normalizar parametros usados en keys (IDs, texto de busqueda, filtros).
3. Usar `enabled` para no llamar APIs con parametros vacios o auth incompleta.
4. Invalidar con menor alcance razonable: detalle, lista del dominio o raiz del dominio.
5. No reemplazar invalidaciones con `refetch` manual salvo dependencia local justificada.
6. Mantener hooks de datos fuera de componentes presentacionales cuando crezcan.
7. Documentar policies compartidas (`staleTime`, refetch) si se vuelven reglas de dominio.

## Flujo

1. Identificar dominio: proveedores, solicitudes, conversaciones, mensajes, dashboard prestador, auth/onboarding.
2. Revisar clientes existentes en `lib/` antes de crear hooks nuevos.
3. Definir key + función fetch + estados UI.
4. Agregar tests de no-request con parametros invalidos e invalidacion esperada cuando el comportamiento sea critico.
5. Ejecutar prueba focalizada, `npm run lint` y build si toca SSR/routing.

## Checklist de cierre

- No hay keys productivas duplicadas en el área tocada.
- Las mutaciones actualizan o invalidan cache de forma explícita.
- Los componentes muestran loading/error/empty sin flicker innecesario.
- No se disparan requests redundantes por cambios de referencia no normalizados.
