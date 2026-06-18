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

## Design System — Primitivas disponibles

Al crear o modificar UI, usar siempre las primitivas existentes en `components/ui/` antes de escribir CSS inline:

### Button (`components/ui/button.tsx`)
Variantes CVA disponibles:
- **Variant**: `brand`, `brandSecondary`, `accept`, `danger`, `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
- **Size**: `default`, `xs`, `sm`, `lg`, `icon`, `full` (ancho completo, h-46px), `action` (ancho completo, h-auto con py-3).
- **Regla**: No sobreescribir colores, padding o font-size con className si ya existe una variante que lo cubre. Si necesitás un patrón nuevo que se repite, crear una nueva variante.

### Avatar (`components/ui/avatar.tsx`)
- CVA con sizes: `xs` (36px), `sm` (40px), `md` (48px), `lg` (64px), `xl` (80px).
- Props: `src`, `alt`, `initials`, `imgTestId`, `fallbackTestId`.
- Muestra foto si hay `src`, iniciales si hay `initials`, o ícono User como fallback.

### Modal (`components/ui/modal.tsx`)
- Basado en Radix Dialog. Provee automáticamente: **focus trap, cierre con Escape, bloqueo de scroll del body, rendering en portal.**
- Props: `open`, `onClose`, `title`, `children`, `footer`, `className`, `closeLabel`.
- **OBLIGATORIO**: Usar `Modal` para cualquier overlay/dialog. **Nunca crear modales caseros con `div fixed inset-0`.**

### DetailPanel (`components/shared/DetailPanel.tsx`)
- Componente reutilizable para vistas de detalle: avatar circular con iniciales + nombre + título + descripción.
- Props: `initials`, `name`, `nameExtra`, `title`, `descriptionLabel`, `description`.
- Usar en modales de detalle (RequestDetailModal, JobRequestPanel, etc.).

### InfoBanner (`components/messaging/InfoBanner.tsx`)
- Banner informativo reutilizable con íconos. No crear SVGs inline para banners de información.

### Otros: `Card`, `Badge`, `Input`, `Label`, `Textarea`, `Separator`
- Todos usan CVA y `cn()` para mezclar clases.

## Estandarización de Layout y Componentes (Clean UI)

Al diseñar o refactorizar componentes, es obligatorio seguir estas reglas de estandarización:
1. **Desacoplar Layout interno**: Los componentes de dominio o UI (como `RegistrationForm`, `ProviderCard`, `EmptyState`) NO deben dictar cómo se posicionan por fuera. No uses márgenes externos (`mt-X`, `mb-X`, `mx-auto`), anchos absolutos/máximos (`w-X`, `max-w-X`), ni forzados de alto (`min-h-screen`) dentro de ellos. Delega esa responsabilidad estructural a la página padre (`page.tsx`) o a un layout wrapper.
2. **Propagación segura de className**: Todo componente debe aceptar una prop opcional `className?: string` y mezclarla en su contenedor raíz utilizando la utilidad `cn()` (Tailwind Merge + CLSX):
   `<div className={cn("bg-white rounded-2xl p-4 border...", className)}>`
3. **Primitivas con cva y i18n**: Utiliza componentes de primitivas basados en `cva` para estandarizar variantes y evitar reescribir divs genéricos con sombras y bordes. Todo texto visible debe ir en `infrastructure/i18n/translations.ts`.
4. **Un componente principal por archivo**: No exportar múltiples componentes complejos del mismo archivo.

## i18n — Textos visibles

- **Todo texto visible al usuario debe estar en `infrastructure/i18n/translations.ts`.**
- Importar con `import { t } from "@/infrastructure/i18n/translations"`.
- No hardcodear strings en español en componentes — usar `t.seccion.clave`.
- Las claves están organizadas por sección: `home`, `messaging`, `header`, `consumerSearch`, `providerHome`, `onboarding`.

## Checklist UI/UX

- CTA primario inequívoco y cerca del contexto de decision.
- Titulos con jerarquia clara; texto secundario no compite con acciones.
- Cards con agrupacion semantica: identidad, beneficio, evidencia, accion.
- Iconos acompañados por texto o `aria-label` si son icon-only.
- Contraste legible en fondos con gradientes/glows.
- Espaciado consistente; evitar pantallas densas o demasiado vacias.
- Microcopy en español, centralizado en `translations.ts`, concreto y accionable.
- Formularios con labels, ayuda y errores cerca del campo.

## Restricciones tecnicas

1. No introducir librerias visuales, fuentes o assets externos sin justificarlo.
2. Preferir Tailwind y componentes existentes (`Button`, `Card`, `Avatar`, `Modal`, `Input`, `Label`, `Separator`, `AmbientGlows`, `DetailPanel`, `InfoBanner`).
3. No degradar SSR ni convertir Server Components en Client Components sin necesidad real.
4. Variables, funciones, tipos y comentarios nuevos deben seguir el idioma predominante del archivo; UI visible en español.
5. Evitar efectos visuales que oculten estados de negocio o errores.
6. No sobreescribir masivamente las clases de las primitivas — si un patrón se repite, crear una variante CVA.

## Validacion recomendada

1. Ejecutar prueba focalizada si existe: `npm run test -- <patron>`.
2. Ejecutar `npm run lint` al cerrar una tanda significativa.
3. Ejecutar `npm run build` si el cambio toca SSR/routing/config o se entrega una pantalla completa.
4. Ejecutar `npm run test:e2e` si el flujo de navegador cambió y hay feature Gherkin asociada.
