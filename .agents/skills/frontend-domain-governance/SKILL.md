---
name: frontend-domain-governance
description: "Modelar reglas de negocio en domain/ con tipos seguros, invariantes explícitas y funciones puras cuando el cambio lo requiera."
---

# Frontend Domain Governance

Usar al crear o cambiar reglas de negocio, tipos de dominio, dinero, fechas, estados u operaciones que requieran invariantes.

## Reglas

- El dominio no depende de React, Next.js, API, infraestructura ni UI.
- Usar tipos inmutables y funciones puras para reglas de negocio.
- Introducir Value Objects o smart constructors cuando un primitivo tenga una invariante real: dinero, fechas, porcentajes, estados o identificadores validados.
- No crear abstracciones de dominio para datos de paso sin comportamiento o invariante.
- El dominio y los puertos usan `camelCase`; los datos crudos se validan y transforman en mappers de infraestructura.
- Mantener decisiones de negocio fuera de JSX y evitar cadenas profundas de navegación cuando un selector o helper de dominio sea más claro.

## Pruebas

- Cubrir invariantes y bordes de las reglas nuevas con tests unitarios puros, sin mocks de React, API ni navegador.
- Aplicar el gate focalizado de `frontend-testing-gates`; no ejecutar la suite completa salvo que el riesgo lo requiera.

Leer [patrones de dominio](references/domain-patterns.md) solo al diseñar Value Objects, smart constructors o módulos con comportamiento.
