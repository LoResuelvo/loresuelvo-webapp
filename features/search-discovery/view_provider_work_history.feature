Feature: [WEB] US-16 - Consultar reputación e historial público de un prestador

  Como consumidor
  quiero consultar la reputación y el historial público de un prestador
  para conocer su experiencia antes de contactarlo

  Background:
    Given que soy un consumidor autenticado

  Rule: La reputación pública se expresa mediante el promedio y la cantidad de reseñas.

    Scenario: 16.1-VPWH Consultar la reputación pública de un prestador
      Given que el perfil público de "Juan Gómez" está disponible con promedio de 4.8 y 12 reseñas
      When ingreso al perfil de "Juan Gómez"
      Then visualizo el promedio de calificación "4.8"
      And visualizo la cantidad de reseñas "12 reseñas"
      And visualizo las estrellas de la calificación de forma decorativa

  Rule: Cada trabajo pagado muestra solamente su información pública, su reporte de finalización y, si existe, su reseña.

    Scenario: 16.2-VPWH Consultar un trabajo pagado del historial público
      Given que el perfil público de "Juan Gómez" incluye el trabajo pagado "Reparación de cañería en cocina" con reporte y reseña
      When ingreso al perfil de "Juan Gómez"
      Then visualizo el trabajo "Reparación de cañería en cocina"
      And visualizo su reporte de finalización
      And visualizo su reseña y calificación

  Rule: Los trabajos sin reseña y los perfiles sin historial informan su estado de manera explícita.

    Scenario: 16.3-VPWH Informar un trabajo pagado sin reseña
      Given que el perfil público de "Juan Gómez" incluye un trabajo pagado sin reseña
      When ingreso al perfil de "Juan Gómez"
      Then visualizo que el trabajo todavía no tiene reseña

    Scenario: 16.4-VPWH Informar reputación e historial públicos vacíos
      Given que el perfil público de "Juan Gómez" no tiene reseñas ni trabajos pagados
      When ingreso al perfil de "Juan Gómez"
      Then visualizo que todavía no tiene reseñas
      And visualizo que todavía no tiene historial público

  Rule: El historial conserva el orden recibido desde la API.

    Scenario: 16.5-VPWH Conservar el orden del historial público
      Given que el perfil público de "Juan Gómez" incluye los trabajos pagados "Reparación de cañería" y "Cambio de grifería" en ese orden
      When ingreso al perfil de "Juan Gómez"
      Then visualizo "Reparación de cañería" antes que "Cambio de grifería"

  Rule: El historial público nunca expone datos privados del trabajo.

    Scenario: 16.6-VPWH Ocultar datos privados del historial público
      Given que el perfil público de "Juan Gómez" incluye un trabajo pagado con datos privados
      When ingreso al perfil de "Juan Gómez"
      Then no visualizo datos del consumidor, importes ni evidencias privadas del trabajo
