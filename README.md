# Restaurants API: práctica de backend de principio a fin

Una API REST pequeña, en TypeScript, Express y PostgreSQL, hecha para **entender cómo viaja una petición por las tres capas**: controller, service y repository. Gestiona restaurantes (crear, listar, ver, cambiar y borrar), un tema parecido al del equipo CPEM de Nando's.

Está organizada con las buenas prácticas habituales en Node.js. Cada archivo tiene comentarios que explican qué hace y por qué. Este README te da el mapa, y en [EJERCICIO.md](EJERCICIO.md) tienes un ejercicio para hacer tú sola, con la misma estructura.

## Cómo arrancarlo

Necesitas Node.js 22 o superior (el proyecto usa la 26, la de `.nvmrc`) y Docker para la base de datos.

```bash
nvm use                     # usa la versión de Node de .nvmrc (si tienes nvm)
npm install                 # instala las dependencias
cp .env.example .env        # crea tu archivo de configuración
docker compose up -d        # arranca PostgreSQL en Docker
npm run db:migrate          # crea las tablas
npm run dev                 # arranca la API en http://localhost:3000, con logs fáciles de leer
```

**Si ya tienes otro PostgreSQL en el puerto 5432:** en tu `.env`, pon `DB_PORT=5434` y cambia `5432` por `5434` en `DATABASE_URL` y `TEST_DATABASE_URL`.

**Sin Docker:** si ya tienes PostgreSQL instalado, crea las bases de datos `restaurants` y `restaurants_test`, y cambia las dos URLs de tu `.env`.

Para probarla, abre `requests.http` en VS Code con la extensión **REST Client**, o usa curl:

```bash
curl -X POST http://localhost:3000/restaurants \
  -H "Content-Type: application/json" \
  -d '{"code":"camden","name":"Nando'\''s Camden","city":"London"}'
```

## Los endpoints

| Método | Ruta | Qué hace | Respuestas |
| --- | --- | --- | --- |
| GET | `/health` | ¿Está vivo el proceso? No toca la base de datos | 200 |
| GET | `/health/ready` | ¿Puede atender peticiones? Comprueba la base de datos | 200, 503 |
| POST | `/restaurants` | Crea un restaurante | 201, 400, 409 |
| GET | `/restaurants?city=London&limit=20&offset=0` | Lista restaurantes, por páginas y opcionalmente por ciudad | 200, 400 |
| GET | `/restaurants/:id` | Devuelve uno | 200, 400, 404 |
| PATCH | `/restaurants/:id` | Cambia `name`, `city` o `isActive` | 200, 400, 404 |
| DELETE | `/restaurants/:id` | Borra uno inactivo | 204, 400, 404, 409 |

La lista viene por páginas. `limit` va de 1 a 100 (20 por defecto) y `offset` es cuántos se salta:

```json
{
  "data": [{ "id": "…", "code": "CAMDEN", "name": "Nando's Camden", "city": "London", "isActive": true, "createdAt": "…" }],
  "pagination": { "limit": 20, "offset": 0, "total": 1 }
}
```

Cada respuesta lleva una cabecera `X-Request-Id`. Si la petición ya traía una, se respeta.

**Reglas de negocio** (están en el service):

1. El código se guarda en mayúsculas: `camden` y `CAMDEN` son el mismo.
2. Dos restaurantes no pueden tener el mismo código (409). Lo garantiza el `UNIQUE` de la base de datos, incluso con dos peticiones a la vez.
3. No se puede borrar un restaurante activo. Primero hay que desactivarlo (409). Se comprueba y se borra en una sola consulta.

## El viaje de una petición

Así recorre el código un `POST /restaurants`:

```text
 Cliente (curl, navegador, frontend)
    │  POST /restaurants  {"code":"camden", ...}
    ▼
 app.ts ─────────────── request-logger: le da un X-Request-Id y lo registrará al terminar
    │                   helmet: cabeceras de seguridad
    │                   express.json(): convierte el JSON en req.body (máximo 100kb)
    ▼
 restaurants.routes.ts ── "POST /" → controller.create
    │
    ▼
 restaurants.controller.ts
    │  1. valida req.body con Zod (restaurants.schemas.ts) ──── si falla: ZodError
    │  2. llama a service.createRestaurant(input)
    ▼
 restaurants.service.ts      ← REGLAS DE NEGOCIO
    │  código en mayúsculas, y llama a repository.create(...)
    ▼
 restaurants.repository.postgres.ts   ← SQL
    │  INSERT INTO restaurants ... VALUES ($1, $2, $3, $4) RETURNING ...
    │  si el código ya existe, Postgres lo rechaza ──► UniqueViolationError
    ▼
 PostgreSQL
    │
    ▼  la fila guardada vuelve por el mismo camino
    │  (si hubo UniqueViolationError, el service la convierte en ConflictError)
 restaurants.controller.ts ── res.status(201).json(restaurant)

 Si algo lanza un error en cualquier punto ──► shared/http/error-handler.ts
     ZodError → 400 · NotFoundError → 404 · ConflictError → 409
     errores 4xx de Express (JSON roto, cuerpo enorme…) → su propio código
     cualquier otro → 500, y se registra en el log con el X-Request-Id
```

## Qué hace cada capa (y qué NO hace)

| Capa | Archivo | Su trabajo | Lo que NO hace |
| --- | --- | --- | --- |
| Routes | `restaurants.routes.ts` | Une cada URL y método con un handler | Lógica de ningún tipo |
| Controller | `restaurants.controller.ts` | Valida la entrada, llama al service y elige el código HTTP | Reglas de negocio o SQL |
| Validación | `restaurants.schemas.ts` | Define qué datos son válidos (Zod) | Comprobar cosas de la base de datos |
| Service | `restaurants.service.ts` | Las reglas de negocio | Saber de HTTP (req, res, status) o de SQL |
| Repository (contrato) | `restaurants.repository.ts` | Dice QUÉ se puede hacer con los datos | Decir CÓMO |
| Repository (Postgres) | `restaurants.repository.postgres.ts` | El SQL y la traducción entre filas y objetos | Reglas de negocio |
| Repository (memoria) | `restaurants.repository.memory.ts` | Lo mismo, pero en un `Map`, para los tests | — |
| Tipos | `restaurants.types.ts` | La forma de los datos dentro de la app | Saber de Express, Zod o SQL |
| Errores | `shared/errors.ts`, `shared/db/errors.ts`, `shared/http/error-handler.ts` | Errores con nombre, y un solo sitio que los traduce a HTTP | — |
| Composition root | `composition-root.ts` | Conecta pool → repository → service, y el logger | — |

**La idea clave:** el service solo conoce la *interfaz* `RestaurantRepository`, no Postgres. Por eso los tests unitarios le pasan el repositorio en memoria y funcionan sin base de datos, y todo el SQL está en un solo archivo.

## Estructura de carpetas

```text
.github/workflows/ci.yml        CI: lint, tipos, tests y build en cada push y cada PR
db/migrations/                  SQL que crea las tablas (npm run db:migrate)
src/
  server.ts                     punto de entrada: arranca el servidor y lo apaga bien (SIGTERM)
  app.ts                        monta Express: middlewares, rutas y error handler
  composition-root.ts           conecta las piezas
  config.ts                     lee y valida el .env
  modules/                      UNA CARPETA POR FUNCIONALIDAD DE NEGOCIO
    restaurants/                todo lo de "restaurantes", junto: routes, controller, service...
    health/                     /health y /health/ready
  shared/                       lo que usan todos los módulos
    db/                         pool de conexiones, migraciones, errores de base de datos
    http/                       error handler y request logger
    errors.ts                   NotFoundError, ConflictError
    logger.ts                   logs en JSON con pino
    pagination.ts               limit/offset, igual para todas las listas
test/
  helpers/test-app.ts           monta la app real contra la base de datos de test
  integration/                  tests de la API completa contra PostgreSQL
requests.http                   peticiones de ejemplo para probar a mano
```

Cuando añadas los horarios del ejercicio, irán en `src/modules/opening-hours/`, con los mismos nombres: `opening-hours.controller.ts`, `opening-hours.service.ts`…

## Por qué está organizado así

Son las prácticas que verás en la mayoría de backends de Node.js profesionales. Cada una tiene su propio commit en el historial, por si quieres ver el cambio exacto.

1. **Carpetas por funcionalidad, no por tipo de archivo.** Todo lo de restaurantes está junto en `modules/restaurants/`. Si borras la funcionalidad, borras una carpeta. Es la primera recomendación de la guía *Node.js Best Practices*.
2. **Cada nombre de archivo dice su capa:** `restaurants.service.ts`. Es la convención de NestJS y de muchos proyectos con Express. Van en *kebab-case* (`opening-hours`) porque macOS no distingue mayúsculas en los nombres de archivo y Linux sí: así un import nunca funciona en tu Mac y falla en el servidor.
3. **Express no pasa del controller.** `req` y `res` nunca llegan al service, así que las reglas se pueden probar sin HTTP.
4. **La base de datos garantiza lo que depende de la concurrencia.** "Comprobar y luego actuar" deja un hueco entre los dos pasos. Por eso el código único lo garantiza el `UNIQUE`, y el borrado es una sola consulta: `DELETE … WHERE id = $1 AND is_active = false`.
5. **Errores con nombre de negocio y una sola traducción a HTTP.** Y un error del cliente (JSON roto, cuerpo enorme) nunca se convierte en un 500.
6. **Logs estructurados.** Cada línea es un JSON con un `reqId`, así puedes seguir una petición de principio a fin en herramientas como Google Cloud Logging.
7. **Listo para producción.** Se apaga bien con `SIGTERM` (lo que mandan Docker, Kubernetes y Cloud Run), tiene health checks de vida y de disponibilidad, no se cae si se rompe una conexión de la base de datos, y usa `helmet`.
8. **Las listas van por páginas,** para no devolver nunca la tabla entera.
9. **Tres tipos de test,** del más rápido al más completo (mira "Tests").
10. **La calidad la comprueba una máquina.** TypeScript estricto, tests incluidos; Biome para el estilo y los errores típicos; y GitHub Actions lo ejecuta todo en cada pull request.

## Si vienes de Java y Spring Boot

| Spring Boot | Aquí |
| --- | --- |
| `@RestController` + `@GetMapping` | `restaurants.routes.ts` + `restaurants.controller.ts` |
| `@Valid` + Bean Validation | `restaurants.schemas.ts` (Zod) |
| `@Service` | `restaurants.service.ts` |
| `@Repository` / `JpaRepository` | `restaurants.repository.ts` + `restaurants.repository.postgres.ts` |
| El contenedor de inyección de Spring | `composition-root.ts` (conectado a mano) |
| `@ControllerAdvice` / `@ExceptionHandler` | `shared/http/error-handler.ts` |
| Flyway | `shared/db/run-migrations.ts` |
| `application.yml` | `config.ts` + `.env` |
| Actuator `/health` | `modules/health/health.routes.ts` |
| SLF4J + MDC con el request id | `shared/logger.ts` + `shared/http/request-logger.ts` |

## Tests

```bash
npm test                    # todos
npm run test:unit           # sin base de datos: el service y la capa HTTP
npm run test:integration    # la API completa contra la base de datos de test
npm run validate            # lint + tipos + todos los tests, lo mismo que hace CI
```

- **Unitarios del service** (`src/modules/restaurants/restaurants.service.test.ts`): las reglas de negocio, con el repositorio en memoria. Tardan milisegundos.
- **HTTP sin base de datos** (`src/app.test.ts`): la app real con el repositorio en memoria, para probar códigos de error, cabeceras y health checks.
- **Integración** (`test/integration/`): peticiones HTTP reales con supertest que pasan por todas las capas hasta PostgreSQL. Usan una base de datos aparte, `restaurants_test`, que se vacía antes de cada test. Los archivos se ejecutan de uno en uno porque comparten esa base de datos. Si la base de datos no está arrancada, fallan con un mensaje que te dice qué hacer.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Arranca la API y la reinicia al guardar. Los logs salen legibles (pino-pretty) |
| `npm run build` / `npm start` | Compila a `dist/` y arranca la versión compilada |
| `npm run db:migrate` | Ejecuta las migraciones pendientes |
| `npm run typecheck` | Comprueba los tipos de todo, tests incluidos |
| `npm run lint` / `npm run lint:fix` | Biome: errores típicos, formato y orden de los imports. `lint:fix` los arregla |
| `npm run validate` | Lint, tipos y tests. Pásalo antes de cada commit |

## Cómo explicarlo en una entrevista (30 segundos)

> It's a small REST API organised by feature, with three layers in each feature. The controller validates the request with Zod and calls the service. The service holds the business rules, and the repository is the only part that knows SQL. The service depends on a repository interface, so the unit tests use an in-memory version and run without a database. Rules that can race, like unique codes, are guaranteed by the database. And it's ready for production: structured logs with a request id, health checks, graceful shutdown, and CI running everything on each pull request.

## Glosario rápido

- **Migración:** un archivo SQL que cambia la estructura de la base de datos. Se ejecutan en orden y una sola vez.
- **Pool:** un grupo de conexiones a la base de datos que se reutilizan.
- **Parámetros (`$1`, `$2`):** la forma segura de meter valores en SQL. Evitan la inyección de SQL.
- **Transacción:** varios cambios que pasan todos juntos o ninguno (mira `run-migrations.ts`).
- **Condición de carrera (race condition):** dos peticiones a la vez que se pisan, porque una se cuela entre el "comprobar" y el "actuar" de la otra.
- **Atómico:** que pasa en un solo paso, sin hueco para que nadie se cuele en medio.
- **Inyección de dependencias:** una pieza *recibe* lo que necesita en vez de crearlo. Por ejemplo, el service recibe el repository.
- **Idempotente:** hacer lo mismo dos veces da el mismo resultado que hacerlo una. `PUT` debería serlo.
- **Liveness y readiness:** "¿está vivo?" y "¿puede atender peticiones ahora?". Si falla la primera, la plataforma reinicia la app. Si falla la segunda, deja de mandarle tráfico.
- **Request id:** un identificador único por petición, que aparece en todas sus líneas de log.
- **Graceful shutdown:** apagarse terminando las peticiones en curso, en vez de cortarlas.
