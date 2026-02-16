import { supabase } from './supabase';
import { Database } from '../types/database';

type UserRole = 'general_manager' | 'compliance_manager' | 'accountant' | 'cfo' | 'legal_counsel' | 'admin' | 'client' | 'platform_admin';
type Tenant = Database['public']['Tables']['platform_tenants']['Row'];
type PlatformAdminUser = Database['public']['Tables']['platform_admin_users']['Row'];
type TenantUser = Database['public']['Tables']['tenant_users']['Row'];

interface StaffAccount {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  permissions: any;
  tenant_id?: string;
}

export interface UserRoles {
  isPlatformAdmin: boolean;
  platformAdminUser: PlatformAdminUser | null;
  tenantAccesses: Array<{
    tenant: Tenant;
    isAdmin: boolean;
    isStaff: boolean;
    staffAccount: StaffAccount | null;
    tenantUser: TenantUser | null;
    userRole: UserRole | null;
  }>;
  isClient: boolean;
  clientTenants: Tenant[];
}

export async function detectAllUserRoles(userId: string): Promise<UserRoles> {
  const [platformAdminResult, staffResult, tenantUserResult, clientResult] = await Promise.all([
    supabase.from('platform_admin_users').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('staff_accounts').select('*, platform_tenants(*)').eq('auth_user_id', userId).eq('status', 'active'),
    supabase.from('tenant_users').select('*, platform_tenants(*)').eq('user_id', userId),
    supabase.from('client_profiles').select('tenant_id, platform_tenants(*)').eq('id', userId)
  ]);

  const result: UserRoles = {
    isPlatformAdmin: !!platformAdminResult.data,
    platformAdminUser: platformAdminResult.data,
    tenantAccesses: [],
    isClient: !!clientResult.data && clientResult.data.length > 0,
    clientTenants: []
  };

  if (staffResult.data) {
    for (const staff of staffResult.data) {
      const tenant = staff.platform_tenants as unknown as Tenant;
      if (!tenant) continue;

      const tenantUserForStaff = await supabase
        .from('tenant_users')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const isAdmin = !!(tenantUserForStaff.data &&
        (tenantUserForStaff.data.role === 'admin' || tenantUserForStaff.data.role === 'owner'));

      result.tenantAccesses.push({
        tenant,
        isAdmin,
        isStaff: true,
        staffAccount: staff as unknown as StaffAccount,
        tenantUser: tenantUserForStaff.data,
        userRole: staff.role as UserRole
      });
    }
  }

  if (tenantUserResult.data) {
    for (const tenantUser of tenantUserResult.data) {
      const tenant = tenantUser.platform_tenants as unknown as Tenant;
      if (!tenant) continue;

      const existingAccess = result.tenantAccesses.find(ta => ta.tenant.id === tenant.id);
      if (existingAccess) continue;

      const isAdmin = tenantUser.role === 'admin' || tenantUser.role === 'owner';

      result.tenantAccesses.push({
        tenant,
        isAdmin,
        isStaff: false,
        staffAccount: null,
        tenantUser: tenantUser as unknown as TenantUser,
        userRole: isAdmin ? 'admin' : null
      });
    }
  }

  if (clientResult.data) {
    for (const client of clientResult.data) {
      const tenant = client.platform_tenants as unknown as Tenant;
      if (tenant) {
        result.clientTenants.push(tenant);
      }
    }
  }

  return result;
}

export interface RedirectDecision {
  shouldRedirect: boolean;
  url?: string;
  reason?: string;
}

export function determineRedirect(userRoles: UserRoles, currentUrl: string): RedirectDecision {
  const currentHostname = window.location.hostname;
  const isPlatformDomain = currentHostname === 'localhost' || currentHostname === 'clearnav.com';
  const params = new URLSearchParams(window.location.search);
  const currentTenantParam = params.get('tenant');

  if (userRoles.isPlatformAdmin && !isPlatformDomain) {
    return {
      shouldRedirect: true,
      url: `${window.location.protocol}//${window.location.hostname.split('.')[0] === 'www' ? window.location.hostname : 'localhost'}${window.location.port ? ':' + window.location.port : ''}`,
      reason: 'platform_admin'
    };
  }

  if (userRoles.isPlatformAdmin && isPlatformDomain && !currentTenantParam) {
    return {
      shouldRedirect: false,
      reason: 'already_on_platform_admin'
    };
  }

  if (userRoles.tenantAccesses.length > 0) {
    if (userRoles.tenantAccesses.length === 1) {
      const access = userRoles.tenantAccesses[0];
      if (currentTenantParam !== access.tenant.slug) {
        const baseUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        return {
          shouldRedirect: true,
          url: `${baseUrl}?tenant=${access.tenant.slug}`,
          reason: 'single_tenant_access'
        };
      }
      return {
        shouldRedirect: false,
        reason: 'already_on_correct_tenant'
      };
    }

    if (!currentTenantParam) {
      return {
        shouldRedirect: false,
        reason: 'multiple_tenants_need_selection'
      };
    }
  }

  if (userRoles.isClient && userRoles.clientTenants.length > 0) {
    const clientTenant = userRoles.clientTenants[0];
    if (currentTenantParam !== clientTenant.slug) {
      const baseUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
      return {
        shouldRedirect: true,
        url: `${baseUrl}?tenant=${clientTenant.slug}`,
        reason: 'client_access'
      };
    }
  }

  return {
    shouldRedirect: false,
    reason: 'no_redirect_needed'
  };
}
