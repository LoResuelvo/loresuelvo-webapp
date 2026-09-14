Feature: US-58 Verificar opcionalmente identidad del prestador
  Como prestador
  quiero verificar mi identidad después de crear mi cuenta
  para demostrar que fue comprobada sin bloquear mi registro

  Scenario: 01-VIP Ofrecer verificación opcional después de crear la cuenta
    Given completé los datos, la foto, el rubro y las zonas obligatorios del prestador
    And la API puede crear mi cuenta correctamente
    When confirmo el registro como prestador
    Then veo la invitación opcional para verificar mi identidad
    And la pantalla informa que mi cuenta ya fue creada
    And veo las acciones "Verificar ahora" y "Más tarde"

  Scenario: 02-VIP Omitir la verificación y continuar a Mercado Pago
    Given mi cuenta de prestador ya fue creada y veo la invitación de identidad
    When elijo "Más tarde"
    Then veo el paso de conexión con Mercado Pago

  Scenario: 03-VIP Iniciar la verificación en Didit
    Given soy un prestador registrado sin sesiones previas y veo la invitación de identidad
    And la API puede iniciar mi verificación
    When elijo "Verificar ahora"
    Then soy dirigido al flujo alojado de Didit

  Scenario: 04-VIP Reconocer una identidad ya aprobada
    Given soy un prestador registrado cuya identidad está aprobada en la API
    When ingreso al paso de identidad del onboarding
    Then veo la confirmación de identidad verificada
    And no veo una acción para iniciar otra sesión

  Scenario Outline: 05-VIP Mostrar el resultado al regresar de Didit
    Given la API informa mi identidad en estado <estado>
    When regreso a la página de resultado de identidad
    Then veo el mensaje correspondiente a <resultado>

    Examples:
      | estado    | resultado              |
      | approved  | identidad verificada   |
      | in_review | verificación pendiente |
      | declined  | verificación rechazada |
      | abandoned | verificación abandonada |
      | expired   | sesión vencida         |

  Scenario: 06-VIP Actualizar un resultado pendiente
    Given veo mi verificación pendiente
    And la API ahora informa mi identidad aprobada
    When elijo actualizar el estado
    Then veo la confirmación de identidad verificada

  Scenario Outline: 07-VIP Continuar a Mercado Pago desde cualquier resultado
    Given veo el resultado <estado> de mi verificación
    When elijo continuar con el onboarding
    Then veo el paso de conexión con Mercado Pago

    Examples:
      | estado      |
      | approved    |
      | in_review   |
      | declined    |
      | abandoned   |
      | expired     |
      | kyc_expired |
      | unverified  |

  @wip
  Scenario: 08-VIP Informar un error de inicio sin perder la cuenta
    Given mi cuenta de prestador ya fue creada y veo la invitación de identidad
    And el servicio de verificación no está disponible
    When elijo "Verificar ahora"
    Then veo un error de verificación controlado
    And veo opciones para reintentar o continuar más tarde
    And no se me solicita completar nuevamente el perfil

  @wip
  Scenario: 09-VIP Reintentar después de un error de inicio
    Given el inicio anterior falló sin crear una sesión y veo el error
    And la API vuelve a estar disponible
    When reintento iniciar la verificación
    Then soy dirigido al flujo alojado de Didit

  @wip
  Scenario Outline: 10-VIP Recuperar el estado al recargar o volver a ingresar
    Given mi cuenta de prestador ya existe
    And la API informa el estado <estado>
    And estoy en la etapa <etapa> del onboarding
    When <accion>
    Then veo <pantalla>
    And no se me solicita crear la cuenta nuevamente

    Examples:
      | estado      | etapa        | accion                                       | pantalla                    |
      | unverified  | identidad    | recargo la página                            | la invitación de identidad  |
      | approved    | identidad    | recargo la página                            | identidad verificada        |
      | unverified  | mercado-pago | recargo la página                            | la conexión de Mercado Pago |
      | in_review   | identidad    | vuelvo al onboarding después de autenticarme | verificación pendiente      |
