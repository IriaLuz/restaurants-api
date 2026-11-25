import { z } from "zod";

// PAGINATION: a list endpoint never returns the whole table at once.
// The client asks for a "page" with ?limit=20&offset=40 ("give me 20, skipping the first 40").
// Every list in the API reuses these, so they all page the same way.

/** Which page the caller wants. */
export interface PageRequest {
  limit: number;
  offset: number;
}

/** One page of results, plus how many there are in total (so the client can show "page 3 of 7"). */
export interface Page<T> {
  items: T[];
  total: number;
}

export const MAX_PAGE_SIZE = 100;

/** Query string fields for pagination. They arrive as text ("20"), so z.coerce turns them into numbers. */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
