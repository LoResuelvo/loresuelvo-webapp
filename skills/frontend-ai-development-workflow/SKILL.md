---
name: frontend-ai-development-workflow
description: "Coordinar una User Story de Lo Resuelvo con un orquestador, un desarrollador persistente, commits en main y CI asíncrono."
---

# Frontend AI Development Workflow

Usar para coordinar agentes durante una User Story. Las reglas de BDD, tests y commits viven en sus skills específicas.

## Roles

### Orquestador

- Mantiene el alcance de la US, la conversación con el usuario y el escenario activo.
- Crea el plan de micro-pasos y delega la implementación a un único desarrollador persistente.
- Revisa el diff, decide el gate aplicable, crea commits y hace push a `main`.
- Registra y monitorea CI por SHA exacto.

### Desarrollador persistente

- Implementa únicamente el micro-paso solicitado para el escenario activo.
- Ejecuta el gate local focalizado y reporta cambios, comandos y resultado.
- No crea commits ni hace push.
- Permanece activo durante toda la US; no crear subagentes descartables por micro-paso.

## Ciclo de trabajo

1. El orquestador define el siguiente micro-paso del escenario activo.
2. El desarrollador implementa, prueba y reporta.
3. El orquestador revisa el diff y reutiliza el resultado del mismo test si no hubo cambios posteriores.
4. Si el gate pasa, el orquestador crea un commit atómico y lo pushea.
5. El ciclo continúa hasta que el E2E del escenario esté en GREEN.

## CI asíncrono

- Después de cada push, monitorear el run asociado al SHA, no solo el último run de `main`.
- El desarrollo local puede continuar mientras CI valida commits anteriores.
- Mantener una ventana configurable de commits en vuelo; el valor inicial recomendado es 3.
- Antes de superar la ventana, esperar el resultado del commit más antiguo.
- Si CI falla, detener nuevos pushes, cargar solo los logs fallidos y priorizar un fix-forward o un rollback seguro.

## Economía de contexto

- Inspeccionar archivos y código de manera quirúrgica.
- Cargar skills y referencias solo cuando aplican.
- Mantener los reportes del desarrollador en pocas líneas: archivos, validación y bloqueo si existe.
