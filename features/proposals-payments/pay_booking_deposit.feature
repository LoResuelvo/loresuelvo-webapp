Feature: Pagar la reserva de una propuesta de servicio
  Como consumidor autenticado
  Quiero pagar la reserva de una propuesta pendiente
  Para confirmar la contratación del prestador de forma segura

  Background:
    Given que soy un consumidor autenticado con una propuesta de servicio pendiente

  Scenario: 01-PRPS Mostrar el desglose y la acción de pago de una propuesta pendiente
    When consulto el detalle de la propuesta
    Then veo una reserva de "$ 20.000,00"
    And veo una comisión de "$ 1.000,00"
    And veo un total a pagar de "$ 21.000,00"
    And veo la acción "Pagar reserva"

  Scenario Outline: 02-PRPS Crear o recuperar un checkout activo
    Given que el checkout de la propuesta responde con estado HTTP <httpStatus>
    When elijo pagar la reserva
    Then se conserva el contexto del pago de reserva en esta sesión
    And soy redirigido exactamente a la URL de checkout informada por el servicio

    Examples:
      | httpStatus |
      | 201        |
      | 200        |

  Scenario: 03-PRPS Evitar solicitudes duplicadas al iniciar el pago
    Given que la creación del checkout está en curso
    When intento pagar la reserva dos veces
    Then la acción de pago permanece deshabilitada durante la solicitud
    And se solicita un único checkout para la propuesta

  Scenario: 04-PRPS Confirmar el pago usando la referencia del retorno
    Given que regreso por la ruta de pago exitoso con la referencia externa del pago
    And el estado verificado cambia de "checkout_ready" a "paid"
    When se consulta el resultado del pago
    Then veo el mensaje "Pago de reserva confirmado"
    And la propuesta y los listados relacionados reflejan la confirmación
    And puedo volver a mis propuestas

  Scenario: 05-PRPS Recuperar el pago guardado cuando el retorno no incluye una referencia
    Given que regreso por la ruta de pago pendiente sin referencia externa
    And existe un pago de reserva activo guardado en esta sesión
    And el estado verificado cambia de "processing" a "paid"
    When se consulta el resultado del pago
    Then veo el mensaje "Pago de reserva confirmado"

  Scenario Outline: 06-PRPS Mostrar un resultado terminal verificado
    Given que regreso desde Mercado Pago por la ruta de pago <returnRoute>
    And el backend informa que el pago está "<paymentStatus>"
    When se consulta el resultado del pago
    Then veo el resultado "<message>"
    And puedo volver a la propuesta para iniciar un nuevo pago

    Examples:
      | returnRoute | paymentStatus | message                           |
      | failure     | rejected      | El pago de reserva fue rechazado  |
      | pending     | expired       | El pago de reserva venció         |

  Scenario: 07-PRPS No confiar en el estado informado por la URL de retorno
    Given que regreso por la ruta de pago exitoso con el parámetro "status=approved"
    And el backend informa que el pago está "processing"
    When se consulta el resultado del pago
    Then veo que el pago continúa en proceso
    And no veo el mensaje "Pago de reserva confirmado"

  Scenario: 08-PRPS Agotar la espera sin interpretar el pago como rechazado
    Given que el backend mantiene el pago en estado "processing"
    When transcurren treinta segundos desde la primera consulta
    Then veo el mensaje "Seguimos esperando la confirmación de Mercado Pago. Podés consultar nuevamente o volver a tus propuestas."
    And no se realizan más consultas automáticas
    And puedo consultar nuevamente el estado del pago

  Scenario: 09-PRPS Volver sin un pago identificable
    Given que regreso desde Mercado Pago sin referencia externa ni un pago activo guardado
    When se intenta consultar el resultado del pago
    Then veo un mensaje neutral que no afirma que el pago fue rechazado
    And puedo volver a mis propuestas

  Scenario: 10-PRPS Vencer la sesión durante la verificación del pago
    Given que regreso desde Mercado Pago con un pago identificable
    And mi sesión vence antes de verificar el resultado
    When se consulta el resultado del pago
    Then se me solicita iniciar sesión nuevamente
    And no veo un mensaje que afirme que el pago falló

  Scenario Outline: 11-PRPS Informar un error al iniciar o verificar el pago
    Given que el servicio de pagos responde con estado HTTP <httpStatus>
    When intento continuar con el pago de reserva
    Then veo el mensaje de pago "<message>"
    And puedo volver a mis propuestas

    Examples:
      | httpStatus | message                                                    |
      | 403        | No tenés permiso para pagar esta propuesta.                |
      | 404        | No encontramos la propuesta o el pago solicitado.          |
      | 409        | El pago no está disponible para esta propuesta.            |

  Scenario: 12-PRPS Reintentar después de un error temporal
    Given que el servicio de pagos responde con estado HTTP 500
    When intento continuar con el pago de reserva
    Then veo el mensaje de pago "No pudimos consultar el pago en este momento. Intentá otra vez."
    And puedo reintentar la operación
