import type pg from "pg";
import { ConflictError } from "../../shared/errors.js";
import type { NewRestaurant, Restaurant, RestaurantChanges, RestaurantFilter } from "./restaurants.types.js";
import type { RestaurantRepository } from "./restaurants.repository.js";

/**
 * THE REPOSITORY (real implementation): the only file that knows about SQL and PostgreSQL.
 *
 * Two things to notice:
 *
 * 1. Parameters ($1, $2...): we NEVER build SQL by gluing user input into the string.
 *    `WHERE code = '${code}'` would let someone inject their own SQL (SQL injection).
 *    With `WHERE code = $1` and [code], the database treats the value as data, never as SQL.
 *
 * 2. Mapping: the database uses snake_case columns (is_active, created_at),
 *    but our app uses camelCase (isActive, createdAt). toRestaurant() translates a row
 *    into our Restaurant type, so the rest of the app never sees database column names.
 */

/** What a row from the "restaurants" table looks like. */
interface RestaurantRow {
  id: string;
  code: string;
  name: string;
  city: string;
  is_active: boolean;
  created_at: Date;
}

const COLUMNS = "id, code, name, city, is_active, created_at";

// Postgres error code for "this value breaks a UNIQUE constraint".
const UNIQUE_VIOLATION = "23505";

export function createPostgresRestaurantRepository(pool: pg.Pool): RestaurantRepository {
  async function findById(id: string) {
    const result = await pool.query<RestaurantRow>(`SELECT ${COLUMNS} FROM restaurants WHERE id = $1`, [id]);
    return result.rows[0] ? toRestaurant(result.rows[0]) : null;
  }

  return {
    async create(restaurant: NewRestaurant) {
      try {
        const result = await pool.query<RestaurantRow>(
          `INSERT INTO restaurants (code, name, city, is_active)
           VALUES ($1, $2, $3, $4)
           RETURNING ${COLUMNS}`, // RETURNING gives us the saved row back, including id and created_at
          [restaurant.code, restaurant.name, restaurant.city, restaurant.isActive],
        );
        const row = result.rows[0];
        if (!row) throw new Error("INSERT ... RETURNING returned no row"); // can't happen, but now TypeScript knows
        return toRestaurant(row);
      } catch (error) {
        // Safety net: the service already checks for duplicate codes, but if two requests
        // arrive at exactly the same time, both could pass that check. The UNIQUE constraint
        // in the database stops the second one, and we turn that into a ConflictError (409).
        if (isPostgresError(error) && error.code === UNIQUE_VIOLATION) {
          throw new ConflictError(`A restaurant with code ${restaurant.code} already exists`);
        }
        throw error;
      }
    },

    findById,

    async findByCode(code: string) {
      const result = await pool.query<RestaurantRow>(`SELECT ${COLUMNS} FROM restaurants WHERE code = $1`, [code]);
      return result.rows[0] ? toRestaurant(result.rows[0]) : null;
    },

    async list(filter: RestaurantFilter) {
      // Only add the WHERE when a city was given. The city is still passed as a parameter ($1).
      const result = filter.city
        ? await pool.query<RestaurantRow>(
            `SELECT ${COLUMNS} FROM restaurants WHERE city = $1 ORDER BY name`,
            [filter.city],
          )
        : await pool.query<RestaurantRow>(`SELECT ${COLUMNS} FROM restaurants ORDER BY name`);
      return result.rows.map(toRestaurant);
    },

    async update(id: string, changes: RestaurantChanges) {
      // Build "SET name = $1, city = $2" with only the fields that were sent.
      // The column NAMES come from our own fixed list (never from the user),
      // and the VALUES are still parameters, so this is safe.
      const columnFor: Record<keyof RestaurantChanges, string> = {
        name: "name",
        city: "city",
        isActive: "is_active",
      };
      const fields = (Object.keys(changes) as (keyof RestaurantChanges)[]).filter(
        (field) => changes[field] !== undefined,
      );
      if (fields.length === 0) return findById(id); // nothing to change

      const setClause = fields.map((field, index) => `${columnFor[field]} = $${index + 1}`).join(", ");
      const values = fields.map((field) => changes[field]);

      const result = await pool.query<RestaurantRow>(
        `UPDATE restaurants SET ${setClause} WHERE id = $${fields.length + 1} RETURNING ${COLUMNS}`,
        [...values, id],
      );
      return result.rows[0] ? toRestaurant(result.rows[0]) : null;
    },

    async delete(id: string) {
      const result = await pool.query("DELETE FROM restaurants WHERE id = $1", [id]);
      return (result.rowCount ?? 0) > 0;
    },
  };
}

function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    city: row.city,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function isPostgresError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}
