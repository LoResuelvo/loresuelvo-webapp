# Límites de módulos y carpetas

Leer esta referencia al agregar, mover o dividir archivos y al resolver una señal de tamaño.

## Ubicación por responsabilidad

| Directorio | Responsabilidad |
| --- | --- |
| `app/` | Rutas, layouts, composición de página y Server Actions. |
| `components/` | Presentación e interacción organizadas por subdominio. |
| `hooks/` | Lógica React compartida y adaptación a APIs del navegador. |
| `application/` | Orquestación de casos de uso. |
| `ports/` | Contratos entre aplicación e infraestructura. |
| `domain/` | Tipos, invariantes y reglas puras del negocio. |
| `infrastructure/` | API, auth, repositorios, mappers y adaptadores externos. |
| `lib/` | Utilidades puras, pequeñas y realmente transversales. |

El código específico de una feature debe quedar junto a esa feature aunque sea técnicamente reutilizable. Promoverlo a `hooks/` o `lib/` solo cuando tenga consumidores reales de más de un subdominio y un nombre independiente del primero.

## Cuándo dividir un archivo

Dividir por concepto o razón de cambio, no por cantidad de líneas ni por secciones arbitrarias.

Una extracción válida tiene:

- un nombre que expresa una capacidad;
- entradas y salidas pequeñas;
- dependencias en la dirección permitida;
- un dueño claro de errores y lifecycle;
- una ubicación que el siguiente lector pueda predecir.

Mantener helpers privados junto al flujo cuando extraerlos obligaría a saltar entre archivos sin reducir conocimiento. No crear `part1`, `misc`, `common`, `helpers` o `utils` como destino de bloques sin concepto propio.

## API y dependencias

- Un archivo tiene un export principal; puede contener tipos y helpers privados que sostengan ese concepto.
- Exportar únicamente símbolos usados fuera del módulo. No crear barrels para ocultar una carpeta incohesiva.
- Mantener `domain/` y `ports/` independientes de React y de capas externas.
- Traducir DTOs y detalles externos en `infrastructure/`; no filtrarlos a aplicación o UI.
- Evitar dependencias circulares y cadenas donde un consumidor conoce la estructura interna de varios colaboradores.
- Preferir imports que revelen el dueño real; usar alias `@/...` cuando mejora la lectura entre módulos.

## Reorganizaciones

- Mover únicamente el alcance necesario y actualizar imports de forma atómica.
- Preservar el contrato observable y no aprovechar un movimiento para agregar comportamiento.
- Revisar consumidores antes de ampliar una API para facilitar la migración.
- No crear una carpeta para un único archivo salvo que represente un límite estable o vaya acompañada en el mismo cambio por piezas cohesionadas reales.
- Si una extracción solo reduce el tamaño del archivo original pero aumenta navegación, parámetros o conocimiento compartido, revertir la decisión y justificar la cohesión existente.
