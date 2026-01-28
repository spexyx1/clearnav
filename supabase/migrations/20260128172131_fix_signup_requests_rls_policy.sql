/*
  # Fix signup_requests RLS Policy

  1. Changes
    - Drop and recreate the INSERT policy for signup_requests
    - Ensure anonymous users can create signup requests
    - The previous policy might have been incorrectly configured

  2. Security
    - Allow anonymous users to insert signup requests
    - This is required for self-service signups
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Anyone can create signup requests" ON signup_requests;

-- Recreate the policy with explicit permissions
CREATE POLICY "Anyone can create signup requests"
  ON signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
