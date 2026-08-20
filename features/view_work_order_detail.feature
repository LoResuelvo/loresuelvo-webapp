Feature: US-27 Consultar detalle y evidencia de una orden de trabajo
  Como participante de una orden de trabajo
  Quiero consultar su detalle y la evidencia presentada
  Para verificar el trabajo antes del pago y conservar el historial contractual

  Background:
    Given que soy un consumidor autenticado con una propuesta de servicio aceptada

  Scenario: 01-VWOD Consumidor visualiza el detalle de una orden programada
    Given que la orden de trabajo está en estado "scheduled"
    When abro el detalle de la orden de trabajo
    Then veo el monto acordado, la fecha programada y la descripción del servicio
    And veo el estado "Programada"
    And no veo la sección de evidencia de finalización

  Scenario: 02-VWOD Consumidor visualiza evidencia en orden pendiente de pago
    Given que la orden de trabajo está en estado "awaiting_payment" con evidencia de finalización
    When abro el detalle de la orden de trabajo
    Then veo el estado "Pendiente de pago"
    And veo la sección "Evidencia de finalización"
    And veo la descripción de entrega del prestador
    And veo 2 fotos de evidencia

  Scenario: 03-VWOD Ampliar foto de evidencia en lightbox
    Given que la orden de trabajo está en estado "awaiting_payment" con evidencia de finalización
    And tengo abierto el detalle de la orden de trabajo
    When hago clic en una foto de evidencia
    Then se abre la foto ampliada en el visor de imágenes

  Scenario: 04-VWOD Prestador visualiza orden pagada con evidencia y fecha de pago
    Given que soy un prestador autenticado con una propuesta de servicio aceptada
    And que la orden de trabajo está en estado "paid" con evidencia de finalización
    When abro el detalle de la orden de trabajo
    Then veo el estado "Pagada"
    And veo la fecha de pago registrada
    And veo la sección "Evidencia de finalización"

  Scenario: 05-VWOD Indicador de carga al abrir el detalle
    Given que la consulta de la orden de trabajo demora en responder
    When abro el detalle de la orden de trabajo
    Then veo un indicador de carga en el detalle

  Scenario: 06-VWOD Mensaje de error cuando falla la consulta de la orden
    Given que el servidor responde con error al consultar el detalle de la orden
    When abro el detalle de la orden de trabajo
    Then veo un mensaje de error al cargar el detalle

  @wip
  Scenario: 07-VWOD Visualizar calificación y reseña previa en orden pagada
    Given que la orden de trabajo está en estado "paid" con reseña de 5 estrellas
    When abro el detalle de la orden de trabajo
    Then veo la calificación con 5 estrellas
    And veo el comentario de la reseña
