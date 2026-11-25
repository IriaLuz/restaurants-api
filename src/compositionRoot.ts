import type pg from "pg";
import type { AppDependencies } from "./app.js";
import { createPostgresRestaurantRepository } from "./restaurants/postgresRestaurantRepository.js";
import { createRestaurantService } from "./restaurants/restaurantService.js";

/**
 * THE COMPOSITION ROOT: the one place where the pieces get connected.
 *
 *   database pool -> repository -> service -> (controller and routes, inside createApp)
 *
 * This is the only file that decides "the real app uses PostgreSQL".
 * To use a different database, you'd write a new repository and change ONE line here.
 */
export function createDependencies(pool: pg.Pool): AppDependencies {
  const restaurantRepository = createPostgresRestaurantRepository(pool);
  const restaurantService = createRestaurantService(restaurantRepository);
  return { restaurantService };
}
