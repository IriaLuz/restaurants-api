-- Runs once, the first time the Docker database starts.
-- Creates a second, separate database just for the integration tests.
CREATE DATABASE restaurants_test OWNER practice;
