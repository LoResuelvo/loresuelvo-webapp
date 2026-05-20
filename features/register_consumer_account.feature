@wip
Feature: Registrar cuenta nueva de consumidor
  Como consumidor
  Quiero registrarme en Lo Resuelvo
  Para contratar servicios residenciales

  Scenario: 01-RCN Redirección al portal de registro como Cliente
    Given que estoy en la página de inicio
    When hago clic en el botón "Ser Cliente"
    Then soy redirigido al portal de autenticación de Auth0

  Scenario: 02-RCN Registro exitoso
    Given que me he registrado exitosamente en Auth0 con nombre "Andres", apellido "Colina" y email "andy@pro.com"
    When entro al home de consumidores
    Then veo mi nombre "Andres" en el encabezado

  Scenario: 03-RCN Verificación de sesión persistente
    Given que estoy autenticado
    When entro al home de consumidores
    Then veo el botón de "Cerrar sesión"
    And no veo el botón de "Registrarse"

  Scenario: 04-RCN Registro fallido
    Given que no me puedo registrar exitosamente en Auth0
    When entro al home de consumidores
    Then veo un error de permisos invalidos
