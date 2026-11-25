import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ConflictError, NotFoundError } from "../errors.js";

/**
 * THE ERROR HANDLER: one place that turns errors into HTTP responses.
 *
 * Express knows this is an error handler because it has FOUR parameters (error, req, res, next).
 * Any error thrown in a route ends up here. So every endpoint answers errors in the same format,
 * and nobody can forget to handle one in a new route.
 *
 *   ZodError       -> 400 Bad Request   (the input was invalid)
 *   NotFoundError  -> 404 Not Found
 *   ConflictError  -> 409 Conflict
 *   anything else  -> 500 Internal Server Error (we log it, but never send details to the user)
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Invalid request",
      details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof ConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }

  // Express sets error.type when the body isn't valid JSON.
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "The request body is not valid JSON" });
    return;
  }

  // An unexpected error: a bug, or the database is down. Log the details for us,
  // but send a generic message, so we never leak stack traces or SQL to users.
  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
};
