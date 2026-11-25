-- A migration is a SQL file that changes the shape of the database.
-- They run in order (001, 002, ...) and each one runs only once.
-- To change the database later, ADD a new file (002_...). Never edit one that already ran.

CREATE TABLE restaurants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Postgres creates the id for us
  code        TEXT NOT NULL UNIQUE,                        -- e.g. "CAMDEN". UNIQUE: no two restaurants share a code
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- An index makes searching by a column fast (like the index in a book).
-- We often list restaurants by city, so we add one here.
CREATE INDEX restaurants_city_idx ON restaurants (city);
