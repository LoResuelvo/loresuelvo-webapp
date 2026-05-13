@wip
Feature: Registrar cuenta nueva de consumidor
  Como consumidor
  Quiero registrarme en Lo Resuelvo
  Para contratar servicios residenciales

  Background:
    Given que estoy en la página de registro de cuenta nueva

  Scenario: Ver el título de la página de registro de cuenta nueva
    Then veo el título "Crear cuenta"

  Scenario: Ver el formulario de registro de cuenta nueva
    Then veo el formulario de registro de cuenta nueva

  Scenario: Ver el subtítulo de la página de registro
    Then veo el subtítulo "Completa tus datos para comenzar"

  Scenario: Ver los campos obligatorios del formulario de registro
    Then veo el campo "Nombre"
    And veo el campo "Apellido"
    And veo el campo "Correo electrónico"
    And veo el campo "Contraseña"

  Scenario: Ver el botón para registrarse
    Then veo el botón "Crear cuenta"

  Scenario: No puedo registrarme si dejo los campos obligatorios vacíos
    When envío el formulario de registro de cuenta nueva
    Then veo un mensaje de error en el campo "Nombre"
    And veo un mensaje de error en el campo "Apellido"
    And veo un mensaje de error en el campo "Correo electrónico"
    And veo un mensaje de error en el campo "Contraseña"