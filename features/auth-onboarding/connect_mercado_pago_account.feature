Feature: US-35.3 Conectar cuenta de Mercado Pago durante el registro
    Como prestador
    quiero conectar mi cuenta de Mercado Pago al finalizar mi registro
    para poder enviar propuestas de servicio y recibir pagos

    Background:
        Given existe el rubro Plomería
        And que me registré exitosamente en Auth0 con email "prestador@example.com"
        And elegí la opción de prestador en la pagina de registro
        And ingreso mi nombre "Juan" y apellido "Pérez" en el formulario
        And elegí el rubro "Plomería" de la lista en la pagina de registro de LoResuelvo
        And elegí la foto de perfil "avatar.png" desde mi dispositivo

    Scenario: 01-CMP Ver paso de conexión de Mercado Pago después de completar el registro
        When finalizo el registro como prestador
        Then veo la pantalla de conexión de Mercado Pago
        And veo un botón "Conectar con Mercado Pago"

    Scenario: 02-CMP Iniciar conexión con Mercado Pago exitosamente
        Given que completé el registro y estoy en el paso de conexión de Mercado Pago
        When hago clic en el botón "Conectar con Mercado Pago"
        Then soy redirigido a la página de autorización de Mercado Pago

    Scenario: 03-CMP Ver confirmación de conexión exitosa al volver de Mercado Pago
        When llego a la página de resultado de conexión con resultado "success"
        Then veo el mensaje "¡Cuenta conectada exitosamente!"
        And veo un botón "Continuar"

    Scenario: 04-CMP Continuar al home del prestador después de conexión exitosa
        Given que la conexión de Mercado Pago fue exitosa
        When hago clic en el botón "Continuar" de la página de resultado
        Then soy redirigido al home de prestadores

    Scenario: 05-CMP Ver opción de reintentar al cancelar la autorización en Mercado Pago
        When llego a la página de resultado de conexión con resultado "cancelled"
        Then veo el mensaje "La conexión fue cancelada"
        And veo un botón "Reintentar"

    Scenario: 06-CMP Reiniciar el flujo de conexión después de cancelar
        Given que la conexión de Mercado Pago fue cancelada
        When hago clic en el botón "Reintentar" de la página de resultado
        Then veo la pantalla de conexión de Mercado Pago
