Feature: 50.1 Enviar audios por el chat web
    Como participante de un chat de trabajo
    quiero enviar mensajes de audio
    para comunicar detalles del problema o coordinar el servicio

    @wip
    Scenario: 50.1.1-WEB Adjuntar un audio WebM con codec Opus y ver su preview
        Given que estoy en un chat activo como consumidor
        And que abrí el menú de adjuntos
        When selecciono el audio WebM con codec Opus "ruido-bomba.webm" de 18 segundos
        Then veo la preview del audio
        And puedo reproducirlo antes de enviarlo

    Scenario: 50.1.2-WEB Grabar un audio válido y ver su preview
        Given que estoy en un chat activo como consumidor
        And que el navegador permite usar el micrófono
        When grabo un audio WebM con codec Opus de 5 segundos
        Then veo la preview del audio grabado
        And puedo reproducirlo antes de enviarlo

    @wip
    Scenario: 50.1.3-WEB Cancelar un audio antes de enviarlo
        Given que estoy en un chat activo como consumidor
        And que tengo la preview del audio "ruido-bomba.webm"
        When cancelo el audio antes de enviarlo
        Then el audio desaparece de la preview
        And no se crea ninguna burbuja de audio

    Scenario: 50.1.4-WEB Rechazar la grabación cuando el navegador no permite el micrófono
        Given que estoy en un chat activo como consumidor
        And que el navegador rechazó el permiso para usar el micrófono
        When intento grabar un audio
        Then veo un mensaje indicando que no se puede acceder al micrófono
        And no se crea ninguna preview de audio

    Scenario: 50.1.5-WEB Rechazar un audio con MIME distinto de WebM/Opus
        Given que estoy en un chat activo como consumidor
        And que abrí el menú de adjuntos
        When intento adjuntar "grabacion.m4a" con MIME "audio/mp4" y codec "aac"
        Then veo un error de formato no permitido
        And el audio no se agrega al composer

    Scenario: 50.1.6-WEB Rechazar un audio mayor a 5 MiB
        Given que estoy en un chat activo como consumidor
        When intento adjuntar un audio WebM con codec Opus de 6 MiB
        Then veo un error indicando que supera los 5 MiB
        And el audio no se agrega al composer

    Scenario Outline: 50.1.7-WEB Validar el límite de 300 segundos
        Given que estoy en un chat activo como consumidor
        And que tengo un audio WebM con codec Opus de <duracion> segundos
        When confirmo el audio para enviarlo
        Then la validación de duración informa "<resultado>"

        Examples:
            | duracion | resultado |
            | 301      | rechazado |
            | 300      | aceptado  |

    Scenario: 50.1.8-WEB Consumidor envía un audio en un chat activo
        Given que existe un chat activo entre el consumidor "Ana Pérez" y el prestador "Juan Gómez"
        And que estoy autenticado como consumidor
        And que tengo confirmado el audio "ruido-bomba.webm"
        When envío únicamente el audio "ruido-bomba.webm"
        Then veo la burbuja del audio en la conversación
        And la burbuja muestra su duración

    Scenario: 50.1.9-WEB Prestador envía un audio en un chat activo
        Given que existe un chat activo entre el consumidor "Ana Pérez" y el prestador "Juan Gómez"
        And que estoy autenticado como prestador
        And que tengo confirmado el audio "indicaciones-visita.webm"
        When envío únicamente el audio "indicaciones-visita.webm"
        Then veo la burbuja del audio en la conversación
        And la burbuja muestra su duración

    Scenario Outline: 50.1.10-WEB Recuperar el composer ante fallas de carga
        Given que estoy en un chat activo como consumidor
        And que la carga del audio falla durante la etapa "<etapa>"
        And que tengo seleccionado el audio "ruido-bomba.webm"
        When intento enviar el audio
        Then veo el error de carga correspondiente a "<etapa>"
        And el composer queda visible y habilitado para volver a intentar

        Examples:
            | etapa   |
            | presign |
            | PUT     |
            | confirm |

    Scenario: 50.1.11-WEB Consultar y reproducir un audio recibido con URL firmada
        Given que el chat contiene el audio recibido "ruido-bomba.webm"
        And que el audio tiene una URL firmada vigente
        When consulto el chat
        Then veo la burbuja del audio recibido
        And puedo reproducirlo usando la URL firmada

    Scenario: 50.1.12-WEB Recibir y reproducir un audio por WebSocket
        Given que estoy en el chat activo con "Juan Gómez"
        And que el WebSocket está conectado
        When recibo por WebSocket el audio "indicaciones-visita.webm"
        Then veo la nueva burbuja sin recargar la página
        And puedo reproducir el audio recibido

    @wip
    Scenario: 50.1.13-WEB Mostrar "🎤 Audio · 0:18" en el sidebar cargado y actualizado por WebSocket
        Given que el sidebar cargó una conversación cuyo último mensaje es un audio de 18 segundos
        And que el sidebar muestra exactamente "🎤 Audio · 0:18"
        And que el WebSocket está conectado
        When recibo por WebSocket un nuevo audio de 18 segundos para esa conversación
        Then el sidebar sigue mostrando exactamente "🎤 Audio · 0:18"
        And el texto también estaba visible antes del evento WebSocket

    @wip
    Scenario: 50.1.14-WEB Consumidor puede enviar un audio en una conversación pendiente
        Given que existe una conversación pendiente entre el consumidor "Ana Pérez" y el prestador "Juan Gómez"
        And que estoy autenticado como consumidor
        And que tengo confirmado el audio "detalle-perdida.webm"
        When envío únicamente el audio "detalle-perdida.webm"
        Then veo la burbuja del audio en la conversación pendiente

    @wip
    Scenario: 50.1.15-WEB Reintentar un audio después del límite de mensajes pendientes
        Given que existe una conversación pendiente como consumidor
        And que el límite de mensajes ya fue alcanzado
        And que el primer intento del audio fue rechazado por el límite
        And que el audio permanece disponible en el composer para reintentar
        When reintento enviar el audio después de liberar un cupo
        Then el audio se envía correctamente
        And el composer queda vacío

    @wip
    Scenario: 50.1.16-WEB Bloquear el audio del prestador en una conversación pendiente
        Given que existe una conversación pendiente entre el consumidor "Ana Pérez" y el prestador "Juan Gómez"
        And que estoy autenticado como prestador
        And que tengo confirmado el audio "respuesta-prestador.webm"
        When intento enviar únicamente el audio
        Then el envío permanece bloqueado hasta aceptar la solicitud
        And no se crea ninguna burbuja de audio
