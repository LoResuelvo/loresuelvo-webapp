---
name: frontend-component-governance
description: "Diseñar o refactorizar componentes React de Lo Resuelvo con cohesión, composición y límites claros de responsabilidad."
---

# Frontend Component Governance

Usar al crear, refactorizar o evaluar componentes en `components/` o `app/`.

Complementar con `frontend-maintainability-governance` para tamaño, funciones internas, hooks colaboradores, APIs públicas y decisiones de extracción.

## Criterios de diseño

- Los componentes visuales renderizan UI y capturan interacción; las reglas de negocio, red, parsing y manipulación de DOM compleja viven en dominio, acciones, hooks o utilidades específicas.
- Mantener un nivel de abstracción por componente y preferir nombres que expresen su responsabilidad.
- Revisar la cohesión cuando un componente, su interfaz de props o su carpeta crecen demasiado; dividir solo si mejora claridad, reutilización o testeabilidad.
- Preferir composición con `children` o slots para layouts. Usar objetos de parámetros cuando datos y callbacks formen una unidad cohesionada.
- Los modales son hermanos coordinados por una vista o contenedor, no modales anidados.

## Límites prácticos

Las cantidades de líneas, props o archivos son señales, no límites rígidos. Un componente puede ser mayor si sigue teniendo una responsabilidad clara y dividirlo agregaría complejidad accidental.

Antes de extraer, verificar que la nueva pieza tenga un nombre, una responsabilidad y una API claras.

## Cierre

- Usar primitivas existentes y preservar contratos de accesibilidad y testing.
- Mantener los componentes organizados por subdominio cuando eso facilite el descubrimiento.
- Ejecutar el gate indicado por `frontend-testing-gates`.

Leer [patrones de composición](references/composition-patterns.md) si el componente tiene prop drilling, slots o coordinación de layout compleja.
