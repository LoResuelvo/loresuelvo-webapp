Feature: Notificaciones en tiempo real para servicios
  Como usuario autenticado de Lo Resuelvo
  Quiero recibir notificaciones en tiempo real
  Para ver la información de mis servicios actualizada al instante y acceder a recordatorios clave

  Background:
    Given que el sistema de mensajería en tiempo real está activo

  Scenario: 01-NOTIF El prestador recibe una solicitud de trabajo en vivo y la ve en su lista sin recargar
    Given que estoy autenticado como prestador en el inicio de prestador
    When recibo una notificación de nueva solicitud de trabajo para "Reparación de filtración"
    Then veo la solicitud "Reparación de filtración" en la lista de solicitudes pendientes sin recargar la página

  Scenario: 02-NOTIF El consumidor recibe una propuesta de servicio en vivo y la ve en su listado sin recargar
    Given que estoy autenticado como consumidor en mis servicios
    When recibo una notificación de nueva propuesta de servicio para "Instalación de grifería"
    Then veo la propuesta de servicio "Instalación de grifería" en la lista de pendientes sin recargar la página

  Scenario: 03-NOTIF El prestador ve la propuesta aceptada en su listado de trabajos sin recargar
    Given que estoy autenticado como prestador en mis trabajos con una propuesta pendiente
    When recibo una notificación de propuesta aceptada
    Then veo la propuesta reflejada en los trabajos aceptados sin recargar la página

  Scenario: 04-NOTIF El consumidor ve el detalle de la orden actualizado al informarse la finalización sin recargar
    Given que estoy autenticado como consumidor con el detalle de una orden de trabajo abierta
    When recibo una notificación de finalización de la orden de trabajo
    Then veo el estado de la orden actualizado a completada sin recargar la página

  Scenario: 05-NOTIF El prestador ve el detalle de la orden actualizado al aprobarse el pago final sin recargar
    Given que estoy autenticado como prestador con el detalle de una orden de trabajo abierta
    When recibo una notificación de pago final aprobado para esa orden
    Then veo el estado de la orden actualizado a pagada sin recargar la página

  Scenario: 06-NOTIF El usuario recibe un recordatorio de servicio próximo y puede abrir la orden desde el aviso
    Given que estoy autenticado en la aplicación
    When recibo una notificación de servicio próximo a iniciar para una orden de trabajo
    Then veo un aviso en pantalla indicando que el servicio está próximo a iniciar
    And puedo interactuar con la acción para abrir el detalle de la orden

  Scenario: 07-NOTIF El usuario recibe un aviso de reautorización de calendario y puede iniciar el flujo
    Given que estoy autenticado en la aplicación
    When recibo una notificación de reautorización requerida para Google Calendar
    Then veo un aviso en pantalla indicando que se requiere reautorizar Google Calendar
    And puedo interactuar con la acción para reautorizar la cuenta

  Scenario: 08-NOTIF Un evento repetido no duplica el recurso visible ni el aviso en pantalla
    Given que estoy autenticado en la aplicación
    When recibo la misma notificación de recordatorio más de una vez
    Then la pantalla permanece utilizable y no se muestra un aviso duplicado

  Scenario: 09-NOTIF Un evento desconocido o con estructura inválida es ignorado sin afectar la aplicación
    Given que estoy autenticado en la aplicación
    When recibo un evento con tipo desconocido o estructura inválida por WebSocket
    Then la pantalla permanece utilizable y los recursos existentes se conservan intactos

  Scenario: 10-NOTIF Un fallo de red al refrescar tras una notificación conserva los datos visibles y permite recuperarse
    Given que tengo abierto el detalle de una orden de trabajo con datos previamente cargados
    When falla la actualización remota disparada tras recibir una notificación de la orden
    Then se conservan visibles los datos previos de la orden y se muestra una opción para reintentar
