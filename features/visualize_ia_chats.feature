@wip
Feature: Gestión de chats con IA
  Como consumidor
  Quiero poder ver mis chats con la IA
  Para poder continuarlos y encontrar una solución a mi problema

  Background:
    Given estoy autenticado como consumidor

  Scenario: 01-CHI Acceder a los chats de IA desde la navegación
    When visualizo el sidebar
    Then veo la opción "Chat con IA"

  Scenario: 02-CHI Visualizar historial de chats
    Given ingreso a la sección "Chat con IA"
    Then veo mis conversaciones anteriores con la IA

  Scenario: 03-CHI Visualizar información resumida de cada chat
    Given ingreso a la sección "Chat con IA"
    Then cada conversación muestra un título
    And cada conversación muestra una preview del último mensaje intercambiado

  Scenario: 04-CHI Abrir una conversación existente
    Given ingreso a la sección "Chat con IA"
    When selecciono una conversación existente
    Then veo el historial completo de mensajes de esa conversación

  Scenario: 05-CHI Crear una nueva conversación
    Given ingreso a la sección "Chat con IA"
    When selecciono "Nuevo chat"
    Then se crea una nueva conversación
    And puedo comenzar a enviar mensajes

  Scenario: 06-CHI Actualizar preview al recibir respuesta
    Given existe una conversación con la IA
    When recibo una nueva respuesta del asistente
    Then la preview de la conversación se actualiza
    And muestra el último mensaje recibido
