Feature: Consultar mi actividad como prestador
  Background:
    Given estoy autenticado como prestador

  Scenario: 01-ACT Consultar resultados del período inicial
    Given tengo contrataciones, finalizaciones informadas y pagos completos en los últimos 30 días
    When abro la sección Actividad de Mi desempeño
    Then veo el período efectivo y los resultados informados por la API
    And veo clientes atendidos desglosados en nuevos y recurrentes
    And veo valor pactado e importe promedio de los trabajos finalizados en pesos argentinos
    And veo la evolución cronológica con intervalos sin eventos en cero

  Scenario: 02-ACT Consultar otro período y agrupación
    Given estoy viendo mi actividad
    And seleccioné un rango válido y agrupación semanal
    When aplico los filtros
    Then los resultados y la evolución corresponden al período aplicado
    And puedo reconocer los límites efectivos de los intervalos
    And los pendientes actuales permanecen separados de esos resultados

  Scenario: 03-ACT Comparar con el período anterior
    Given estoy viendo mi actividad en un período válido
    When activo la comparación con el período anterior
    Then veo los límites del período anterior y sus variaciones
    And una variación porcentual sin base se muestra como no disponible
    And no se presenta un crecimiento porcentual inventado

  @wip
  Scenario: 04-ACT Distinguir falta de actividad y pendientes actuales
    Given el período consultado no tiene eventos
    And tengo solicitudes pendientes y órdenes programadas o pendientes de pago
    When abro mi actividad para ese período
    Then veo resultados en cero y promedio no disponible
    And veo los pendientes actuales informados por la API
    And la pantalla explica que los pendientes no están filtrados por el período

  @wip
  Scenario: 05-ACT Recuperarme de un error de consulta
    Given una consulta de actividad falló y veo un mensaje de error
    And la API vuelve a estar disponible
    When reintento la consulta
    Then veo los resultados del mismo filtro solicitado
    And el error anterior no se representa como falta de actividad
