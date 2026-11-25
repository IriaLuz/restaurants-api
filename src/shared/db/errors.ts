// Errors from the DATA layer. They say what the database refused, not what it means for the business.
// The repository throws them; the service decides what they mean (e.g. "that code is taken" -> 409).

/** The database refused a row because it breaks a UNIQUE constraint (Postgres error 23505). */
export class UniqueViolationError extends Error {
  constructor(readonly field: string) {
    super(`Unique constraint violated on ${field}`);
    this.name = "UniqueViolationError";
  }
}
