Feature: Registrar cuenta nueva de prestador
    Como prestador
    Quiero registrarme en Lo Resuelvo
    Para poder ofrecer mis servicios a los consumidores

    @wip
  Scenario: 01-RPN Registro exitoso
        Given que me registré exitosamente en Auth0 con email "andy@pro.com"
        And elegí la opción de prestador en la pagina de registro
        And ingreso mi nombre "Andres" y apellido "Colina" en el formulario
        And elegí el rubro "Plomería" de la lista en la pagina de registro de LoResuelvo
        When finalizo el registro
        Then soy redirigido al home de prestadores
        And veo mi nombre "Andres" en el encabezado

    Rule: No se puede forzar el acceso al home sin haber completado el registro
        Scenario: 02-RPN Intento de acceso directo sin registro en Auth0
            Given que no me registré en Auth0
            When entro al home de prestadores
            Then soy redirigido a la página de inicio

        Scenario: 03-RPN Intento de acceso directo con registro incompleto
            Given que me registré exitosamente en Auth0 con email "andy@pro.com"
            And no completé mis datos en la pagina de registro de LoResuelvo
            When entro al home de prestadores
            Then soy redirigido a la página de registro

    Rule: El formulario de registro requiere completar todos los campos obligatorios
        Scenario: 04-RPN Intento de registro sin nombre y apellido
            Given que me registré exitosamente en Auth0 con email "andy@pro.com"
            And elegí la opción de prestador en la pagina de registro
            And no completé mis datos en la pagina de registro de LoResuelvo
            When finalizo el registro
            Then veo un mensaje de error "Campo obligatorio"
            And permanezco en la página de registro

        Scenario: 05-RPN Intento de registro sin elegir rubro
            Given que me registré exitosamente en Auth0 con email "andy@pro.com"
            And elegí la opción de prestador en la pagina de registro
            And ingreso mi nombre "Andres" y apellido "Colina" en el formulario
            When finalizo el registro
            Then veo un mensaje de error "Debe seleccionar un rubro"
            And permanezco en la página de registro
