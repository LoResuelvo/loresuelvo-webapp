Feature: Registrar cuenta nueva de prestador
    Como prestador
    Quiero registrarme en Lo Resuelvo
    Para poder ofrecer mis servicios a los consumidores

    Scenario: 01-RPN Registro exitoso
        Given que me registré exitosamente en Auth0 con email "andy@pro.com"
        And elegí la opción de prestador en la pagina de registro
        And complete mi nombre "Andres" y apellido "Colina" en la pagina de registro de LoResuelvo
        When entro al home de prestadores
        Then veo mi nombre "Andres" en el encabezado
        And veo el botón de "Cerrar sesión"

    Rule: No se puede acceder al home sin registro en Auth0
        Scenario: 02-RPN Registro en Auth0 fallido
            Given que no me registré en Auth0
            When entro al home de prestadores
            Then soy redirigido a la página de inicio

    Rule: No se puede acceder al home sin completar el registro de LoResuelvo

        Scenario: 03-RPN Registro incompleto
            Given que me registré exitosamente en Auth0 con email "andy@pro.com"
            And no completé mis datos en la pagina de registro de LoResuelvo
            When entro al home de prestadores
            Then soy redirigido a la página de registro