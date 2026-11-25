import express from "express";
import { errorHandler } from "./shared/http/error-handler.js";
import { createRestaurantController } from "./modules/restaurants/restaurants.controller.js";
import { createRestaurantRouter } from "./modules/restaurants/restaurants.routes.js";
import type { RestaurantService } from "./modules/restaurants/restaurants.service.js";

export interface AppDependencies {
  restaurantService: RestaurantService;
}

/**
 * Builds the Express app. It RECEIVES the services instead of creating them,
 * so the tests can build the same app with whatever they need.
 *
 * Order matters in Express: a request goes through these in order, top to bottom.
 */
export function createApp({ restaurantService }: AppDependencies) {
  const app = express();

  app.use(express.json()); // 1. turns the JSON body into a JavaScript object (req.body)

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" }); // 2. a tiny endpoint to check the server is running
  });

  const restaurantController = createRestaurantController(restaurantService);
  app.use("/restaurants", createRestaurantRouter(restaurantController)); // 3. our feature

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" }); // 4. no route matched
  });

  app.use(errorHandler); // 5. always last: catches errors from everything above

  return app;
}
