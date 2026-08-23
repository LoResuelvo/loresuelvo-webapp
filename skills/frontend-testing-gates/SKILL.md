---
name: frontend-testing-gates
description: "Ejecutar gates explícitos de calidad en Lo Resuelvo: RED BDD, tests, typechecks, lint, build, E2E y CI."
---

# Frontend Testing Gates

Usar durante el desarrollo y obligatoriamente antes de cada commit y push. El ejecutor depende de la granularidad y los owners declarados; quien cambia el diff es responsable de dejar su gate en GREEN.

## Gate 0 — Outer RED

Para steps de un escenario `@wip`:

```bash
make test-e2e-wip-file-managed FILE=features/...feature NAME='<scenario>'
```

- Debe ejecutar al menos un escenario y fallar por el comportamiento observable todavía ausente.
- Ese RED es esperado y no requiere escalamiento.
- Antes de commitear steps, ejecutar:

```bash
npx tsc --project tsconfig.cucumber.json --noEmit
make test-e2e-managed
```

La suite normal excluye `@wip` y debe permanecer GREEN para proteger el pipeline mientras el nuevo escenario continúa en RED.

## Gate A — Código nuevo aislado

Para helper, dominio, mapper, use case o componente todavía no integrado:

```bash
npm run test -- <patrón-o-archivo>
npx tsc --noEmit
```

Si cambia steps o soporte E2E, agregar:

```bash
npx tsc --project tsconfig.cucumber.json --noEmit
```

## Gate B — Integración del escenario activo

Mientras conserva `@wip`:

```bash
make test-e2e-wip-file-managed FILE=features/...feature NAME='<scenario>'
```

Solo después de GREEN retirar `@wip` y confirmar:

```bash
make test-e2e-file-managed FILE=features/...feature NAME='<scenario>'
```

Ambos targets fallan si `FILE`/`NAME` seleccionan cero escenarios.

## Gate C — Cambio compartido o de riesgo alto

Para routing, navegación, layouts, componentes compartidos, API client o Server Actions compartidas:

```bash
npm run lint
npx tsc --noEmit
npx tsc --project tsconfig.cucumber.json --noEmit
npm run test
make test-e2e-managed
```

El target gestionado incluye build, puerto 3001, servidor, readiness, suite E2E y cleanup. CI conserva stages separados para hacer visible qué gate remoto falla.

## Gate D — Cierre de escenario o US

Ejecutar el Gate C completo y verificar además:

- ningún `@wip` del alcance terminado;
- commits coherentes, pusheados individualmente y registrados por SHA;
- CI verde para los SHAs del escenario o US;
- working tree sin artefactos accidentales.

## Fail-fast y reparación

- No commitear ni pushear mientras el gate requerido falle.
- Corregir autónomamente la causa directa dentro del alcance y repetir el comando fallido solo si cambió código, configuración o evidencia relevante.
- No reportar RED esperado ni intentos locales que terminen en GREEN.
- Escalar si la falla persiste, parece ajena, exige archivos fuera del alcance o cambia el plan.

### Presupuesto de iteración

- Definir la firma de falla como comando, exit code, primer error normalizado y archivo/línea cuando exista.
- El presupuesto es global para esa firma y se conserva entre developer, orquestador, subagentes, handoffs y compactaciones.
- El developer puede formular como máximo 2 hipótesis, cada una con hasta 2 intentos de corrección. Si ambas fallan, pasa a `ESCALATE_ORCHESTRATOR` con el paquete compacto.
- El orquestador dispone de una única intervención: revisar evidencia focalizada, realizar como máximo una consulta de triage y formular como máximo una tercera hipótesis global, con hasta 2 intentos de corrección ejecutados por el developer.
- Si la misma firma aparece dos veces consecutivas dentro de una hipótesis, esa hipótesis se considera agotada. No repetir una tool call fallida sin cambios de código, configuración o evidencia.
- Agotada la tercera hipótesis, pasar obligatoriamente a `STOP_USER`. Quedan prohibidas una cuarta hipótesis, las cadenas de subagentes y cualquier nuevo comando de reparación, cambio, commit o push hasta recibir instrucciones del usuario.
- Una firma causal materialmente distinta abre un diagnóstico nuevo. Cambios cosméticos del log, líneas desplazadas o ejecutar desde otro agente no crean una firma nueva. El RED esperado del ciclo TDD no consume presupuesto.

### Paquete de diagnóstico

No cargar logs crudos completos por defecto. Conservar el artefacto completo y compartir solo:

```text
Command:
Exit code:
Failure signature:
Hypotheses attempted:
Files changed:
20 lines around first error:
Last 40 lines:
Developer hypotheses used: <0-2>/2
Orchestrator hypotheses used: <0-1>/1
Triage calls used: <0-1>/1
State: ACTIVE | ESCALATE_ORCHESTRATOR | STOP_USER
```

Usar salida minificada, rangos focalizados y `gh run view <run-id> --log-failed`. Ampliar el log únicamente si el diagnóstico lo requiere.

El ledger viaja con toda delegación o resumen relacionado con la falla. En `STOP_USER`, el orquestador informa firma, hipótesis, evidencia, alcance que sería necesario ampliar y alternativas; pedir ayuda no cambia por sí solo `AGENT_ORCHESTRATED` a `USER_GUIDED`.

## CI remoto

- Monitorear cada push por SHA, con ventana inicial máxima recomendada de 3 commits pendientes.
- Antes de superar la ventana, esperar el run más antiguo.
- Ante CI fallido, detener nuevos pushes y consultar únicamente los logs del stage fallido.

## Seguridad antes de commit

- Sin secretos, tokens, `.env` ni logs de datos sensibles.
- Errores de usuario genéricos y en español.
- Actualizar `.env.example` si cambian variables públicas o privadas.
