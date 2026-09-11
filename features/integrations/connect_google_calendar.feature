Feature: US-57 Vincular Google Calendar
  Como usuario autenticado de LoResuelvo
  quiero vincular mi cuenta de Google Calendar
  para que la plataforma pueda sincronizar mis turnos y citas de trabajo

  Scenario Outline: 01-CGC Ver una cuenta de Calendar desvinculada desde el perfil
    Given que estoy autenticado como <rol>
    And mi perfil informa el estado de Google Calendar "disconnected"
    When abro mi perfil de LoResuelvo
    Then veo la integración "Google Calendar" como no vinculada
    And veo la acción "Vincular Google Calendar"

    Examples:
      | rol        |
      | consumidor |
      | prestador  |

  Scenario: 02-CGC Ver una cuenta de Calendar vinculada
    Given que estoy autenticado como consumidor
    And mi perfil informa el estado de Google Calendar "connected"
    When abro mi perfil de LoResuelvo
    Then veo la integración "Google Calendar" como vinculada y sincronizada
    And no veo una acción para volver a vincularla

  Scenario: 03-CGC Ver que una conexión de Calendar requiere atención
    Given que estoy autenticado como prestador
    And mi perfil informa el estado de Google Calendar "action_required"
    When abro mi perfil de LoResuelvo
    Then veo una alerta indicando que Google Calendar requiere autorización
    And veo la acción "Reautorizar Google Calendar"

  Scenario: 04-CGC Recuperarse de un error al consultar el perfil
    Given que estoy autenticado
    And la consulta de mi perfil no está disponible
    When abro mi perfil de LoResuelvo
    Then veo un mensaje seguro indicando que no se pudo cargar la configuración
    And veo una acción para reintentar la consulta

  @wip
  Scenario Outline: 05-CGC Iniciar la autorización de Google Calendar
    Given que estoy autenticado
    And mi perfil informa el estado de Google Calendar "<estado>"
    And la API devuelve una URL de consentimiento de Google Calendar
    When activo "<accion>"
    Then se inicia una única autorización web para mi cuenta
    And soy redirigido a la URL de consentimiento de Google

    Examples:
      | estado          | accion                      |
      | disconnected    | Vincular Google Calendar    |
      | action_required | Reautorizar Google Calendar |

  @wip
  Scenario: 06-CGC Evitar autorizaciones duplicadas mientras comienza la vinculación
    Given que estoy autenticado con Google Calendar desvinculado
    And la solicitud de autorización todavía está en curso
    When activo "Vincular Google Calendar"
    Then veo la acción de vinculación ocupada y deshabilitada
    And no puedo iniciar otra autorización mientras la primera está pendiente

  @wip
  Scenario: 07-CGC Reintentar después de un error al iniciar la autorización
    Given que estoy autenticado con Google Calendar desvinculado
    And la API no puede iniciar la autorización
    When activo "Vincular Google Calendar"
    Then permanezco en mi perfil con el estado no vinculado
    And veo un error seguro que no expone detalles internos
    And la acción "Vincular Google Calendar" vuelve a estar disponible

  @wip
  Scenario: 08-CGC Confirmar la vinculación al regresar de Google
    Given que Google autorizó el acceso al calendario
    And la API redirige a mi perfil con el resultado "success"
    And mi perfil informa el estado de Google Calendar "connected"
    When regreso a LoResuelvo desde Google
    Then veo la confirmación de que Google Calendar fue vinculado
    And veo la integración como vinculada y sincronizada

  @wip
  Scenario: 09-CGC Informar la cancelación al regresar de Google
    Given que rechacé el acceso al calendario en Google
    And la API redirige a mi perfil con el resultado "cancelled"
    And mi perfil informa el estado de Google Calendar "disconnected"
    When regreso a LoResuelvo desde Google
    Then veo que la vinculación de Google Calendar fue cancelada
    And veo la integración como no vinculada
    And veo la acción "Vincular Google Calendar"
