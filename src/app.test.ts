// HTTP TESTS WITHOUT A DATABASE: the real Express app, with the in-memory repository.
// They check what the HTTP layer does on its own: status codes, error format, unknown routes.
// The business rules are tested in the service tests, and the SQL in the integration tests.
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createInMemoryRestaurantRepository } from "./modules/restaurants/restaurants.repository.memory.js";
import { createRestaurantService, type RestaurantService } from "./modules/restaurants/restaurants.service.js";
import { createLogger } from "./shared/logger.js";

function buildApp({
  restaurantService = createRestaurantService(createInMemoryRestaurantRepository()),
  checkDatabase = async () => {},
}: { restaurantService?: RestaurantService; checkDatabase?: () => Promise<void> } = {}) {
  return createApp({ logger: createLogger("silent"), checkDatabase, restaurantService });
}

describe("health checks", () => {
  it("GET /health answers 200 without touching the database", async () => {
    const checkDatabase = async () => {
      throw new Error("should not be called");
    };

    await request(buildApp({ checkDatabase })).get("/health").expect(200, { status: "ok" });
  });

  it("GET /health/ready answers 200 when the database answers", async () => {
    await request(buildApp()).get("/health/ready").expect(200, { status: "ready" });
  });

  it("GET /health/ready answers 503 when the database doesn't answer", async () => {
    const checkDatabase = async () => {
      throw new Error("connection refused");
    };

    await request(buildApp({ checkDatabase })).get("/health/ready").expect(503, { status: "unavailable" });
  });
});

describe("security headers", () => {
  it("doesn't tell the world we use Express, and sends helmet's headers", async () => {
    const response = await request(buildApp()).get("/health").expect(200);

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("request ids", () => {
  it("creates an X-Request-Id for every request", async () => {
    const response = await request(buildApp()).get("/health").expect(200);

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps the X-Request-Id the caller sent", async () => {
    await request(buildApp()).get("/health").set("X-Request-Id", "abc-123").expect("X-Request-Id", "abc-123");
  });
});

describe("HTTP errors", () => {
  it("answers 400 with a clear message when the body isn't valid JSON", async () => {
    const response = await request(buildApp())
      .post("/restaurants")
      .set("Content-Type", "application/json")
      .send('{"code": ')
      .expect(400);

    expect(response.body).toEqual({ error: "The request body is not valid JSON" });
  });

  it("answers 413 when the body is too large", async () => {
    const huge = { code: "BIG", name: "x".repeat(200_000), city: "London" };

    await request(buildApp()).post("/restaurants").send(huge).expect(413);
  });

  it("answers 415 when the charset isn't supported", async () => {
    await request(buildApp())
      .post("/restaurants")
      .set("Content-Type", "application/json; charset=latin9")
      .send("{}")
      .expect(415);
  });

  it("answers 404 for a route that doesn't exist", async () => {
    await request(buildApp()).get("/nope").expect(404, { error: "Route not found" });
  });

  it("answers 500 with a generic message, and no details, for an unexpected error", async () => {
    const brokenService = {
      ...createRestaurantService(createInMemoryRestaurantRepository()),
      listRestaurants: async () => {
        throw new Error("connection to the database lost");
      },
    };

    const response = await request(buildApp({ restaurantService: brokenService })).get("/restaurants").expect(500);

    expect(response.body).toEqual({ error: "Something went wrong" });
  });
});
