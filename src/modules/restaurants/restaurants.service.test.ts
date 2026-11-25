// UNIT TESTS for the service: they test the business rules on their own.
// They use the in-memory repository, so there's no database and no HTTP.
// That's why they run in a few milliseconds. Run them with: npm run test:unit
import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { createInMemoryRestaurantRepository } from "./restaurants.repository.memory.js";
import { createRestaurantService, type RestaurantService } from "./restaurants.service.js";

describe("restaurantService", () => {
  let service: RestaurantService;

  // A fresh, empty repository before every test, so tests never affect each other.
  beforeEach(() => {
    service = createRestaurantService(createInMemoryRestaurantRepository());
  });

  const camden = { code: "camden", name: "Nando's Camden", city: "London", isActive: true };

  describe("createRestaurant", () => {
    it("saves the code in uppercase", async () => {
      const restaurant = await service.createRestaurant(camden);

      expect(restaurant.code).toBe("CAMDEN");
      expect(restaurant.id).toBeDefined();
    });

    it("rejects a code that already exists, whatever its case", async () => {
      await service.createRestaurant(camden);

      await expect(service.createRestaurant({ ...camden, code: "CAMDEN" })).rejects.toThrow(ConflictError);
    });
  });

  describe("getRestaurant", () => {
    it("throws NotFoundError when the restaurant doesn't exist", async () => {
      await expect(service.getRestaurant("00000000-0000-0000-0000-000000000000")).rejects.toThrow(NotFoundError);
    });
  });

  describe("listRestaurants", () => {
    it("filters by city and sorts by name", async () => {
      await service.createRestaurant({ ...camden, code: "B", name: "Brixton", city: "London" });
      await service.createRestaurant({ ...camden, code: "A", name: "Angel", city: "London" });
      await service.createRestaurant({ ...camden, code: "M", name: "Manchester Piccadilly", city: "Manchester" });

      const london = await service.listRestaurants({ city: "London" });

      expect(london.map((restaurant) => restaurant.name)).toEqual(["Angel", "Brixton"]);
    });
  });

  describe("updateRestaurant", () => {
    it("changes only the fields that were sent", async () => {
      const created = await service.createRestaurant(camden);

      const updated = await service.updateRestaurant(created.id, { city: "Greater London" });

      expect(updated.city).toBe("Greater London");
      expect(updated.name).toBe("Nando's Camden"); // unchanged
    });
  });

  describe("deleteRestaurant", () => {
    it("refuses to delete an active restaurant", async () => {
      const created = await service.createRestaurant(camden);

      await expect(service.deleteRestaurant(created.id)).rejects.toThrow(ConflictError);
    });

    it("deletes an inactive restaurant", async () => {
      const created = await service.createRestaurant({ ...camden, isActive: false });

      await service.deleteRestaurant(created.id);

      await expect(service.getRestaurant(created.id)).rejects.toThrow(NotFoundError);
    });
  });
});
