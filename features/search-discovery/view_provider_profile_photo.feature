Feature: Visualizar foto de perfil de prestador
    Como consumidor
    Quiero poder ver la foto de perfil de un prestador
    Para saber con quien voy a hablar

    Background:
        Given que me logueé exitosamente en Auth0 como cliente
        And existen los rubros Plomería, Electricista y Gasista
        And existen los siguientes prestadores registrados:
            | id       | name | surname | category_name | category_id | profile_photo_url     |
            | prov-002 | Juan | Pérez   | Plomería      | 1           | https://example.com/a |

    Rule: El consumidor debe ver la foto del prestador al listar rubros

        Scenario: 01-VPF Al filtrar por rubro debo poder ver la foto de perfil del prestador
            Given estoy en el home de consumidores
            When hago clic en la tarjeta del rubro "Plomería"
            Then soy redirigido al listado de técnicos del rubro "Plomería"
            And veo la tarjeta del técnico "Juan Pérez" con su foto de perfil

    Rule: El consumidor debe ver la foto del prestador en el chat

        Scenario: 02-VPF Al entrar a la ventana de chats debo poder ver la foto de perfil de los demas prestadores con los que tengo una conversacion
            Given que tengo una conversacion iniciada con un prestador
            When navego a la sección de mensajes del dashboard de cliente
            Then visualizo una lista de conversaciones
            And veo la foto de perfil del prestador en la lista de chats

        Scenario: 03-VPF Al chatear con un prestador debo poder ver su foto de perfil en el header del chat
            Given que tengo una conversacion iniciada con un prestador
            And estoy en la seccion de mensajes del dashboard de cliente
            When hago clic en una conversación
            Then veo la foto de perfil del prestador en el header del chat
