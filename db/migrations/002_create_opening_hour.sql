CREATE TABLE opening_hours (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    opens_at TIME NOT NULL,
    closes_at TIME NOT NULL,
    CHECK (opens_at < closes_at)
);