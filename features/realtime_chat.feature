Feature: Chat en vivo
  Como usuario
  Quiero ver los mensajes entrantes en vivo
  Para tener una mejor experiencia al conversar

  Background:
    Given que existe un chat activo entre el consumidor "Ana Pérez" y el prestador "Juan Gómez"

  Scenario: 01-TR El consumidor ve el mensaje del prestador sin recargar la página
    Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
    When el prestador "Juan Gómez" me envía el mensaje "¿El jueves por la mañana te queda cómodo?"
    Then veo el mensaje "¿El jueves por la mañana te queda cómodo?" en la pantalla del chat

  Scenario: 02-TR El prestador ve el mensaje del consumidor sin recargar la página
    Given que estoy en el chat con el consumidor "Ana Pérez" como prestador
    When el consumidor "Ana Pérez" me envía el mensaje "Te dejo mi disponibilidad para coordinar la visita."
    Then veo el mensaje "Te dejo mi disponibilidad para coordinar la visita." en la pantalla del chat

  Scenario: 03-TR Un mensaje de otro chat no aparece en la conversación actual
    Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
    When otro usuario me envía un mensaje en una conversación diferente
    Then ese mensaje no aparece en el chat con "Juan Gómez"

  Scenario: 04-TR La pantalla hace scroll automático al llegar un mensaje nuevo si estoy al final del chat
    Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
    And estoy viendo el final de la conversación
    When el prestador "Juan Gómez" me envía el mensaje "Confirmado para el jueves."
    Then la pantalla hace scroll automáticamente para mostrar el nuevo mensaje

  @wip
  Scenario: 05-TR Se muestra un aviso de mensaje nuevo si no estoy al final del chat
    Given que estoy en el chat con el prestador "Juan Gómez" como consumidor
    And estoy revisando mensajes anteriores en la conversación
    When el prestador "Juan Gómez" me envía el mensaje "Confirmado para el jueves."
    Then veo un aviso indicando que hay un mensaje nuevo
    And la pantalla no hace scroll automáticamente
