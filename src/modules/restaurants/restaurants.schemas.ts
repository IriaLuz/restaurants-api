import { z } from "zod";
import { paginationQuerySchema } from "../../shared/pagination.js";

// VALIDATION: everything that comes from outside (the request body, the URL, the query string)
// is checked here with Zod before it reaches the service.
// TypeScript types disappear when the code runs, so they can't check real requests. Zod can.
// If the data is wrong, Zod throws a ZodError, and the error handler turns it into a 400.

export const restaurantIdParamsSchema = z.object({
  id: z.uuid("The id must be a valid UUID"),
});

// GET /restaurants?city=London&limit=20&offset=0
export const listRestaurantsQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().min(1).optional(),
});

export const createRestaurantSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{2,20}$/, "The code must be 2-20 letters, numbers or dashes"),
  name: z.string().trim().min(1, "The name is required").max(100),
  city: z.string().trim().min(1, "The city is required").max(100),
  isActive: z.boolean().default(true), // if it isn't sent, a new restaurant is active
});

export const updateRestaurantSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict() // unknown fields, like "code", are rejected: the code can't be changed
  .refine((changes) => Object.keys(changes).length > 0, "Send at least one field to update");
