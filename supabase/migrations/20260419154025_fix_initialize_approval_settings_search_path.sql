/*
  # Fix initialize_approval_settings trigger function

  ## Summary
  The initialize_approval_settings trigger function was set with search_path=""
  as a security hardening measure, but the function body references
  ai_agent_approval_settings without schema qualification, causing it to fail
  when inserting into platform_tenants.

  This migration updates the function to fully qualify the table name with
  the public schema so it works correctly with the empty search path.
*/

CREATE OR REPLACE FUNCTION initialize_approval_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.ai_agent_approval_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$;
