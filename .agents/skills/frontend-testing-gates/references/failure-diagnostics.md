# Diagnóstico y escalamiento de gates

Leer únicamente cuando `delivery_prepare` o CI devuelve una falla que requiere reparación.

## Reglas de progreso

- Definir la firma causal mediante check o comando, exit code, primer error normalizado y archivo/línea cuando exista.
- Conservar el historial de esa firma entre developer, orquestador, subagentes, handoffs y compactaciones.
- No repetir una ejecución sin cambios de código, configuración o evidencia. Una respuesta cacheada no constituye progreso.
- Probar hipótesis distintas y sustentadas. Si dos líneas razonables se agotan sin progreso, escalar normalmente al orquestador; este umbral es una señal, no una cuota universal.
- El orquestador puede realizar un triage senior si aporta información nueva y decide si existe otra hipótesis justificada, si hace falta ampliar alcance o si corresponde `STOP_USER`.
- Una firma causal materialmente distinta abre otro diagnóstico. Cambios cosméticos del log, líneas desplazadas o cambiar de agente no crean una firma nueva.
- El RED esperado de TDD no consume el presupuesto de reparación.
- Una vez declarado `STOP_USER`, detener reparaciones, cambios, commits, pushes y cadenas de subagentes hasta recibir instrucciones.

## Evidencia compacta

Usar primero la respuesta procesada de `delivery_prepare` o `delivery_ci_inspect`. Abrir el log local solo cuando una hipótesis concreta necesite más contexto y limitar el extracto a las líneas causales.

```text
Frontera / escenario / SHA:
Check y exit code:
Firma causal:
Diagnóstico procesado:
Hipótesis distintas intentadas:
Progreso observado:
Archivos cambiados:
Alcance o decisión requerida:
Estado: ACTIVE | ESCALATE_ORCHESTRATOR | STOP_USER
```

El ledger completo permanece local. El handoff transporta este resumen, no logs crudos. En `STOP_USER`, presentar además alternativas seguras; la escalación no cambia por sí sola la conducción de la US.
