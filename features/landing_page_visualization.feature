Feature: Crear pantalla de bienvenida para usuarios
    Como usuario
    Quiero visualizar una pantalla de bienvenida clara y moderna al abrir la aplicación
    Para poder acceder fácilmente al registro o inicio de sesión

    Background:
        Given no estoy logueado

    Scenario: 01-LPV Visibilidad de elementos de bienvenida
        When entro a la landing page
        Then veo el título "LoResuelvo"

    Scenario: 02-LPV Visibilidad de botón de registro
        When entro a la landing page
        Then veo el botón "Registrarse"

    Scenario: 03-LPV Visibilidad de botón de inicio de sesión
        When entro a la landing page
        Then veo el botón "Iniciar Sesión"

    Scenario: 04-LPV Ver footer
        When entro a la landing page
        Then veo el footer
        And veo el texto "LoResuelvo ©2026 Todos los derechos reservados"

