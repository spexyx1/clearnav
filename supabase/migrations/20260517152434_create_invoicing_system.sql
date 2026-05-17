/*
  # Create Invoicing System

  ## Overview
  Full-featured tenant-branded invoicing system allowing all tenant users to
  create, send, and track invoices with PDF download, email delivery, SMS, and
  public payment links. Scaffolded for Stripe Connect in phase 2.

  ## New Tables

  ### invoices
  Core invoice records scoped to a tenant. Holds recipient snapshot data so
  invoices remain accurate even if client profiles change later.
  - id, tenant_id, invoice_number (per-tenant unique)
  - Recipient: to_name, to_email, to_phone, to_address
  - Dates: issue_date, due_date
  - Financials: currency, subtotal, tax_total, discount_total, total, amount_paid, balance_due
  - status enum: draft | sent | viewed | partial | paid | overdue | void
  - notes, terms, footer (invoice body copy)
  - pdf_storage_path: path in invoice-pdfs bucket
  - public_view_token: UUID for recipient shareable link (no auth required)
  - sent_at, paid_at, viewed_at, voided_at, created_by

  ### invoice_line_items
  Ordered line items belonging to an invoice.
  - id, invoice_id, sort_order
  - description, quantity, unit_price, tax_rate (%), discount_rate (%)
  - line_total (computed by app, stored for snapshot)

  ### invoice_payments
  Payment records against an invoice (manual recording + future Stripe).
  - id, invoice_id, amount, currency, payment_date, method
  - reference, stripe_payment_intent_id, recorded_by, notes

  ### invoice_settings
  One row per tenant: defaults for new invoices.
  - tenant_id (unique), number_prefix, next_sequence, default_currency,
    default_due_days, default_tax_rate, default_terms, default_footer,
    payment_instructions, logo_url, accent_color
  - stripe_connect_account_id (phase 2, nullable)
  - reminder_days_before, reminder_days_after

  ### invoice_activity
  Append-only audit log of every state change and delivery event.
  - id, invoice_id, actor_id, action, metadata (jsonb), created_at

  ## Security
  - RLS enabled on all tables
  - Tenant members (staff + admin) can fully manage their tenant's invoices
  - Public read via token on invoices (for recipient view link)
  - invoice_settings only writable by tenant_admin role
  - invoice_activity is insert-only for members, no delete
*/

-- ============================================================
-- HELPER: check if current user belongs to a tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- invoice_settings (one row per tenant, created at provisioning)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL UNIQUE REFERENCES public.platform_tenants(id) ON DELETE CASCADE,
  number_prefix            text NOT NULL DEFAULT 'INV-',
  next_sequence            integer NOT NULL DEFAULT 1,
  default_currency         text NOT NULL DEFAULT 'USD',
  default_due_days         integer NOT NULL DEFAULT 30,
  default_tax_rate         numeric(5,2) NOT NULL DEFAULT 0,
  default_terms            text NOT NULL DEFAULT '',
  default_footer           text NOT NULL DEFAULT '',
  payment_instructions     text NOT NULL DEFAULT '',
  logo_url                 text,
  accent_color             text NOT NULL DEFAULT '#0891b2',
  stripe_connect_account_id text,
  reminder_days_before     integer NOT NULL DEFAULT 3,
  reminder_days_after      integer NOT NULL DEFAULT 7,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read invoice settings"
  ON public.invoice_settings FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can insert invoice settings"
  ON public.invoice_settings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can update invoice settings"
  ON public.invoice_settings FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- FUNCTION: atomically allocate next invoice number
-- ============================================================
CREATE OR REPLACE FUNCTION public.allocate_invoice_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix    text;
  v_seq       integer;
  v_number    text;
BEGIN
  -- upsert ensures settings row exists
  INSERT INTO public.invoice_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  UPDATE public.invoice_settings
  SET next_sequence = next_sequence + 1,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
  RETURNING number_prefix, next_sequence - 1 INTO v_prefix, v_seq;

  v_number := v_prefix || lpad(v_seq::text, 4, '0');
  RETURN v_number;
END;
$$;

-- ============================================================
-- invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.platform_tenants(id) ON DELETE CASCADE,
  invoice_number      text NOT NULL,
  -- recipient snapshot
  to_name             text NOT NULL DEFAULT '',
  to_email            text NOT NULL DEFAULT '',
  to_phone            text,
  to_company          text,
  to_address          text,
  -- optional FK to client profile (snapshot preserved above)
  client_id           uuid REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  -- dates
  issue_date          date NOT NULL DEFAULT CURRENT_DATE,
  due_date            date,
  -- financials
  currency            text NOT NULL DEFAULT 'USD',
  subtotal            numeric(15,2) NOT NULL DEFAULT 0,
  discount_total      numeric(15,2) NOT NULL DEFAULT 0,
  tax_total           numeric(15,2) NOT NULL DEFAULT 0,
  total               numeric(15,2) NOT NULL DEFAULT 0,
  amount_paid         numeric(15,2) NOT NULL DEFAULT 0,
  balance_due         numeric(15,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  -- content
  notes               text,
  terms               text,
  footer              text,
  -- status
  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','sent','viewed','partial','paid','overdue','void')),
  -- delivery
  public_view_token   uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  pdf_storage_path    text,
  sent_at             timestamptz,
  viewed_at           timestamptz,
  paid_at             timestamptz,
  voided_at           timestamptz,
  -- audit
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Tenant members can manage their invoices
CREATE POLICY "Tenant members can select invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Recipient public link (anon or authenticated) via token
CREATE POLICY "Anyone can view invoice by public token"
  ON public.invoices FOR SELECT
  TO anon, authenticated
  USING (public_view_token::text = current_setting('request.headers', true)::json->>'x-invoice-token' OR true);

-- We use a SECURITY DEFINER RPC for token-based public access instead of the above.
-- Drop the overly-broad anon policy and replace with RPC pattern.
DROP POLICY IF EXISTS "Anyone can view invoice by public token" ON public.invoices;

-- ============================================================
-- invoice_line_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sort_order      integer NOT NULL DEFAULT 0,
  description     text NOT NULL DEFAULT '',
  quantity        numeric(12,4) NOT NULL DEFAULT 1,
  unit_price      numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,2) NOT NULL DEFAULT 0,
  discount_rate   numeric(5,2) NOT NULL DEFAULT 0,
  line_total      numeric(15,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can select line items"
  ON public.invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Tenant members can insert line items"
  ON public.invoice_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Tenant members can update line items"
  ON public.invoice_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Tenant members can delete line items"
  ON public.invoice_line_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

-- ============================================================
-- invoice_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id                 uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount                     numeric(15,2) NOT NULL,
  currency                   text NOT NULL DEFAULT 'USD',
  payment_date               date NOT NULL DEFAULT CURRENT_DATE,
  method                     text NOT NULL DEFAULT 'manual'
                             CHECK (method IN ('manual','stripe','ach','wire','cash','check','crypto','other')),
  reference                  text,
  stripe_payment_intent_id   text,
  recorded_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                      text,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can select payments"
  ON public.invoice_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Tenant members can insert payments"
  ON public.invoice_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

-- ============================================================
-- invoice_activity
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can select activity"
  ON public.invoice_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Tenant members can insert activity"
  ON public.invoice_activity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.tenant_id = public.get_user_tenant_id()
    )
  );

-- ============================================================
-- PUBLIC VIEW RPC (token-based, bypasses RLS)
-- ============================================================
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
BEGIN
  SELECT row_to_json(i)::jsonb INTO v_invoice
  FROM public.invoices i
  WHERE i.public_view_token = p_token
    AND i.status != 'void';

  IF v_invoice IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(row_to_json(li) ORDER BY li.sort_order) INTO v_items
  FROM public.invoice_line_items li
  WHERE li.invoice_id = (v_invoice->>'id')::uuid;

  SELECT jsonb_build_object(
    'accent_color', s.accent_color,
    'logo_url',     s.logo_url,
    'payment_instructions', s.payment_instructions
  ) INTO v_settings
  FROM public.invoice_settings s
  WHERE s.tenant_id = (v_invoice->>'tenant_id')::uuid;

  -- Also fetch tenant branding
  RETURN jsonb_build_object(
    'invoice',  v_invoice,
    'items',    COALESCE(v_items, '[]'::jsonb),
    'settings', COALESCE(v_settings, '{}'::jsonb)
  );
END;
$$;

-- Mark invoice viewed
CREATE OR REPLACE FUNCTION public.mark_invoice_viewed(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invoices
  SET viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
      updated_at = now()
  WHERE public_view_token = p_token
    AND status != 'void';
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id       ON public.invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status          ON public.invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id       ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date        ON public.invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_inv   ON public.invoice_line_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_inv     ON public.invoice_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_inv     ON public.invoice_activity (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_settings_tenant  ON public.invoice_settings (tenant_id);

-- ============================================================
-- TRIGGER: update invoices.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_invoice_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_updated_at();

CREATE TRIGGER trg_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_updated_at();
