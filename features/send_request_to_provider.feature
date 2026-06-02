@wip
Feature: Enviar solicitud de contacto a un prestador
    Como consumidor
    Quiero enviar un mensaje de solicitud de contacto a un prestador con el que nunca interactué
    Para proponerle un trabajo e iniciar un chat

    Background:
        Given que me logueé exitosamente en Auth0 como cliente
        And existe el rubro Plomería
        And existen los siguientes prestadores registrados:
            | id       | name  | surname | category_name | category_id |
            | prov-001 | Juan  | Pérez   | Plomería      | 1           |
            | prov-002 | Pedro | Dib     | Plomería      | 1           |
        And estoy en el listado de técnicos del rubro "Plomería"

    Scenario: 01-SRP Abrir modal de contacto para un nuevo prestador
        When hago clic en el botón "Contactar" del prestador "Juan Pérez"
        Then se abre el modal "Crear Solicitud de Trabajo"
        And veo el nombre del prestador "Juan Pérez"
        And veo los campos obligatorios "TÍTULO DEL PROBLEMA" y "DESCRIPCIÓN DEL PROBLEMA"

    Scenario: 02-SRP Enviar la solicitud de trabajo exitosamente
        Given que tengo abierta la ventana modal "Crear Solicitud de Trabajo" para "Juan Pérez"
        When ingreso un titulo, una descripcion y toco el boton "Enviar solicitud"
        Then soy redirigido a la pantalla de mensajes con "Juan Pérez"

    Scenario: 03-SRP Verificar que el prestador aparece como contacto después del primer mensaje
        Given que ya envié la solicitud de trabajo a "Juan Pérez"
        When accedo a la sección de mensajes
        Then visualizo al prestador "Juan Pérez" como contacto en mi lista

    Scenario: 04-SRP Permitir enviar más mensajes mientras la conversación no sea aceptada
        Given que inicié la conversación con "Juan Pérez"
        And el prestador aún no aceptó la conversación
        When escribo un nuevo mensaje
        Then puedo enviar mensajes adicionales al prestador
