Feature: US-52 Adjuntar imágenes a solicitud de trabajo
  Como consumidor
  quiero adjuntar imágenes a mi solicitud de trabajo
  para dar un mejor contexto al prestador de mi problema

  Background:
    Given que me logueé exitosamente en Auth0 como cliente
    And existe el rubro Plomería
    And existen los siguientes prestadores registrados:
      | id       | name | surname | category_name | category_id |
      | prov-001 | Juan | Pérez   | Plomería      | 1           |
    And estoy en el listado de técnicos del rubro "Plomería"
    And que tengo abierta la ventana modal "Crear Solicitud de Trabajo" para "Juan Pérez"

  Scenario: 52.1-AIJR Carga exitosa de job request con una imagen adjunta
    Given que adjunté la imagen "perdida-bajo-mesada.jpg" a la solicitud
    When ingreso un titulo, una descripcion y toco el boton "Enviar solicitud"
    Then soy redirigido a la pantalla de mensajes con "Juan Pérez"

  Scenario: 52.2-AIJR Carga de múltiples imágenes a una job request exitosa
    Given que adjunté las imágenes "perdida-bajo-mesada.jpg", "detalle-sifon.webp" y "humedad-pared.png" a la solicitud
    When ingreso un titulo, una descripcion y toco el boton "Enviar solicitud"
    Then soy redirigido a la pantalla de mensajes con "Juan Pérez"

  Scenario: 52.3-AIJR No se puede adjuntar más de 3 imágenes a una job request
    Given que adjunté 3 imágenes a la solicitud
    When intento adjuntar una cuarta imagen
    Then veo un mensaje de error indicando que se alcanzó el límite de imágenes
    And la cuarta imagen no se adjunta

  Scenario: 52.4-AIJR Prestador puede obtener imagen de la job request
    Given que el consumidor envió una solicitud con la imagen "perdida-bajo-mesada.jpg"
    And estoy autenticado como prestador "Juan Pérez"
    When visualizo el detalle de la solicitud de trabajo
    Then veo la imagen "perdida-bajo-mesada.jpg" en la solicitud
