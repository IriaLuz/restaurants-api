import { Router } from "express";
import type { RestaurantController } from "./restaurantController.js";

/**
 * THE ROUTES: a simple map of "this URL + this HTTP method -> this controller handler".
 * Reading this file tells you every endpoint the API has.
 */
export function createRestaurantRouter(controller: RestaurantController): Router {
  const router = Router();

  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
}
