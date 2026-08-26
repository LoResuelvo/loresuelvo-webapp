@wip
Feature: US-53.2 Tiempo estimado de trabajo
  Como prestador
  Quiero especificar la duración estimada del servicio al crear una propuesta
  Para que el consumidor conozca el tiempo previsto de ejecución del trabajo

  Como usuario
  Quiero visualizar el tiempo estimado de trabajo en el detalle de la propuesta y en la orden de trabajo
  Para tener claridad sobre la planificación y el compromiso acordado

  Background:
    Given que estoy en el chat del prestador con un consumidor activo

  Scenario: 01-TET Visualizar campo de duración estimada en el formulario de propuesta
    When abro el formulario de propuesta desde el menú de acciones
    Then se abre el modal de propuesta "Propuesta de Servicio"
    And veo los campos obligatorios "Monto", "Fecha", "Hora", "Duración estimada" y "Motivo de la visita"

  Scenario: 02-TET Enviar propuesta con duración estimada válida exitosamente
    Given que tengo abierto el formulario de propuesta de servicio
    When completo y envío la propuesta con monto "15000.50", fecha futura, duración de "90" minutos y motivo "Reparación de pérdida de agua"
    Then veo un indicador de éxito informando que la propuesta fue enviada
    And el formulario se cierra

  Scenario: 03-TET Bloquear envío si no se completa la duración estimada
    Given que tengo abierto el formulario de propuesta de servicio
    When ingreso monto "15000.50", fecha futura y motivo "Reparación" pero dejo la duración estimada vacía
    Then el botón de envío permanece deshabilitado

  Scenario: 04-TET Rechazar duración estimada menor a quince minutos
    Given que tengo abierto el formulario de propuesta de servicio
    When ingreso una duración estimada de "10" minutos
    Then veo un mensaje de error indicando que la duración mínima es de 15 minutos
    And el botón de envío permanece deshabilitado

  Scenario: 05-TET Rechazar duración estimada mayor a veinticuatro horas
    Given que tengo abierto el formulario de propuesta de servicio
    When ingreso una duración estimada de "1500" minutos
    Then veo un mensaje de error indicando que la duración máxima es de 24 horas
    And el botón de envío permanece deshabilitado

  Scenario: 06-TET Consumidor visualiza la duración estimada en el detalle de la propuesta
    Given que soy un consumidor con una propuesta recibida con duración estimada de "90" minutos
    When abro el detalle de la propuesta de servicio
    Then veo la duración estimada "1 h 30 min" en la información del servicio

  Scenario: 07-TET Prestador visualiza la duración estimada en el detalle de su propuesta enviada
    Given que soy un prestador con una propuesta enviada con duración estimada de "45" minutos
    When abro el detalle de la propuesta de servicio
    Then veo la duración estimada "45 min" en la información del servicio

  Scenario: 08-TET Visualizar la duración estimada en el detalle de la orden de trabajo
    Given que soy un consumidor autenticado con una orden de trabajo programada con duración estimada de "120" minutos
    When abro el detalle de la orden de trabajo
    Then veo la duración estimada "2 h" en los datos acordados de la orden
