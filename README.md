# Restaurants API: práctica de backend de principio a fin

Una API REST pequeña, en TypeScript, Express y PostgreSQL, hecha para **entender cómo viaja una petición por las tres capas**: controller, service y repository. Gestiona restaurantes (crear, listar, ver, cambiar y borrar), un tema parecido al del equipo CPEM de Nando's.

Cada archivo tiene comentarios que explican qué hace y por qué. Este README te da el mapa. Y en [EJERCICIO.md](EJERCICIO.md) tienes un ejercicio para hacer tú sola, con la misma estructura.

## Cómo arrancarlo

Necesitas Node.js 20 o superior y Docker (para la base de datos).

```bash
npm install                 # instala las dependencias
cp .env.example .env        # crea tu archivo de configuración
docker compose up -d        # arranca PostgreSQL en Docker
npm run db:migrate          # crea las tablas
npm run dev                 # arranca la API en http://localhost:3000
```

Para probarla, abre `requests.http` en VS Code con la extensión **REST Client**, o usa curl:

```bash
curl -X POST http://localhost:3000/restaurants \
  -H "Content-Type: application/json" \
  -d '{"code":"camden","name":"Nando'\''s Camden","city":"London"}'
```

**Sin Docker:** si ya tienes PostgreSQL instalado, crea las bases de datos `restaurants` y `restaurants_test`, y cambia `DATABASE_URL` y `TEST_DATABASE_URL` en tu `.env`.

## Los endpoints

| Método | Ruta                       | Qué hace                                     | Respuestas         |
| ------ | -------------------------- | -------------------------------------------- | ------------------ |
| GET    | `/health`                  | Comprueba que el servidor está vivo          | 200                |
| POST   | `/restaurants`             | Crea un restaurante                          | 201, 400, 409      |
| GET    | `/restaurants?city=London` | Lista restaurantes, opcionalmente por ciudad | 200, 400           |
| GET    | `/restaurants/:id`         | Devuelve uno                                 | 200, 400, 404      |
| PATCH  | `/restaurants/:id`         | Cambia `name`, `city` o `isActive`           | 200, 400, 404      |
| DELETE | `/restaurants/:id`         | Borra uno inactivo                           | 204, 400, 404, 409 |

**Reglas de negocio** (están en el service):

1. El código se guarda en mayúsculas: `camden` y `CAMDEN` son el mismo.
2. Dos restaurantes no pueden tener el mismo código (409).
3. No se puede borrar un restaurante activo. Primero hay que desactivarlo (409).

## El viaje de una petición

Así recorre el código un `POST /restaurants`:

```text
 Cliente (curl, navegador, frontend)
    │  POST /restaurants  {"code":"camden", ...}
    ▼
 app.ts ─────────────── express.json() convierte el JSON en req.body
    │
    ▼
 restaurantRoutes.ts ── "POST /" → controller.create
    │
    ▼
 restaurantController.ts
    │  1. valida req.body con Zod (restaurantSchemas.ts) ──── si falla: ZodError
    │  2. llama a service.createRestaurant(input)
    ▼
 restaurantService.ts      ← REGLAS DE NEGOCIO
    │  código en mayúsculas, ¿ya existe? ──────────────────── si existe: ConflictError
    │  llama a repository.create(...)
    ▼
 postgresRestaurantRepository.ts   ← SQL
    │  INSERT INTO restaurants ... VALUES ($1, $2, $3, $4) RETURNING ...
    ▼
 PostgreSQL
    │
    ▼  la fila guardada vuelve por el mismo camino
 restaurantController.ts ── res.status(201).json(restaurant)

 Si algo lanza un error en cualquier punto ──► errorHandler.ts
     ZodError → 400 · NotFoundError → 404 · ConflictError → 409 · otro → 500
```

## Qué hace cada capa (y qué NO hace)

| Capa                  | Archivo                              | Su trabajo                                                            | Lo que NO hace                            |
| --------------------- | ------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------- |
| Routes                | `restaurantRoutes.ts`                | Une cada URL y método con un handler                                  | Lógica de ningún tipo                     |
| Controller            | `restaurantController.ts`            | Valida la entrada, llama al service y elige el código HTTP            | Reglas de negocio o SQL                   |
| Validación            | `restaurantSchemas.ts`               | Define qué datos son válidos (Zod)                                    | Comprobar cosas de la base de datos       |
| Service               | `restaurantService.ts`               | Las reglas de negocio                                                 | Saber de HTTP (req, res, status) o de SQL |
| Repository (contrato) | `restaurantRepository.ts`            | Dice QUÉ se puede hacer con los datos                                 | Decir CÓMO                                |
| Repository (Postgres) | `postgresRestaurantRepository.ts`    | El SQL y la traducción entre filas y objetos                          | Reglas de negocio                         |
| Repository (memoria)  | `inMemoryRestaurantRepository.ts`    | Lo mismo, pero en un `Map`, para los tests                            | —                                         |
| Errores               | `errors.ts` + `http/errorHandler.ts` | Errores con nombre de negocio, y un solo sitio que los traduce a HTTP | —                                         |
| Composition root      | `compositionRoot.ts`                 | Conecta pool → repository → service                                   | —                                         |

**La idea clave:** el service solo conoce la _interfaz_ `RestaurantRepository`, no Postgres. Por eso los tests unitarios le pasan el repositorio en memoria y funcionan sin base de datos. Si mañana cambias de base de datos, escribes otro repositorio y cambias **una línea** en `compositionRoot.ts`.

## Estructura de carpetas

```text
db/migrations/                  SQL que crea las tablas (se ejecuta con npm run db:migrate)
src/
  server.ts                     punto de entrada: arranca el servidor
  app.ts                        monta Express: middlewares, rutas y errorHandler
  compositionRoot.ts            conecta las piezas
  config.ts                     lee y valida el .env
  errors.ts                     NotFoundError, ConflictError
  db/                           pool de conexiones y el script de migraciones
  http/errorHandler.ts          traduce errores a respuestas HTTP
  restaurants/                  todo lo de la funcionalidad "restaurantes", junto
test/                           tests de integración (API + base de datos real)
requests.http                   peticiones de ejemplo para probar a mano
```

## Tests

```bash
npm test                    # todos
npm run test:unit           # solo el service, con el repositorio en memoria (sin base de datos)
npm run test:integration    # la API completa contra la base de datos de test
```

- **Unitarios** (`src/restaurants/restaurantService.test.ts`): prueban las reglas de negocio. Tardan milisegundos.
- **Integración** (`test/restaurants.integration.test.ts`): hacen peticiones HTTP reales con supertest y pasan por todas las capas hasta PostgreSQL. Usan una base de datos aparte, `restaurants_test`, que se vacía antes de cada test.

## Subirlo a tu GitHub

1. En github.com, crea un repositorio nuevo vacío llamado `restaurants-api` (sin README ni .gitignore).
2. En la carpeta del proyecto:

```bash
git remote add origin https://github.com/TU-USUARIO/restaurants-api.git
git push -u origin main
```

## Cómo explicarlo en una entrevista (30 segundos)

> It's a small REST API in three layers. The controller validates the request with Zod and calls the service. The service holds the business rules, like codes being unique and not deleting an active restaurant. And the repository is the only part that knows SQL. The service only depends on a repository interface, so the unit tests use an in-memory version and run without a database. Everything gets connected in one composition root.

## Glosario rápido

- **Migración:** un archivo SQL que cambia la estructura de la base de datos. Se ejecutan en orden y una sola vez.
- **Pool:** un grupo de conexiones a la base de datos que se reutilizan.
- **Parámetros (`$1`, `$2`):** la forma segura de meter valores en SQL. Evitan la inyección de SQL.
- **Transacción:** varios cambios que pasan todos juntos o ninguno (mira `runMigrations.ts`).
- **Inyección de dependencias:** una pieza _recibe_ lo que necesita en vez de crearlo. Por ejemplo, el service recibe el repository.
- **Idempotente:** hacer lo mismo dos veces da el mismo resultado que hacerlo una. `PUT` debería serlo.
