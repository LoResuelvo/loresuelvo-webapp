# Checklist BDD/TDD

## Antes de implementar

- Existe criterio de aceptación o comportamiento esperado explícito.
- Se eligió nivel de prueba correcto: BDD, componente, unitario o API client.
- La prueba nueva debería fallar por la razón correcta.

## Durante RED/GREEN

- RED inicial confirmado cuando sea viable y aporte valor (Gate 0 no exige demostrar RED). Un RED esperado no habilita commit.
- GREEN logrado con el cambio mínimo razonable.
- En fronteras de verificación, stage exacto y `delivery_prepare` según `frontend-testing-gates`; comandos focalizados crudos solo como fallback de diagnóstico excepcional.
- Refactor sin cambiar expectativas.

## Calidad de pruebas

- Aserciones orientadas a usuario o contrato público.
- Títulos y descripciones de tests en inglés.
- Mocks en fronteras externas, no en la unidad que se quiere validar.
- Fixtures pequeñas y con nombres de dominio.
- Sin snapshots amplios ni aserciones accidentales.
- Steps Gherkin reutilizados cuando representan el mismo comportamiento.
- En Testing Library, preferir rol, label o texto visible; usar `data-testid` solo si no existe una consulta accesible estable.
- Probar interacción con `userEvent` y estados async con `findBy*` o `waitFor` justificado.
- No usar `waitFor` para ocultar una race condition sin entenderla.

## Cierre

- Cierre de frontera o escenario mediante `delivery_prepare` con `status: passed`.
- Sin `@wip` residual en el escenario cerrado.
- Validación de CI y evidencia registrada en el ledger.
