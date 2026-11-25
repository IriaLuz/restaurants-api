import { UniqueViolationError } from "../../shared/db/errors.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { Page, PageRequest } from "../../shared/pagination.js";
import type { RestaurantRepository } from "./restaurants.repository.js";
import type { NewRestaurant, Restaurant, RestaurantChanges, RestaurantFilter } from "./restaurants.types.js";

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

      // Rule 2: we don't check "does it exist?" first and insert after. Two requests at the same
      // time could both pass that check. The database's UNIQUE constraint is the real guarantee,
      // so we just try to insert, and translate the refusal into a business error.
      try {
        return await repository.create({ ...input, code });
      } catch (error) {
        if (error instanceof UniqueViolationError) {
          throw new ConflictError(`A restaurant with code ${code} already exists`);
        }
        throw error;
      }
    },

    async listRestaurants(filter: RestaurantFilter, page: PageRequest): Promise<Page<Restaurant>> {
      return repository.list(filter, page);
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
      // Rule 3, done atomically: the repository deletes it only if it's inactive, in one step.
      const deleted = await repository.deleteIfInactive(id);
      if (deleted) return;

      // Nothing was deleted. Find out why, to give the right error.
      const restaurant = await repository.findById(id);
      if (!restaurant) throw new NotFoundError("Restaurant");
      throw new ConflictError("An active restaurant can't be deleted. Deactivate it first.");
    },
  };
}

// The type of the object returned above. Other files use it, like the controller.
export type RestaurantService = ReturnType<typeof createRestaurantService>;

function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}
