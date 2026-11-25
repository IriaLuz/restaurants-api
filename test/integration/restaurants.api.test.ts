// INTEGRATION TESTS: they test all the layers together, for real:
//   HTTP request -> routes -> controller -> service -> Postgres repository -> real database
// They use a SEPARATE test database (TEST_DATABASE_URL), which is emptied before every test.
// Run them with: npm run test:integration (the database must be running: docker compose up -d)
// The migrations already ran once, in test/integration/global-setup.ts.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext, resetDatabase } from "../helpers/test-app.js";

describe("Restaurants API (integration)", () => {
  const { pool, app } = createTestContext();

  beforeEach(async () => {
    await resetDatabase(pool); // start every test with empty tables
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

  it("lets only one of two simultaneous requests with the same code through (the UNIQUE constraint)", async () => {
    const [first, second] = await Promise.all([
      request(app).post("/restaurants").send(camden),
      request(app).post("/restaurants").send({ ...camden, code: "CAMDEN" }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
  });

  it("lists restaurants filtered by city", async () => {
    await request(app).post("/restaurants").send(camden).expect(201);
    await request(app).post("/restaurants").send({ code: "MCR1", name: "Piccadilly", city: "Manchester" }).expect(201);

    const response = await request(app).get("/restaurants").query({ city: "Manchester" }).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].code).toBe("MCR1");
    expect(response.body.pagination).toEqual({ limit: 20, offset: 0, total: 1 });
  });

  it("pages through the list with limit and offset", async () => {
    for (const name of ["A", "B", "C"]) {
      await request(app).post("/restaurants").send({ code: `R${name}`, name, city: "London" }).expect(201);
    }

    const response = await request(app).get("/restaurants").query({ limit: 2, offset: 2 }).expect(200);

    expect(response.body.data.map((restaurant: { name: string }) => restaurant.name)).toEqual(["C"]);
    expect(response.body.pagination).toEqual({ limit: 2, offset: 2, total: 3 });
  });

  it("returns 400 when limit is bigger than the maximum", async () => {
    await request(app).get("/restaurants").query({ limit: 1000 }).expect(400);
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

  it("is ready when the database answers", async () => {
    await request(app).get("/health/ready").expect(200, { status: "ready" });
  });

  it("returns 400 for an id that isn't a UUID", async () => {
    await request(app).get("/restaurants/not-a-uuid").expect(400);
  });
});
