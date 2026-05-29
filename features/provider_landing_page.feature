Feature: Provider Home Page

  Scenario: 01-HPP Mostrar barra lateral de navegación
    Given que ingreso a la HomePage como prestador
    When se carga la pantalla principal
    Then visualizo una barra lateral de navegación
    And veo la opción "Inicio"
    And veo la opción "Calendario"
    And veo la opción "Mensajes"
    And veo la opción "Trabajos"
    And veo la opción "Perfil"

  Scenario: 02-HPP Mostrar solicitudes de trabajo
    Given que ingreso a la HomePage como prestador
    When se carga la pantalla principal
    Then visualizo la sección "Solicitudes de Trabajo"
    And visualizo una lista de solicitudes de trabajo
    And cada solicitud muestra el nombre del cliente
    And cada solicitud muestra el título del problema
    And cada solicitud muestra una descripción resumida
    And cada solicitud muestra la ubicación
    And cada solicitud muestra la fecha u hora de publicación
    And cada solicitud posee una acción "Responder"
    And cada solicitud posee una acción "Detalles"

#  Scenario: 03-HPP Mostrar trabajos agendados
#    Given que ingreso a la HomePage como prestador
#    When se carga la pantalla principal
#    Then visualizo la sección "Trabajos Agendados"
#    And visualizo una lista de trabajos programados
#    And cada trabajo muestra el título del trabajo
#    And cada trabajo muestra el cliente asociado
#    And cada trabajo muestra la fecha y hora programada
#    And cada trabajo muestra la ubicación
#    And cada trabajo muestra el importe acordado
#
#  Scenario: 04-HPP Mostrar métricas del prestador
#    Given que ingreso a la HomePage como prestador
#    When se carga la pantalla principal
#    Then visualizo un panel de métricas
#    And visualizo los ingresos del período
#    And visualizo la cantidad de trabajos realizados
#    And visualizo la calificación promedio del prestador
#
#  Scenario: 05-HPP Mostrar datos simulados
#    Given que la API aún no se encuentra disponible
#    When ingreso a la HomePage
#    Then visualizo solicitudes de trabajo simuladas
#    And visualizo trabajos agendados simulados
#    And visualizo métricas simuladas
#    And todas las secciones renderizan correctamente utilizando datos mockeados
