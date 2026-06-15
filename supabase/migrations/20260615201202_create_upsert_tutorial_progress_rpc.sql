
-- Create a SECURITY DEFINER RPC that marks tutorial progress so platform admins
-- (and any user whose direct UPDATE might be blocked) can reliably persist status.
CREATE OR REPLACE FUNCTION upsert_tutorial_progress(
  p_user_id uuid,
  p_tutorial_key text,
  p_status text,
  p_current_step integer DEFAULT 0,
  p_steps_completed jsonb DEFAULT '[]'::jsonb,
  p_started_at timestamptz DEFAULT NULL,
  p_completed_at timestamptz DEFAULT NULL,
  p_skipped_at timestamptz DEFAULT NULL
)
RETURNS user_tutorial_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress user_tutorial_progress;
BEGIN
  -- Caller must be the user themselves or a platform admin
  IF auth.uid() != p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM platform_admin_users WHERE user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  INSERT INTO user_tutorial_progress (
    user_id, tutorial_key, status, current_step, steps_completed,
    started_at, completed_at, skipped_at, updated_at
  )
  VALUES (
    p_user_id, p_tutorial_key, p_status, p_current_step, p_steps_completed,
    p_started_at, p_completed_at, p_skipped_at, now()
  )
  ON CONFLICT (user_id, tutorial_key) DO UPDATE
    SET status = EXCLUDED.status,
        current_step = EXCLUDED.current_step,
        steps_completed = EXCLUDED.steps_completed,
        started_at = COALESCE(EXCLUDED.started_at, user_tutorial_progress.started_at),
        completed_at = COALESCE(EXCLUDED.completed_at, user_tutorial_progress.completed_at),
        skipped_at = COALESCE(EXCLUDED.skipped_at, user_tutorial_progress.skipped_at),
        updated_at = now()
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_tutorial_progress(uuid, text, text, integer, jsonb, timestamptz, timestamptz, timestamptz) TO authenticated;
