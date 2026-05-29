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

  Scenario: 02.1-HPP Mostrar mensaje cuando no hay solicitudes de trabajo
    Given que ingreso a la HomePage como prestador
    When se carga la pantalla principal
    Then visualizo la sección "Solicitudes de Trabajo"
    And visualizo el mensaje "Todavía no tienes ninguna solicitud de trabajo :("

  Scenario: 02.2-HPP Mostrar solicitudes de trabajo
    Given que ingreso a la HomePage como prestador con solicitudes
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

Scenario: 03-HPP Mostrar trabajos agendados
    Given que ingreso a la HomePage como prestador con trabajos agendados
    When se carga la pantalla principal
    Then visualizo la sección "Trabajos Agendados"
    And visualizo una lista de trabajos programados
    And cada trabajo muestra el título del trabajo
    And cada trabajo muestra el cliente asociado
    And cada trabajo muestra la fecha y hora programada
    And cada trabajo muestra la ubicación
    And cada trabajo muestra el importe acordado
Scenario: 04-HPP Mostrar panel de ingresos
    Given que ingreso a la HomePage como prestador con métricas
    When se carga la pantalla principal
    Then visualizo el panel de ingresos
    And visualizo el título "INGRESOS DEL MES"
    And visualizo el monto de ingresos
    And visualizo el indicador de variación
Scenario: 05-HPP Mostrar datos simulados
    Given que la API aún no se encuentra disponible
    When ingreso a la HomePage como prestador con datos simulados
    Then visualizo la sección "Solicitudes de Trabajo" con datos simulados
    And visualizo la sección "Trabajos Agendados" con datos simulados
    And visualizo el panel de ingresos con datos simulados
    And todas las secciones renderizan correctamente utilizando datos mockeados
