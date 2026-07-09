@wip
Feature: US-53 Enviar propuesta de servicio
  Como prestador
  Quiero enviar una propuesta de servicio desde el chat
  Para poder brindar mis servicios a un consumidor

  Background:
    Given que estoy en el chat del prestador con un consumidor activo

  Scenario: 01-PSP Visualizar botón de acciones en la barra de mensajes
    When visualizo la barra de entrada de mensajes
    Then veo un botón "+" para abrir el menú de acciones

  Scenario: 02-PSP Abrir menú desplegable con opciones de adjuntar y propuesta
    When hago clic en el botón "+" del menú de acciones
    Then veo las opciones "Adjuntar imágenes" y "Crear propuesta de servicio"

  Scenario: 03-PSP Abrir formulario de propuesta de servicio
    When abro el formulario de propuesta desde el menú de acciones
    Then se abre el modal "Propuesta de Servicio"
    And veo los campos obligatorios "Monto", "Fecha y hora" y "Motivo de la visita"

  Scenario: 04-PSP Enviar propuesta de servicio exitosamente
    Given que tengo abierto el formulario de propuesta de servicio
    When completo y envío la propuesta con monto "15000.50", fecha futura y motivo "Reparación de pérdida de agua"
    Then veo un indicador de éxito informando que la propuesta fue enviada
    And el formulario se cierra

  Scenario: 05-PSP Bloquear envío si faltan campos obligatorios
    Given que tengo abierto el formulario de propuesta de servicio
    When intento enviar la propuesta sin completar todos los campos
    Then el botón de envío permanece deshabilitado

  Scenario: 06-PSP Rechazar monto negativo o cero
    Given que tengo abierto el formulario de propuesta de servicio
    When ingreso un monto de "0" en el campo de monto
    Then veo un mensaje de error indicando que el monto debe ser mayor a cero

  Scenario: 07-PSP Rechazar fecha en el pasado
    Given que tengo abierto el formulario de propuesta de servicio
    When selecciono una fecha y hora en el pasado
    Then veo un mensaje de error indicando que la fecha debe ser futura

  Scenario: 08-PSP Mostrar error cuando la API rechaza la propuesta
    Given que tengo abierto el formulario de propuesta de servicio
    And el servicio de propuestas no está disponible
    When completo y envío la propuesta con monto "15000.50", fecha futura y motivo "Reparación"
    Then veo un mensaje de error indicando el problema

  Scenario: 09-PSP No mostrar opción de propuesta en conversación pendiente
    Given que estoy en el chat del prestador con un consumidor pendiente
    When hago clic en el botón "+" del menú de acciones
    Then no veo la opción "Crear propuesta de servicio"
    And veo la opción "Adjuntar imágenes"
