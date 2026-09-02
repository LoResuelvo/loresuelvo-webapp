---
name: frontend-accessibility-gates
description: "Validar accesibilidad de interacciones, formularios, diálogos y estados de Lo Resuelvo."
---

# Frontend Accessibility Gates

Usar al crear o modificar formularios, botones, links, modales, menús, banners, mensajería o navegación interactiva.

## Gates

- Navegación usable con `Tab`, `Shift+Tab`, `Enter`, `Space` y `Escape` cuando aplique.
- Foco visible y retorno de foco al cerrar un diálogo.
- Semántica correcta: botones para acciones y links para navegación.
- ARIA solo cuando agrega significado; acciones solo con ícono tienen nombre accesible.
- Loading, error, empty, disabled y success deben entenderse sin depender solo del color.
- Los campos tienen label, ayuda o error asociado, y las confirmaciones o errores asíncronos se anuncian cuando el foco no los revela.

## Componentes

- Usar `Modal` para diálogos y overlays; no recrear manualmente focus trap, Escape, portal o scroll lock.
- Usar `InfoBanner` para avisos reutilizables cuando corresponda.
- Mantener textos visibles en las traducciones del proyecto.

## Validación

- Agregar tests RTL o E2E cuando la interacción cambie.
- Seleccionar el gate de `frontend-testing-gates` según el alcance.
