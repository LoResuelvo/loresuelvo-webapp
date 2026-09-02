---
name: frontend-testing-gates
description: "Ejecutar gates explícitos de calidad en Lo Resuelvo: RED BDD, tests, typechecks, lint, build, E2E y CI."
---

# Frontend Testing Gates

Usar durante el desarrollo y obligatoriamente antes de cada commit y push. El ejecutor depende de la granularidad y los owners declarados; quien cambia el diff es responsable de dejar su gate en GREEN.

Los gates verifican comportamiento y salud técnica, no legibilidad por sí solos. Para código productivo no trivial, ejecutar y resolver primero la auditoría de `frontend-maintainability-governance`; sus umbrales son señales de revisión, no nuevos tests rígidos.

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

## Gate B — Integración de bajo riesgo del escenario activo

Al cerrar un escenario de bajo riesgo listo para entrar a la suite normal,
retirar `@wip` y ejecutar todos los escenarios normales de su feature:

```bash
make test-e2e-managed E2E_FILE=features/...feature
```

- Esta ejecución prueba el comportamiento integrado, confirma que el escenario
  ingresó a la suite normal y detecta regresiones en los escenarios ya cerrados
  del mismo feature.
- No repetirla con `@wip` si desde Gate 0 no se necesita una frontera
  intermedia.
- Usar `make test-e2e-wip-file-managed` durante la implementación solo cuando
  se necesite validar una integración intermedia sin habilitar todavía el
  escenario en la suite normal.

Si el escenario modificó una frontera compartida o de alto riesgo, Gate D
reemplaza Gate B: no ejecutar además el archivo completo porque la suite E2E
integral ya lo cubre.

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

## Gate D — Cierre de batch, US o escenario de alto riesgo

Ejecutar el Gate C completo al cerrar un batch o una US. También ejecutarlo al
cerrar un escenario si modificó routing, navegación, layouts, componentes
compartidos, API client, Server Actions u otra frontera de riesgo alto.

Para un escenario de bajo riesgo, el cierre mínimo es Gate B en verde: retirar
`@wip` y ejecutar los escenarios normales de su feature. El Gate D del batch
cubre la regresión integral.

Además verificar:

- ningún `@wip` del alcance terminado;
- commits coherentes, pusheados individualmente y registrados por SHA;
- los SHAs relevantes no tienen CI roja; un `rerun_pending` autorizado puede
  permanecer al cierre de batch o escenario, pero debe estar verde antes del
  cierre de la US;
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

Usar salida minificada, rangos focalizados y `gh run view <run-id> --log-failed`. Ampliar el log únicamente si el diagnóstico lo requiere. En ejecuciones verdes, conservar solo el resumen del comando; no adjuntar logs completos de build, E2E o CI.

El ledger viaja con toda delegación o resumen relacionado con la falla. En `STOP_USER`, el orquestador informa firma, hipótesis, evidencia, alcance que sería necesario ampliar y alternativas; pedir ayuda no cambia por sí solo `AGENT_ORCHESTRATED` a `USER_GUIDED`.

## CI remoto

- Monitorear cada push por SHA, con ventana inicial máxima recomendada de 3 commits pendientes.
- Después de cada push, registrar el SHA y consultar una instantánea compacta, por ejemplo: `gh run list --commit <sha> --json headSha,status,conclusion,databaseId,url --limit 1`.
- Mientras haya menos de tres SHAs pendientes, continuar el trabajo local. Antes de superar la ventana, consultar el SHA pendiente más antiguo; no usar `gh run watch` continuo salvo que una investigación puntual necesite estados en vivo.
- Ante CI fallido, detener nuevos pushes y consultar únicamente los logs del stage fallido. En los reportes, incluir SHA, stage, primer error causal y un extracto focalizado; no logs completos.

### CI anormalmente lenta

Un run `in_progress` no equivale a CI verde. Puede tratarse como sospecha de
degradación del proveedor solo si supera 2 veces su duración habitual, no
existe error causal de código y sus logs no muestran progreso sostenido de una
prueba o build propio.

Ante esa firma conocida:

1. Registrar SHA, run, job y duración observada.
2. Si el SHA sucesor inmediato ya está en CI, esperar su resultado antes de
   clasificar el run lento. Si pasa los mismos checks requeridos y no cambió el
   área vinculada al run lento, clasificar el caso como degradación probable del
   proveedor. Si modificó esa área, revisar el diff mínimo antes de clasificarlo.
3. Cancelar el run lento y reintentar el job o workflow sobre el mismo SHA; no
   crear un commit nuevo para comprobar la hipótesis.
4. En cambios de bajo riesgo, continuar dentro de la ventana normal de hasta
   tres SHAs pendientes mientras el reintento se resuelve y mantener una alerta
   compacta sobre su resultado.
5. Si el SHA sucesor confirma degradación probable, marcar el SHA lento como
   `rerun_pending` y permitir una única excepción: la ventana efectiva puede
   pasar de tres a cuatro SHAs pendientes mientras se resuelve ese reintento,
   incluso en cambios de alto riesgo. No usar esta excepción para otro run.
6. Si el reintento pasa, registrar la degradación y continuar. Si falla,
   marcar posible flakiness o defecto reproducible e informar inmediatamente al
   orquestador con SHA, job, firma y extracto focalizado. El orquestador decide
   el triage; no atribuir el fallo automáticamente al proveedor.
7. Exigir el reintento verde antes de cerrar la US.

## Seguridad antes de commit

- Sin secretos, tokens, `.env` ni logs de datos sensibles.
- Errores de usuario genéricos y en español.
- Actualizar `.env.example` si cambian variables públicas o privadas.

## Integridad de fixtures y tipos de prueba

No usar `as any`, `as never` ni `@ts-ignore` en tests nuevos. Si una prueba de
frontera necesita representar un payload externo con campos no modelados, usar
`unknown` de forma localizada, documentar el motivo y validarlo en el mapper;
no inyectar datos inválidos mediante casts inseguros en componentes. Preferir
factories tipadas y assertions sobre el contrato público resultante.
