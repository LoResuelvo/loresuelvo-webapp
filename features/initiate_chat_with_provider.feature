Feature: Iniciar conversación con un prestador
  Como consumidor
  Quiero enviar un mensaje de solicitud de contacto a un prestador con el que nunca interactué
  Para proponerle un trabajo e iniciar un chat

  Scenario: 01-IC Verificar logo de mensaje en resultados de búsqueda
    Given que estoy buscando prestadores por rubro
    When visualizo la lista de resultados
    Then veo un logo de mensaje para contactarlos

  Scenario: 02-IC Redirigir a pantalla de chats al iniciar conversación
    Given que quiero iniciar chat con un prestador desde los resultados de búsqueda
    When hago clic en el botón "Contactar" del prestador
    Then soy redirigido a la pantalla de mensajes para continuar la conversación

  @wip
  Scenario: 03-IC Verificar que el prestador aparece como contacto después del primer mensaje
    Given que ya envié un mensaje a un prestador
    When accedo a la sección de mensajes
    Then visualizo al prestador como contacto en mi lista

  @wip
  Scenario: 04-IC Verificar notificación de solicitud pendiente
    Given que inicié un chat con un prestador
    And el prestador aún no aceptó la conversación
    When visualizo el estado del contacto
    Then veo una notificación indicando que el prestador todavía no aceptó mi solicitud

  @wip
  Scenario: 05-IC Verificar que el consumidor puede enviar más mensajes mientras el prestador no acepte
    Given que inicié un chat con un prestador y no fue aceptado
    When escribo un nuevo mensaje
    Then puedo enviar mensajes adicionales al prestador sin restricciones