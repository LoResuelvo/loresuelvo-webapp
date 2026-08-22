---
name: frontend-testing-gates
description: "Ejecutar validaciones de calidad en Lo Resuelvo: Vitest, Cucumber/Playwright, lint, TypeScript checks, build standalone y verificación de pipeline. Usar durante el desarrollo y OBLIGATORIAMENTE antes de cada commit + push."
---

# Frontend Testing Gates

Esta skill define la política estricta de validaciones de calidad para asegurar que ningún commit rompa el pipeline de CI/CD en GitHub Actions.

---

## 1. Comandos Canónicos Obligatorios

### A. Durante la Iteración Rápida (Bucle Interno TDD)
Mientras se programa y se aplican micro-cambios (RED -> GREEN -> REFACTOR), usar comandos focalizados y rápidos:

```bash
npm run test -- <patron-o-archivo>  # Vitest focalizado en milisegundos
make test                           # Suite unitaria completa
```

### B. Quality Gates antes de Commit + Push (Matriz de Riesgo)
Aplicar las validaciones correspondientes según el tipo de cambio antes de hacer `git commit` y `git push`:

1. **Caso A (Código Nuevo Aislado)** — TSX nuevo, función de dominio o mapper no conectado aún a un escenario activo:
   ```bash
   npx tsc --noEmit && npm run test -- <archivo>
   ```

2. **Caso B (Integración de Escenario de Feature)** — Conexión con Server Action y step definitions del escenario actual:
   ```bash
   make test-e2e-file FILE=features/...feature
   ```

3. **Caso C (Modificación de Componente Compartido o Cierre de Regla / US)** — Cambios en `PaymentResultPage`, `Header`, `api-client`, o entrega final de la User Story:
   ```bash
   # 1. Linter (0 warnings, 0 errors)
   npm run lint

   # 2. Tipado TypeScript Estricto (App y Tests Cucumber)
   npx tsc --noEmit && npx tsc --project tsconfig.cucumber.json --noEmit

   # 3. Tests Unitarios y de Dominio (100% pasando)
   npm run test

   # 4. Compilación de Producción
   npm run build

   # 5. Suite E2E Completa (servidor en puerto 3001)
   fuser -k 3001/tcp || true
   make start-test &
   make test-e2e
   ```

---

## 2. Comandos E2E Auxiliares con Make

```bash
make test-e2e-file FILE=features/auth-onboarding/login.feature   # E2E de un archivo específico
make docker-test-e2e                                            # E2E 100% containerizado en Docker
```

---

## 3. Política Fail-Fast

1. **Detenerse en la primera falla**: Si el linter, TypeScript o un test falla, NO continuar con el push.
2. **Corregir causa raíz**: Arreglar el tipo, el stub o la aserción rota.
3. **Re-ejecutar el comando fallido y luego validar la suite completa**.

---

## 4. Seguridad Manual antes de Commit

- Sin secretos ni tokens hardcodeados en código o tests.
- Sin logs de datos sensibles (`console.log(password)`).
- Sin `dangerouslySetInnerHTML` salvo sanitización explícita.
- Errores de usuario genéricos, claros y en español.
- `.env.example` actualizado si cambian variables públicas/privadas.

