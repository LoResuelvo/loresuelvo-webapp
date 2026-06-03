Feature: US-43 Responder solicitudes de trabajo
  Como prestador
  Quiero visualizar y responder solicitudes de trabajo pendientes
  Para aceptar o rechazar el contacto inicial con el consumidor.

  Scenario: 01-RST Visualizar solicitudes pendientes
    Given que existen solicitudes de trabajo pendientes para mí
    When accedo al dashboard de prestador
    Then visualizo las solicitudes pendientes en la sección "Solicitudes de Trabajo"

  Scenario: 02-RST Abrir detalle de solicitud
    Given que visualizo una solicitud pendiente
    When hago clic en "Ver solicitud"
    Then se muestra el detalle de la solicitud
    And visualizo:
      | Campo              |
      | nombre del consumidor |
      | ubicación           |
      | fecha de creación   |
      | categoría           |
      | descripción del problema |

  Scenario: 03-RST Aceptar solicitud
    Given que me encuentro visualizando el detalle de una solicitud pendiente
    When hago clic en "Aceptar Solicitud"
    Then la solicitud cambia a estado aceptada
    And deja de aparecer en la lista de solicitudes pendientes

  Scenario: 04-RST Rechazar solicitud
    Given que me encuentro visualizando el detalle de una solicitud pendiente
    When hago clic en "Rechazar Solicitud"
    Then la solicitud cambia a estado rechazada
    And deja de aparecer en la lista de solicitudes pendientes

  Scenario: 05-RST Cerrar detalle de solicitud
    Given que estoy visualizando el detalle de una solicitud
    When cierro la ventana de detalle
    Then regreso al dashboard de prestador
    And continúo visualizando la lista de solicitudes pendientes
  @wip
  Scenario: 06-RST Aceptar solicitud abre el chat con el consumidor
    Given que me encuentro visualizando el detalle de una solicitud pendiente
    When hago clic en "Aceptar Solicitud"
    Then se abre el chat con el consumidor para iniciar la comunicación