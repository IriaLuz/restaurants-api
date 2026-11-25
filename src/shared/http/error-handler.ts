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
 *   ZodError                 -> 400 Bad Request   (the input was invalid)
 *   NotFoundError            -> 404 Not Found
 *   ConflictError            -> 409 Conflict
 *   Express's own 4xx errors -> their own status   (bad JSON 400, body too large 413, bad charset 415...)
 *   anything else            -> 500 Internal Server Error (we log it, but never send details to the user)
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  // If part of the response was already sent, we can't send a new one.
  // Express's default handler then closes the connection.
  if (res.headersSent) {
    next(error);
    return;
  }

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

  // Express and its JSON body parser create errors with a "status" for bad requests.
  // They are the client's fault, so they keep their 4xx status instead of becoming a 500.
  if (isClientHttpError(error)) {
    const message = error.type === "entity.parse.failed" ? "The request body is not valid JSON" : error.message;
    res.status(error.status).json({ error: message });
    return;
  }

  // An unexpected error: a bug, or the database is down. Log the details for us,
  // but send a generic message, so we never leak stack traces or SQL to users.
  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
};

interface ClientHttpError {
  status: number;
  message: string;
  type?: string;
}

function isClientHttpError(error: unknown): error is ClientHttpError {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}
