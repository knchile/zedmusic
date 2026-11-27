-- Extensions required by the schema (available on Neon).
-- pg_trgm powers fuzzy, typo-tolerant search on artist names and titles.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
