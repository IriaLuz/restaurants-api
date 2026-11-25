import type pg from "pg";
import type { AppDependencies } from "./app.js";
import { createPostgresRestaurantRepository } from "./modules/restaurants/restaurants.repository.postgres.js";
import { createRestaurantService } from "./modules/restaurants/restaurants.service.js";
import type { Logger } from "./shared/logger.js";

/**
 * THE COMPOSITION ROOT: the one place where the pieces get connected.
 *
 *   database pool -> repository -> service -> (controller and routes, inside createApp)
 *   logger        -> everything that logs
 *
 * This is the only file that decides "the real app uses PostgreSQL".
 * Everything else only knows interfaces, which is why the tests can swap in the in-memory repository.
 */
export function createDependencies({ pool, logger }: { pool: pg.Pool; logger: Logger }): AppDependencies {
  const restaurantRepository = createPostgresRestaurantRepository(pool);
  const restaurantService = createRestaurantService(restaurantRepository);
  return {
    logger,
    checkDatabase: async () => {
      await pool.query("SELECT 1");
    },
    restaurantService,
  };
}
