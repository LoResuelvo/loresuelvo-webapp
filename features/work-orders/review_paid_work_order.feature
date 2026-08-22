Feature: US-30 Calificar y reseñar una orden de trabajo pagada
  Como consumidor
  Quiero calificar y reseñar el trabajo terminado
  Para dejar constancia de mi experiencia con el prestador y ayudar a la comunidad

  Background:
    Given que soy un consumidor autenticado con una orden de trabajo pagada

  Rule: Calificación exitosa de órdenes de trabajo pagadas
    @wip
    Scenario: 01-RW Consumidor califica exitosamente con 5 estrellas y comentario descriptivo
      Given tengo abierto el formulario de calificación de la orden
      And seleccioné una calificación de 5 estrellas
      And ingresé el comentario "Excelente servicio, muy puntual y prolijo"
      When envío la reseña
      Then veo el mensaje de confirmación de reseña registrada
      And el detalle de la orden muestra la calificación de 5 estrellas
      And el detalle de la orden muestra el comentario "Excelente servicio, muy puntual y prolijo"
      And no se muestra la opción para volver a calificar

    @wip
    Scenario: 02-RW Consumidor califica únicamente con estrellas dejando el comentario vacío
      Given tengo abierto el formulario de calificación de la orden
      And seleccioné una calificación de 4 estrellas
      When envío la reseña
      Then veo el mensaje de confirmación de reseña registrada
      And el detalle de la orden muestra la calificación de 4 estrellas
      And no se muestra la opción para volver a calificar

  Rule: Prevención de envíos duplicados durante el procesamiento
    @wip
    Scenario: 03-RW Botón en estado enviando reseña y deshabilitado durante el guardado
      Given que el registro de la reseña demora en responder
      And tengo abierto el formulario de calificación de la orden
      And seleccioné una calificación de 5 estrellas
      When hago clic en enviar la reseña
      Then veo el botón de envío en estado "Enviando reseña..." y deshabilitado

  Rule: Validación inicial de campos requeridos
    @wip
    Scenario: 04-RW Botón de enviar deshabilitado mientras no se haya seleccionado ninguna estrella
      Given tengo abierto el detalle de la orden de trabajo
      When abro el formulario de calificación
      Then el botón de envío se encuentra deshabilitado

  Rule: Límites de caracteres y restricciones de rol o estado
    @wip
    Scenario: 05-RW Contador de caracteres en tiempo real e impedimento de exceder 500 caracteres
      Given tengo abierto el formulario de calificación de la orden
      When escribo una descripción de 500 caracteres
      Then veo el contador de caracteres en "500/500"
      And el campo no permite ingresar más de 500 caracteres

    @wip
    Scenario: 06-RW No mostrar la opción de calificar si la orden no está pagada o si el usuario es prestador
      Given que la orden de trabajo se encuentra en estado "awaiting_payment"
      When abro el detalle de la orden de trabajo
      Then no veo el botón para calificar el servicio

  Rule: Manejo de errores y tolerancia a fallos del servidor
    @wip
    Scenario: 07-RW Mensaje de error cuando la orden ya cuenta con una reseña previa
      Given que el servidor responde con conflicto 409 al registrar la reseña
      And tengo abierto el formulario de calificación de la orden
      And seleccioné una calificación de 5 estrellas
      When envío la reseña
      Then veo un mensaje de error indicando que la orden ya fue calificada

    @wip
    Scenario: 08-RW Mensaje de error y reintento ante fallo del servidor sin perder el texto ingresado
      Given que el servidor responde con error 500 al registrar la reseña
      And tengo abierto el formulario de calificación de la orden
      And seleccioné una calificación de 5 estrellas
      And ingresé el comentario "Gran trabajo pero falló el primer intento de envío"
      When envío la reseña
      Then veo un mensaje de error por falla de servidor
      And el comentario "Gran trabajo pero falló el primer intento de envío" se mantiene en el campo
