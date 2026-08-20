---
name: frontend-design
description: "Guia para diseñar o rediseñar interfaces Next.js/React de Lo Resuelvo con calidad profesional, jerarquia visual, UX clara, estados completos, accesibilidad y coherencia con Tailwind/shadcn. Usar en pantallas nuevas, landing, home de consumidor/prestador, formularios, cards, dashboards, mensajeria o mejoras visuales."
---

# Frontend Design

Usar esta skill cuando la tarea principal sea elevar la calidad visual o UX de una interfaz.

## Norte de producto y excelencia de diseño

1. **Resolver rápido:** la UI debe reducir fricción entre consumidor y prestador.
2. **Inspirar confianza:** servicios, perfiles, solicitudes y mensajes deben sentirse claros, seguros y profesionales.
3. **Comunicar estado:** cada acción asíncrona debe tener feedback visible (loading, empty, error, disabled, success).
4. **Mantener consistencia:** reutilizar `components/ui`, layout existente y tokens Tailwind antes de inventar patrones.
5. **Legibilidad antes que optimización prematura (KISS):** priorizar código simple, declarativo y fácil de leer y testear por sobre sobre-ingeniería o micro-optimizaciones innecesarias.

## Principios de Calidad Visual e Interacción (UI/UX)

1. **Jerarquía Visual y Escaneo Rápido:**
   - La pantalla debe entenderse en 3 segundos: *Título -> Dato clave destacado (monto/estado) -> Acción primaria (CTA).*
   - Usar peso tipográfico (`font-semibold`, `font-bold`) y tonos de color antes que tamaños de fuente gigantes.
2. **Restricción Semántica de Color (Anti-Rainbow):**
   - Máximo 2 familias de color por bloque: 1 neutro/marca (`brand-primary`, `slate`) y 1 semántico para estados (`warning` ámbar, `success` verde, `destructive` rojo).
   - No usar colores de estado en títulos o elementos neutrales.
3. **Patrones de Chat y Mensajería (Conversational UX):**
   - **Alineación por Rol:** Mensajes/tarjetas recibidos a la izquierda (`justify-start`, `rounded-tl-sm`), mensajes/tarjetas emitidos a la derecha (`justify-end`, `rounded-tr-sm`).
   - **Truncamiento de texto:** Descripciones largas siempre con `line-clamp-2` o `line-clamp-3` y apertura de modal para ver detalle completo.
   - **Hora obligatoria:** Todo mensaje o tarjeta de propuesta debe incluir la hora de emisión al pie.
4. **Patrones Financieros y de Señas (Transparencia de Costos):**
   - En flujos de pago o presupuestos, mostrar siempre el desglose claro: Total pactado, Seña a pagar online y Saldo restante en destino.
   - Incorporar sellos o indicadores de confianza y seguridad (Mercado Pago, SSL).
5. **Preservación de Contratos de Testing:**
   - Al rediseñar o reemplazar componentes, **nunca eliminar `data-testid`, roles ARIA o textos clave** que consumen los escenarios de Cucumber o tests de Vitest.

## Flujo operativo

1. Identificar usuario, objetivo principal y CTA primario de la pantalla.
2. Auditar la UI existente: jerarquía, densidad, contraste, responsive, estados y microcopy.
3. Definir una dirección visual concreta antes de codificar: tono, composición, elemento memorable y estructura responsive.
4. Implementar en componentes pequeños, con nombres descriptivos y cohesión alta.
5. Cubrir estados `loading`, `empty`, `error`, `disabled`, `success` y permisos/roles cuando apliquen.
6. Validar desktop y mobile; combinar con `frontend-mobile-responsive` si hay breakpoints relevantes.
7. Combinar con `frontend-accessibility-gates` si hay formularios, modales, menús, overlays o flujos por teclado.

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

### DetailField (`components/ui/detail-field.tsx`)
- Componente atómico para mostrar pares clave-valor contractuales y metadatos con ícono (monto, fecha, rubro, estado).
- **Variantes CVA**: `default` (caja neutra para metadatos), `highlight` (monto o dato principal), `compact` (versión densa).
- **PROHIBIDO**: Duplicar bloques de 15 líneas de HTML (caja gris + ícono en cuadrado blanco + label uppercase + valor).
- **OBLIGATORIO**: Usar `<DetailField icon={<DollarSign className="..." />} label={t.section.amountLabel} value={formattedValue} variant="highlight" />`.

### DetailPanel (`components/shared/DetailPanel.tsx`)
- Componente reutilizable para vistas de detalle: avatar circular con iniciales + nombre + título + descripción.
- Props: `initials`, `name`, `nameExtra`, `title`, `descriptionLabel`, `description`.
- Usar en modales de detalle (RequestDetailModal, JobRequestPanel, etc.).

### InfoBanner (`components/messaging/InfoBanner.tsx`)
- Banner informativo reutilizable con íconos. No crear SVGs inline para banners de información.

### Otros: `Card`, `Badge`, `Input`, `Label`, `Textarea`, `Separator`
- Todos usan CVA y `cn()` para mezclar clases.

## 🔤 Escala Tipográfica Obligatoria (Prohibido `text-[...px]`)

Para garantizar coherencia y evitar código espagueti visual, **está terminantemente prohibido usar clases arbitrarias con corchetes (ej. `text-[11px]`, `text-[15px]`, `text-[17px]`)**. Usar siempre los tokens semánticos configurados en `@theme` dentro de `app/globals.css`:

- **`text-caption`** (11px, 0.6875rem): Labels en uppercase, timestamps, badges y micro-etiquetas.
- **`text-small`** (12px, 0.75rem): Metadatos secundarios, helpers de inputs, subtítulos de tarjetas.
- **`text-body-sm`** (13px, 0.8125rem): Cuerpo de texto compacto.
- **`text-body`** (14px, 0.875rem): Cuerpo de texto por defecto, descripciones y campos de formulario.
- **`text-body-lg`** (15px, 0.9375rem): Fechas programadas, valores enfatizados y montos intermedios.
- **`text-subtitle`** (18px, 1.125rem): Subtítulos de sección y encabezados de tarjetas.
- **`text-title`** (24px, 1.5rem): Títulos principales de modales y cabeceras de página.
- **`text-heading`** (26px, 1.625rem): Encabezados de landing y héroes.

## Estandarización de Layout y Componentes (Clean UI)

Al diseñar o refactorizar componentes, es obligatorio seguir estas reglas de estandarización:
1. **Desacoplar Layout interno**: Los componentes de dominio o UI (como `RegistrationForm`, `ProviderCard`, `EmptyState`) NO deben dictar cómo se posicionan por fuera. No uses márgenes externos (`mt-X`, `mb-X`, `mx-auto`), anchos absolutos/máximos (`w-X`, `max-w-X`), ni forzados de alto (`min-h-screen`) dentro de ellos. Delega esa responsabilidad estructural a la página padre (`page.tsx`) o a un layout wrapper.
2. **Propagación segura de className**: Todo componente debe aceptar una prop opcional `className?: string` y mezclarla en su contenedor raíz utilizando la utilidad `cn()` (Tailwind Merge + CLSX):
   `<div className={cn("bg-white rounded-2xl p-4 border...", className)}>`
3. **Variantes con CVA**: Utilizar `cva` (`class-variance-authority`) para encapsular variantes de estado, tamaño y énfasis visual, en lugar de concatenar condicionales manuales con `className` sueltos.
4. **Primitivas y i18n**: Usar las primitivas atómicas de `components/ui/` (`DetailField`, `Badge`, `Button`, `Modal`) para evitar reescribir divs genéricos. Todo texto visible debe ir en `infrastructure/i18n/translations.ts`.
5. **Un componente principal por archivo**: No exportar múltiples componentes complejos del mismo archivo.

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
