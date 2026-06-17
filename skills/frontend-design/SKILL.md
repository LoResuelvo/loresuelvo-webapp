---
name: frontend-design
description: "Guia para diseñar o rediseñar interfaces Next.js/React de Lo Resuelvo con calidad profesional, jerarquia visual, UX clara, estados completos, accesibilidad y coherencia con Tailwind/shadcn. Usar en pantallas nuevas, landing, home de consumidor/prestador, formularios, cards, dashboards, mensajeria o mejoras visuales."
---

# Frontend Design

Usar esta skill cuando la tarea principal sea elevar la calidad visual o UX de una interfaz.

## Norte de producto

1. Resolver rapido: la UI debe reducir friccion entre consumidor y prestador.
2. Inspirar confianza: servicios, perfiles, solicitudes y mensajes deben sentirse claros, seguros y profesionales.
3. Comunicar estado: cada accion asincrona debe tener feedback visible.
4. Mantener consistencia: reutilizar `components/ui`, layout existente y tokens Tailwind antes de inventar patrones.

## Flujo operativo

1. Identificar usuario, objetivo principal y CTA primario de la pantalla.
2. Auditar la UI existente: jerarquia, densidad, contraste, responsive, estados y microcopy.
3. Definir una direccion visual concreta antes de codificar: tono, composicion, elemento memorable y estructura responsive.
4. Implementar en componentes pequeños, con nombres descriptivos y cohesion alta.
5. Cubrir estados `loading`, `empty`, `error`, `disabled`, `success` y permisos/roles cuando apliquen.
6. Validar desktop y mobile; combinar con `frontend-mobile-responsive` si hay breakpoints relevantes.
7. Combinar con `frontend-accessibility-gates` si hay formularios, modales, menus, overlays o flujos por teclado.

## Estandarización de Layout y Componentes (Clean UI)

Al diseñar o refactorizar componentes, es obligatorio seguir estas reglas de estandarización:
1. **Desacoplar Layout interno**: Los componentes de dominio o UI (como `RegistrationForm`, `ProviderCard`, `EmptyState`) NO deben dictar cómo se posicionan por fuera. No uses márgenes externos (`mt-X`, `mb-X`, `mx-auto`), anchos absolutos/máximos (`w-X`, `max-w-X`), ni forzados de alto (`min-h-screen`) dentro de ellos. Delega esa responsabilidad estructural a la página padre (`page.tsx`) o a un layout wrapper.
2. **Propagación segura de className**: Todo componente debe aceptar una prop opcional `className?: string` y mezclarla en su contenedor raíz utilizando la utilidad `cn()` (Tailwind Merge + CLSX):
   `<div className={cn("bg-white rounded-2xl p-4 border...", className)}>`
3. **Primitivas con cva y i18n**: Utiliza componentes de primitivas (ej. `<Card />`, `<Badge />`, `<Avatar />`) basados en `cva` para estandarizar variantes y evitar reescribir divs genéricos con sombras y bordes una y otra vez. Asimismo, evita textos hardcodeados (magic strings) moviéndolos siempre a `infrastructure/i18n/translations.ts`.

## Checklist UI/UX

- CTA primario inequívoco y cerca del contexto de decision.
- Titulos con jerarquia clara; texto secundario no compite con acciones.
- Cards con agrupacion semantica: identidad, beneficio, evidencia, accion.
- Iconos acompañados por texto o `aria-label` si son icon-only.
- Contraste legible en fondos con gradientes/glows.
- Espaciado consistente; evitar pantallas densas o demasiado vacias.
- Microcopy en español, concreto y accionable.
- Formularios con labels, ayuda y errores cerca del campo.

## Restricciones tecnicas

1. No introducir librerias visuales, fuentes o assets externos sin justificarlo.
2. Preferir Tailwind y componentes existentes (`button`, `card`, `input`, `label`, `separator`, `AmbientGlows`).
3. No degradar SSR ni convertir Server Components en Client Components sin necesidad real.
4. Variables, funciones, tipos y comentarios nuevos deben seguir el idioma predominante del archivo; UI visible en español.
5. Evitar efectos visuales que oculten estados de negocio o errores.

## Validacion recomendada

1. Ejecutar prueba focalizada si existe: `npm run test -- <patron>`.
2. Ejecutar `npm run lint` al cerrar una tanda significativa.
3. Ejecutar `npm run build` si el cambio toca SSR/routing/config o se entrega una pantalla completa.
4. Ejecutar `npm run test:e2e` si el flujo de navegador cambió y hay feature Gherkin asociada.
