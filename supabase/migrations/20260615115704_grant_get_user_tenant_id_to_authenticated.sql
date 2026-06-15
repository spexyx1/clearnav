
-- Restore EXECUTE on get_user_tenant_id for authenticated so the old
-- invoice_settings tenant-scoped RLS policies stop throwing
-- "permission denied for function get_user_tenant_id".
-- The function is SECURITY DEFINER, so granting EXECUTE is safe —
-- callers cannot escalate beyond what the function itself does.
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
