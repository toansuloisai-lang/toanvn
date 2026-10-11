-- Private server-only schema: never expose it through Supabase Data API.
CREATE SCHEMA IF NOT EXISTS math_lab_private;
REVOKE ALL ON SCHEMA math_lab_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS math_lab_private.state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  revision bigint NOT NULL DEFAULT 1,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS math_lab_private.files (
  file_key text PRIMARY KEY,
  content bytea NOT NULL
);
ALTER TABLE math_lab_private.state ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_lab_private.files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA math_lab_private FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA math_lab_private FROM anon;
    REVOKE ALL ON ALL TABLES IN SCHEMA math_lab_private FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA math_lab_private FROM authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA math_lab_private FROM authenticated;
  END IF;
END $$;
