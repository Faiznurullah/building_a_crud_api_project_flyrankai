-- Index demo (stretch goal): run inside the db container with
--   docker compose exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB -f /docker-entrypoint-initdb.d/../explain.sql
-- or copy/paste the statements in `psql`.
--
-- 1) Build a big table with no index.
DROP TABLE IF EXISTS explain_demo;
CREATE TABLE explain_demo (
  id    serial PRIMARY KEY,
  title text,
  done  boolean
);
INSERT INTO explain_demo (title, done)
SELECT 'task number ' || g, (g % 2 = 0)
FROM generate_series(1, 100000) AS g;
ANALYZE explain_demo;

-- 2) BEFORE the index: expect a Seq Scan over ~100k rows.
EXPLAIN ANALYZE SELECT * FROM explain_demo WHERE title = 'task number 54321';

-- 3) Add the index.
CREATE INDEX idx_explain_demo_title ON explain_demo (title);
ANALYZE explain_demo;

-- 4) AFTER the index: expect an Index Scan / Bitmap Heap Scan with far fewer rows read.
EXPLAIN ANALYZE SELECT * FROM explain_demo WHERE title = 'task number 54321';
