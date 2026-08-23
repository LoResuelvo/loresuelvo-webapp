Feature: [WEB] US-14 - Ver información de perfil de un prestador

  Como consumidor
  quiero consultar la información pública de un prestador
  para conocer sus datos antes de contactarlo

  Rule: El consumidor autenticado puede consultar perfiles públicos

    Background:
      Given que soy un consumidor autenticado

    @wip
    Scenario: 14.1-VPP Consultar el perfil público de un prestador
      Given que estoy viendo los resultados de prestadores de "Plomería"
      And el resultado incluye al prestador "Juan Gómez"
      And el perfil de "Juan Gómez" está disponible con foto
      When selecciono "Ver perfil" para el prestador "Juan Gómez"
      Then soy redirigido al perfil de "Juan Gómez"
      And visualizo el nombre completo "Juan Gómez"
      And visualizo la foto de perfil de "Juan Gómez"
      And visualizo el rubro "Plomería"

    @wip
    Scenario: 14.2-VPP Ocultar datos privados del prestador
      Given que el perfil público de "Juan Gómez" está disponible
      When ingreso al perfil de "Juan Gómez"
      Then no visualizo el correo del prestador
      And no visualizo documentos privados del prestador

    @wip
    Scenario: 14.3-VPP Informar que el perfil se está cargando
      Given que la consulta del perfil de "Juan Gómez" permanece pendiente
      When ingreso al perfil de "Juan Gómez"
      Then visualizo que el perfil se está cargando

    @wip
    Scenario: 14.4-VPP Informar que el prestador no existe
      Given que no existe el prestador solicitado
      When ingreso al perfil del prestador inexistente
      Then visualizo que el perfil no fue encontrado
      And puedo volver a la búsqueda de prestadores

    @wip
    Scenario: 14.5-VPP Informar una falla temporal al consultar el perfil
      Given que el servicio de perfiles no está disponible
      When ingreso al perfil de "Juan Gómez"
      Then visualizo un mensaje de error seguro
      And puedo reintentar la consulta

  Rule: El perfil requiere una sesión válida

    @wip
    Scenario: 14.6-VPP Impedir el acceso sin autenticación
      Given que no tengo una sesión válida
      When intento ingresar al perfil de "Juan Gómez"
      Then soy redirigido fuera del área de consumidores
      And el perfil del prestador no se muestra
