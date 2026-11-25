import { randomUUID } from "node:crypto";
import type { Restaurant } from "./restaurant.js";
import type { RestaurantRepository } from "./restaurantRepository.js";

/**
 * A FAKE repository that keeps restaurants in a Map instead of a database.
 *
 * It follows the same RestaurantRepository contract as the Postgres one,
 * so the service can't tell the difference. We use it in the unit tests:
 * they run in milliseconds and don't need a database.
 */
export function createInMemoryRestaurantRepository(): RestaurantRepository {
  const restaurants = new Map<string, Restaurant>();

  return {
    async create(newRestaurant) {
      const restaurant: Restaurant = { ...newRestaurant, id: randomUUID(), createdAt: new Date() };
      restaurants.set(restaurant.id, restaurant);
      return restaurant;
    },

    async findById(id) {
      return restaurants.get(id) ?? null;
    },

    async findByCode(code) {
      return [...restaurants.values()].find((restaurant) => restaurant.code === code) ?? null;
    },

    async list(filter) {
      return [...restaurants.values()]
        .filter((restaurant) => !filter.city || restaurant.city === filter.city)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async update(id, changes) {
      const restaurant = restaurants.get(id);
      if (!restaurant) return null;
      const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
      const updated = { ...restaurant, ...defined };
      restaurants.set(id, updated);
      return updated;
    },

    async delete(id) {
      return restaurants.delete(id);
    },
  };
}
