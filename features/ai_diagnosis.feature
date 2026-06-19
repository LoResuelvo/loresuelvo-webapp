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

  Scenario: 03-DIA Mostrar indicador de carga
    Given estoy en una conversación con el asistente
    When envío un nuevo mensaje y la respuesta tarda en llegar
    Then veo un indicador de carga
    And no puedo enviar un nuevo mensaje hasta recibir una respuesta

  Scenario: 04-DIA Mostrar error de servicio
    Given estoy en una conversación con el asistente
    When envío un nuevo mensaje y el servicio falla
    Then veo el mensaje del asistente "No pudimos obtener una respuesta en este momento"
    And puedo volver a intentarlo

  Scenario: 05-DIA Mostrar advertencia de orientación preliminar
    When visualizo la conversación con el asistente
    Then veo el mensaje del asistente "Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo"

  Scenario: 06-DIA Navegar al chat de IA
    When selecciono la opción "Chat con IA"
    Then veo la pantalla de conversación con el asistente

  Scenario: 07-DIA Expandir campo de texto automáticamente
    Given me encuentro escribiendo un mensaje para el asistente
    When el contenido supera una línea
    Then el campo de texto aumenta su altura automáticamente
    And permite visualizar hasta 6 líneas de contenido sin scroll

  Scenario: 08-DIA Utilizar scroll en mensajes extensos
    Given me encuentro escribiendo un mensaje para el asistente
    When el contenido supera las 6 líneas visibles
    Then el campo de texto mantiene una altura máxima de 6 líneas
    And puedo desplazarme mediante scroll dentro del campo
    And el contenido completo permanece accesible

  Scenario: 09-DIA Visualizar diagnóstico concluido con prestadores recomendados
    Given la IA concluyó el diagnóstico y recomienda prestadores del rubro "Plomería"
    When visualizo la respuesta del asistente
    Then veo la explicación del problema detectado
    And veo los prestadores recomendados del rubro "Plomería"

  Scenario: 10-DIA Visualizar datos de cada prestador recomendado
    Given la IA concluyó el diagnóstico y recomienda prestadores del rubro "Plomería"
    When visualizo la respuesta del asistente
    Then cada prestador muestra nombre y apellido
    And cada prestador muestra el rubro "Plomería"
    And cada prestador muestra su foto de perfil

  Scenario: 11-DIA Conversación sin recomendaciones de prestador
    Given la IA respondió sin recomendar prestadores
    When visualizo la respuesta del asistente
    Then no veo la sección de prestadores recomendados
    And la conversación continúa normalmente
