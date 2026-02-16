/*
  # Fix Signup Requests RLS and Subdomain Validation

  1. Changes
    - Add SELECT policy for signup_requests to allow anonymous users to read their recent requests
    - Create RPC function to check slug availability that bypasses RLS
    
  2. Security
    - Anonymous users can read signup_requests (needed for .insert().select() pattern)
    - RPC function uses SECURITY DEFINER to check all tenants regardless of status
    - This prevents false "available" messages when slug is taken by trial/inactive tenants
*/

-- Allow anyone to read signup requests (needed for insert().select() pattern)
CREATE POLICY "Anyone can read signup requests"
  ON signup_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create RPC function to check if a slug is available
-- This bypasses RLS to check all tenants regardless of status
CREATE OR REPLACE FUNCTION check_slug_available(requested_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if slug is reserved
  IF EXISTS (
    SELECT 1 FROM reserved_subdomains 
    WHERE subdomain = requested_slug
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if slug is already taken by any tenant (regardless of status)
  IF EXISTS (
    SELECT 1 FROM platform_tenants 
    WHERE slug = requested_slug
  ) THEN
    RETURN false;
  END IF;
  
  -- Slug is available
  RETURN true;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION check_slug_available(text) TO anon, authenticated;
