Feature: US-1.2 Registrar consumidor con dirección
  Como consumidor
  Quiero registrar obligatoriamente mi dirección durante el registro
  Para recibir recomendaciones y contratar servicios de prestadores que trabajen
  en mi zona de cobertura

  Background:
    Given que me registré exitosamente en Auth0 con email "consumidor@example.com"

  Scenario: 01-RCA Ver campos de dirección al registrar como consumidor
    Given elegí la opción de consumidor en la pagina de registro
    When avanzo al paso de datos de perfil
    Then veo los campos "Calle", "Número", "Piso" y "Departamento"
    And "Calle" y "Número" son obligatorios
    And "Piso" y "Departamento" son opcionales

  @wip
  Scenario: 02-RCA Registrar consumidor con calle y número
    Given elegí la opción de consumidor en la pagina de registro
    And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
    And ingreso la calle "Av. Rivadavia" y el número "5100"
    When finalizo el registro
    Then soy redirigido al home de consumidores

  @wip
  Scenario: 03-RCA Registrar consumidor con dirección completa
    Given elegí la opción de consumidor en la pagina de registro
    And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
    And ingreso la calle "Av. Rivadavia", número "5100", piso "4" y departamento "B"
    When finalizo el registro
    Then soy redirigido al home de consumidores

  Rule: La dirección debe contener calle y número no vacíos

    Scenario: 04-RCA Rechazar registro sin calle
      Given elegí la opción de consumidor en la pagina de registro
      And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
      And ingreso el número "5100" pero dejo la calle vacía
      When finalizo el registro
      Then veo el mensaje de error "Campo obligatorio" debajo del campo "Calle"
      And permanezco en la página de registro

    @wip
    Scenario: 05-RCA Rechazar registro sin número
      Given elegí la opción de consumidor en la pagina de registro
      And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
      And ingreso la calle "Av. Rivadavia" pero dejo el número vacío
      When finalizo el registro
      Then veo el mensaje de error "Campo obligatorio" debajo del campo "Número"
      And permanezco en la página de registro

    @wip
    Scenario: 06-RCA Rechazar registro con calle de solo espacios en blanco
      Given elegí la opción de consumidor en la pagina de registro
      And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
      And ingreso la calle "   " y el número "5100"
      When finalizo el registro
      Then veo el mensaje de error "Campo obligatorio" debajo del campo "Calle"
      And permanezco en la página de registro

  Rule: Errores del backend se muestran como mensajes específicos

    @wip
    Scenario: 07-RCA Informar que la dirección no pudo validarse
      Given elegí la opción de consumidor en la pagina de registro
      And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
      And ingreso la calle "Calle Inexistente" y el número "99999"
      And la API responde que la dirección no pudo geolocalizarse
      When finalizo el registro
      Then veo el mensaje "No se pudo validar la dirección ingresada"
      And permanezco en la página de registro

    @wip
    Scenario: 08-RCA Informar que la dirección está fuera del área de servicio
      Given elegí la opción de consumidor en la pagina de registro
      And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
      And ingreso la calle "Ruta Nacional 5" y el número "100"
      And la API responde que la dirección está fuera del área de servicio
      When finalizo el registro
      Then veo el mensaje "Todavía no ofrecemos servicios en esa ubicación"
      And permanezco en la página de registro

    @wip
    Scenario: 09-RCA Informar que el servicio de validación no está disponible
      Given elegí la opción de consumidor en la pagina de registro
      And ingreso mi nombre "Ana" y apellido "Pérez" en el formulario
      And ingreso la calle "Av. Rivadavia" y el número "5100"
      And la API de ubicación no está disponible temporalmente
      When finalizo el registro
      Then veo el mensaje "No se pudo validar la dirección temporalmente. Intente nuevamente más tarde"
      And permanezco en la página de registro

  Rule: El autocomplete de direcciones asiste el ingreso cuando está disponible

    @wip
    Scenario: 10-RCA Ver sugerencias de direcciones al escribir la calle
      Given elegí la opción de consumidor en la pagina de registro
      And Google Places Autocomplete está disponible con sugerencias para "Rivadavia"
      When escribo "Rivadavia" en el campo "Calle"
      Then veo sugerencias de direcciones que incluyen "Rivadavia"

    @wip
    Scenario: 11-RCA Autocompletar calle y número al seleccionar una sugerencia
      Given elegí la opción de consumidor en la pagina de registro
      And Google Places Autocomplete está disponible
      And escribo "Rivadavia 5100" en el campo "Calle"
      When selecciono la sugerencia "Av. Rivadavia 5100, Buenos Aires"
      Then el campo "Calle" contiene "Av. Rivadavia"
      And el campo "Número" contiene "5100"

  Rule: Sin Google Places se puede completar la dirección manualmente

    @wip
    Scenario: 12-RCA Ingresar dirección manualmente sin configuración de Google
      Given elegí la opción de consumidor en la pagina de registro
      And no hay API key de Google configurada
      When avanzo al paso de datos de perfil
      Then veo los campos "Calle" y "Número" editables sin sugerencias automáticas
      And puedo completar la dirección manualmente

    @wip
    Scenario: 13-RCA Ingresar dirección manualmente cuando falla Google Places
      Given elegí la opción de consumidor en la pagina de registro
      And falla la carga de Google Places
      When avanzo al paso de datos de perfil
      Then veo los campos "Calle" y "Número" editables sin sugerencias automáticas
      And puedo completar la dirección manualmente
