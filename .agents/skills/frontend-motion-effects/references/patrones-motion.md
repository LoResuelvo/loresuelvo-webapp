# Patrones Motion

- Botones: `transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0` y foco visible.
- Cards: entrada sutil con opacity/translate, sin bloquear interacción.
- Modales: backdrop fade + panel translate/scale corto; cerrar con Escape y retornar foco.
- Listas/mensajes: evitar animar altura repetidamente; preferir opacity en nuevos elementos.
- Reduced motion: envolver animaciones no esenciales con `motion-safe:` y proveer estado final claro.
