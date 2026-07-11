@wip
Feature: US-54 Visualizar propuestas de servicio
  Como usuario
  Quiero ver mis propuestas de servicio
  Para revisar sus condiciones y acceder al chat

  Scenario: 01-VPS Visualizar tarjeta de propuesta con datos del prestador
    Given que estoy en la vista de propuestas como consumidor con una propuesta pendiente del prestador "Juan Gómez" con rubro "Plomería"
    When visualizo la lista de propuestas de servicio
    Then veo una tarjeta con el nombre "Juan Gómez", el rubro "Plomería" y su foto de perfil
    And la tarjeta muestra el monto "$ 15.000,50"
    And la tarjeta muestra la fecha "05/07/2026 - 09:30 hs"
    And la tarjeta muestra la descripción de la propuesta
    And la tarjeta muestra un badge de estado "Pendiente" en color amarillo
    And la tarjeta incluye un botón "Ver conversación"

  Scenario: 02-VPS Visualizar tarjeta de propuesta con datos del consumidor
    Given que estoy en la vista de propuestas como prestador con una propuesta pendiente para "Ana Pérez"
    When visualizo la lista de propuestas de servicio
    Then veo una tarjeta con el nombre "Ana Pérez" sin rubro visible
    And el nombre se centra verticalmente respecto al avatar

  Scenario: 03-VPS Visualizar propuestas con distintos estados
    Given que estoy en la vista de propuestas como consumidor con propuestas en estado "pending", "accepted" y "rejected"
    When visualizo la lista de propuestas de servicio
    Then veo un badge "Pendiente" en color amarillo
    And veo un badge "Aceptada" en color verde
    And veo un badge "Rechazada" en color rojo

  Scenario: 04-VPS Prestador ve propuestas aceptadas en Trabajos Agendados
    Given que ingreso a la HomePage como prestador con propuestas aceptadas
    When se carga la pantalla principal
    Then visualizo la sección "Trabajos Agendados"
    And visualizo una lista de trabajos agendados
    And no se muestran propuestas pendientes ni rechazadas en esa sección

  Scenario: 05-VPS Consumidor ve propuestas pendientes y aceptadas en su inicio
    Given que ingreso a la HomePage como consumidor con propuestas pendientes y aceptadas
    When se carga la pantalla principal
    Then visualizo la sección "Propuestas Pendientes"
    And visualizo la sección "Servicios Próximos"

  Scenario: 06-VPS Visualizar listado completo con filtros por estado
    Given que estoy en la vista histórica de propuestas como prestador
    When visualizo la lista de propuestas de servicio
    Then veo pestañas para filtrar por "Pendientes", "Aceptadas" y "Rechazadas"
    And las propuestas se muestran ordenadas de la más reciente a la más antigua

  Scenario: 07-VPS Filtrar propuestas por estado aceptado
    Given que estoy en la vista histórica de propuestas como prestador con propuestas en varios estados
    When selecciono la pestaña "Aceptadas"
    Then solo se muestran las propuestas con estado aceptado

  Scenario: 08-VPS Mostrar estado vacío cuando no hay propuestas
    Given que estoy en la vista histórica de propuestas como consumidor sin propuestas
    When visualizo la lista de propuestas de servicio
    Then visualizo el mensaje "No tenés propuestas de servicio"

  Scenario: 09-VPS Ver resumen de propuesta en el chat
    Given que estoy en el chat del prestador con una propuesta de servicio asociada
    When visualizo el panel de la propuesta en el chat
    Then veo los datos de la propuesta incluyendo monto, fecha, descripción y estado

  Scenario: 10-VPS Navegar al chat desde la tarjeta de propuesta
    Given que estoy en la vista histórica de propuestas como consumidor con una propuesta
    When hago clic en el botón "Ver conversación"
    Then se abre el chat asociado a esa propuesta

  Scenario: 11-VPS Redirigir a login si la sesión no es válida
    Given que no tengo una sesión válida
    When intento acceder a mis propuestas de servicio
    Then soy redirigido al flujo de autenticación
