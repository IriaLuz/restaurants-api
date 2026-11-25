import type { NewRestaurant, Restaurant, RestaurantChanges, RestaurantFilter } from "./restaurant.js";

/**
 * THE REPOSITORY "CONTRACT" (also called a "port" or an interface).
 *
 * It says WHAT we can do with stored restaurants, but not HOW.
 * The service only knows this interface. It never imports "pg" or writes SQL.
 *
 * There are two implementations of this contract in this project:
 *   - postgresRestaurantRepository.ts -> the real one, which talks to PostgreSQL
 *   - inMemoryRestaurantRepository.ts -> a fake one that keeps data in a Map, used by the unit tests
 *
 * Because the service only depends on this interface, we can swap one for the other
 * without changing a single line of the service. That's the whole point.
 */
export interface RestaurantRepository {
  create(restaurant: NewRestaurant): Promise<Restaurant>;
  findById(id: string): Promise<Restaurant | null>;
  findByCode(code: string): Promise<Restaurant | null>;
  list(filter: RestaurantFilter): Promise<Restaurant[]>;
  /** Returns null if there was no restaurant with that id. */
  update(id: string, changes: RestaurantChanges): Promise<Restaurant | null>;
  /** Returns false if there was no restaurant with that id. */
  delete(id: string): Promise<boolean>;
}
