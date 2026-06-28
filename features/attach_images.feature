@wip
Feature: 50 Adjuntar imágenes en el chat con un prestador
    Como participante de un chat de trabajo
    quiero adjuntar imágenes a mis mensajes
    para mostrar el problema o compartir información visual con la otra parte

    Background:
        Given que existe un chat activo entre el consumidor "Ana Pérez" y el prestador "Juan Gómez"

    Scenario: 50.1-AICP Consumidor envía un mensaje con una imagen
        Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
        And que adjunté la imagen "perdida-bajo-mesada.jpg"
        When envío el mensaje "La pérdida se ve en esta conexión debajo de la pileta."
        Then el sistema registra y muestra el mensaje con la imagen "perdida-bajo-mesada.jpg"

    Scenario: 50.2-AICP Prestador envía un mensaje con una imagen
        Given que estoy en el chat con el consumidor "Ana Pérez" como prestador
        And que adjunté la imagen "repuesto-recomendado.png"
        When envío el mensaje "Este es el repuesto que probablemente necesitemos."
        Then el sistema registra y muestra el mensaje con la imagen "repuesto-recomendado.png"

    Scenario: 50.3-AICP Enviar un mensaje compuesto solamente por imágenes
        Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
        And que adjunté la imagen "detalle-sifon.webp"
        When envío el mensaje sin texto
        Then el sistema registra y muestra el mensaje con la imagen "detalle-sifon.webp"

    Scenario: 50.4-AICP Enviar más de una imagen en el mismo mensaje
        Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
        And que adjunté las imágenes "vista-general-cocina.jpg" y "detalle-conexion.jpg"
        When envío el mensaje "Te envío una vista general y un detalle de la conexión."
        Then el sistema registra y muestra el mensaje con las imágenes "vista-general-cocina.jpg" y "detalle-conexion.jpg"

    Scenario: 50.5-AICP La contraparte consulta un mensaje con imágenes
        Given que estoy en el chat con el consumidor "Ana Pérez" como prestador
        And que el consumidor envió un mensaje con la imagen "perdida-bajo-mesada.jpg"
        Then el detalle del mensaje en pantalla incluye la imagen "perdida-bajo-mesada.jpg"

    Scenario: 50.6-AICP La contraparte recibe en tiempo real un mensaje con imágenes
        Given que estoy en el chat con el consumidor "Ana Pérez" como prestador
        When el consumidor "Ana Pérez" me envía un mensaje con la imagen "perdida-bajo-mesada.jpg"
        Then veo el mensaje con la imagen "perdida-bajo-mesada.jpg" en la pantalla del chat sin recargar la página

    Scenario: 50.7-AICP Rechazar archivo muy grande
        Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
        When adjunto la imagen "archivo-pesado.jpg" que supera los 5MB
        Then veo un mensaje de error indicando que la imagen es muy grande
        And la imagen no se adjunta al mensaje

    Scenario: 50.8-AICP Eliminar imagen adjunta antes de enviar
        Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
        And que adjunté la imagen "perdida-bajo-mesada.jpg"
        And que eliminé la imagen "perdida-bajo-mesada.jpg" de los archivos adjuntos
        When envío el mensaje "Solo texto"
        Then el mensaje se envía sin imágenes
