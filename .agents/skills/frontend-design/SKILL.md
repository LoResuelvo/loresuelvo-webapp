---
name: frontend-design
description: "Diseñar o rediseñar pantallas de Lo Resuelvo con jerarquía visual, UX clara y consistencia con el sistema existente."
---

# Frontend Design

Usar cuando la tarea principal sea diseñar o mejorar una interfaz. No cargar para cambios de lógica sin impacto visual.

## Criterios

- Priorizar una CTA clara, jerarquía comprensible y feedback visible para acciones asíncronas.
- Reutilizar primitivas, tokens y patrones existentes antes de crear estilos o componentes nuevos.
- Diseñar estados loading, empty, error, disabled y success cuando apliquen.
- Mantener contraste, semántica, responsive e i18n; cargar accesibilidad o responsive si el cambio lo requiere.
- Preservar roles, textos y selectores que usen tests existentes.
- No introducir librerías, fuentes o assets externos sin necesidad concreta.

## Flujo

1. Identificar usuario, objetivo y CTA de la pantalla.
2. Revisar el patrón existente y definir una dirección visual concreta.
3. Implementar la mínima UI coherente con el escenario activo.
4. Validar visualmente y cerrar la frontera mediante `delivery_prepare` según `frontend-testing-gates`; no seleccionar ni ejecutar manualmente sus checks.

Leer [sistema de diseño](references/design-system.md) cuando se necesiten primitivas, tipografía o patrones de mensajería y pagos.
