Feature: US-37 Ver mensajes como prestador
  Como prestador
  Quiero visualizar mis mensajes y solicitudes de contacto recibidas
  Para poder gestionar conversaciones iniciadas por consumidores.

  Scenario: 01-VMP Visualizar sección de mensajes
    Given que estoy en el dashboard de prestador
    When navego a la sección de mensajes del dashboard
    Then visualizo una lista de conversaciones

  Scenario: 02-VMP Listar conversaciones del prestador
    Given que tengo conversaciones asociadas a mi cuenta de prestador
    When visualizo la lista de mensajes
    Then veo todas las conversaciones asociadas a mi cuenta

  Scenario: 03-VMP Ver nombre del consumidor en conversación
    Given que tengo conversaciones pendientes y aceptadas
    When visualizo la lista de conversaciones
    Then cada conversación muestra el nombre del consumidor

  Scenario: 04-VMP Ver último mensaje intercambiado
    Given que tengo conversaciones con mensajes
    When visualizo la lista de conversaciones
    Then cada conversación muestra el último mensaje intercambiado

  Scenario: 05-VMP Ver fecha del último mensaje
    Given que tengo conversaciones con mensajes
    When visualizo la lista de conversaciones
    Then cada conversación muestra la fecha u hora del último mensaje

  @wip
  Scenario: 06-VMP Identificar conversaciones pendientes visualmente
    Given que tengo conversaciones pendientes de aceptación
    When visualizo la lista de conversaciones
    Then las conversaciones pendientes se identifican visualmente de manera distintiva

  Scenario: 07-VMP Seleccionar conversación para visualizar contenido
    Given que visualizo la lista de conversaciones
    When hago clic en una conversación
    Then se muestra el contenido completo de la conversación

  Scenario: 08-VMP RST-06 - Continuar conversación abre el chat con el consumidor
    Given que me encuentro visualizando el detalle de una solicitud pendiente
    When hago clic en "Continuar conversación"
    Then se abre el chat con el consumidor para iniciar la comunicación