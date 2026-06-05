# Checklist BDD/TDD

## Antes de implementar

- Existe criterio de aceptación o comportamiento esperado explícito.
- Se eligió nivel de prueba correcto: BDD, componente, unitario o API client.
- La prueba nueva debería fallar por la razón correcta.

## Durante RED/GREEN

- RED confirmado cuando sea viable.
- GREEN logrado con el cambio mínimo razonable.
- Refactor sin cambiar expectativas.

## Calidad de pruebas

- Aserciones orientadas a usuario o contrato público.
- Mocks en fronteras externas, no en la unidad que se quiere validar.
- Fixtures pequeñas y con nombres de dominio.
- Sin snapshots amplios ni aserciones accidentales.
- Steps Gherkin reutilizados cuando representan el mismo comportamiento.

## Cierre

- Prueba focalizada ejecutada.
- E2E ejecutado si cambió un flujo en `features/`.
- Validación robusta pendiente o ejecutada según el alcance del handoff/PR.
