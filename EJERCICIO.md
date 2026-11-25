# Ejercicio: horarios de apertura

Ahora te toca a ti. Vas a añadir **horarios de apertura** a los restaurantes, siguiendo exactamente la misma estructura que `src/restaurants/`. Es muy parecido a lo que hace el producto **Hours** del equipo CPEM.

No hay solución en el repo a propósito. Intenta hacerlo sin IA primero. Si te atascas, abre las pistas de cada paso, que van de menos a más.

## Cómo practicarlo como si fuera el pair programming

1. **Ponte un temporizador de 60 minutos** para la Parte 1.
2. **Antes de escribir código, lee todo y escribe tus preguntas,** igual que se las harías a Alex. Por ejemplo: "Can a restaurant have two slots on the same day?" o "What happens with time zones?". Las respuestas están en "Decisiones ya tomadas".
3. **Piensa en voz alta, en inglés,** mientras programas. Si puedes, grábate.
4. **Haz algo pequeño que funcione y luego mejóralo.** No pasa nada si no terminas: en el pair programming lo que más cuenta es cómo piensas.
5. **Al final, revisa tu código con la lista de autoevaluación.**

---

## Parte 0: calentamiento (15 minutos)

Añade un filtro por estado: `GET /restaurants?active=true` devuelve solo los activos, y `?active=false` solo los inactivos. Sin el parámetro, devuelve todos, como ahora.

Te obliga a tocar todas las capas con un cambio pequeño:

- [ ] `restaurantSchemas.ts`: añade `active` a `listRestaurantsQuerySchema`. Ojo: en la URL llega como el texto `"true"`, no como booleano.
- [ ] `restaurant.ts`: añade `isActive?: boolean` a `RestaurantFilter`.
- [ ] `inMemoryRestaurantRepository.ts` y `postgresRestaurantRepository.ts`: aplica el filtro.
- [ ] Un test unitario y uno de integración.

<details>
<summary>Pista 1</summary>

Para convertir el texto `"true"` o `"false"` en booleano, puedes usar `z.enum(["true", "false"]).transform((value) => value === "true").optional()`. Cuidado con `z.coerce.boolean()`: convierte `"false"` en `true`, porque cualquier texto que no esté vacío es "truthy".
</details>

<details>
<summary>Pista 2</summary>

En el repositorio de Postgres, ahora puede haber dos filtros a la vez (ciudad y estado). En lugar de un `if` para cada combinación, construye una lista de condiciones y otra de valores: `conditions.push("city = $" + (values.length + 1)); values.push(filter.city);`, y al final `WHERE ` + `conditions.join(" AND ")` si la lista no está vacía.
</details>

---

## Parte 1: horarios de apertura (60 minutos)

### Lo que hay que construir

**1. Guardar los horarios de un restaurante.** Sustituye todos los horarios que tuviera antes.

```http
PUT /restaurants/:id/opening-hours
Content-Type: application/json

{
  "hours": [
    { "dayOfWeek": 1, "opensAt": "11:30", "closesAt": "22:00" },
    { "dayOfWeek": 5, "opensAt": "11:30", "closesAt": "23:00" },
    { "dayOfWeek": 6, "opensAt": "12:00", "closesAt": "23:00" }
  ]
}
```

Responde `200` con la lista guardada, ordenada por día y hora de apertura.

**2. Ver los horarios.**

```http
GET /restaurants/:id/opening-hours
```

Responde `200` con la lista. Si el restaurante no tiene horarios, devuelve una lista vacía.

**3. Saber si está abierto en un momento concreto.**

```http
GET /restaurants/:id/is-open?at=2026-11-30T19:30
```

Responde `200` con `{ "isOpen": true }` o `{ "isOpen": false }`.

### Decisiones ya tomadas (las respuestas a tus preguntas)

- **Días:** `dayOfWeek` va de 1 (lunes) a 7 (domingo). Un día que no aparece en la lista significa cerrado.
- **Horas:** formato `"HH:MM"` de 24 horas. `opensAt` tiene que ser anterior a `closesAt`. En esta parte no hay horarios que crucen la medianoche (eso es la Parte 2).
- **Varias franjas por día:** se permiten, por ejemplo 12:00–15:00 y 18:00–23:00, pero **no pueden solaparse**.
- **Abierto:** un restaurante está abierto si `opensAt <= hora < closesAt`. A las 22:00 en punto, uno que cierra a las 22:00 ya está cerrado.
- **Restaurante inactivo:** nunca está abierto, tenga los horarios que tenga.
- **Zonas horarias:** en esta parte se ignoran. Usa la hora tal como llega en `at`.
- **`PUT` sustituye todo:** si mandas tres franjas, el restaurante queda con esas tres. Si mandas `[]`, queda sin horarios. Es idempotente: mandarlo dos veces da el mismo resultado.

### Errores esperados

| Situación | Respuesta |
| --- | --- |
| El restaurante no existe | 404 |
| El id no es un UUID | 400 |
| `dayOfWeek` fuera de 1–7, o una hora con formato incorrecto | 400 |
| `opensAt` no es anterior a `closesAt` | 400 |
| Dos franjas del mismo día se solapan | 400 |
| Falta `at` en `/is-open`, o no es una fecha válida | 400 |

### Archivos que vas a crear

Sigue la misma estructura que `src/restaurants/`:

```text
db/migrations/002_create_opening_hours.sql
src/openingHours/openingHours.ts                         tipos
src/openingHours/openingHoursRepository.ts               el contrato (interfaz)
src/openingHours/inMemoryOpeningHoursRepository.ts       para los tests unitarios
src/openingHours/postgresOpeningHoursRepository.ts       el SQL
src/openingHours/openingHoursService.ts                  las reglas
src/openingHours/openingHoursService.test.ts             tests unitarios
src/openingHours/openingHoursSchemas.ts                  validación con Zod
src/openingHours/openingHoursController.ts
src/openingHours/openingHoursRoutes.ts
test/openingHours.integration.test.ts                    tests de integración
```

Y cambiarás `compositionRoot.ts` y `app.ts` para conectarlo todo.

### Pasos sugeridos (de dentro hacia fuera)

**Paso 1. La tabla.** Crea `002_create_opening_hours.sql` y ejecuta `npm run db:migrate`.

<details>
<summary>Pista</summary>

Columnas: `id`, `restaurant_id` (que apunte a `restaurants(id)`), `day_of_week`, `opens_at` y `closes_at`. Para las horas, Postgres tiene el tipo `TIME`. Piensa qué debería pasar con los horarios si se borra el restaurante: busca `ON DELETE CASCADE`. Puedes proteger los datos también en la base de datos con `CHECK (day_of_week BETWEEN 1 AND 7)` y `CHECK (opens_at < closes_at)`.
</details>

**Paso 2. Tipos y contrato.** Define `OpeningHoursSlot` y la interfaz `OpeningHoursRepository`. ¿Qué operaciones necesita el service? Probablemente "sustituir los horarios de un restaurante" y "leer los horarios de un restaurante".

**Paso 3. El service y sus tests unitarios.** Este es el corazón del ejercicio. Empieza por los tests: tienes la lista en `test/openingHours.todo.test.ts`.

<details>
<summary>Pista 1: cómo comparar horas</summary>

Las horas `"HH:MM"` con dos dígitos se pueden comparar como texto: `"09:30" < "22:00"` es `true`. Otra opción, más clara, es pasarlas a minutos desde medianoche: `"19:30"` → `19 * 60 + 30 = 1170`.
</details>

<details>
<summary>Pista 2: el día de la semana</summary>

`new Date("2026-11-30T19:30").getDay()` devuelve 0 para el domingo, 1 para el lunes… y 6 para el sábado. Nosotros usamos 1–7, con el domingo como 7. Escribe una función pequeña que lo convierta, con su propio test.
</details>

<details>
<summary>Pista 3: ¿quién comprueba qué?</summary>

El formato de cada franja (día válido, `"HH:MM"`, apertura antes que cierre, sin solapes) se puede comprobar en el schema de Zod, porque solo depende de los datos que llegan. Que el restaurante exista o esté activo depende de la base de datos, así que va en el service. Para eso el service de horarios necesita también el `RestaurantRepository`: recíbelo como parámetro, igual que el otro.
</details>

**Paso 4. El repositorio de Postgres.**

<details>
<summary>Pista: sustituir todo de forma segura</summary>

"Borrar los horarios viejos e insertar los nuevos" son dos pasos. Si el segundo falla, el restaurante se quedaría sin horarios. Usa una **transacción**: mira cómo lo hace `src/db/runMigrations.ts` con `BEGIN`, `COMMIT`, `ROLLBACK` y `client.release()`.

Postgres devuelve las columnas `TIME` como `"11:30:00"`. Recórtalo a `"11:30"` al convertir la fila.
</details>

**Paso 5. Schemas, controller y rutas.** Como los de restaurantes.

<details>
<summary>Pista: las rutas</summary>

Puedes crear un router propio y montarlo en `app.ts` con `app.use("/restaurants", openingHoursRouter)`. Dentro, las rutas serían `"/:id/opening-hours"` y `"/:id/is-open"`. Express permite montar dos routers en la misma ruta base.
</details>

**Paso 6. Conectarlo.** Crea el repositorio y el service en `compositionRoot.ts`, y pásalos a `createApp`.

**Paso 7. Tests de integración,** copiando el estilo de `test/restaurants.integration.test.ts`.

### Cuándo está terminado

- [ ] `npm run typecheck` sin errores.
- [ ] `npm test` en verde, con tests nuevos unitarios y de integración.
- [ ] Puedes probar los tres endpoints a mano con `requests.http`.
- [ ] Cada error de la tabla devuelve el código esperado.

---

## Parte 2: si quieres más

1. **Horarios que cruzan la medianoche,** como 22:00–02:00. ¿Cómo cambia la regla de "abierto"? ¿Y la de los solapes?
2. **Cierres puntuales:** `POST /restaurants/:id/closures` con una fecha (`"2026-12-25"`). Ese día el restaurante está cerrado aunque su horario diga lo contrario. Es justo lo que hace Hours con los cierres.
3. **`GET /restaurants/open-now?city=London`:** todos los restaurantes abiertos ahora en una ciudad. ¿Lo harías en el service o en SQL? ¿Por qué?
4. **Zonas horarias:** si Nando's tuviera restaurantes en Dublín y en Nueva York, ¿qué cambiarías?

---

## Autoevaluación

Mírala cuando termines, como haría un Tech Lead en una revisión:

- [ ] ¿El controller solo valida, llama al service y responde? ¿No tiene reglas de negocio?
- [ ] ¿El service no sabe nada de HTTP ni de SQL?
- [ ] ¿Todo el SQL usa parámetros (`$1`) y ningún valor pegado al texto?
- [ ] ¿El `PUT` usa una transacción?
- [ ] ¿Los tests unitarios usan el repositorio en memoria y no tocan la base de datos?
- [ ] ¿Probaste los bordes: abrir a las 11:30 en punto, cerrar a las 22:00 en punto, un día sin horario o un restaurante inactivo?
- [ ] ¿Puedes explicar en 30 segundos, en inglés, por qué cada cosa está en su capa?
