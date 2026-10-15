/*
# Critical access-control fixes

## Plain-English summary
Closes several holes where signed-in users (or visitors) could read or change data
that does not belong to them.

## 1. Membership helper functions (bug fix)
`user_is_tenant_member`, `user_is_tenant_admin` and `user_tenant_ids` compared
columns to themselves (parameter names were shadowed by column names), so they
returned TRUE / ALL tenants for every caller. They now use positional parameters.
These power policies on `tenant_users` and `client_profiles`.

## 2. Vault passphrase
`get_vault_passphrase` could be executed by any signed-in user and returned any
vault secret. It is now callable only by the server (service_role) and only for
secrets whose name ends in `_vault_passphrase`.

## 3. Discounts
`apply_discount_to_subscription` had no caller check and unqualified table names.
It now requires a platform admin or an admin of the subscription's own tenant and
verifies the subscription belongs to that tenant.

## 4. Usage metrics
`get_tenant_usage_metrics` returned any tenant's counts and AUM. It now requires
membership of that tenant (or platform admin) and uses qualified table names.

## 5. Signup requests
Removed "Anyone can read signup requests". Visitors can still create a pending
request. Added `complete_signup_request` so a newly provisioned owner can mark
their own request completed/failed.

## 6. Shared rate limiting
New table `edge_rate_limits` + `consume_rate_limit` (server only) providing a
durable fixed-window counter for edge functions.
*/

-- 1. Membership helpers
CREATE OR REPLACE FUNCTION public.user_is_tenant_member(user_id uuid, tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = $1 AND tu.tenant_id = $2); $$;

CREATE OR REPLACE FUNCTION public.user_is_tenant_admin(user_id uuid, tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = $1 AND tu.tenant_id = $2 AND tu.role IN ('owner','admin')); $$;

CREATE OR REPLACE FUNCTION public.user_tenant_ids(user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = $1; $$;

-- 2. Vault passphrase: server only
CREATE OR REPLACE FUNCTION public.get_vault_passphrase(secret_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result text;
BEGIN
  IF secret_name IS NULL OR secret_name NOT LIKE '%\_vault\_passphrase' THEN
    RETURN NULL;
  END IF;
  SELECT ds.decrypted_secret INTO result FROM vault.decrypted_secrets ds WHERE ds.name = secret_name LIMIT 1;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_vault_passphrase(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_passphrase(text) TO service_role;

-- 3. Discounts
CREATE OR REPLACE FUNCTION public.apply_discount_to_subscription(p_tenant_id uuid, p_subscription_id uuid, p_discount_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_validation jsonb;
  v_discount_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT (
       public.is_platform_admin(auth.uid())
       OR public.user_is_tenant_admin(auth.uid(), p_tenant_id)
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id AND ur.role_category = 'tenant_admin')
     ) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Not authorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenant_subscriptions s WHERE s.id = p_subscription_id AND s.tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Subscription not found');
  END IF;

  v_validation := public.validate_discount_code(p_discount_code);
  IF COALESCE((v_validation->>'valid')::boolean, false) = false THEN
    RETURN v_validation;
  END IF;
  v_discount_id := (v_validation->>'discount_id')::uuid;

  IF EXISTS (SELECT 1 FROM public.tenant_discounts td WHERE td.subscription_id = p_subscription_id AND td.discount_code_id = v_discount_id) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Discount already applied');
  END IF;

  UPDATE public.tenant_subscriptions SET applied_discount_code_id = v_discount_id WHERE id = p_subscription_id;
  UPDATE public.discount_codes SET times_used = times_used + 1, updated_at = now() WHERE id = v_discount_id;
  INSERT INTO public.tenant_discounts (tenant_id, discount_code_id, subscription_id) VALUES (p_tenant_id, v_discount_id, p_subscription_id);

  RETURN jsonb_build_object('success', true, 'discount_applied', v_validation);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_discount_to_subscription(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_discount_to_subscription(uuid, uuid, text) TO authenticated, service_role;

-- 4. Usage metrics
CREATE OR REPLACE FUNCTION public.get_tenant_usage_metrics(p_tenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
       public.is_platform_admin(auth.uid())
       OR public.user_is_tenant_member(auth.uid(), p_tenant_id)
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id AND ur.role_category IN ('tenant_admin','staff_user'))
     ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'user_count',   (SELECT COUNT(*) FROM public.tenant_users WHERE tenant_id = p_tenant_id),
    'client_count', (SELECT COUNT(*) FROM public.client_profiles WHERE tenant_id = p_tenant_id),
    'active_funds', (SELECT COUNT(*) FROM public.funds WHERE tenant_id = p_tenant_id AND status = 'active'),
    'total_aum',    0
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_tenant_usage_metrics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_usage_metrics(uuid) TO authenticated, service_role;

-- 5. Signup requests
DROP POLICY IF EXISTS "Anyone can read signup requests" ON public.signup_requests;

CREATE OR REPLACE FUNCTION public.complete_signup_request(p_request_id uuid, p_status text, p_tenant_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_email text := lower(auth.jwt() ->> 'email');
BEGIN
  IF auth.uid() IS NULL OR v_email IS NULL OR p_status NOT IN ('completed','failed') THEN
    RETURN false;
  END IF;
  IF p_status = 'completed' AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id AND ur.role_category = 'tenant_admin'
  ) THEN
    RETURN false;
  END IF;
  UPDATE public.signup_requests
     SET status = p_status,
         tenant_id = CASE WHEN p_status = 'completed' THEN p_tenant_id ELSE tenant_id END,
         completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END
   WHERE id = p_request_id AND lower(contact_email) = v_email AND status = 'pending';
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_signup_request(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_signup_request(uuid, text, uuid) TO authenticated;

-- 6. Rate limiting
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  bucket text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_hits integer;
BEGIN
  INSERT INTO public.edge_rate_limits AS r (bucket, hits, window_start)
  VALUES (p_bucket, 1, now())
  ON CONFLICT (bucket) DO UPDATE
    SET hits = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.hits + 1 END,
        window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE r.window_start END
  RETURNING hits INTO v_hits;
  RETURN v_hits <= p_max;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;
