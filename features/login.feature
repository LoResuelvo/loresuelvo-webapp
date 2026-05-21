@wip
Feature: Iniciar sesión
    Como usuario registrado
    Quiero iniciar sesión en Lo Resuelvo
    Para acceder a mis servicios y funcionalidades personalizadas

    Background:
        Given previamente me registre exitosamente con el mail "andy@pro.com", nombre "Andres" y apellido "Colina"

    Scenario: 01-LI Redirección al portal de autenticación de Auth0 para login
        Given que estoy en la página de inicio
        When hago clic en el botón "Iniciar Sesión"
        Then soy redirigido al portal de autenticación de Auth0 para iniciar sesión

    Scenario: 02-LI Inicio de sesión exitoso como cliente
        Given que me logueé exitosamente en Auth0 como cliente
        When entro al home de clientes
        Then veo mi nombre "Andres" en el encabezado
        And veo el botón de "Cerrar sesión"

    Scenario: 03-LI Inicio de sesión exitoso como prestador
        Given que me logueé exitosamente en Auth0 como prestador
        When entro al home de prestadores
        Then veo mi nombre "Andres" en el encabezado
        And veo el botón de "Cerrar sesión"

    Rule: No se puede acceder a las páginas protegidas sin iniciar sesión

        Scenario: 04-LI Intento de acceder al home de consumidores sin sesión activa
            Given que no inicié sesión en Auth0
            When entro al home de consumidores
            Then soy redirigido a la página de inicio

        Scenario: 05-LI Intento de acceder al home de prestadores sin sesión activa
            Given que no inicié sesión en Auth0
            When entro al home de prestadores
            Then soy redirigido a la página de inicio
