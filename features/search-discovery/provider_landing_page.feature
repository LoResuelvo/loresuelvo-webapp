Feature: Dashboard del Prestador
  Como prestador registrado y con perfil completo
  Quiero visualizar una página principal con un resumen de mi actividad
  Para acceder rápidamente a mis solicitudes, trabajos y métricas relevantes

  Scenario: 01-HPP Verificar barra lateral de navegación
    Given que ingreso a la HomePage como prestador
    When se carga la pantalla principal
    Then visualizo una barra lateral de navegación
    And veo la opción "Inicio"
    And no veo la opción "Calendario" en la barra lateral
    And veo la opción "Mensajes"
    And veo la opción "Trabajos"
    And no veo la opción "Perfil" en la barra lateral

  Scenario: 02.1-HPP Verificar mensaje cuando no hay solicitudes de trabajo
    Given que ingreso a la HomePage como prestador
    When se carga la pantalla principal
    Then visualizo la sección "Solicitudes de Trabajo"
    And visualizo el mensaje "Todavía no tienes ninguna solicitud de trabajo :("

  Scenario: 02.2-HPP Verificar solicitudes de trabajo
    Given que ingreso a la HomePage como prestador con solicitudes
    When se carga la pantalla principal
    Then visualizo la sección "Solicitudes de Trabajo"
    And visualizo una lista de solicitudes de trabajo
    And cada solicitud muestra el nombre del cliente
    And cada solicitud muestra el título del problema
    And cada solicitud muestra una descripción resumida
    # And cada solicitud muestra la ubicación
    And cada solicitud muestra la fecha u hora de publicación
   #  And cada solicitud posee una acción "Responder"
    And cada solicitud posee una acción "Ver Solicitud"

  @wip
  Scenario: 03-HPP Verificar trabajos agendados
    Given que ingreso a la HomePage como prestador con trabajos agendados
    When se carga la pantalla principal
    Then visualizo la sección "Trabajos Agendados"
    And visualizo una lista de trabajos agendados
    And cada trabajo muestra el título del trabajo
    And cada trabajo muestra el cliente asociado
    And cada trabajo muestra la fecha y hora programada
    # And cada trabajo muestra la ubicación

  Scenario: 04-HPP Consultar desempeño desde Inicio
    Given que ingreso a la HomePage como prestador con métricas
    When se carga la pantalla principal
    Then visualizo el acceso a mi desempeño

  @wip
  Scenario: 05-HPP Verificar datos simulados cuando la API no está disponible
    Given que la API aún no se encuentra disponible
    When ingreso a la HomePage como prestador con datos simulados
    Then visualizo la sección "Solicitudes de Trabajo" con datos simulados
    And visualizo la sección "Trabajos Agendados" con datos simulados
    And visualizo el panel de ingresos con datos simulados
    And todas las secciones renderizan correctamente utilizando datos mockeados
