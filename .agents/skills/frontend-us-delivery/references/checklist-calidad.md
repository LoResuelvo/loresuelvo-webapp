# Checklist Calidad

- Revisión de `frontend-maintainability-governance` resuelta para todo código productivo no trivial.
- Cada símbolo cambiado tiene propósito y razón de cambio reconocibles.
- Funciones y componentes mantienen un nivel de abstracción legible.
- Señales de tamaño o densidad fueron refactorizadas o justificadas; ninguna división existe solo para bajar líneas.
- Hooks tienen estados, efectos, callbacks, dependencias y cleanup con dueños claros.
- API pública mínima, sin opciones, setters, exports ni extensibilidad especulativa.
- Componentes con responsabilidad visual reconocible.
- Tipos explícitos en fronteras API/UI.
- Tests cubren lógica crítica y regresiones.
- Estados de UI completos.
- Un error o transición produce una sola consecuencia visible intencional.
- Sin duplicación que pueda divergir ni abstracciones creadas antes de tener consumidores reales.
- Imports por alias `@/...` cuando mejore claridad.
