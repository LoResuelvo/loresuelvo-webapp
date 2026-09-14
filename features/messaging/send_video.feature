Feature: 50.2 Enviar videos por el chat web
    Como participante de un chat de trabajo
    quiero enviar y reproducir videos
    para mostrar el problema o explicar el servicio

    Scenario Outline: 50.2.1-WEB Seleccionar y revisar un video permitido
        Given que estoy en un chat activo y abrí el menú de adjuntos
        And que el video "perdida.mp4" es MP4 H.264 con "<sonido>"
        And que tiene <bytes> bytes, <duracion> segundos y dimensiones <ancho> por <alto> píxeles
        When selecciono el video "perdida.mp4"
        Then veo su miniatura, nombre y duración en la vista previa
        And puedo reproducirlo antes de enviarlo
        And puedo escribir un texto para acompañarlo

        Examples:
            | sonido    | bytes    | duracion | ancho | alto |
            | audio AAC | 1048576  | 17       | 1920  | 1080 |
            | sin audio | 1048576  | 17       | 1080  | 1920 |
            | audio AAC | 52428800 | 120      | 1920  | 1920 |

    Scenario: 50.2.2-WEB Quitar un video sin perder el texto
        Given que tengo seleccionado "perdida.mp4" con el texto "La pérdida está aquí"
        When quito el video de la vista previa
        Then desaparece la vista previa del video
        And se conserva el texto "La pérdida está aquí"
        And no se crea ningún mensaje de video

    Scenario: 50.2.3-WEB Reemplazar el video seleccionado
        Given que tengo seleccionado "perdida.mp4" con el texto "La pérdida está aquí"
        When selecciono otro video permitido llamado "detalle.mp4"
        Then la vista previa muestra únicamente "detalle.mp4"
        And se conserva el texto "La pérdida está aquí"
        And todavía no se ha enviado ningún video

    Scenario Outline: 50.2.4-WEB Informar por qué un archivo no puede adjuntarse
        Given que estoy en un chat activo con un borrador de texto
        And que el archivo seleccionado presenta "<problema>"
        When intento adjuntar el archivo
        Then veo un mensaje en español que indica "<motivo>"
        And el archivo no queda disponible para enviar
        And se conserva mi borrador de texto
        And puedo seleccionar otro video

        Examples:
            | problema                         | motivo                                      |
            | formato WebM                     | se requiere un video MP4                    |
            | archivo vacío                    | el archivo está vacío                       |
            | tamaño de 52428801 bytes         | supera el máximo de 50 MiB                   |
            | duración de 121 segundos         | supera el máximo de 120 segundos             |
            | ancho de 1921 píxeles            | supera el máximo de 1920 píxeles por lado     |
            | alto de 1921 píxeles             | supera el máximo de 1920 píxeles por lado     |
            | archivo dañado o ilegible        | no se pudo preparar el video                 |
            | duración desconocida o inválida  | no se pudo preparar el video                 |

    Scenario Outline: 50.2.5-WEB Evitar combinar adjuntos incompatibles
        Given que estoy en un chat activo con "<actual>" seleccionado y un borrador de texto
        When intento agregar "<nuevo>"
        Then veo que debo quitar el adjunto actual para agregar el nuevo
        And se conservan el adjunto actual y mi borrador de texto
        And no se agrega el adjunto incompatible

        Examples:
            | actual        | nuevo         |
            | imagen        | video         |
            | audio adjunto | video         |
            | audio grabado | video         |
            | video         | imagen        |
            | video         | audio adjunto |
            | video         | audio grabado |

    Scenario Outline: 50.2.6-WEB Enviar un video en un chat activo
        Given que estoy autenticado como "<rol>" en un chat activo
        And que tengo seleccionado un video permitido de 17 segundos con "<sonido>"
        And que el campo de texto contiene "<texto>"
        When envío el mensaje
        Then veo un único mensaje propio con miniatura, botón de reproducción y duración "0:17"
        And el mensaje muestra el texto "<texto>" cuando no está vacío
        And se vacían el campo de texto y la selección de video

        Examples:
            | rol        | sonido    | texto                         |
            | consumidor | audio AAC |                               |
            | consumidor | audio AAC | La pérdida está aquí          |
            | prestador  | audio AAC |                               |
            | prestador  | audio AAC | Así quedaría la reparación    |
            | consumidor | sin audio |                               |
            | prestador  | sin audio | Te muestro el resultado       |

    Scenario: 50.2.7-WEB Mostrar que el video se está enviando
        Given que tengo un video listo para enviar en un chat activo
        And que el envío tarda en completarse
        When envío el mensaje
        Then veo una indicación de que el envío está en curso
        And no puedo iniciar otro envío mientras el actual está en curso
        And el video todavía no aparece como enviado correctamente

    Scenario Outline: 50.2.8-WEB Conservar el borrador cuando el video no se envía
        Given que tengo seleccionado "perdida.mp4" con el texto "La pérdida está aquí"
        And que el servicio no puede enviar el mensaje debido a "<situacion>"
        And que la falla no crea un mensaje
        When intento enviar el mensaje
        Then veo un error en español que explica "<motivo>"
        And se conservan el video y el texto para reintentar o cambiar el archivo
        And el campo de mensaje vuelve a estar habilitado
        And no queda ningún mensaje marcado como enviado correctamente

        Examples:
            | situacion                                  | motivo                                        |
            | no se puede iniciar la carga               | no se pudo iniciar la carga del video          |
            | se interrumpe la transferencia             | no se pudo cargar el video                     |
            | no se puede completar la carga             | no se pudo completar la carga del video        |
            | el chat rechaza el envío                   | no se pudo enviar el mensaje                   |
            | el video MP4 usa un codec distinto de H.264 | se requiere MP4 H.264 con audio AAC opcional    |
            | la pista de audio usa un codec no permitido| se requiere MP4 H.264 con audio AAC opcional    |

    Scenario: 50.2.9-WEB Reintentar un envío fallido
        Given que el primer envío del video y su texto falló sin crear un mensaje
        And que el borrador permanece disponible y la causa de la falla se resolvió
        When reintento enviar el mensaje
        Then veo un único mensaje enviado con el video y su texto
        And se vacían el campo de texto y la selección de video

    Scenario Outline: 50.2.10-WEB Consultar videos del historial
        Given que el chat contiene un video de 17 segundos "<origen>" con el texto "<texto>"
        When abro nuevamente ese chat
        Then veo el video como mensaje "<tipo>" con miniatura, botón de reproducción y duración "0:17"
        And se muestra el texto "<texto>" cuando no está vacío
        And el video no comienza a reproducirse automáticamente

        Examples:
            | origen          | tipo     | texto                         |
            | enviado por mí  | propio   |                               |
            | enviado por mí  | propio   | La pérdida está aquí          |
            | recibido        | recibido |                               |
            | recibido        | recibido | Así quedaría la reparación    |

    Scenario Outline: 50.2.11-WEB Abrir y reproducir un video en el visor
        Given que veo un video "<orientacion>" que se puede reproducir
        And que uso una pantalla "<pantalla>"
        When activo el botón de reproducción del video
        Then se abre un visor amplio sobre fondo oscuro
        And puedo reproducir, pausar, avanzar y ajustar el volumen con los controles del video
        And veo el video completo conservando su proporción
        And los controles y el cierre quedan accesibles sin desplazamiento horizontal

        Examples:
            | orientacion | pantalla       |
            | horizontal  | mobile angosta |
            | vertical    | mobile angosta |
            | horizontal  | tablet         |
            | vertical    | tablet         |
            | horizontal  | desktop        |
            | vertical    | desktop        |

    Scenario Outline: 50.2.12-WEB Cerrar el visor y detener la reproducción
        Given que abrí el visor desde el botón de un video
        And que el video está reproduciéndose
        When cierro el visor usando "<accion>"
        Then desaparece el visor y deja de escucharse o reproducirse el video
        And el foco vuelve al botón que abrió el visor

        Examples:
            | accion          |
            | botón de cerrar |
            | tecla Escape    |

    Scenario Outline: 50.2.13-WEB Informar que un video no puede reproducirse
        Given que veo la tarjeta de un video del chat
        And que el video no se puede reproducir por "<problema>"
        When abro el video
        Then veo un mensaje en español indicando que no se pudo cargar o reproducir el video
        And puedo reintentar o cerrar el visor

        Examples:
            | problema                          |
            | el acceso al archivo venció       |
            | el archivo no está disponible     |
            | se perdió la conexión             |
            | el navegador no puede reproducirlo|

    Scenario Outline: 50.2.14-WEB Reintentar la reproducción de un video
        Given que el visor muestra un error de reproducción
        And que el video está "<disponibilidad>" al volver a cargarlo
        When reintento cargar el video
        Then veo "<resultado>"
        And no se crea ningún mensaje nuevo

        Examples:
            | disponibilidad       | resultado                                                    |
            | disponible nuevamente| el video listo para reproducir                               |
            | todavía inaccesible  | un error con las opciones de volver a intentar o cerrar       |

    @wip
    Scenario Outline: 50.2.15-WEB Recibir un video sin recargar la página
        Given que estoy usando la sección de mensajes
        And que la conversación que recibirá el video está "<estado>"
        When la otra persona envía un video de 18 segundos a esa conversación
        Then veo "<resultado>"
        And esa conversación muestra "Video · 0:18" como último mensaje en la lista
        And puedo consultar el video desde su conversación

        Examples:
            | estado                    | resultado                                      |
            | abierta                   | la nueva tarjeta de video en el chat           |
            | fuera del chat que miro   | que el chat que estoy mirando no cambia        |

    @wip
    Scenario Outline: 50.2.16-WEB Reconocer un video en la lista de conversaciones
        Given que el último mensaje de una conversación es un video de 17 segundos "<acompanamiento>"
        When consulto la lista de conversaciones
        Then esa conversación muestra el ícono de video y el texto "Video · 0:17"

        Examples:
            | acompanamiento |
            | sin texto      |
            | con texto      |

    @wip
    Scenario Outline: 50.2.17-WEB Enviar un video como consumidor en una conversación pendiente
        Given que estoy autenticado como consumidor en una conversación pendiente existente
        And que ya envié <cantidad> mensajes en esa conversación
        And que tengo un video permitido con un texto listo para enviar
        When intento enviar el mensaje
        Then veo "<resultado>"
        And el borrador queda "<borrador>"

        Examples:
            | cantidad | resultado                                             | borrador                       |
            | 4        | el mensaje propio de video enviado                    | vacío                          |
            | 5        | un aviso de que alcancé el límite de mensajes pendientes| conservado con video y texto   |

    @wip
    Scenario: 50.2.18-WEB Reintentar tras alcanzar el límite de mensajes pendientes
        Given que estoy en una conversación pendiente como consumidor
        And que un envío de video fue rechazado por el límite de mensajes sin crear un mensaje
        And que conservé el video y el texto y ahora hay cupo
        When reintento enviar el mensaje
        Then veo un único mensaje enviado con el video y el texto
        And se vacían el campo de texto y la selección de video

    @wip
    Scenario: 50.2.19-WEB Bloquear al prestador hasta aceptar la solicitud
        Given que estoy autenticado como prestador en una conversación pendiente
        When intento adjuntar un video
        Then veo que debo aceptar la solicitud antes de enviar mensajes
        And no puedo iniciar el envío del video

    @wip
    Scenario: 50.2.20-WEB Evitar trasladar un video pendiente a otro chat
        Given que tengo un video seleccionado en el chat con "Juan Gómez"
        When cambio al chat con otra persona
        Then el video de "Juan Gómez" no aparece en el campo de mensaje del nuevo chat
        And no se envía ningún video a la otra persona por cambiar de chat
