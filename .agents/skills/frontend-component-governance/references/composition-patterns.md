# Patrones de composición

## Slots para layouts

```tsx
interface MessagesSplitLayoutProps {
  sidebar: React.ReactNode;
  chat: React.ReactNode;
  isChatActive: boolean;
}
```

Usar slots cuando un contenedor solo organiza regiones visuales y no necesita conocer los datos internos de cada región.

## Objetos de parámetros

Agrupar datos y callbacks que pertenecen al mismo concepto, por ejemplo un composer de mensajes. No crear objetos solo para ocultar props no relacionadas.

## Extracción

Extraer un hook para lógica de DOM, scroll, resize, polling o efectos. Extraer un subcomponente cuando tenga responsabilidad visual propia y pueda describirse con un nombre claro.
