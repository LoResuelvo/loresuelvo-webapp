Feature: US-28 Completar pago del servicio
  Como consumidor autenticado
  Quiero completar el pago del saldo de una orden de trabajo finalizada
  Para saldar el importe acordado tras verificar la evidencia del trabajo

  Background:
    Given que soy un consumidor autenticado con una orden de trabajo pendiente de pago

  Rule: Completar el pago cobra únicamente el saldo acordado

    Scenario: 01-CSP Mostrar el desglose del saldo y la acción de pago en una orden pendiente de pago
      When abro el detalle de la orden de trabajo
      Then veo un saldo del servicio de "$ 80.000,00"
      And veo una comisión pendiente de "$ 4.000,00"
      And veo un total a pagar de saldo de "$ 84.000,00"
      And veo la acción "Pagar saldo del servicio"

    Scenario Outline: 02-CSP Iniciar o recuperar un checkout activo del saldo
      Given que el checkout del saldo responde con estado HTTP <httpStatus>
      When elijo pagar el saldo del servicio
      Then se conserva el contexto del pago del saldo en esta sesión
      And soy redirigido exactamente a la URL de checkout informada por el servicio

      Examples:
        | httpStatus |
        | 201        |
        | 200        |

    Scenario: 03-CSP Evitar solicitudes duplicadas al iniciar el pago del saldo
      Given que la creación del checkout del saldo está en curso
      When intento pagar el saldo dos veces
      Then la acción de pagar saldo permanece deshabilitada durante la solicitud
      And se solicita un único checkout para el saldo de la orden

  Rule: El pago aprobado y verificado completa el saldo de la orden

    Scenario: 04-CSP Confirmar el pago del saldo usando la referencia del retorno
      Given que regreso por la ruta de pago exitoso con la referencia externa del pago del saldo
      And el estado verificado cambia de "checkout_ready" a "paid"
      When se consulta el resultado del pago
      Then veo el mensaje "Pago del servicio confirmado"
      And la orden de trabajo refleja el estado "Pagada"
      And puedo volver a mis servicios

    Scenario: 05-CSP Recuperar el pago del saldo guardado cuando el retorno no incluye una referencia
      Given que regreso por la ruta de pago pendiente sin referencia externa
      And existe un pago de saldo activo guardado en esta sesión
      And el estado verificado cambia de "processing" a "paid"
      When se consulta el resultado del pago
      Then veo el mensaje "Pago del servicio confirmado"

    Scenario: 06-CSP No confiar en el estado informado por la URL de retorno del saldo
      Given que regreso por la ruta de pago exitoso con el parámetro "status=approved"
      And el backend informa que el pago del saldo está "processing"
      When se consulta el resultado del pago
      Then veo que el pago continúa en proceso
      And no veo el mensaje "Pago del servicio confirmado"

    Scenario: 07-CSP Agotar la espera sin interpretar el pago del saldo como rechazado
      Given que el backend mantiene el pago del saldo en estado "processing"
      When transcurren treinta segundos desde la primera consulta
      Then veo el mensaje "Seguimos esperando la confirmación de Mercado Pago. Podés consultar nuevamente o volver a tus servicios."
      And no se realizan más consultas automáticas
      And puedo consultar nuevamente el estado del pago

    Scenario: 08-CSP Volver sin un pago de saldo identificable
      Given que regreso desde Mercado Pago sin referencia externa ni un pago activo guardado
      When se intenta consultar el resultado del pago
      Then veo un mensaje neutral que no afirma que el pago fue rechazado
      And puedo volver a mis servicios

  Rule: Manejo de errores y estados terminales en el pago del saldo

    Scenario Outline: 09-CSP Mostrar un resultado terminal verificado para el saldo
      Given que regreso desde Mercado Pago por la ruta de pago <returnRoute>
      And el backend informa que el pago del saldo está "<paymentStatus>"
      When se consulta el resultado del pago
      Then veo el resultado "<message>"
      And puedo volver a la orden de trabajo para iniciar un nuevo pago

      Examples:
        | returnRoute | paymentStatus | message                            |
        | failure     | rejected      | El pago del servicio fue rechazado |
        | pending     | expired       | El pago del servicio venció        |

    Scenario: 10-CSP Vencer la sesión durante la verificación del pago del saldo
      Given que regreso desde Mercado Pago con un pago de saldo identificable
      And mi sesión vence antes de verificar el resultado
      When se consulta el resultado del pago
      Then se me solicita iniciar sesión nuevamente
      And no veo un mensaje que afirme que el pago falló

    @wip
    Scenario Outline: 11-CSP Informar un error al iniciar o verificar el pago del saldo
      Given que el servicio de pagos del saldo responde con estado HTTP <httpStatus>
      When intento continuar con el pago del saldo
      Then veo el mensaje de pago "<message>"
      And puedo volver a mis servicios

      Examples:
        | httpStatus | message                                                  |
        | 403        | No tenés permiso para pagar esta orden de trabajo.       |
        | 404        | No encontramos la orden de trabajo o el pago solicitado. |
        | 409        | El pago del saldo no está disponible para esta orden.    |

    @wip
    Scenario: 12-CSP Reintentar después de un error temporal al iniciar el saldo
      Given que el servicio de pagos del saldo responde con estado HTTP 500
      When intento continuar con el pago del saldo
      Then veo el mensaje de pago "No pudimos consultar el pago en este momento. Intentá otra vez."
      And puedo reintentar la operación
