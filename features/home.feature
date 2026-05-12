Feature: Registrar cuenta nueva de consumidor
  Como consumidor
  Quiero ver la página de registro de cuenta nueva
  Para registrarme en el sistema

  Scenario: Ver el título de la página de registro de cuenta nueva
    Given que estoy en la página de registro de cuenta nueva
    Then veo el título "Crear cuenta"

  Scenario: Ver el formulario de registro de cuenta nueva
    Given que estoy en la página de registro de cuenta nueva
    Then veo el formulario de registro de cuenta nueva
