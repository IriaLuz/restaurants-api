import type { Request, Response } from "express";
import {
  createRestaurantSchema,
  listRestaurantsQuerySchema,
  restaurantIdParamsSchema,
  updateRestaurantSchema,
} from "./restaurants.schemas.js";
import type { RestaurantService } from "./restaurants.service.js";

/**
 * THE CONTROLLER: the bridge between HTTP and the service.
 *
 * Every handler does the same three things:
 *   1. Read and validate the input (params, query, body) with Zod.
 *   2. Call ONE service method. No business rules here!
 *   3. Send the response with the right status code.
 *
 * Errors are not caught here. If the service throws (NotFoundError, ConflictError...)
 * or Zod throws, Express 5 passes the error to the error handler automatically.
 */
export function createRestaurantController(service: RestaurantService) {
  return {
    // POST /restaurants
    async create(req: Request, res: Response) {
      const input = createRestaurantSchema.parse(req.body);
      const restaurant = await service.createRestaurant(input);
      res.status(201).json(restaurant); // 201 Created
    },

    // GET /restaurants?city=London&limit=20&offset=0
    async list(req: Request, res: Response) {
      const { city, limit, offset } = listRestaurantsQuerySchema.parse(req.query);
      const page = await service.listRestaurants({ city }, { limit, offset });
      // 200 OK is the default. The list goes in "data", and "pagination" says which page this is.
      res.json({ data: page.items, pagination: { limit, offset, total: page.total } });
    },

    // GET /restaurants/:id
    async getById(req: Request, res: Response) {
      const { id } = restaurantIdParamsSchema.parse(req.params);
      const restaurant = await service.getRestaurant(id);
      res.json(restaurant);
    },

    // PATCH /restaurants/:id
    async update(req: Request, res: Response) {
      const { id } = restaurantIdParamsSchema.parse(req.params);
      const changes = updateRestaurantSchema.parse(req.body);
      const restaurant = await service.updateRestaurant(id, changes);
      res.json(restaurant);
    },

    // DELETE /restaurants/:id
    async remove(req: Request, res: Response) {
      const { id } = restaurantIdParamsSchema.parse(req.params);
      await service.deleteRestaurant(id);
      res.status(204).end(); // 204 No Content: it worked, and there's nothing to send back
    },
  };
}

export type RestaurantController = ReturnType<typeof createRestaurantController>;
