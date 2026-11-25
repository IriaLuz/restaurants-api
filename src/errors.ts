// Errors that describe WHAT went wrong, in business terms.
// The service throws them. It doesn't know about HTTP status codes.
// The error handler (src/http/errorHandler.ts) decides which status code each one becomes.

/** Something the user asked for doesn't exist. Becomes a 404. */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

/** The request is valid, but it clashes with the current state, e.g. a duplicate code. Becomes a 409. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
