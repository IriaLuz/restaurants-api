import express from "express";
import helmet from "helmet";
import { createHealthRouter } from "./modules/health/health.routes.js";
import { createRestaurantController } from "./modules/restaurants/restaurants.controller.js";
import { createRestaurantRouter } from "./modules/restaurants/restaurants.routes.js";
import type { RestaurantService } from "./modules/restaurants/restaurants.service.js";
import { errorHandler } from "./shared/http/error-handler.js";
import { createRequestLogger } from "./shared/http/request-logger.js";
import type { Logger } from "./shared/logger.js";

export interface AppDependencies {
  logger: Logger;
  checkDatabase: () => Promise<void>;
  restaurantService: RestaurantService;
}

/**
 * Builds the Express app. It RECEIVES the services instead of creating them,
 * so the tests can build the same app with whatever they need.
 *
 * Order matters in Express: a request goes through these in order, top to bottom.
 */
export function createApp({ logger, checkDatabase, restaurantService }: AppDependencies) {
  const app = express();

  app.use(createRequestLogger(logger)); // 1. gives each request an id and logs it when it finishes
  app.use(helmet()); // 2. security headers, and hides "X-Powered-By: Express"
  app.use(express.json({ limit: "100kb" })); // 3. turns the JSON body into a JavaScript object (req.body). Bigger bodies get a 413

  app.use("/health", createHealthRouter({ logger, checkDatabase })); // 4. is it alive? is it ready?

  const restaurantController = createRestaurantController(restaurantService);
  app.use("/restaurants", createRestaurantRouter(restaurantController)); // 5. our feature

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" }); // 6. no route matched
  });

  app.use(errorHandler); // 7. always last: catches errors from everything above

  return app;
}
