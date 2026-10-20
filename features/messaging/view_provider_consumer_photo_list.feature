Feature: Foto de perfil del consumidor en el listado de conversaciones del prestador

  Scenario: 01-US42 Fotos de consumidores en el listado
    Given que soy un prestador con conversaciones pendientes y aceptadas de distintos consumidores con fotos de perfil disponibles
    When visualizo mi listado de conversaciones
    Then cada conversación muestra la foto y el nombre de su consumidor correspondiente
    And cada imagen tiene un texto alternativo que identifica al consumidor

  @wip
  Scenario Outline: 02-US42 Conversación sin foto en el listado
    Given que soy un prestador con una conversación cuya foto del consumidor llega como <valor>
    When visualizo mi listado de conversaciones
    Then esa conversación muestra el avatar de respaldo y el nombre del consumidor
    And no muestra una imagen rota
    Examples:
      | valor         |
      | campo ausente |
      | null          |
      | cadena vacía  |

  @wip
  Scenario: 03-US42 Fallo al cargar una foto del listado
    Given que soy un prestador con una conversación cuya foto del consumidor falla al cargar y otra cuya foto está disponible
    When visualizo mi listado de conversaciones
    Then la conversación afectada muestra el avatar de respaldo
    And la otra conversación conserva la foto de su consumidor
