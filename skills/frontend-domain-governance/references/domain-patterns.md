# Patrones de dominio

Usar cuando el cambio requiere una invariante de negocio real.

## Tipo inmutable y módulo de funciones

```ts
export type Money = {
  readonly cents: number;
  readonly currency: "ARS" | "USD";
};

export const Money = {
  create(cents: number, currency: Money["currency"] = "ARS"): Money {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new Error("Money cents must be a non-negative integer");
    }

    return { cents, currency };
  },
  add(left: Money, right: Money): Money {
    if (left.currency !== right.currency) throw new Error("Currency mismatch");
    return Money.create(left.cents + right.cents, left.currency);
  },
};
```

## Cuándo aplicar

- Value Object: valor con formato, rango o invariante propia.
- Módulo de entidad: reglas de permisos o transición de estado que de otro modo se dispersarían en UI.
- Mapper: frontera de datos externos; transforma DTO `snake_case` a dominio `camelCase` y rechaza datos inválidos.

Evitar Value Objects para campos que son meramente transportados y no tienen comportamiento ni validación propia.
