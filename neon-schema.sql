-- Mid-Ama Promo — Neon PostgreSQL bootstrap
-- This schema deliberately preserves the application's existing versioned JSON state
-- model. It does not import, alter, or delete any existing Supabase data.
-- Run this only in the NEW Neon database when instructed.

CREATE TABLE IF NOT EXISTS public.midama_state (
  id text PRIMARY KEY,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Atomically replace the state only when the caller's expected version still matches.
-- A zero-row result means another request updated the state first; callers must reload
-- and retry rather than overwrite a concurrent change.
CREATE OR REPLACE FUNCTION public.midama_update_state(
  expected_version bigint,
  next_state jsonb
)
RETURNS TABLE (
  id text,
  version bigint,
  state jsonb,
  updated_at timestamptz
)
LANGUAGE sql
AS $$
  UPDATE public.midama_state AS current_state
     SET version = current_state.version + 1,
         state = next_state,
         updated_at = now()
   WHERE current_state.id = 'main'
     AND current_state.version = expected_version
  RETURNING current_state.id,
            current_state.version,
            current_state.state,
            current_state.updated_at;
$$;

-- Intentionally do not insert a 'main' row here. The application migration
-- must initialize it from a verified export after explicit validation.
