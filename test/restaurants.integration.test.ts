// INTEGRATION TESTS: they test all the layers together, for real:
//   HTTP request -> routes -> controller -> service -> Postgres repository -> real database
// They use a SEPARATE test database (TEST_DATABASE_URL), which is wiped before every test.
// Run them with: npm run test:integration (the database must be running: docker compose up -d)
import "dotenv/config";
import type pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createDependencies } from "../src/compositionRoot.js";
import { createPool } from "../src/db/pool.js";
import { runMigrations } from "../src/db/runMigrations.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// If there's no test database configured, skip these tests instead of failing.
describe.skipIf(!testDatabaseUrl)("Restaurants API (integration)", () => {
  let pool: pg.Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createPool(testDatabaseUrl!);
    await runMigrations(pool); // make sure the tables exist
    app = createApp(createDependencies(pool)); // the REAL app, with the REAL Postgres repository
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE restaurants"); // start every test with an empty table
  });

  afterAll(async () => {
    await pool.end();
  });

  const camden = { code: "camden", name: "Nando's Camden", city: "London" };

  it("creates a restaurant and reads it back", async () => {
    const created = await request(app).post("/restaurants").send(camden).expect(201);

    expect(created.body).toMatchObject({ code: "CAMDEN", name: "Nando's Camden", city: "London", isActive: true });

    const fetched = await request(app).get(`/restaurants/${created.body.id}`).expect(200);
    expect(fetched.body.id).toBe(created.body.id);
  });

  it("returns 400 with the field that's wrong when the body is invalid", async () => {
    const response = await request(app).post("/restaurants").send({ code: "x", name: "" }).expect(400);

    const fields = response.body.details.map((detail: { field: string }) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(["code", "name", "city"]));
  });

  it("returns 409 for a duplicate code", async () => {
    await request(app).post("/restaurants").send(camden).expect(201);

    await request(app).post("/restaurants").send({ ...camden, code: "CAMDEN" }).expect(409);
  });

  it("lists restaurants filtered by city", async () => {
    await request(app).post("/restaurants").send(camden).expect(201);
    await request(app).post("/restaurants").send({ code: "MCR1", name: "Piccadilly", city: "Manchester" }).expect(201);

    const response = await request(app).get("/restaurants").query({ city: "Manchester" }).expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].code).toBe("MCR1");
  });

  it("updates only the fields sent, and rejects changing the code", async () => {
    const created = await request(app).post("/restaurants").send(camden).expect(201);

    const updated = await request(app).patch(`/restaurants/${created.body.id}`).send({ isActive: false }).expect(200);
    expect(updated.body).toMatchObject({ isActive: false, name: "Nando's Camden" });

    await request(app).patch(`/restaurants/${created.body.id}`).send({ code: "NEW" }).expect(400);
  });

  it("only deletes inactive restaurants", async () => {
    const created = await request(app).post("/restaurants").send(camden).expect(201);
    const url = `/restaurants/${created.body.id}`;

    await request(app).delete(url).expect(409); // still active

    await request(app).patch(url).send({ isActive: false }).expect(200);
    await request(app).delete(url).expect(204);
    await request(app).get(url).expect(404);
  });

  it("returns 400 for an id that isn't a UUID", async () => {
    await request(app).get("/restaurants/not-a-uuid").expect(400);
  });
});
