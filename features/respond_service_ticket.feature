Feature: Responder solicitud de trabajo
  Como prestador
  Quiero responder solicitudes de trabajo recibidas mediante el chat
  Para poder aceptar el contacto inicial y comenzar a conversar con el consumidor.

  @wip
  Scenario: 01-RST Visualizar solicitud pendiente
    Given que un consumidor inició una conversación conmigo
    And aún no respondí la solicitud
    When accedo a la página de inicio
    Then visualizo la solicitud como pendiente
    And visualizo la cantidad de mensajes sin leer en la conversación
    And visualizo un botón para ver la solicitud pendiente


  @wip
  Scenario: 02-RST Aceptar solicitud pendiente
    Given que existe una conversación pendiente
    And Estoy en la página de inicio
    And Existe una conversación pendiente
    When Presiono el botón para aceptar la solicitud pendiente
    Then Visualizo la conversación con el consumidor
    And Puedo comenzar a conversar con el consumidor

  @wip
  Scenario: 03-RST Rechazar solicitud pendiente
    Given que existe una conversación pendiente
    And Estoy en la página de inicio
    And Existe una conversación pendiente
    When Presiono el botón para rechazar la solicitud pendiente
    Then Soy redireccionado a la página de inicio
    And La solicitud pendiente ya no se visualiza en la página de inicio
    And No puedo visualizar la conversación con el consumidor