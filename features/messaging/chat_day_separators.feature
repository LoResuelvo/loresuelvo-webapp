Feature: Separadores por día en el chat

  Scenario Outline: Mostrar la etiqueta correspondiente al día
    Given una conversación con mensajes de <antigüedad>
    When abro la conversación
    Then aparece un separador con <etiqueta> antes de esos mensajes

    Examples:
      | antigüedad         | etiqueta                    |
      | hoy                | Hoy                         |
      | ayer               | Ayer                        |
      | hace 2 a 6 días    | nombre del día en español   |
      | hace 7 días o más  | fecha completa dd/MM/yyyy  |

  Scenario: Agrupar mensajes del mismo día
    Given una conversación con varios mensajes del mismo día
    When abro la conversación
    Then aparece un único separador antes del primer mensaje de ese día

  Scenario: Separar mensajes de días distintos
    Given una conversación con mensajes de varios días
    When abro la conversación
    Then aparece el separador correspondiente al comenzar cada día

  Scenario: Recibir un mensaje de un nuevo día
    Given una conversación abierta cuyo último mensaje es de ayer
    When llega un mensaje de hoy
    Then aparece el separador Hoy antes del nuevo mensaje
