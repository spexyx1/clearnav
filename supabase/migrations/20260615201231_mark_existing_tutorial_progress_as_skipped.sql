
-- For any user who already has a tutorial progress row in 'not_started' status
-- AND has been active (user was created before today), mark it as skipped.
-- This prevents the tutorial from firing for existing users who have already
-- seen (or been exposed to) the platform before this fix.
UPDATE user_tutorial_progress
SET status = 'skipped',
    skipped_at = now(),
    updated_at = now()
WHERE status = 'not_started'
  AND created_at < now() - interval '10 minutes';
