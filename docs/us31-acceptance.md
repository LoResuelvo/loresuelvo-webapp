# US31 — Reclamos de participantes

Escenarios aprobados el 2026-10-19.

### 01 — Presentar un reclamo sobre una operación propia

```gherkin
Given un consumidor o prestador autenticado con una solicitud pendiente, propuesta u orden propia accesible
When presenta un reclamo con un motivo y testimonio válidos
Then recibe una confirmación con el identificador del reclamo y su estado Abierto, vinculado a la operación correspondiente.
```

### 02 — Presentar evidencia del problema

```gherkin
Given un participante que está preparando un reclamo y seleccionó hasta tres imágenes JPEG o PNG válidas de hasta 5 MiB cada una
When presenta el reclamo con esas imágenes
Then recibe la confirmación del reclamo con su evidencia vinculada de forma privada.
```

### 03 — Corregir la presentación antes de enviarla

```gherkin
Given un participante que prepara un reclamo con datos incompletos o inválidos, imágenes no admitidas o evidencia cuya carga falló
When intenta presentar el reclamo
Then recibe indicaciones comprensibles para corregir los datos, reintentar la carga o quitar imágenes, conserva lo ingresado y no se confirma un reclamo incompleto.
```

### 04 — Recuperar un envío sin duplicar el reclamo

```gherkin
Given un participante cuyo reclamo quedó sin confirmación por un problema de conexión
When reintenta la misma presentación
Then obtiene la confirmación del expediente y su estado actual sin crear un reclamo duplicado.
```

### 05 — Evitar reclamos propios simultáneos sobre la misma operación

```gherkin
Given un participante con un reclamo propio abierto o en revisión sobre una operación
When intenta presentar otro reclamo sobre esa misma operación
Then recibe un aviso de que ya tiene un reclamo en curso y el expediente anterior se conserva sin cambios.
```

### 06 — Presentar un nuevo expediente cuando corresponde

```gherkin
Given un participante cuya contraparte tiene un reclamo en la operación o cuyo reclamo propio anterior ya fue resuelto o desestimado
When presenta un nuevo reclamo válido sobre la operación
Then obtiene un expediente propio nuevo sin modificar los anteriores ni acceder al expediente de la contraparte.
```

### 07 — Consultar y encontrar mis reclamos

```gherkin
Given un consumidor o prestador autenticado con reclamos propios
When consulta Mis reclamos con el filtro de estado y la página elegidos
Then ve únicamente sus reclamos con motivo, operación, estado y fechas disponibles, ordenados del más reciente al más antiguo, con navegación entre páginas y un mensaje claro cuando no hay resultados.
```

### 08 — Consultar el seguimiento y resultado de un reclamo

```gherkin
Given un participante con un reclamo propio
When abre el detalle del reclamo
Then ve su testimonio, motivo, operación, estado y fechas registradas, además del dictamen si existe o la indicación de que aún no hay resolución; cualquier compensación se informa como sugerida, sin afirmar que fue pagada.
```

### 09 — Consultar la evidencia privada del reclamo

```gherkin
Given un participante con un reclamo propio que tiene imágenes adjuntas
When consulta la evidencia en el detalle
Then puede visualizar exclusivamente las imágenes vinculadas mediante acceso temporal privado y dispone de un reintento si una imagen deja de estar disponible, sin perder la evidencia del expediente.
```

### 10 — Proteger el acceso a reclamos privados

```gherkin
Given una persona sin sesión válida, sin cuenta habilitada o que intenta acceder a un reclamo o referencia inexistente o ajeno
When intenta presentar o consultar el reclamo
Then recibe la indicación de autenticarse, la falta de habilitación o un mensaje de recurso no disponible según corresponda, sin acceder a información privada ni evidencia de otra persona.
```

### 11 — Recuperarse de errores del servicio

```gherkin
Given un participante que está presentando un reclamo o consultando el listado o detalle y el servicio demora o falla
When consulta el resultado de su acción
Then ve un estado de carga mientras espera o un mensaje de error con una acción de recuperación si falla, sin confundir el fallo con un éxito o con la ausencia de reclamos.
```

### 12 — Gestionar reclamos desde distintos dispositivos y con teclado

```gherkin
Given un participante que usa un móvil, tablet o escritorio, o navega con teclado
When recorre el flujo de presentación y consulta de reclamos
Then puede completar las acciones, leer el contenido y reconocer errores y estados con controles etiquetados, foco visible y una presentación adaptada a su pantalla.
```

