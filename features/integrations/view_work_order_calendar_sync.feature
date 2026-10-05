Feature: [WEB] US-22 - Consultar la vinculación de Google Calendar en mis órdenes

  Scenario Outline: 22.1-COT Mostrar que Google Calendar está vinculado
    Given que soy un participante autenticado con rol <rol>
    And la API informa que mi cuenta de Google Calendar está conectada
    When consulto una orden propia en <superficie>
    Then visualizo "Google Calendar vinculado"
    And no visualizo una confirmación de sincronización de esa cita

    Examples:
      | rol        | superficie             |
      | consumidor | el listado de turnos   |
      | prestador  | el listado de turnos   |
      | consumidor | el detalle de la orden |
      | prestador  | el detalle de la orden |

  Scenario Outline: 22.3-COT Invitar a vincular una cuenta desconectada
    Given que soy un participante autenticado con rol <rol>
    And la API informa que mi cuenta de Google Calendar está desconectada
    When consulto el detalle de una orden propia
    Then visualizo una invitación para vincular Google Calendar
    And dispongo de un enlace a Mi perfil dentro de mi rol

    Examples:
      | rol        |
      | consumidor |
      | prestador  |

  Scenario Outline: 22.4-COT Informar que la cuenta requiere atención
    Given que soy un participante autenticado con rol <rol>
    And la API informa que mi conexión de Google Calendar requiere atención
    When consulto el detalle de una orden propia
    Then visualizo que debo reautorizar mi cuenta de Google Calendar
    And dispongo de la acción "Reautorizar Google Calendar"

    Examples:
      | rol        |
      | consumidor |
      | prestador  |

  @wip
  Scenario: 22.5-COT Iniciar la reautorización desde la orden
    Given que mi conexión de Google Calendar requiere atención
    And estoy viendo el detalle de una orden propia
    And Google Calendar está disponible para iniciar la autorización
    When selecciono "Reautorizar Google Calendar"
    Then soy redirigido al consentimiento de Google mediante el flujo existente

  @wip
  Scenario: 22.6-COT Recuperarse de una falla al iniciar la reautorización
    Given que estoy viendo una orden propia cuya conexión de Calendar requiere atención
    And el inicio de autorización de Google Calendar no está disponible
    When selecciono "Reautorizar Google Calendar"
    Then visualizo un mensaje de error seguro
    And puedo reintentar la autorización sin perder el contexto de la orden

  @wip
  Scenario: 22.7-COT No inventar estados mientras se consulta la cuenta
    Given que la consulta del estado de mi cuenta permanece pendiente
    When consulto el detalle de una orden propia
    Then visualizo que el estado de Google Calendar se está cargando
    And no visualizo un estado de vinculación supuesto

  @wip
  Scenario: 22.8-COT No confundir una falla de consulta con una cuenta desconectada
    Given que la consulta del estado de mi cuenta falla temporalmente
    When consulto el detalle de una orden propia
    Then visualizo un error seguro al consultar el estado de Google Calendar
    And no visualizo una confirmación de vinculación ni una invitación basada en un estado supuesto
