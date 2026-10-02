Feature: [WEB] US-59 - Reconocer la identidad verificada de un prestador

  Background:
    Given que soy un consumidor autenticado

  Scenario: 59.1-IVP Distinguir la identidad verificada en la búsqueda
    Given que la búsqueda de "Plomería" incluye a "Juan Pérez" con identidad verificada
    And incluye a "Pedro Dib" sin identidad verificada
    When ingreso a los resultados de prestadores de "Plomería"
    Then visualizo "Identidad verificada" en la tarjeta de "Juan Pérez"
    And no visualizo ese indicador en la tarjeta de "Pedro Dib"
    And ambos prestadores conservan sus acciones de contacto y acceso al perfil

  Scenario: 59.2-IVP Reconocer la identidad verificada en el perfil
    Given que el perfil público de "Juan Pérez" está disponible con identidad verificada
    When ingreso al perfil de "Juan Pérez"
    Then visualizo "Identidad verificada" junto a su información de presentación
    And puedo leer el indicador sin depender exclusivamente de su color o icono

  Scenario: 59.3-IVP Consultar un perfil sin identidad verificada
    Given que el perfil público de "Pedro Dib" está disponible sin identidad verificada
    When ingreso al perfil de "Pedro Dib"
    Then visualizo su información pública
    And no visualizo el indicador "Identidad verificada"
    And no visualizo mensajes de rechazo o advertencias sobre su identidad

  @wip
  Scenario Outline: 59.4-IVP Preservar la privacidad de la verificación pública
    Given que "Juan Pérez" tiene su identidad verificada
    And la respuesta de la consulta incluye datos internos de verificación que no pertenecen al contrato público
    When consulto a "Juan Pérez" en <superficie>
    Then visualizo únicamente el indicador público "Identidad verificada" sobre su verificación
    And no visualizo estados internos, fecha de aprobación, identificadores de sesión ni documentos de identidad

    Examples:
      | superficie                 |
      | los resultados de búsqueda |
      | el perfil público          |
