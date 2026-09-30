Feature: Consultar mis cobros verificados
  Background:
    Given estoy autenticado como prestador

  @wip
  Scenario: 01-COB Distinguir cobros verificados de saldos pendientes
    Given tengo señas y saldos verificados en los últimos 30 días
    And tengo trabajos programados y finalizados pendientes de saldo
    When abro la sección Cobros de Mi desempeño
    Then veo señas, saldos y total verificados sin comisiones
    And veo su evolución cronológica y el período efectivo
    And veo por separado cantidades e importes pendientes de trabajos programados y finalizados
    And la pantalla distingue los cobros verificados del saldo bancario

  @wip
  Scenario: 02-COB Cambiar período y comparar cobros
    Given estoy viendo mis cobros
    And seleccioné un rango válido, agrupación mensual y comparación anterior
    When aplico los filtros
    Then veo resumen, evolución y comparación correspondientes al período aplicado
    And una variación porcentual sin base se muestra como no disponible
    And los pendientes actuales no se filtran ni comparan con el período anterior

  @wip
  Scenario: 03-COB Consultar el detalle por propósito
    Given estoy viendo el detalle de cobros del período aplicado
    And hay señas y saldos verificados dentro de ese período
    When filtro el detalle por señas
    Then veo únicamente transacciones de señas con fecha verificada e importe del prestador
    And veo sus referencias comerciales informadas por la API
    And la cantidad y el importe total corresponden a todas las señas del período y no sólo a la página visible

  @wip
  Scenario: 04-COB Continuar el detalle sin cambiar la consulta
    Given estoy viendo una página de transacciones con más resultados
    When solicito la siguiente página
    Then veo la siguiente página en el orden informado por la API
    And se conservan el período efectivo y el filtro de propósito
    And no se recalcula una ventana móvil de últimos 30 días

  @wip
  Scenario: 05-COB Consultar un período sin cobros
    Given no tengo cobros verificados en el período consultado
    And mi cuenta de Mercado Pago está desconectada
    And tengo un trabajo finalizado con saldo contractual pendiente
    When abro mis cobros para ese período
    Then veo totales y evolución en cero y un detalle sin transacciones
    And sigo viendo el saldo pendiente informado por la API
    And no se me exige conectar Mercado Pago para consultar estos datos

  @wip
  Scenario: 06-COB Recuperar el detalle ante un error
    Given veo un resumen válido y la consulta del detalle falló
    And la API vuelve a estar disponible
    When reintento consultar el detalle
    Then veo las transacciones de la misma consulta solicitada
    And el fallo anterior no se representa como un detalle vacío o un total cero
