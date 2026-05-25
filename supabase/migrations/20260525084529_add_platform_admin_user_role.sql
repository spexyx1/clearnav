
/*
  # Add user_roles record for platform admin

  The auth flow in auth.tsx queries user_roles to determine role_category.
  Without a record here, login succeeds but role resolution fails and the
  user is blocked at the portal gateway.

  role_detail must be NULL for non-staff roles (check constraint enforces this).
*/

INSERT INTO user_roles (user_id, email, role_category, role_detail, tenant_id, status)
SELECT
  u.id,
  'info@clearnav.cv',
  'superadmin',
  NULL,
  NULL,
  'active'
FROM auth.users u
WHERE u.email = 'info@clearnav.cv'
ON CONFLICT DO NOTHING;
