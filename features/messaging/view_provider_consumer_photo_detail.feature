Feature: Foto de perfil del consumidor en el detalle de conversación del prestador

  Scenario: 01-US41 Foto del consumidor en el encabezado
    Given que soy un prestador con una conversación cuyo consumidor tiene una foto de perfil disponible
    When abro esa conversación
    Then el encabezado muestra la foto y el nombre del consumidor correspondiente
    And la imagen tiene un texto alternativo que identifica al consumidor

  Scenario Outline: 02-US41 Encabezado de consumidor sin foto
    Given que soy un prestador con una conversación cuya foto del consumidor llega como <valor>
    When abro esa conversación
    Then el encabezado muestra el avatar de respaldo y el nombre del consumidor
    And no muestra una imagen rota
    Examples:
      | valor         |
      | campo ausente |
      | null          |
      | cadena vacía  |

  Scenario: 03-US41 Fallo al cargar la foto del encabezado
    Given que soy un prestador con una conversación cuya foto del consumidor falla al cargar
    When abro esa conversación
    Then el encabezado muestra el avatar de respaldo y el nombre del consumidor
    And puedo seguir consultando los mensajes de esa conversación
