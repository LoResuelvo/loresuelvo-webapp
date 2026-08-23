# Patrones de integración

## Mapper

```ts
export function mapApiProvider(api: ApiProvider): Provider {
  return {
    id: api.id,
    displayName: api.display_name,
    categoryName: api.category_name,
  };
}
```

El mapper es la frontera entre datos externos y dominio. Si el dato requiere una invariante, usar el constructor del dominio allí.

## Resultado de Server Action

```ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number };
```

La acción captura errores de infraestructura y devuelve un resultado que el cliente pueda manejar sin exponer detalles internos.
