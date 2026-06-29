Feature: Adjuntar imágenes del problema en el chat con la IA
    Como consumidor
    quiero adjuntar imágenes del problema
    para obtener un pre diagnóstico y facilitar la evaluación del profesional

    Background:
        Given estoy autenticado como consumidor

    # Desde el chat con el asistente (conversación existente)

    Scenario: 01-AIDI Adjuntar una imagen desde la galería del dispositivo
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        When adjunto una imagen "perdida-canilla.jpg" desde la galería
        Then veo la vista previa de la imagen "perdida-canilla.jpg" en el área de adjuntos

    Scenario: 02-AIDI Visualizar imágenes seleccionadas antes de enviarlas
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        And adjunté las imágenes "fuga-sifon.jpg" y "humedad-pared.jpg" para el diagnóstico
        When reviso las imágenes adjuntas antes de enviar
        Then veo la vista previa de la imagen "fuga-sifon.jpg" en el área de adjuntos
        And veo la vista previa de la imagen "humedad-pared.jpg" en el área de adjuntos

    Scenario: 03-AIDI Eliminar una imagen antes del envío
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        And adjunté la imagen "foto-incorrecta.jpg" para el diagnóstico
        When elimino la imagen "foto-incorrecta.jpg" del área de adjuntos
        Then la imagen "foto-incorrecta.jpg" ya no aparece en el área de adjuntos

    Scenario: 04-AIDI Enviar imágenes junto con un texto descriptivo
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        And adjunté la imagen "perdida-canilla.jpg" para el diagnóstico
        When envío el mensaje de diagnóstico "Se ve una pérdida en la conexión del sifón."
        Then el sistema muestra mi mensaje con la imagen "perdida-canilla.jpg" en el chat
        And el asistente recibe el mensaje con la imagen para procesar el diagnóstico

    Scenario: 05-AIDI Enviar imágenes sin texto adicional
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        And adjunté la imagen "detalle-conexion.jpg" para el diagnóstico
        When envío el mensaje de diagnóstico sin texto
        Then el sistema muestra mi mensaje con la imagen "detalle-conexion.jpg" en el chat

    Scenario: 06-AIDI Informar error cuando falla la carga de la imagen
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        When la carga de la imagen "foto-corrupta.jpg" falla por un error del servidor
        Then veo un mensaje de error indicando que no se pudo cargar la imagen
        And puedo reintentar la carga

    Scenario: 07-AIDI Informar error cuando falla el procesamiento de la imagen por la IA
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        And adjunté la imagen "perdida-canilla.jpg" para el diagnóstico
        When envío el mensaje de diagnóstico "¿Qué problema se observa?" y el procesamiento falla
        Then veo el mensaje del asistente "No pudimos obtener una respuesta en este momento"
        And puedo volver a intentarlo

    Scenario: 08-AIDI Rechazar imagen que supera el tamaño máximo
        Given tengo una conversación activa con el asistente de diagnóstico
        And estoy en el chat con el asistente de diagnóstico
        When adjunto una imagen "archivo-pesado.jpg" que supera los 5MB en el diagnóstico
        Then veo un mensaje de error indicando que la imagen es demasiado grande
        And la imagen no se adjunta al área de adjuntos

    # Desde la pantalla Home (inicio de nueva conversación)

    Scenario: 09-AIDI Adjuntar una imagen al iniciar un diagnóstico desde el Home
        Given me encuentro en la pantalla Home
        And adjunté la imagen "perdida-canilla.jpg" en el campo de diagnóstico
        When presiono "Diagnosticar"
        Then se inicia una conversación con el asistente
        And el sistema muestra mi mensaje con la imagen "perdida-canilla.jpg" en el chat

    Scenario: 10-AIDI Enviar imagen con texto desde el Home para iniciar diagnóstico
        Given me encuentro en la pantalla Home
        And adjunté la imagen "detalle-sifon.jpg" en el campo de diagnóstico
        When ingreso un mensaje en el campo de diagnóstico
        And presiono "Diagnosticar"
        Then se inicia una conversación con el asistente
        And veo mi mensaje en el chat
        And el sistema muestra mi mensaje con la imagen "detalle-sifon.jpg" en el chat

    Scenario: 11-AIDI Visualizar vista previa de imagen adjunta en el Home antes de diagnosticar
        Given me encuentro en la pantalla Home
        When adjunto una imagen "foto-problema.jpg" en el campo de diagnóstico desde la galería
        Then veo la vista previa de la imagen "foto-problema.jpg" en el área de adjuntos

    Scenario: 12-AIDI Eliminar imagen adjunta en el Home antes de diagnosticar
        Given me encuentro en la pantalla Home
        And adjunté la imagen "foto-incorrecta.jpg" en el campo de diagnóstico
        When elimino la imagen "foto-incorrecta.jpg" del área de adjuntos
        Then la imagen "foto-incorrecta.jpg" ya no aparece en el área de adjuntos
