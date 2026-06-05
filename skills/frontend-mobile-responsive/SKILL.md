---
name: frontend-mobile-responsive
description: "Diagnosticar y corregir layouts mobile/tablet/desktop en Lo Resuelvo sin degradar la UI existente. Usar cuando una pantalla se vea cortada, desbalanceada, demasiado densa, con overflow, stacking incorrecto o mala jerarquia responsive."
---

# Frontend Mobile Responsive

## Objetivo

Corregir problemas responsive con cambios locales, mobile-first y testeables, conservando desktop.

## Flujo

1. Reproducir el breakpoint exacto afectado.
2. Ubicar el componente responsable, no parchear globalmente salvo que el problema sea de tokens/base CSS.
3. Detectar causa: ancho, grid/flex, overflow, gap, texto largo, botones agrupados, imagen/asset, sidebar/header o modal.
4. Ajustar primero mobile (`base`) y restaurar comportamiento desde `sm`, `md`, `lg` según corresponda.
5. Verificar roles: consumidor, prestador, visitante y formularios de registro/onboarding si aplican.

## Heuristicas

- Preferir CSS/Tailwind a listeners JS de resize.
- Usar `min-w-0`, `overflow-hidden`, `break-words` para textos dentro de flex/grid.
- Usar `mx-auto`, `max-w-*`, `w-full` para compactar mobile sin achicar desktop.
- En layouts con sidebar, asegurar navegación usable en mobile antes de optimizar desktop.
- Evitar duplicar markup mobile/desktop salvo que la estructura cambie de verdad.
- Mantener CTA visibles y alcanzables; no esconder acciones críticas en overflow ambiguo.

## Patrones utiles

```tsx
<div className="mx-auto grid w-full max-w-sm gap-4 md:max-w-none md:grid-cols-[...]">
```

```tsx
<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
```

```tsx
<h2 className="text-center text-2xl font-semibold sm:text-left md:text-3xl">
```

## Validacion

1. Revisar visualmente al menos mobile angosto, tablet y desktop.
2. Agregar/ajustar tests si el responsive depende de clases o render condicional.
3. Ejecutar prueba focalizada y `npm run lint`.
4. Ejecutar `npm run build` al cierre de pantalla completa o si hay cambios SSR/routing.
