@wip
Feature: Registrar cuenta nueva de consumidor
  Como consumidor
  Quiero registrarme en Lo Resuelvo
  Para contratar servicios residenciales

  Background:
    Given que estoy en la página de registro de cuenta nueva

  Scenario: 01-RCN Ver el título de la página de registro de cuenta nueva
    Then veo el título "Crea tu cuenta"

  Scenario: 02-RCN Ver el formulario de registro de cuenta nueva
    Then veo el formulario de registro de cuenta nueva

  Scenario: 03-RCN Ver el subtítulo de la página de registro
    Then veo el subtítulo "Completa tus datos para comenzar"

  Scenario: 04-RCN Ver los campos obligatorios del formulario de registro
    Then veo el campo "Nombre"
    And veo el campo "Apellido"
    And veo el campo "Correo electrónico"
    And veo el campo "Contraseña"

  Scenario: 05-RCN Ver el botón para registrarse
    Then veo el botón "Crear cuenta"

  Scenario: 06-RCN Registrarme exitosamente
    Given completo los campos obligatorios del formulario de registro de cuenta nueva
    When envío el formulario de registro de cuenta nueva
    Then veo el mensaje de éxito "Cuenta creada exitosamente"

  Scenario: 07-RCN No puedo registrarme si dejo los campos obligatorios vacíos
    When envío el formulario de registro de cuenta nueva
    Then veo un mensaje de error en el campo "Nombre"
    And veo un mensaje de error en el campo "Apellido"
    And veo un mensaje de error en el campo "Correo electrónico"
    And veo un mensaje de error en el campo "Contraseña"