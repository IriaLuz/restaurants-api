import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { NewRestaurant, Restaurant, RestaurantChanges, RestaurantFilter } from "./restaurants.types.js";
import type { RestaurantRepository } from "./restaurants.repository.js";

/**
 * THE SERVICE: the business rules live here.
 *
 * It answers questions like "can this restaurant be created?" or "can it be deleted?".
 * It doesn't know about HTTP (no req, no res, no status codes) and it doesn't know about SQL.
 * It only talks to storage through the RestaurantRepository interface.
 *
 * "createRestaurantService" is a factory function: it RECEIVES the repository it needs
 * (dependency injection). The real app passes the Postgres repository;
 * the unit tests pass the in-memory one.
 *
 * Business rules in this service:
 *   1. A restaurant code is stored in uppercase, so "camden" and "CAMDEN" are the same code.
 *   2. Two restaurants can't share a code.
 *   3. An active restaurant can't be deleted. You have to deactivate it first,
 *      so nobody deletes a restaurant that's still trading by mistake.
 */
export function createRestaurantService(repository: RestaurantRepository) {
  return {
    async createRestaurant(input: NewRestaurant): Promise<Restaurant> {
      const code = normaliseCode(input.code); // rule 1

      const existing = await repository.findByCode(code);
      if (existing) {
        throw new ConflictError(`A restaurant with code ${code} already exists`); // rule 2
      }

      return repository.create({ ...input, code });
    },

    async listRestaurants(filter: RestaurantFilter): Promise<Restaurant[]> {
      return repository.list(filter);
    },

    async getRestaurant(id: string): Promise<Restaurant> {
      const restaurant = await repository.findById(id);
      if (!restaurant) throw new NotFoundError("Restaurant");
      return restaurant;
    },

    async updateRestaurant(id: string, changes: RestaurantChanges): Promise<Restaurant> {
      const updated = await repository.update(id, changes);
      if (!updated) throw new NotFoundError("Restaurant");
      return updated;
    },

    async deleteRestaurant(id: string): Promise<void> {
      const restaurant = await repository.findById(id);
      if (!restaurant) throw new NotFoundError("Restaurant");

      if (restaurant.isActive) {
        throw new ConflictError("An active restaurant can't be deleted. Deactivate it first."); // rule 3
      }

      await repository.delete(id);
    },
  };
}

// The type of the object returned above. Other files use it, like the controller.
export type RestaurantService = ReturnType<typeof createRestaurantService>;

function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}
