---
name: frontend-motion-effects
description: "Aplicar animaciones, transiciones y microinteracciones en Lo Resuelvo con proposito, accesibilidad y performance. Usar cuando se pidan efectos visuales, feedback animado, transiciones de estado, hover/press, entradas de cards, modales o mensajes."
---

# Frontend Motion Effects

Leer primero `skills/frontend-design/SKILL.md`. Si hay formularios/overlays, leer tambien `skills/frontend-accessibility-gates/SKILL.md`.

## Principios

1. Toda animacion debe tener motivo: feedback, transición, guía de atención o delight contextual.
2. Respetar `prefers-reduced-motion`.
3. Priorizar `transform` y `opacity`; evitar animar layout.
4. No introducir librerias nuevas sin justificación clara.
5. Pocas animaciones orquestadas valen más que muchos efectos dispersos.

## Estrategia

1. Detectar estados abruptos: loading, empty, error, modal open/close, envio de mensaje, aceptación de solicitud.
2. Definir capas:
   - feedback: hover, press, focus, loading;
   - transición: show/hide, tabs, listas, modales;
   - hero moment: una animación memorable por pantalla si aporta valor.
3. Implementar con CSS/Tailwind y utilidades existentes.
4. Mantener fallback usable con reduced motion.

## Validacion

- Desktop y mobile sin jank.
- Teclado y foco correctos si hay overlays.
- Pruebas afectadas en verde.
- `npm run lint`; `npm run build` si toca SSR/routing o cierre de feature.
