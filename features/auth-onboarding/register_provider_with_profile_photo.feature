Feature: Completar registro de prestador con foto de perfil
    Como prestador
    quiero cargar mi foto de perfil al registrarme
    para que la gente que me contrate pueda verme

    Background:
        Given existe el rubro Plomería
        And que me registré exitosamente en Auth0 con email "prestador@example.com"
        And elegí la opción de prestador en la pagina de registro
        And ingreso mi nombre "Juan" y apellido "Pérez" en el formulario
        And elegí el rubro "Plomería" de la lista en la pagina de registro de LoResuelvo

    @wip
    Scenario: 01-RPP Registrar una cuenta nueva de prestador con foto de perfil correctamente
        Given elegí la foto de perfil "avatar.png" desde mi dispositivo
        When finalizo el registro
        Then soy redirigido al home de prestadores
        And veo mi foto de perfil en el encabezado

    Scenario: 02-RPP Ver vista previa de la foto de perfil al cargarla
        When selecciono la foto de perfil "avatar.png" desde mi dispositivo
        Then veo una vista previa de la foto seleccionada

    Rule: El prestador debe cargar una foto de perfil

        Scenario: 03-RPP Rechazar registro sin foto de perfil
            When finalizo el registro
            Then veo un mensaje de error "La foto de perfil es obligatoria"
            And permanezco en la página de registro

    Rule: La foto de perfil debe tener formato png, jpg, jpeg o webp

        Scenario: 04-RPP Rechazar registro con foto de perfil no válida
            When selecciono la foto de perfil "archivo_invalido.pdf" desde mi dispositivo
            Then veo un mensaje de error "Formato de imagen no permitido"
            And permanezco en la página de registro

    Rule: La foto de perfil no debe superar los 5MB

        Scenario: 05-RPP Rechazar registro con foto de perfil que supera el tamaño máximo
            When selecciono la foto de perfil "imagen_grande.jpg" de 6MB desde mi dispositivo
            Then veo un mensaje de error "La imagen no debe superar los 5MB"
            And permanezco en la página de registro
