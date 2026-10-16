-- Schema for the Postgres-backed Task API.
-- Mounted into the db container at /docker-entrypoint-initdb.d, so it runs
-- automatically the first time the database volume is created (empty).
CREATE TABLE IF NOT EXISTS tasks (
  id         SERIAL PRIMARY KEY,
  title      TEXT        NOT NULL,
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
