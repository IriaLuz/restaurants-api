import type { Page, PageRequest } from "../../shared/pagination.js";
import type { NewRestaurant, Restaurant, RestaurantChanges, RestaurantFilter } from "./restaurants.types.js";

/**
 * THE REPOSITORY "CONTRACT" (also called a "port" or an interface).
 *
 * It says WHAT we can do with stored restaurants, but not HOW.
 * The service only knows this interface. It never imports "pg" or writes SQL.
 *
 * There are two implementations of this contract in this project:
 *   - restaurants.repository.postgres.ts -> the real one, which talks to PostgreSQL
 *   - restaurants.repository.memory.ts   -> a fake one that keeps data in a Map, used by the unit tests
 *
 * Because the service only depends on this interface, the unit tests can give it the fake one,
 * and all the SQL stays in one file. That's the whole point.
 */
export interface RestaurantRepository {
  /** Throws UniqueViolationError if the code is already taken. */
  create(restaurant: NewRestaurant): Promise<Restaurant>;
  findById(id: string): Promise<Restaurant | null>;
  /** One page of restaurants, sorted by name, plus the total that match the filter. */
  list(filter: RestaurantFilter, page: PageRequest): Promise<Page<Restaurant>>;
  /** Returns null if there was no restaurant with that id. */
  update(id: string, changes: RestaurantChanges): Promise<Restaurant | null>;
  /** Deletes it only if it exists AND is inactive, in one atomic step. Returns false if nothing was deleted. */
  deleteIfInactive(id: string): Promise<boolean>;
}
