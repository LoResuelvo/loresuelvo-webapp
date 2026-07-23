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

    Scenario: 02-LI Inicio de sesión exitoso como cliente sin foto de perfil
        Given que me logueé exitosamente en Auth0 como cliente
        And la API devuelve mi perfil completo de consumidor sin foto
        When entro al home de clientes
        Then veo mi nombre "Andres" en el encabezado
        And veo el botón de "Cerrar sesión"

    Scenario: 03-LI Inicio de sesión exitoso como cliente con foto de perfil
        Given que me logueé exitosamente en Auth0 como cliente
        And la API devuelve mi perfil completo de consumidor con foto
        When entro al home de clientes
        Then veo mi nombre "Andres" en el encabezado
        And veo mi foto de perfil cargada en el encabezado

    Scenario: 04-LI Inicio de sesión exitoso como prestador con rubro
        Given que me logueé exitosamente en Auth0 como prestador
        And la API devuelve mi perfil completo de prestador con rubro "Plomería"
        When entro al home de prestadores
        Then veo mi nombre "Andres" en el encabezado
        And el sistema cargó la información de mi rubro

    Rule: No se puede acceder a las páginas protegidas sin iniciar sesión

        Scenario: 05-LI Intento de acceder al home de consumidores sin sesión activa
            Given que no inicié sesión en Auth0
            When entro al home de consumidores
            Then soy redirigido a la página de inicio

        Scenario: 06-LI Intento de acceder al home de prestadores sin sesión activa
            Given que no inicié sesión en Auth0
            When entro al home de prestadores
            Then soy redirigido a la página de inicio
