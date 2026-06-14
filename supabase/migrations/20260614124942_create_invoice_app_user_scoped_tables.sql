/*
  # Invoice App — User-Scoped Tables
  
  Creates the tables and policies needed for the standalone invoice app at
  invoice.clearnav.cv. All data is scoped to auth.uid() rather than tenant_id,
  allowing any Supabase user (including existing ClearNAV platform users) to
  use the invoice app independently.

  ## New Tables
  - invoice_app_profiles        — per-user profile + onboarding flag
  - invoice_saved_clients       — reusable client contacts per user
  - invoice_saved_products      — reusable product/service line items per user
  - invoice_terms_templates     — named T&C templates per user

  ## Schema Additions
  - invoice_settings.user_id    — nullable, allows user-scoped settings row
  - invoices.user_id            — nullable, allows user-scoped invoices
  - invoices.guest_token        — nullable, links guest invoices for recovery
  - invoice_settings.unique constraint relaxed so both tenant_id and user_id rows can coexist

  ## New RPCs
  - allocate_invoice_number_for_user  — user-scoped invoice number allocation
  - claim_guest_invoices              — links guest invoices to a user on signup
  - get_invoice_by_token_with_user    — public token lookup including user-scoped settings
*/

-- ─── invoice_app_profiles ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_app_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        text,
  avatar_url          text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_app_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own profile"
  ON public.invoice_app_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.invoice_app_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.invoice_app_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_invoice_app_profiles_user_id ON public.invoice_app_profiles (user_id);

-- ─── invoice_saved_clients ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_saved_clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  company     text,
  email       text,
  phone       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_saved_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own saved clients"
  ON public.invoice_saved_clients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved clients"
  ON public.invoice_saved_clients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved clients"
  ON public.invoice_saved_clients FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved clients"
  ON public.invoice_saved_clients FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_invoice_saved_clients_user_id ON public.invoice_saved_clients (user_id);

-- ─── invoice_saved_products ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_saved_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description     text NOT NULL DEFAULT '',
  default_price   numeric(15,2) NOT NULL DEFAULT 0,
  default_tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  default_quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own saved products"
  ON public.invoice_saved_products FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved products"
  ON public.invoice_saved_products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved products"
  ON public.invoice_saved_products FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved products"
  ON public.invoice_saved_products FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_invoice_saved_products_user_id ON public.invoice_saved_products (user_id);

-- ─── invoice_terms_templates ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_terms_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  body        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_terms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own terms templates"
  ON public.invoice_terms_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own terms templates"
  ON public.invoice_terms_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own terms templates"
  ON public.invoice_terms_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own terms templates"
  ON public.invoice_terms_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_invoice_terms_templates_user_id ON public.invoice_terms_templates (user_id);

-- ─── Add user_id to invoice_settings ─────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'user_id') THEN
    ALTER TABLE public.invoice_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    -- Make tenant_id nullable so user-only rows can exist
    ALTER TABLE public.invoice_settings ALTER COLUMN tenant_id DROP NOT NULL;
  END IF;
END $$;

-- Drop old unique constraint on tenant_id so we can have user-only rows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'invoice_settings' AND constraint_name = 'invoice_settings_tenant_id_key') THEN
    ALTER TABLE public.invoice_settings DROP CONSTRAINT invoice_settings_tenant_id_key;
  END IF;
END $$;

-- Unique where tenant_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS invoice_settings_tenant_id_unique ON public.invoice_settings (tenant_id) WHERE tenant_id IS NOT NULL;
-- Unique where user_id is not null  
CREATE UNIQUE INDEX IF NOT EXISTS invoice_settings_user_id_unique ON public.invoice_settings (user_id) WHERE user_id IS NOT NULL;

-- RLS policies for user-scoped invoice settings
CREATE POLICY "Users can select own invoice settings"
  ON public.invoice_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own invoice settings"
  ON public.invoice_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id IS NULL);

CREATE POLICY "Users can update own invoice settings"
  ON public.invoice_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Add user_id and guest_token to invoices ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'user_id') THEN
    ALTER TABLE public.invoices ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    -- Make tenant_id nullable for user-only invoices
    ALTER TABLE public.invoices ALTER COLUMN tenant_id DROP NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'guest_token') THEN
    ALTER TABLE public.invoices ADD COLUMN guest_token uuid;
  END IF;
END $$;

-- Drop old unique on (tenant_id, invoice_number) — will conflict for user rows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'invoices' AND constraint_name = 'invoices_tenant_id_invoice_number_key') THEN
    ALTER TABLE public.invoices DROP CONSTRAINT invoices_tenant_id_invoice_number_key;
  END IF;
END $$;

-- Partial unique: per-tenant invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_invoice_number_unique ON public.invoices (tenant_id, invoice_number) WHERE tenant_id IS NOT NULL;
-- Partial unique: per-user invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_unique ON public.invoices (user_id, invoice_number) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_guest_token ON public.invoices (guest_token) WHERE guest_token IS NOT NULL;

-- RLS policies for user-scoped invoices
CREATE POLICY "Users can select own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id IS NULL);

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── User-scoped policies for related tables ──────────────────────────────────

-- invoice_line_items: user-owned via parent invoice
CREATE POLICY "Users can select own invoice line items"
  ON public.invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice line items"
  ON public.invoice_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own invoice line items"
  ON public.invoice_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice line items"
  ON public.invoice_line_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

-- invoice_payments: user-owned via parent invoice
CREATE POLICY "Users can select own invoice payments"
  ON public.invoice_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice payments"
  ON public.invoice_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice payments"
  ON public.invoice_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

-- invoice_activity: user-owned via parent invoice
CREATE POLICY "Users can select own invoice activity"
  ON public.invoice_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice activity"
  ON public.invoice_activity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.user_id = auth.uid()
    )
  );

-- ─── RPC: allocate_invoice_number_for_user ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.allocate_invoice_number_for_user(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix  text;
  v_seq     integer;
  v_number  text;
BEGIN
  INSERT INTO public.invoice_settings (user_id, tenant_id)
  VALUES (p_user_id, NULL)
  ON CONFLICT DO NOTHING;

  UPDATE public.invoice_settings
  SET next_sequence = next_sequence + 1,
      updated_at    = now()
  WHERE user_id = p_user_id
    AND tenant_id IS NULL
  RETURNING number_prefix, next_sequence - 1 INTO v_prefix, v_seq;

  IF v_prefix IS NULL THEN
    v_prefix := 'INV-';
    v_seq := 1;
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 4, '0');
  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_invoice_number_for_user(uuid) TO authenticated;

-- ─── RPC: claim_guest_invoices ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_guest_invoices(p_guest_token uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.invoices
  SET user_id     = auth.uid(),
      guest_token = NULL,
      updated_at  = now()
  WHERE guest_token = p_guest_token
    AND user_id IS NULL
    AND tenant_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_guest_invoices(uuid) TO authenticated;

-- ─── Updated get_invoice_by_token to support user-scoped settings ─────────────

CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice   jsonb;
  v_items     jsonb;
  v_settings  jsonb;
  v_tenant_id uuid;
  v_user_id   uuid;
BEGIN
  SELECT row_to_json(i)::jsonb INTO v_invoice
  FROM public.invoices i
  WHERE i.public_view_token = p_token
    AND i.status != 'void';

  IF v_invoice IS NULL THEN
    RETURN NULL;
  END IF;

  v_tenant_id := (v_invoice->>'tenant_id')::uuid;
  v_user_id   := (v_invoice->>'user_id')::uuid;

  SELECT jsonb_agg(row_to_json(li) ORDER BY li.sort_order) INTO v_items
  FROM public.invoice_line_items li
  WHERE li.invoice_id = (v_invoice->>'id')::uuid;

  IF v_tenant_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'accent_color',          s.accent_color,
      'logo_url',              s.logo_url,
      'payment_instructions',  s.payment_instructions,
      'business_name',         s.business_name,
      'business_address_line1',s.business_address_line1,
      'business_city',         s.business_city,
      'business_state',        s.business_state,
      'business_zip',          s.business_zip,
      'business_country',      s.business_country,
      'business_phone',        s.business_phone,
      'business_email',        s.business_email,
      'business_tax_id',       s.business_tax_id,
      'bank_account_name',     s.bank_account_name,
      'bank_name',             s.bank_name,
      'bank_account_number',   s.bank_account_number,
      'bank_routing_number',   s.bank_routing_number,
      'bank_swift_bic',        s.bank_swift_bic,
      'bank_iban',             s.bank_iban,
      'bank_extra_instructions',s.bank_extra_instructions
    ) INTO v_settings
    FROM public.invoice_settings s
    WHERE s.tenant_id = v_tenant_id;
  ELSIF v_user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'accent_color',          s.accent_color,
      'logo_url',              s.logo_url,
      'payment_instructions',  s.payment_instructions,
      'business_name',         s.business_name,
      'business_address_line1',s.business_address_line1,
      'business_city',         s.business_city,
      'business_state',        s.business_state,
      'business_zip',          s.business_zip,
      'business_country',      s.business_country,
      'business_phone',        s.business_phone,
      'business_email',        s.business_email,
      'business_tax_id',       s.business_tax_id,
      'bank_account_name',     s.bank_account_name,
      'bank_name',             s.bank_name,
      'bank_account_number',   s.bank_account_number,
      'bank_routing_number',   s.bank_routing_number,
      'bank_swift_bic',        s.bank_swift_bic,
      'bank_iban',             s.bank_iban,
      'bank_extra_instructions',s.bank_extra_instructions
    ) INTO v_settings
    FROM public.invoice_settings s
    WHERE s.user_id = v_user_id AND s.tenant_id IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'invoice',  v_invoice,
    'items',    COALESCE(v_items, '[]'::jsonb),
    'settings', COALESCE(v_settings, '{}'::jsonb)
  );
END;
$$;
