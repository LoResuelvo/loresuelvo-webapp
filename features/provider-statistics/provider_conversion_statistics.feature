Feature: [WEB] US-73 - Analizar la conversión de mis propuestas de servicio

  Scenario: 73.1-CON Consultar el embudo de una misma cohorte
    Given que soy un prestador autenticado con propuestas y avances informados por la API
    And algunas propuestas del período alcanzaron etapas después de su fecha de fin
    When accedo a Conversión desde Mi desempeño
    Then visualizo emitidas, contratadas, con finalización informada y con pago completo de esa cohorte
    And visualizo las tasas sobre la cohorte y la etapa anterior con sus denominadores
    And visualizo las propuestas sin contratación observada sin llamarlas rechazadas o perdidas
    And visualizo el período efectivo y el instante de observación informados
    And se explica que los resultados pueden cambiar cuando las propuestas avanzan

  Scenario: 73.2-CON Consultar propuestas creadas en otro período
    Given que estoy consultando Conversión con un rango inicial
    And seleccioné un rango válido de fechas de creación
    When aplico el rango seleccionado
    Then visualizo el embudo informado para ese nuevo conjunto de propuestas
    And el período visible corresponde a la respuesta consultada
    And no dispongo de agrupación, comparación ni evolución temporal

  Scenario Outline: 73.3-CON Rechazar un rango inválido
    Given que estoy consultando Conversión
    And seleccioné un rango <rango>
    When aplico el rango seleccionado
    Then visualizo un mensaje accesible de rango inválido
    And conservo la última consulta válida sin presentarla como resultado del rango rechazado

    Examples:
      | rango                 |
      | incompleto            |
      | invertido             |
      | mayor a 365 días      |
      | con una fecha futura  |

  @wip
  Scenario: 73.4-CON Consultar solicitudes sin mezclarlas con propuestas
    Given que la API informa una cohorte sin propuestas
    And informa solicitudes recibidas, aceptadas y pendientes dentro del período
    When consulto Conversión
    Then visualizo el bloque de solicitudes con su porcentaje de aceptación
    And ese bloque permanece visible aunque el embudo esté vacío
    And no se presenta la aceptación como contratación ni como etapa del embudo

  @wip
  Scenario Outline: 73.5-CON Distinguir una tasa no disponible de una tasa cero
    Given que la API informa <situacion>
    When consulto Conversión
    Then visualizo los conteos reales informados
    And el porcentaje correspondiente se muestra como <porcentaje>

    Examples:
      | situacion                                | porcentaje    |
      | una cohorte y solicitudes vacías          | No disponible |
      | propuestas emitidas sin contrataciones   | cero          |
      | solicitudes recibidas sin aceptaciones   | cero          |

  @wip
  Scenario: 73.6-CON Informar carga sin inventar conversión
    Given que la consulta inicial de Conversión permanece pendiente
    When accedo a Conversión
    Then visualizo un estado de carga accesible
    And no visualizo conteos cero ni ausencia de propuestas como si fueran datos recibidos

  @wip
  Scenario: 73.7-CON Reintentar una consulta fallida del mismo rango
    Given que la consulta de un rango seleccionado falló
    And visualizo un error seguro y el rango que no pudo consultarse
    And la API vuelve a estar disponible
    When selecciono Reintentar
    Then visualizo la respuesta del mismo rango solicitado
    And el error no se presenta como conversión cero

  @wip
  Scenario: 73.8-CON Conservar el resultado de la consulta más reciente
    Given que una consulta de un rango anterior sigue pendiente
    And seleccioné un rango nuevo cuya respuesta llega primero
    When aplico el rango nuevo
    Then visualizo la respuesta y los límites efectivos del rango nuevo
    And una respuesta tardía del rango anterior no reemplaza esa información

  @wip
  Scenario Outline: 73.9-CON Restringir el acceso a conversión privada
    Given que mi sesión es <sesion>
    When intento acceder a Conversión
    Then se aplica el control de acceso existente
    And no visualizo estadísticas privadas de un prestador

    Examples:
      | sesion           |
      | inexistente      |
      | de un consumidor |
