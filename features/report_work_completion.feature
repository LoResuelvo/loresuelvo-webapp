Feature: US-26 Informar finalización de orden de trabajo
  Como prestador asignado
  Quiero informar la finalización de una orden de trabajo programada
  Para que el consumidor pueda proceder con el pago del servicio realizado

  Background:
    Given que soy un prestador autenticado con una propuesta de servicio aceptada

  Scenario: 01-RWC Visualizar botón de informar finalización en propuesta aceptada
    Given que la orden de trabajo tiene fecha de servicio pasada
    And abro el detalle de la propuesta aceptada
    When visualizo las acciones disponibles
    Then veo el botón "Informar finalización"

  Scenario: 02-RWC Abrir el formulario de reporte de finalización
    Given que la orden de trabajo tiene fecha de servicio pasada
    And abro el detalle de la propuesta aceptada
    When elijo informar la finalización del trabajo
    Then se abre el modal "Reporte de Finalización"
    And veo los campos "Fotos de evidencia" y "Descripción de trabajo realizado"

  Scenario: 03-RWC Informar finalización exitosamente con 1 foto
    Given que tengo abierto el formulario de reporte de finalización
    And adjunto 1 foto de evidencia
    And completo la descripción con "Trabajo finalizado. Se reemplazó la cañería dañada."
    When confirmo el reporte de finalización
    Then veo un mensaje de éxito indicando que el reporte fue enviado

  Scenario: 04-RWC Informar finalización exitosamente con 3 fotos
    Given que tengo abierto el formulario de reporte de finalización
    And adjunto 3 fotos de evidencia
    And completo la descripción con "Instalación completa del termotanque."
    When confirmo el reporte de finalización
    Then veo un mensaje de éxito indicando que el reporte fue enviado

  Rule: El reporte requiere al menos una foto y una descripción

    Scenario: 05-RWC Botón deshabilitado sin fotos ni descripción
      Given que tengo abierto el formulario de reporte de finalización
      When visualizo el formulario vacío
      Then el botón de confirmar reporte permanece deshabilitado

    Scenario: 06-RWC Botón deshabilitado con foto pero sin descripción
      Given que tengo abierto el formulario de reporte de finalización
      And adjunto 1 foto de evidencia
      When visualizo el estado del formulario
      Then el botón de confirmar reporte permanece deshabilitado

    Scenario: 07-RWC Botón se habilita con foto y descripción completas
      Given que tengo abierto el formulario de reporte de finalización
      And adjunto 1 foto de evidencia
      And completo la descripción con "Trabajo terminado."
      When visualizo el estado del formulario
      Then el botón de confirmar reporte se habilita

  Rule: No se puede reportar antes de la fecha y hora pactadas

    Scenario: 08-RWC No mostrar botón de finalización si la fecha es futura
      Given que la orden de trabajo tiene fecha de servicio futura
      And abro el detalle de la propuesta aceptada
      When visualizo las acciones disponibles
      Then no veo el botón "Informar finalización"
      And veo un aviso indicando que el servicio aún no fue realizado

  Rule: No se puede reportar una orden que ya fue reportada

    Scenario: 09-RWC Mostrar error cuando la orden ya tiene un reporte previo
      Given que tengo abierto el formulario de reporte de finalización
      And la orden de trabajo ya tiene un reporte de finalización
      And adjunto 1 foto de evidencia
      And completo la descripción con "Segundo intento de reporte."
      When confirmo el reporte de finalización
      Then veo un mensaje de error indicando que la orden ya fue reportada
