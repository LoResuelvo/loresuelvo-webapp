Feature: Registrar cuenta nueva de consumidor
  Como consumidor
  Quiero registrarme en Lo Resuelvo
  Para contratar servicios residenciales

  Scenario: 01-RCN Redirección al portal de registro como Cliente
    Given que estoy en la página de inicio
    When hago clic en el botón "Registrarse"
    Then soy redirigido al portal de autenticación de Auth0

  Scenario: 02-RCN Registro exitoso
    Given que me registré exitosamente en Auth0 con email "andy@pro.com"
    And complete mi nombre "Andres" y apellido "Colina" en la pagina de registro de LoResuelvo
    When entro al home de consumidores
    Then veo mi nombre "Andres" en el encabezado
    And veo el botón de "Cerrar sesión"

  Rule: No se puede acceder al home sin registro en Auth0

    Scenario: 03-RCN Registro en Auth0 fallido
      Given que no me registré en Auth0
      When entro al home de consumidores
      Then soy redirigido a la página de inicio

  Rule: No se puede acceder al home sin completar el registro de LoResuelvo

    @wip

    Scenario: 04-RCN Registro incompleto
      Given que me registré exitosamente en Auth0 con email "andy@pro.com"
      And no completé mis datos en la pagina de registro de LoResuelvo
      When entro al home de consumidores
      Then soy redirigido a la pantalla de registro
