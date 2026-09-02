# Hooks y adaptadores React

Leer esta referencia al crear o modificar hooks, Client Components, efectos, callbacks, timers, listeners, streams, requests cancelables o APIs del navegador.

## Separación recomendada

```text
funciones puras o reducer -> hook adaptador -> componente
```

- El núcleo puro calcula valores y transiciones sin conocer React, el DOM ni APIs del navegador.
- El hook adapta ese núcleo al render, conserva estado/refs y sincroniza recursos externos.
- El componente expresa la UI y traduce interacción a comandos del hook.

Esta separación no exige tres archivos. Mantener helpers privados en el mismo archivo mientras exista una única razón de cambio y el conjunto siga siendo fácil de recorrer.

## Árbol de decisión

| Necesidad | Herramienta preferida |
| --- | --- |
| Cálculo, validación, parsing o transición determinista | Función pura. |
| Estados relacionados con transiciones e invariantes | `useReducer` con acciones del dominio y unión discriminada cuando evite estados imposibles. |
| Compartir lógica con estado o sincronización React | Custom hook con API pequeña. |
| Sincronizar timer, stream, listener, conexión o request con React | Hook adaptador con un único dueño del setup y cleanup. |
| Recurso imperativo reutilizado fuera de React o por varios adaptadores | Controller o clase más un hook adaptador fino. |
| Responsabilidad puramente visual | Componente. |

No llamar “clase pura” a una clase que muta estado interno. Una clase puede encapsular bien un recurso imperativo, pero no se justifica solo porque un hook tiene muchas líneas o callbacks.

## Orden de lectura de un hook

Organizar, cuando aplique, en este orden:

1. tipos, constantes y helpers puros;
2. estado y refs;
3. dependencias de otros hooks, desestructuradas;
4. valores derivados;
5. comandos y handlers con nombres de intención;
6. efectos junto a su cleanup;
7. API pública retornada.

No intercalar setup, comandos, cálculos y cleanup de un mismo recurso en secciones distantes si pueden leerse juntos.

## Estado y transiciones

- Evitar booleanos independientes que permitan combinaciones inválidas. Si el lector debe reconstruir mentalmente una máquina de estados, representarla como estados y eventos explícitos.
- Usar un reducer cuando las actualizaciones relacionadas están dispersas entre muchos handlers; no usarlo para envolver uno o dos estados independientes.
- Extraer cálculos derivados del estado en vez de sincronizar una segunda copia mediante un efecto.
- Nombrar eventos por lo ocurrido (`recordingStarted`, `uploadFailed`) y comandos por intención (`startRecording`, `retryUpload`).

## Efectos y dependencias

- Usar efectos para sincronizar con sistemas externos, no como flujo general de eventos ni para derivar datos que pueden calcularse durante render.
- Mantener las dependencias alineadas con el código. No desactivar `exhaustive-deps` ni omitir dependencias para estabilizar artificialmente un efecto.
- Evitar objetos y funciones recreados como dependencias cuando basta con primitivas u operaciones estables desestructuradas.
- Separar efectos que se ejecutan por razones diferentes. Mantener juntos setup y cleanup del mismo recurso.
- Usar refs para identidad o valores imperativos que no participan del render; no utilizarlas como un segundo árbol de estado oculto.
- Si un callback externo debe observar el valor más reciente sin reiniciar una suscripción, centralizar el puente de callback y documentar esa semántica. Usar `useEffectEvent` solo si la versión instalada y el lint del repositorio lo soportan.

## Callbacks y API pública

- React no exige envolver cada función en `useCallback`. Usarlo cuando la identidad estable forma parte del contrato, es dependencia de otro hook o evita trabajo medido en un consumidor memoizado.
- En un hook público, mantener estables los comandos si consumidores dependen de su identidad; no memoizar helpers internos sin una razón concreta.
- Muchos callbacks pequeños no son por sí solos un defecto. Sí son una señal cuando repiten guardas, modifican los mismos refs en órdenes distintos o distribuyen una misma transición.
- Retornar solo estado y comandos usados. Evitar exponer setters, refs o detalles del recurso interno.

## Lifecycle y concurrencia

Para cada timer, stream, listener, URL, recorder, request o suscripción, comprobar:

- quién lo crea y quién lo destruye;
- si start/stop/reset/unmount son idempotentes;
- qué ocurre con respuestas o eventos tardíos;
- cómo se evita actuar sobre una operación cancelada o reemplazada;
- si el cleanup cubre salida normal, error y desmontaje;
- si una única transición produce una única notificación o error visible.

Cuando estas respuestas están repartidas entre varios callbacks, agruparlas alrededor del recurso o extraer una frontera con nombre. No trasladar la complejidad a una clase sin simplificar el contrato que ve React.
