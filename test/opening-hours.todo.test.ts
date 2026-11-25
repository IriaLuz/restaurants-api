// YOUR EXERCISE (see EJERCICIO.md).
// These are the behaviours to build. "it.todo" shows them as pending, without failing.
// Turn each one into a real test as you build the feature, then move the unit ones
// to src/modules/opening-hours/opening-hours.service.test.ts and the API ones to test/integration/opening-hours.api.test.ts.
import { describe, it } from "vitest";

describe("openingHoursService (unit, with in-memory repositories)", () => {
  describe("setOpeningHours", () => {
    it.todo("replaces all the previous hours of the restaurant");
    it.todo("accepts an empty list, which leaves the restaurant with no hours");
    it.todo("throws NotFoundError when the restaurant doesn't exist");
    it.todo("returns the hours sorted by day, then by opening time");
  });

  describe("isOpen", () => {
    it.todo("is open inside a slot (Monday 19:30, open 11:30-22:00)");
    it.todo("is open at the exact opening time (11:30)");
    it.todo("is closed at the exact closing time (22:00)");
    it.todo("is closed on a day with no hours");
    it.todo("is closed between two slots on the same day (16:00, with 12:00-15:00 and 18:00-23:00)");
    it.todo("is always closed when the restaurant is inactive");
    it.todo("treats Sunday as day 7");
    it.todo("throws NotFoundError when the restaurant doesn't exist");
  });
});

describe("Opening hours API (integration)", () => {
  it.todo("PUT /restaurants/:id/opening-hours saves the hours and returns 200");
  it.todo("PUT twice with the same body gives the same result (idempotent)");
  it.todo("GET /restaurants/:id/opening-hours returns [] for a restaurant with no hours");
  it.todo("returns 400 when opensAt is not before closesAt");
  it.todo("returns 400 when two slots on the same day overlap");
  it.todo("returns 400 when dayOfWeek is outside 1-7, or a time isn't HH:MM");
  it.todo("returns 404 for a restaurant that doesn't exist");
  it.todo("GET /restaurants/:id/is-open?at=... returns { isOpen: true } inside a slot");
  it.todo("GET /restaurants/:id/is-open returns 400 when 'at' is missing or invalid");
  it.todo("deleting a restaurant also deletes its hours");
});
