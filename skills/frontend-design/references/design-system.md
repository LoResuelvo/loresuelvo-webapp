# Sistema de diseño de Lo Resuelvo

## Primitivas

- Las definiciones CVA en el código de cada primitiva son la fuente canónica de variantes y tamaños. Inspeccionar el componente antes de usarlo; no mantener un catálogo duplicado en esta skill.
- Usar variantes existentes antes de sobrescribir color, padding, tamaño o tipografía.
- Si un patrón visual faltante se repite, agregar una variante CVA con nombre semántico; para un caso aislado, componer con `className` sin duplicar la primitiva.
- `Avatar`: reutilizar sus tamaños y fallbacks existentes.
- `Modal`: usarlo para overlays y diálogos; ofrece focus trap, Escape, scroll lock y portal.
- `DetailField`, `DetailPanel` e `InfoBanner`: reutilizar para metadatos, detalles y avisos antes de recrear estructuras equivalentes.

## Tipografía y layout

- Usar tokens tipográficos definidos en `app/globals.css`; evitar tamaños arbitrarios si existe un token semántico.
- Los componentes de dominio no definen el layout externo de la página; el wrapper o la ruta decide márgenes y anchos.
- Propagar `className` cuando el componente necesite composición visual externa.

## Imágenes

- En previews o galerías con imágenes mockeadas o dinámicas, usar `unoptimized` en `<Image />` o declarar el dominio correspondiente en `next.config.ts` para evitar Error Boundaries durante E2E.
- No usar rutas absolutas locales como fuentes o fixtures commiteados.

## Patrones por contexto

- Mensajería: distinguir visualmente mensajes recibidos y emitidos; truncar textos largos cuando haya una vista de detalle.
- Pagos o presupuestos: mostrar el desglose de importes cuando el flujo lo requiera.
- Formularios: labels, ayuda y errores cerca del campo; cargar `frontend-accessibility-gates`.
