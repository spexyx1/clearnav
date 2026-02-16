/*
  # Platform Admin Helper Functions

  Creates utility functions for platform administrators to manage and view data across all tenants.

  ## New Functions

  ### `get_all_platform_users()`
  Allows platform admins to retrieve all users with their tenant associations
  
  ### `get_tenant_overview(p_tenant_id)`
  Provides comprehensive overview of a specific tenant

  ### `search_users_across_tenants(p_search_term)`
  Global user search functionality

  ## Security
  - All functions check for platform admin permissions
  - Functions are SECURITY DEFINER to allow access to auth schema
  - Audit logging is included for sensitive operations
*/

-- Function to get all platform users (for platform admins only)
CREATE OR REPLACE FUNCTION get_all_platform_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  tenant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT EXISTS (
    SELECT 1 FROM platform_admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Platform admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    COUNT(tu.tenant_id) as tenant_count
  FROM auth.users u
  LEFT JOIN tenant_users tu ON tu.user_id = u.id
  GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to get tenant overview for platform admins
CREATE OR REPLACE FUNCTION get_tenant_overview(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_user_count integer;
  v_active_subscription jsonb;
  v_total_revenue integer;
BEGIN
  -- Check if caller is platform admin
  IF NOT EXISTS (
    SELECT 1 FROM platform_admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Platform admin access required';
  END IF;

  -- Get user count
  SELECT COUNT(*) INTO v_user_count
  FROM tenant_users
  WHERE tenant_id = p_tenant_id;

  -- Get active subscription
  SELECT jsonb_build_object(
    'plan_name', sp.name,
    'status', ts.status,
    'current_period_end', ts.current_period_end
  ) INTO v_active_subscription
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON sp.id = ts.plan_id
  WHERE ts.tenant_id = p_tenant_id
    AND ts.status = 'active'
  LIMIT 1;

  -- Get total revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM billing_records
  WHERE tenant_id = p_tenant_id
    AND status = 'paid';

  -- Build result
  SELECT jsonb_build_object(
    'tenant_id', pt.id,
    'name', pt.name,
    'slug', pt.slug,
    'status', pt.status,
    'database_type', pt.database_type,
    'user_count', v_user_count,
    'active_subscription', v_active_subscription,
    'total_revenue', v_total_revenue,
    'trial_ends_at', pt.trial_ends_at,
    'created_at', pt.created_at
  ) INTO v_result
  FROM platform_tenants pt
  WHERE pt.id = p_tenant_id;

  -- Log the view action
  INSERT INTO platform_admin_audit_logs (
    admin_user_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    'view_tenant_overview',
    'platform_tenants',
    p_tenant_id,
    jsonb_build_object('tenant_id', p_tenant_id)
  );

  RETURN v_result;
END;
$$;

-- Function to search users across all tenants
CREATE OR REPLACE FUNCTION search_users_across_tenants(p_search_term text)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  tenant_name text,
  tenant_id uuid,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT EXISTS (
    SELECT 1 FROM platform_admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Platform admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' as full_name,
    pt.name as tenant_name,
    tu.tenant_id,
    tu.role
  FROM auth.users u
  LEFT JOIN tenant_users tu ON tu.user_id = u.id
  LEFT JOIN platform_tenants pt ON pt.id = tu.tenant_id
  WHERE 
    u.email ILIKE '%' || p_search_term || '%'
    OR u.raw_user_meta_data->>'full_name' ILIKE '%' || p_search_term || '%'
  ORDER BY u.email;
END;
$$;

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total_tenants integer;
  v_active_tenants integer;
  v_total_users integer;
  v_total_revenue integer;
  v_monthly_revenue integer;
BEGIN
  -- Check if caller is platform admin
  IF NOT EXISTS (
    SELECT 1 FROM platform_admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Platform admin access required';
  END IF;

  -- Get total tenants
  SELECT COUNT(*) INTO v_total_tenants
  FROM platform_tenants;

  -- Get active tenants
  SELECT COUNT(*) INTO v_active_tenants
  FROM platform_tenants
  WHERE status = 'active';

  -- Get total users
  SELECT COUNT(*) INTO v_total_users
  FROM auth.users;

  -- Get total revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM billing_records
  WHERE status = 'paid';

  -- Get monthly revenue (current month)
  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_revenue
  FROM billing_records
  WHERE status = 'paid'
    AND created_at >= date_trunc('month', now());

  RETURN jsonb_build_object(
    'total_tenants', v_total_tenants,
    'active_tenants', v_active_tenants,
    'total_users', v_total_users,
    'total_revenue', v_total_revenue,
    'monthly_revenue', v_monthly_revenue,
    'generated_at', now()
  );
END;
$$;

-- Function to view tenant data (read-only for platform admins)
CREATE OR REPLACE FUNCTION view_tenant_clients(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  account_status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is platform admin
  IF NOT EXISTS (
    SELECT 1 FROM platform_admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Platform admin access required';
  END IF;

  -- Log the view action
  INSERT INTO platform_admin_audit_logs (
    admin_user_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    'view_tenant_clients',
    'platform_tenants',
    p_tenant_id,
    jsonb_build_object('tenant_id', p_tenant_id)
  );

  RETURN QUERY
  SELECT 
    c.id,
    c.email,
    c.full_name,
    c.account_status,
    c.created_at
  FROM clients c
  WHERE c.tenant_id = p_tenant_id
  ORDER BY c.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users (function will check for admin role)
GRANT EXECUTE ON FUNCTION get_all_platform_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_across_tenants(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION view_tenant_clients(uuid) TO authenticated;
