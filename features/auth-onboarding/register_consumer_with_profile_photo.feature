Feature: Completar registro de consumidor con foto de perfil
    Como consumidor
    quiero cargar mi foto de perfil al registrarme
    para que los prestadores que me contacten puedan verme

    Background:
        Given que me registré exitosamente en Auth0 con email "consumidor@example.com"
        And elegí la opción de consumidor en la pagina de registro
        And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario

    Scenario: 01-RCF Registrar una cuenta nueva de consumidor con foto de perfil correctamente
        Given elegí la foto de perfil de consumidor "avatar.png" desde mi dispositivo
        When finalizo el registro
        Then soy redirigido al home de consumidores
        And veo mi foto de perfil en el encabezado del consumidor

    Scenario: 02-RCF Ver vista previa de la foto de perfil al cargarla
        When selecciono la foto de perfil "avatar.png" desde mi dispositivo
        Then veo una vista previa de la foto seleccionada

    Scenario: 03-RCF Registrar una cuenta nueva de consumidor sin foto de perfil
        When finalizo el registro
        Then soy redirigido al home de consumidores

    Rule: La foto de perfil debe tener formato png, jpg, jpeg o webp

        Scenario: 04-RCF Rechazar registro con foto de perfil no válida
            When selecciono la foto de perfil "archivo_invalido.pdf" desde mi dispositivo
            Then veo un mensaje de error "Formato de imagen no permitido"
            And permanezco en la página de registro

    Rule: La foto de perfil no debe superar los 5MB

        Scenario: 05-RCF Rechazar registro con foto de perfil que supera el tamaño máximo
            When selecciono la foto de perfil "imagen_grande.jpg" de 6MB desde mi dispositivo
            Then veo un mensaje de error "La imagen no debe superar los 5MB"
            And permanezco en la página de registro
