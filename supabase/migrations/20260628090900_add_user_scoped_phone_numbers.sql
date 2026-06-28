-- Add user_id column to tenant_phone_numbers so standalone phone app users
-- (who have no tenant) can own numbers directly via their auth.uid()
ALTER TABLE tenant_phone_numbers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- phone_app_profiles table for standalone phone.clearnav.cv users
CREATE TABLE IF NOT EXISTS phone_app_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE phone_app_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_phone_profile" ON phone_app_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_phone_profile" ON phone_app_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_phone_profile" ON phone_app_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_phone_profile" ON phone_app_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Extend RLS on tenant_phone_numbers to allow user-scoped rows for phone app users
-- Existing tenant-based policies remain; we ADD user-based access alongside them.
-- A row belongs to the user when user_id = auth.uid() (tenant_id may be null).

CREATE POLICY "select_own_user_phone_numbers" ON tenant_phone_numbers FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "insert_own_user_phone_numbers" ON tenant_phone_numbers FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_user_phone_numbers" ON tenant_phone_numbers FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_user_phone_numbers" ON tenant_phone_numbers FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Extend call log RLS for user-scoped rows
CREATE POLICY "select_own_user_call_log" ON phone_number_call_log FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tenant_phone_numbers pn
      WHERE pn.id = phone_number_call_log.phone_number_id
        AND pn.user_id = auth.uid()
    )
  );

-- Extend voicemail RLS for user-scoped rows
CREATE POLICY "select_own_user_voicemails" ON phone_number_voicemails FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tenant_phone_numbers pn
      WHERE pn.id = phone_number_voicemails.phone_number_id
        AND pn.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_user_voicemails" ON phone_number_voicemails FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tenant_phone_numbers pn
    WHERE pn.id = phone_number_voicemails.phone_number_id
      AND pn.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_phone_numbers pn
    WHERE pn.id = phone_number_voicemails.phone_number_id
      AND pn.user_id = auth.uid()
  ));
