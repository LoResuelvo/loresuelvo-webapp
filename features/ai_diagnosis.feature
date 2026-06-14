Feature: Diagnóstico asistido por IA
  Como consumidor
  Quiero conversar con un bot asistido por IA
  Para describir el problema de mi hogar y recibir una orientación inicial antes de contactar un prestador

  Background:
    Given estoy autenticado como consumidor
    And me encuentro en la pantalla Home

  Scenario: 01-DIA Iniciar conversación con el asistente
    When ingreso un mensaje en el campo de diagnóstico
    And presiono "Diagnosticar"
    Then se inicia una conversación con el asistente
    And veo mi mensaje en el chat

  Scenario: 02-DIA Recibir respuesta del asistente
    Given inicié una conversación con el asistente
    When el asistente procesa mi mensaje
    Then veo una respuesta del asistente en el chat

  @wip
  Scenario: 03-DIA Mostrar indicador de carga
    Given envié un mensaje al asistente
    When la respuesta aún se encuentra en procesamiento
    Then veo un indicador de carga
    And no puedo enviar un nuevo mensaje hasta recibir una respuesta

  @wip
  Scenario: 04-DIA Mostrar error de servicio
    Given envié un mensaje al asistente
    When el servicio de IA no se encuentra disponible
    Then veo el mensaje "No pudimos obtener una respuesta en este momento"
    And puedo volver a intentarlo

  @wip
  Scenario: 05-DIA Mostrar advertencia de orientación preliminar
    When visualizo la conversación con el asistente
    Then veo el mensaje "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo"

  @wip
  Scenario: 06-DIA Mantener historial de conversación
    Given existe una conversación activa con el asistente
    When envío un nuevo mensaje
    Then veo el historial completo de la conversación
    And veo los mensajes ordenados cronológicamente

  @wip
  Scenario: 07-DIA Realizar preguntas de seguimiento
    Given describí un problema de manera incompleta
    When el asistente necesita más información
    Then recibo una pregunta de seguimiento
    And puedo responder desde el mismo chat
