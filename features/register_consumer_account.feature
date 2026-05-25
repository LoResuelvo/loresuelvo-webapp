Feature: Registrar cuenta nueva de consumidor
  Como consumidor
  Quiero registrarme en Lo Resuelvo
  Para contratar servicios residenciales

  Scenario: 01-RCN Redirección al portal de registro como Cliente
    Given que estoy en la página de inicio
    When hago clic en el botón "Registrarse"
    Then soy redirigido al portal de autenticación de Auth0

  @wip
  Scenario: 02-RCN Registro exitoso
    Given que me registré exitosamente en Auth0 con email "andy@pro.com"
    And elegí la opción de consumidor en la pagina de registro
    And ingreso mi nombre "Andres" y apellido "Colina" en el formulario
    When hago clic en el botón "Continuar"
    Then soy redirigido al home de consumidores
    And veo mi nombre "Andres" en el encabezado
    And veo el botón de "Cerrar sesión"

  Rule: No se puede forzar el acceso al home sin haber completado el registro

    Scenario: 03-RCN Intento de acceso directo sin registro en Auth0
      Given que no me registré en Auth0
      When entro al home de consumidores
      Then soy redirigido a la página de inicio

    Scenario: 04-RCN Intento de acceso directo con registro incompleto
      Given que me registré exitosamente en Auth0 con email "andy@pro.com"
      And no completé mis datos en la pagina de registro de LoResuelvo
      When entro al home de consumidores
      Then soy redirigido a la página de registro

  Rule: El formulario de registro requiere completar todos los campos obligatorios

    @wip
    Scenario: 05-RCN Intento de registro sin nombre y apellido
      Given que me registré exitosamente en Auth0 con email "andy@pro.com"
      And elegí la opción de consumidor en la pagina de registro
      And no completé mis datos en la pagina de registro de LoResuelvo
      When hago clic en el botón "Continuar"
      Then veo un mensaje de error "Campo obligatorio"
      And permanezco en la página de registro
