@wip
Feature: Buscar técnicos por rubro
    Como consumidor
    Quiero buscar técnicos por rubro
    Para encontrar profesionales especializados en el servicio que necesito

    Background:
        Given que me logueé exitosamente en Auth0 como cliente
        And estoy en el home de consumidores
        And existen los rubros Plomería, Electricista y Gasista
        And existen los siguientes prestadores registrados:
            | id       | name  | surname | category_name | category_id |
            | prov-001 | Laura | Gómez   | Electricista  | 2           |
            | prov-002 | Juan  | Pérez   | Plomería      | 1           |
            | prov-003 | Pedro | Dib     | Plomería      | 1           |

    Rule: El consumidor debe poder visualizar los técnicos del rubro seleccionado

        Scenario: 01-SPC Visualizar técnicos de un rubro con un solo profesional
            When hago clic en la tarjeta del rubro "Electricista"
            Then soy redirigido al listado de técnicos del rubro "Electricista"
            And veo la tarjeta del técnico "Laura Gómez" con el rubro "Electricista"

        Scenario: 02-SPC Visualizar técnicos de un rubro con múltiples profesionales
            When hago clic en la tarjeta del rubro "Plomería"
            Then soy redirigido al listado de técnicos del rubro "Plomería"
            And veo la tarjeta del técnico "Juan Pérez" con el rubro "Plomería"
            And veo la tarjeta del técnico "Pedro Dib" con el rubro "Plomería"

    Rule: El sistema debe informar cuando no existan resultados para el rubro buscado

        Scenario: 03-SPC Informar que no hay técnicos disponibles para el rubro seleccionado
            Given que no existen prestadores registrados para el rubro "Gas"
            When hago clic en la tarjeta del rubro "Gas"
            Then soy redirigido al listado de técnicos del rubro "Gas"
            And veo el mensaje "No se encontraron profesionales especializados en esta categoría"
