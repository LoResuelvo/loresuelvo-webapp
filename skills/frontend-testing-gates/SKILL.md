---
name: frontend-testing-gates
description: "Ejecutar validaciones de calidad en Lo Resuelvo: Vitest, Cucumber/Playwright, lint, build standalone y checks manuales de seguridad. Usar antes de handoff, PR, cierre de feature o cuando se pida robustez completa."
---

# Frontend Testing Gates

## Comandos canonicos actuales

Durante iteración, usar comandos focalizados. Para cierre robusto, ejecutar en orden:

```bash
npm run test
npm run lint
npm run build
```

Si el cambio toca flujos de navegador cubiertos por Gherkin:

```bash
npm run test:e2e
```

También se puede usar Make:

```bash
make test
make lint
make build
make test-e2e
```

## Política fail-fast

1. Detenerse en la primera falla.
2. Corregir causa raíz.
3. Re-ejecutar el comando fallido y luego continuar con los restantes.
4. Reportar evidencia breve: comando, resultado y cualquier riesgo residual.

## Seguridad manual antes de cierre

- Sin secretos hardcodeados.
- Sin logs de datos sensibles.
- Sin `dangerouslySetInnerHTML` salvo sanitización explícita.
- Errores de usuario genéricos y en español.
- `.env.example` actualizado si cambian variables públicas/privadas.

## Cuándo no correr todo

No ejecutar build/e2e en cada microcambio visual. Usar pruebas focalizadas durante RED/GREEN y reservar validación completa para handoff/PR/cierre.
