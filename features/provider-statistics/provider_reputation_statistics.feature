Feature: [WEB] US-72 - Consultar mi reputación y cobertura de reseñas

  Scenario: 72.1-REP Consultar los indicadores globales de mi reputación
    Given que soy un prestador autenticado con trabajos pagados y reseñas
    And la API informa mi promedio, distribución de cinco estrellas y cobertura global
    When accedo a Reputación desde Mi desempeño
    Then visualizo el promedio, la cantidad de reseñas y la distribución informados
    And visualizo los trabajos pagados elegibles, los que tienen reseña y su cobertura
    And se explica qué trabajos forman el denominador de la cobertura
    And no dispongo de filtros temporales ni comparación entre períodos

  Scenario: 72.2-REP Consultar una reseña sin comentario
    Given que estoy consultando mi reputación
    And la API incluye una reseña con calificación y descripción vacía
    When se muestra la página de reseñas
    Then visualizo su calificación sin un comentario inventado
    And esa reseña permanece incluida en los indicadores informados por la API

  Scenario: 72.3-REP Avanzar a otra página de reseñas
    Given que estoy viendo una página de mis reseñas con una continuación disponible
    And la API dispone de otra página con indicadores globales
    When selecciono Siguiente página
    Then visualizo la nueva página en el orden informado por la API
    And los indicadores corresponden a la respuesta global de esa página
    And no se calculan a partir de las reseñas visibles ni se presenta el orden como recencia

  Scenario: 72.4-REP Reconocer el fin de las páginas
    Given que la API informa una página de mis reseñas sin continuación
    When consulto esa página
    Then visualizo sus reseñas
    And no puedo solicitar una siguiente página

  Scenario Outline: 72.5-REP Distinguir reputación vacía de una calificación cero
    Given que soy un prestador autenticado con <situacion>
    And no tengo reseñas
    When consulto Reputación
    Then visualizo cantidad de reseñas y distribución en cero
    And el promedio se muestra como No disponible
    And la cobertura se muestra como <cobertura>
    And visualizo un mensaje de ausencia de reseñas

    Examples:
      | situacion                    | cobertura     |
      | trabajos pagados elegibles    | cero          |
      | ningún trabajo pagado elegible | No disponible |

  Scenario: 72.6-REP Informar carga de reputación
    Given que la consulta de mi reputación permanece pendiente
    When accedo a Reputación
    Then visualizo un estado de carga accesible
    And no visualizo métricas supuestas ni ausencia de reseñas

  Scenario: 72.7-REP Recuperarse de un error en la consulta inicial
    Given que la consulta inicial de mi reputación falló
    And visualizo un error seguro con opción de reintento
    And la API vuelve a estar disponible
    When selecciono Reintentar
    Then visualizo mi reputación consultada correctamente
    And el error previo no se presenta como métricas cero

  Scenario: 72.8-REP Conservar información ante un error de paginación
    Given que visualizo una página válida de mi reputación
    And la consulta de la siguiente página falla
    When selecciono Siguiente página
    Then conservo los indicadores y las reseñas de la última respuesta válida
    And visualizo un error seguro que permite reintentar la página solicitada

  Scenario Outline: 72.9-REP Restringir el acceso a reputación privada
    Given que mi sesión es <sesion>
    When intento acceder a Reputación
    Then se aplica el control de acceso existente
    And no visualizo estadísticas privadas de un prestador

    Examples:
      | sesion                  |
      | inexistente             |
      | de un consumidor        |
