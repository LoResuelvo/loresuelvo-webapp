Feature: US-35.5 Registrar prestador con zonas de cobertura
  Como prestador
  Quiero seleccionar las comunas en las que estoy dispuesto a trabajar durante mi registro
  Para recibir solicitudes únicamente dentro de mi área de cobertura

  Background:
    Given que me registré exitosamente en Auth0 con email "prestador@example.com"

  Scenario: 01-RPZ Cargar las zonas habilitadas al ingresar a los datos de perfil
    Given la API dispone de las comunas habilitadas "Comuna 6" y "Comuna 14"
    And Google Maps está disponible con límites para esas comunas
    When elijo la opción de prestador y avanzo al paso de datos de perfil
    Then veo el estado de carga de las zonas de cobertura
    And veo los nombres de las comunas disponibles en la lista accesible
    And veo sus límites identificados en el mapa de CABA

  @wip
  Scenario: 02-RPZ Seleccionar comunas no contiguas desde la lista
    Given estoy en los datos de perfil con "Comuna 6" y "Comuna 14" disponibles
    When selecciono "Comuna 6" y "Comuna 14" desde la lista de zonas
    Then ambas comunas figuran seleccionadas en la lista
    And ambos polígonos figuran seleccionados en el mapa

  @wip
  Scenario: 03-RPZ Sincronizar una selección realizada en el mapa
    Given estoy en los datos de perfil con el mapa de comunas disponible
    When selecciono el polígono de "Comuna 14" en el mapa
    Then el polígono de "Comuna 14" figura seleccionado
    And "Comuna 14" figura seleccionada en la lista accesible

  @wip
  Scenario: 04-RPZ Deseleccionar una comuna antes de registrar
    Given seleccioné "Comuna 6" en la lista y en el mapa
    When vuelvo a seleccionar "Comuna 6" desde la lista de zonas
    Then "Comuna 6" deja de figurar seleccionada en la lista
    And su polígono deja de figurar seleccionado en el mapa

  @wip
  Scenario: 05-RPZ Usar la lista cuando no existe configuración de Google Maps
    Given estoy en los datos de perfil sin API key o Map ID de Google Maps
    When selecciono "Comuna 6" desde la lista de zonas
    Then "Comuna 6" figura seleccionada
    And el formulario informa que el mapa no está disponible
    And puedo continuar el registro mediante la lista

  @wip
  Scenario: 06-RPZ Usar la lista cuando falla la carga de Google Maps
    Given estoy en los datos de perfil y falla la carga de Google Maps
    When selecciono "Comuna 14" desde la lista de zonas
    Then "Comuna 14" figura seleccionada
    And el formulario informa que el mapa no está disponible
    And puedo continuar el registro mediante la lista

  Scenario: 07-RPZ Informar que no hay zonas de cobertura disponibles
    Given la API responde que no hay comunas habilitadas
    When elijo la opción de prestador y avanzo al paso de datos de perfil
    Then veo un mensaje que informa que no hay zonas de cobertura disponibles
    And no puedo finalizar el registro como prestador

  Scenario: 08-RPZ Reintentar la consulta después de un error del catálogo
    Given la consulta de zonas falló y veo su estado de error
    And la API vuelve a estar disponible
    When reintento cargar las zonas de cobertura
    Then veo la lista de comunas habilitadas
    And puedo seleccionar una zona para continuar

  @wip
  Scenario: 09-RPZ Rechazar el registro sin zonas seleccionadas
    Given completé los datos, el rubro y la foto obligatorios del prestador
    And no seleccioné ninguna zona de cobertura
    When finalizo el registro
    Then veo el mensaje de error "Debes seleccionar al menos una zona de cobertura"
    And permanezco en la página de registro
    And no se envía el registro del prestador

  @wip
  Scenario: 10-RPZ Registrar exactamente las zonas seleccionadas
    Given completé los datos, el rubro y la foto obligatorios del prestador
    And seleccioné "Comuna 6" desde la lista y "Comuna 14" desde el mapa
    When finalizo el registro
    Then veo la pantalla de conexión de Mercado Pago
