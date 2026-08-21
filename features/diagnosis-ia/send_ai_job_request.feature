Feature: US-51 Enviar solicitud de trabajo a prestadores desde diagnóstico IA
  Como consumidor
  Quiero contactar a uno o más prestadores recomendados a partir de la evaluación del chatbot
  Para solicitarles ayuda sin tener que volver a describir el problema de mi hogar

  Background:
    Given estoy autenticado como consumidor
    And la IA concluyó el diagnóstico y recomienda prestadores del rubro "Plomería"

  Scenario: 01-AIJR Visualizar botón de contacto en prestadores recomendados
    When visualizo la respuesta del asistente
    Then cada prestador recomendado muestra un botón "Contactar"

  Scenario: 02-AIJR Enviar solicitud de trabajo a un prestador recomendado
    When hago clic en "Contactar" del prestador recomendado "Juan Gómez"
    Then el sistema envía la solicitud de trabajo al prestador "Juan Gómez"
    And veo una confirmación de que la solicitud fue enviada
    And soy redirigido a la conversación de trabajo con "Juan Gómez"

  Scenario: 03-AIJR Enviar solicitud a varios prestadores recomendados
    When hago clic en "Contactar" del prestador recomendado "Juan Gómez"
    And hago clic en "Contactar" del prestador recomendado "María López"
    Then el sistema envía la solicitud de trabajo al prestador "Juan Gómez"
    And el sistema envía la solicitud de trabajo al prestador "María López"

  Scenario: 04-AIJR No mostrar botón de contacto cuando no hay prestadores recomendados
    Given la IA respondió sin recomendar prestadores
    When visualizo la respuesta del asistente
    Then no veo la sección de prestadores recomendados

  Scenario: 05-AIJR No mostrar botón de contacto mientras la evaluación requiere más información
    Given la evaluación del chatbot todavía requiere más información
    When visualizo la conversación con el asistente
    Then no veo la sección de prestadores recomendados

  Scenario: 06-AIJR No mostrar botón de contacto cuando el problema puede resolverse sin profesional
    Given la evaluación del chatbot determina que el problema puede resolverse sin profesional
    When visualizo la conversación con el asistente
    Then no veo la sección de prestadores recomendados

  Scenario: 07-AIJR Mostrar error al fallar el envío de la solicitud
    Given el servicio de solicitudes de trabajo no está disponible
    When hago clic en "Contactar" del prestador recomendado "Juan Gómez"
    Then veo un mensaje de error indicando que no se pudo enviar la solicitud

  Scenario: 08-AIJR Mostrar error cuando ya existe solicitud abierta con el prestador
    Given ya existe una solicitud de trabajo abierta con "Juan Gómez"
    When hago clic en "Contactar" del prestador recomendado "Juan Gómez"
    Then veo un mensaje indicando que ya existe una solicitud abierta con ese prestador
