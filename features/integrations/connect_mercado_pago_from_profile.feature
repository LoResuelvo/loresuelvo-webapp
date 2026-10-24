Feature: US-35.3 Vincular Mercado Pago desde Mi perfil
  Como prestador de LoResuelvo
  quiero vincular mi cuenta de Mercado Pago desde Mi perfil
  para habilitar mis cobros aunque haya omitido la vinculación durante el registro

  Scenario Outline: 01-CMPP Ver Mercado Pago según el rol y la vinculación
    Given que estoy autenticado como <rol>
    And mi cuenta de Mercado Pago para el perfil está "<estado>"
    When abro mi perfil de LoResuelvo
    Then la tarjeta de Mercado Pago en mi perfil muestra "<resultado>"

    Examples:
      | rol        | estado    | resultado                              |
      | prestador  | pending   | Sin vincular y con opción para vincular |
      | prestador  | connected | Vinculada y sin opción para vincular    |
      | consumidor | pending   | No visible                             |

  @wip
  Scenario: 02-CMPP Iniciar la vinculación desde Mi perfil
    Given que estoy autenticado como prestador
    And mi cuenta de Mercado Pago para el perfil está "pending"
    And estoy en Mi perfil con una autorización de Mercado Pago disponible
    When selecciono vincular Mercado Pago desde Mi perfil
    Then soy dirigido a la autorización existente de Mercado Pago

  @wip
  Scenario Outline: 03-CMPP Regresar a Mi perfil desde Mercado Pago
    Given que estoy autenticado como prestador
    And inicié la vinculación de Mercado Pago desde Mi perfil
    And mi cuenta de Mercado Pago para el perfil está "<estado>"
    When regreso de Mercado Pago con el resultado "<resultado>"
    Then veo Mi perfil con la vinculación de Mercado Pago "<confirmacion>"

    Examples:
      | resultado | estado    | confirmacion                    |
      | success   | connected | Confirmada por el backend       |
      | cancelled | pending   | Cancelada y con opción de retry |
