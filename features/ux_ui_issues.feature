@wip
Feature: US-44 UX/UI Issues
  Como consumidor y prestador
  Quiero que la plataforma sea fácil de usar y navegar
  Para realizar mis tareas de manera rápida y eficiente

  Scenario: 01-UXUI Redimensionar la lista de contactos como consumidor
    Given que estoy en la pantalla de mensajes como consumidor con conversaciones
    When arrastro el separador de la lista de contactos para reducir su ancho
    Then el ancho de la lista de contactos es menor al inicial

  Scenario: 02-UXUI Redimensionar la lista de conversaciones como prestador
    Given que estoy en la pantalla de mensajes como prestador con conversaciones
    When arrastro el separador de la lista de conversaciones para ampliar su ancho
    Then el ancho de la lista de conversaciones es mayor al inicial

  Scenario: 03-UXUI Conservar el scroll al volver a una conversación como consumidor
    Given que estoy chateando con un prestador con varios mensajes en la conversación
    And hice scroll en la conversación
    When cambio a otra conversación y vuelvo a abrir la conversación original
    Then la conversación se muestra en la misma posición de scroll que dejé

  Scenario: 04-UXUI Conservar el scroll al volver a una conversación como prestador
    Given que estoy chateando con un consumidor con varios mensajes en la conversación
    And hice scroll en la conversación
    When cambio a otra conversación y vuelvo a abrir la conversación original
    Then la conversación se muestra en la misma posición de scroll que dejé

  Scenario: 05-UXUI Respetar ancho mínimo de la lista
    Given que estoy en la pantalla de mensajes como consumidor con conversaciones
    When arrastro el separador más allá del ancho mínimo permitido
    Then la lista de contactos mantiene el ancho mínimo
