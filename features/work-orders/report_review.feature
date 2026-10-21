Feature: US-30.2 Reportar una reseña
  Como prestador titular de una orden de trabajo
  Quiero reportar una reseña que considero inapropiada
  Para solicitar su revisión administrativa

  Rule: El prestador puede solicitar la revisión sin modificar la reseña

    Scenario Outline: 01-RR Reportar una reseña con un motivo admitido
      Given que soy el prestador titular de una orden con una reseña visible
      And tengo abierto el formulario para reportar la reseña
      And seleccioné el motivo "<motivo>"
      And dejé la explicación "<explicacion>"
      When envío el reporte de la reseña
      Then veo una confirmación de que el reporte fue recibido para revisión
      And la reseña conserva su comentario y sus estrellas
      And no se ofrece volver a reportarla en el detalle actual

      Examples:
        | motivo                     | explicacion                              |
        | Lenguaje abusivo            | El comentario contiene insultos.         |
        | Datos personales           | Publica mi teléfono sin mi autorización. |
        | Spam o publicidad          |                                          |
        | Contenido ajeno al servicio | El comentario se refiere a otro trabajo. |

  Rule: El reporte necesita un motivo y admite una explicación de hasta 500 caracteres

    Scenario Outline: 02-RR Corregir los datos antes de enviar el reporte
      Given que soy el prestador titular y tengo abierto el formulario para reportar una reseña
      And el formulario tiene "<problema>"
      When intento enviar el reporte de la reseña
      Then veo una indicación de "<correccion>"
      And el reporte no se envía
      And conservo los datos ingresados para corregirlos

      Examples:
        | problema                                    | correccion                               |
        | ningún motivo seleccionado                  | seleccionar un motivo                    |
        | un motivo válido y más de 500 caracteres de explicación | reducir la explicación a 500 caracteres |

  Rule: Solo se ofrece reportar una reseña al prestador de la orden

    Scenario Outline: 03-RR No ofrecer el reporte cuando no corresponde
      Given que consulto una orden de trabajo como "<actor>"
      And la orden "<resena>"
      When abro el detalle de la orden de trabajo
      Then no veo la opción para reportar la reseña

      Examples:
        | actor               | resena                      |
        | consumidor titular  | tiene una reseña visible    |
        | prestador titular   | no tiene reseña disponible  |

  Rule: Una reseña solo puede reportarse una vez

    Scenario: 04-RR Informar que la reseña ya fue reportada
      Given que soy el prestador titular y tengo abierto el formulario de una reseña reportada anteriormente
      And seleccioné un motivo válido
      When envío el reporte de la reseña
      Then veo un aviso indicando que la reseña ya fue reportada
      And no se ofrece volver a reportarla en el detalle actual
      And la reseña conserva su comentario y sus estrellas

  Rule: El prestador puede desistir antes de enviar

    Scenario: 05-RR Cancelar el reporte de una reseña
      Given que soy el prestador titular y completé el formulario para reportar una reseña
      When cancelo el reporte
      Then regreso al detalle de la orden sin enviar el reporte
      And la reseña conserva su comentario y sus estrellas

  Rule: Un fallo al enviar permite recuperar el reporte

    Scenario: 06-RR Conservar los datos para reintentar el envío
      Given que soy el prestador titular y completé el reporte con el motivo "Datos personales"
      And ingresé la explicación "Publica mi teléfono sin mi autorización."
      And el servicio de reportes no está disponible temporalmente
      When envío el reporte de la reseña
      Then veo un mensaje indicando que no se pudo enviar el reporte
      And conservo el motivo y la explicación ingresados
      And tengo disponible la opción de reintentar
