---
name: frontend-accessibility-gates
description: "Checklist operativo de accesibilidad para componentes y flujos frontend: foco, teclado, semantica, formularios, dialogos, menus, estados interactivos y mensajes de error. Usar al crear o cerrar UI interactiva."
---

# Frontend Accessibility Gates

Aplicar cuando la tarea toque formularios, botones, links, modales, banners, mensajeria, navegación, onboarding o cualquier interacción.

## Gates minimos

1. Navegacion por teclado: `Tab`, `Shift+Tab`, `Enter`, `Space`; `Escape` en overlays.
2. Foco visible y retorno de foco al cerrar modales/drawers.
3. Semantica correcta: `button` para acciones, `Link`/`a` para navegación.
4. ARIA solo cuando mejora semantica: `aria-expanded`, `aria-controls`, `aria-current`, `aria-describedby`, `aria-live`.
5. Estados `loading`, `error`, `empty`, `disabled`, `success` entendibles sin depender solo del color.
6. Icon-only actions con `aria-label`.

## Modales y Overlays

- **Usar siempre `<Modal>` de `components/ui/modal.tsx`** (basado en Radix Dialog).
- El componente `Modal` provee automáticamente:
  - ✅ Focus trap (el usuario no puede tabear fuera del modal)
  - ✅ Cierre con tecla Escape
  - ✅ Bloqueo de scroll del body
  - ✅ Rendering en portal (evita problemas de z-index)
  - ✅ `role="dialog"` y `aria-modal="true"` automáticos
  - ✅ Retorno de foco al cerrar
- **Nunca crear modales caseros** con `div fixed inset-0` — les falta focus trap, Escape, scroll lock.
- Props disponibles: `open`, `onClose`, `title`, `titleId`, `closeLabel`, `children`, `footer`, `className`.

## Formularios

- Todo campo tiene label accesible.
- Error asociado al campo o visible junto al control.
- Mensajes en español, centralizados en `infrastructure/i18n/translations.ts`.
- Botones deshabilitados explican el motivo cuando el bloqueo no es obvio.

## Mensajeria y cambios asincronos

- Nuevos errores o confirmaciones importantes usan region anunciable si no son visibles por foco.
- Inputs de chat conservan foco al enviar salvo navegación intencional.
- No mover foco inesperadamente durante polling/websocket/refetch.

## Banners informativos

- Usar `InfoBanner` (`components/messaging/InfoBanner.tsx`) para mensajes informativos y warnings.
- No crear SVGs inline para banners — reutilizar componentes existentes.

## Identificadores de test

- Usar `data-testid` para testing — no `data-field` ni atributos custom sin documentar.
- Cada elemento interactivo relevante debe tener un `data-testid` o ser consultable por rol/label.

## Validacion recomendada

1. Agregar tests RTL para apertura/cierre, labels, roles, errores y estados bloqueados.
2. Ejecutar prueba focalizada: `npm run test -- <archivo-o-patron>`.
3. Ejecutar `npm run lint`.
4. Ejecutar `npm run test:e2e` si el cambio toca flujo Gherkin de navegador.
