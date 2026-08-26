Feature: Ver reputación de prestadores en la búsqueda
    Como consumidor
    Quiero conocer la reputación de cada prestador
    Para elegir con quién contactar

    Scenario: 30.1.1-RSP Informar que un prestador todavía no tiene reseñas
        Given que la búsqueda de "Plomería" incluye al prestador "Juan Pérez" sin reseñas
        When ingreso a los resultados de prestadores de "Plomería"
        Then visualizo que "Juan Pérez" tiene 0 reseñas

    @wip
    Scenario: 30.1.2-RSP Mostrar el promedio y la cantidad de reseñas
        Given que la búsqueda de "Plomería" incluye al prestador "Juan Pérez" con promedio 4.5 y 2 reseñas
        When ingreso a los resultados de prestadores de "Plomería"
        Then visualizo la calificación promedio 4.5 de "Juan Pérez"
        And visualizo que "Juan Pérez" tiene 2 reseñas

    @wip
    Scenario: 30.1.3-RSP Asociar la reputación con el prestador correcto
        Given que la búsqueda de "Plomería" incluye a "Juan Pérez" con promedio 5 y a "Pedro Dib" con promedio 2
        When ingreso a los resultados de prestadores de "Plomería"
        Then visualizo la calificación 5 en la tarjeta de "Juan Pérez"
        And visualizo la calificación 2 en la tarjeta de "Pedro Dib"
