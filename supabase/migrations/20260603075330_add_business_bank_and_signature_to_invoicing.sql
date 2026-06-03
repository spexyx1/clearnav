/*
  # Add Business Details, Bank Info, and Signature Support to Invoicing

  ## Summary
  Extends the invoicing system with:

  1. **Business/Sender Profile** (on invoice_settings)
     - Business name, tax ID (EIN/VAT/ABN), full address, phone, email, website
     - Used in the "From" block on every invoice PDF and email

  2. **Bank & Payment Details** (on invoice_settings)
     - Account holder name, bank name, account number, routing number
     - SWIFT/BIC and IBAN for international wires
     - Extra free-text instructions

  3. **E-Signature Support** (on invoices)
     - signature_required: boolean flag set at invoice creation
     - signed_at, signed_by_name, signed_by_choice, signature_data, signed_by_ip
     - Enables the public signing flow at /invoice/:token

  ## No destructive changes — all new nullable columns added with IF NOT EXISTS guards.
*/

-- ─── Business / Sender Profile ───────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_name') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_tax_id') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_tax_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_address_line1') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_address_line1 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_address_line2') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_address_line2 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_city') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_state') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_state text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_zip') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_zip text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_country') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_country text DEFAULT 'US';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_phone') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_email') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'business_website') THEN
    ALTER TABLE invoice_settings ADD COLUMN business_website text;
  END IF;
END $$;

-- ─── Bank & Payment Details ───────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'bank_account_name') THEN
    ALTER TABLE invoice_settings ADD COLUMN bank_account_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'bank_name') THEN
    ALTER TABLE invoice_settings ADD COLUMN bank_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'bank_account_number') THEN
    ALTER TABLE invoice_settings ADD COLUMN bank_account_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'bank_routing_number') THEN
    ALTER TABLE invoice_settings ADD COLUMN bank_routing_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'bank_swift_bic') THEN
    ALTER TABLE invoice_settings ADD COLUMN bank_swift_bic text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'bank_iban') THEN
    ALTER TABLE invoice_settings ADD COLUMN bank_iban text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_settings' AND column_name = 'bank_extra_instructions') THEN
    ALTER TABLE invoice_settings ADD COLUMN bank_extra_instructions text;
  END IF;
END $$;

-- ─── E-Signature Fields on Invoices ──────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signature_required') THEN
    ALTER TABLE invoices ADD COLUMN signature_required boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signed_at') THEN
    ALTER TABLE invoices ADD COLUMN signed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signed_by_name') THEN
    ALTER TABLE invoices ADD COLUMN signed_by_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signed_by_choice') THEN
    ALTER TABLE invoices ADD COLUMN signed_by_choice text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signature_data') THEN
    ALTER TABLE invoices ADD COLUMN signature_data text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signed_by_ip') THEN
    ALTER TABLE invoices ADD COLUMN signed_by_ip text;
  END IF;
END $$;

-- ─── RPC: Sign Invoice via Token ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sign_invoice_by_token(
  p_token uuid,
  p_signed_by_name text,
  p_signed_by_choice text,
  p_signature_data text,
  p_signed_by_ip text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_already_signed boolean;
BEGIN
  SELECT id, signed_at IS NOT NULL
  INTO v_invoice_id, v_already_signed
  FROM invoices
  WHERE public_view_token = p_token;

  IF v_invoice_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  IF v_already_signed THEN
    RETURN json_build_object('success', false, 'error', 'Invoice already signed');
  END IF;

  UPDATE invoices SET
    signed_at = now(),
    signed_by_name = p_signed_by_name,
    signed_by_choice = p_signed_by_choice,
    signature_data = p_signature_data,
    signed_by_ip = p_signed_by_ip,
    updated_at = now()
  WHERE id = v_invoice_id;

  INSERT INTO invoice_activity (invoice_id, action, actor_type, metadata)
  VALUES (v_invoice_id, 'signed', 'client', json_build_object(
    'signed_by_name', p_signed_by_name,
    'signed_by_choice', p_signed_by_choice,
    'signed_at', now()
  ));

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION sign_invoice_by_token(uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION sign_invoice_by_token(uuid, text, text, text, text) TO authenticated;
