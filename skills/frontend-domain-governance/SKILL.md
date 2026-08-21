---
name: frontend-domain-governance
description: "Gobernanza de Modelado de Dominio bajo Functional DDD: creación de Value Objects, entidades inmutables, Smart Constructors, invariantes y Parse Don't Validate. Usar al crear o refactorizar archivos en domain/, definir tipos de negocio, manipular dinero, fechas u órdenes, y erradicar modelos anémicos u obsesión por primitivos."
---

# Frontend Domain Governance (Functional DDD)

Esta skill define las reglas obligatorias para el diseño y modelado de la capa de dominio (`domain/`) en `loresuelvo-webapp`, garantizando **código auto-documentado, tipado seguro, invariantes estrictas y 100% de compatibilidad con React/Next.js**.

---

## 1. Arquitectura de Dominio Funcional (Data + Module)

Para evitar la pérdida de prototipos en React (`{ ...state }`) y problemas de serialización en Next.js Server Components, el dominio **NO utiliza clases mutables**, sino el patrón **Tipo Inmutable + Módulo de Funciones Puras**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TIPO INMUTABLE (Data - 100% React & Next.js Safe)         │
│    export type Money = {                                    │
│      readonly cents: number;                                │
│      readonly currency: "ARS" | "USD";                      │
│    };                                                       │
├─────────────────────────────────────────────────────────────┤
│ 2. MÓDULO DE DOMINIO (Namespace de Comportamiento Puro)     │
│    export const Money = {                                   │
│      create(cents: number, currency?: "ARS" | "USD"): Money │
│      format(money: Money): string                           │
│      add(a: Money, b: Money): Money                         │
│      isPositive(money: Money): boolean                      │
│    };                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Anti-patrones Prohibidos

| Anti-patrón Prohibido                                                           | Por qué es dañino                                                  | Solución Obligatoria (Functional DDD)                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Obsesión por Primitivos** (`number` para plata, `string` para fechas/estados) | No valida invariantes; permite plata negativa o strings inválidos. | **Value Objects** (`Money`, `ScheduledDateTime`, `ProposalStatus`). |
| **Modelo Anémico** (`interface` vacías de comportamiento)                       | Desparrama la lógica en `utils/` sueltos y ternarios en JSX.       | **Módulo de Dominio** (`ServiceProposal.canBeAccepted()`).          |
| **Validación Dispersa** (`if (cents < 0)` en 10 archivos distintos)             | Código frágil y duplicado.                                         | **Smart Constructor** (`Type.create()` valida al nacer).            |
| **Switches en Componentes UI** (`switch (status)` en cada vista)                | Viola Open/Closed y ensucia el JSX.                                | **Status Helper en Dominio** (`Type.getStatusBadge()`).             |

---

## 3. Principio _Parse, Don't Validate_ en la Frontera

Los datos crudos del backend (JSON snake_case) **nunca** entran al dominio ni a la UI sin pasar por la aduana de los **Mappers** en `infrastructure/repositories/`:

```ts
// infrastructure/repositories/service-proposal-mapper.ts
export function mapApiServiceProposal(
  api: ApiServiceProposal,
): ServiceProposal {
  return {
    id: api.id,
    amount: Money.create(api.amount_cents), // Valida invariante
    scheduledOn: ScheduledDateTime.create(api.scheduled_on), // Valida fecha ISO
    status: api.status as ProposalStatus,
    description: api.description,
  };
}
```

> Si la API devuelve un dato corrupto (ej: centavos negativos o fecha inválida), `create()` arroja un error en la frontera y el dato inválido **jamás llega vivo a la UI**.

---

## 4. Arquetipos Canónicos de Referencia (Ejemplos Modelo)

No es necesario registrar cada nueva entidad en esta skill; cualquier nuevo módulo que se cree en `domain/` debe seguir uno de estos dos arquetipos de diseño:

### Arquetipo 1: Value Object Puro (Ejemplo: `Money` en `domain/shared/Money.ts`)

Úsese para encapsular datos primitivos con invariantes matemáticas, formatos o rangos (ej. Dinero, Fechas ISO, Calificaciones, Porcentajes).

- Tipo inmutable con `readonly`.
- `create()` valida la invariante (ej. entero no negativo).
- Funciones puras de operación y formateo (`add`, `format`).

### Arquetipo 2: Entidad de Dominio con Reglas de Estado (Ejemplo: `ServiceProposal` en `domain/messaging/ServiceProposal.ts`)

Úsese para entidades de negocio con ciclo de vida o permisos (ej. Propuestas, Órdenes, Sesiones).

- Predicados de negocio (_Tell Don't Ask_): `Type.canBeAccepted(item, isConsumer)`.
- Metadatos visuales centralizados: `Type.getStatusBadge(item)`.

---

## 5. Principios Fundamentales de Ingeniería de Software

1. **Tell, Don't Ask (Dile, no le preguntes)**:
   - La UI no debe inspeccionar estados anidados con operadores lógicos complejos (`if (status === 'pending' && !isProvider)`).
   - Siempre se debe delegar la decisión en el módulo de dominio (`if (ServiceProposal.canBeAccepted(proposal, isConsumer))`).
2. **Ley de Deméter (Principio de Mínimo Conocimiento)**:
   - Evitar cadenas de navegación profundas en componentes (`order.proposal.provider.category.name`).
   - El mapper o el módulo de dominio deben aplanar o proveer selectores limpios.
3. **Nombres que Revelan Intención (_Intention-Revealing Interfaces_)**:
   - El código debe ser auto-documentado.
   - Prohibido el uso de variables genéricas (`data`, `res`, `info`, `temp`, `item`, `val`) en favor de términos del **Lenguaje Ubicuo** (`serviceProposal`, `bookingDeposit`, `workOrder`).
4. **Regla del Boy Scout (_The Boy Scout Rule_)**:
   - _"Dejar el código más limpio de lo que se encontró"_. Si se detecta un helper procedural obsoleto o lógica de negocio dispersa en un componente, debe migrarse al dominio correspondiente.

---

## 6. Disciplina de Testing (TDD Estricto)

1. **Tests Unitarios de Dominio**: Cada módulo en `domain/` DEBE tener su archivo `.test.ts` que valide:
   - Invariantes en el constructor (ej. centavos negativos deben arrojar error).
   - Casos de borde y operaciones de negocio.
2. **Sin Mocks en el Dominio**: Las pruebas de `domain/` son 100% puras; no mockean React, APIs ni timers de navegador.

---

## 7. Quality Gates & Convenciones de Commit

Antes de commitear cualquier cambio de dominio:

1. `npm run lint` (0 errores, 0 warnings).
2. `npx tsc --noEmit` (0 errores de tipos).
3. `npm run test` (todos los tests pasando).
4. `npm run build` (build Next.js exitoso).
5. **Commits sin User Story**: Formato Conventional Commits `refactor: ...`, `fix: ...`, `test: ...` **sin corchetes `[]` ni paréntesis `()`**.
