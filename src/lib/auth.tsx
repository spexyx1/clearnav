import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';
import { dbg } from './debug';

type UserRole = 'general_manager' | 'compliance_manager' | 'accountant' | 'cfo' | 'legal_counsel' | 'admin' | 'client' | 'platform_admin' | 'auditor';
type RoleCategory = 'superadmin' | 'tenant_admin' | 'client' | 'staff_user' | 'auditor';
type Tenant = Database['public']['Tables']['platform_tenants']['Row'];
type PlatformAdminUser = Database['public']['Tables']['platform_admin_users']['Row'];
type TenantUser = Database['public']['Tables']['tenant_users']['Row'];
type UserRoleRecord = Database['public']['Tables']['user_roles']['Row'];

interface StaffAccount {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  permissions: any;
  tenant_id?: string;
}

interface AuditorProfile {
  id: string;
  user_id: string;
  firm_name: string;
  bio: string | null;
  specializations: any;
  certification_status: string;
  is_publicly_listed: boolean;
  total_audits_completed: number;
  average_rating: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  roleCategory: RoleCategory | null;
  roleDetail: string | null;
  /** Derived from roleCategory — use roleCategory === 'staff_user' for new code */
  isStaff: boolean;
  /** Derived from roleCategory — use roleCategory === 'tenant_admin' for new code */
  isTenantAdmin: boolean;
  /** Derived from roleCategory — use roleCategory === 'client' for new code */
  isClient: boolean;
  /** Derived from roleCategory — use roleCategory === 'auditor' for new code */
  isAuditor: boolean;
  staffAccount: StaffAccount | null;
  auditorProfile: AuditorProfile | null;
  /** Derived from roleCategory — use roleCategory === 'superadmin' for new code */
  isPlatformAdmin: boolean;
  platformAdminUser: PlatformAdminUser | null;
  currentTenant: Tenant | null;
  tenantId: string | null;
  tenantUser: TenantUser | null;
  userRoleRecord: UserRoleRecord | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleCategory, setRoleCategory] = useState<RoleCategory | null>(null);
  const [roleDetail, setRoleDetail] = useState<string | null>(null);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);
  const [auditorProfile, setAuditorProfile] = useState<AuditorProfile | null>(null);
  const [platformAdminUser, setPlatformAdminUser] = useState<PlatformAdminUser | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [userRoleRecord, setUserRoleRecord] = useState<UserRoleRecord | null>(null);

  const loadUserRole = async (userId: string) => {
    dbg('[Auth] Loading user role for:', userId);

    const { data: userRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    dbg('[Auth] User role data:', userRoleData, 'Error:', roleError);

    if (roleError || !userRoleData) {
      console.error('Failed to load user role:', roleError);
      resetRoleState();
      return;
    }

    setUserRoleRecord(userRoleData);
    setRoleCategory(userRoleData.role_category as RoleCategory);
    setRoleDetail(userRoleData.role_detail);

    // Tenant fetch + role-specific detail fetch run in parallel
    const tenantPromise = userRoleData.tenant_id
      ? supabase
          .from('platform_tenants')
          .select('id, slug, name, subdomain, custom_domain, status, billing_plan, subscription_status, branding, settings, created_at, updated_at, trial_ends_at, stripe_customer_id, stripe_subscription_id')
          .eq('id', userRoleData.tenant_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    type DetailResult = {
      adminData: PlatformAdminUser | null;
      tenantUserData: TenantUser | null;
      staffData: StaffAccount | null;
      auditorData: AuditorProfile | null;
    };

    let detailPromise: Promise<DetailResult>;

    switch (userRoleData.role_category) {
      case 'superadmin':
        setUserRole('platform_admin');
        detailPromise = supabase
          .from('platform_admin_users')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
          .then(({ data }) => ({ adminData: data, tenantUserData: null, staffData: null, auditorData: null }));
        break;

      case 'tenant_admin':
        setUserRole('admin');
        detailPromise = supabase
          .from('tenant_users')
          .select('*')
          .eq('user_id', userId)
          .eq('tenant_id', userRoleData.tenant_id)
          .maybeSingle()
          .then(({ data }) => ({ adminData: null, tenantUserData: data, staffData: null, auditorData: null }));
        break;

      case 'staff_user':
        setUserRole(userRoleData.role_detail as UserRole);
        detailPromise = supabase
          .from('staff_accounts')
          .select('*')
          .eq('auth_user_id', userId)
          .eq('status', 'active')
          .maybeSingle()
          .then(({ data }) => ({ adminData: null, tenantUserData: null, staffData: data, auditorData: null }));
        break;

      case 'auditor':
        setUserRole('auditor');
        detailPromise = supabase
          .from('auditor_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
          .then(({ data }) => ({ adminData: null, tenantUserData: null, staffData: null, auditorData: data }));
        break;

      default:
        setUserRole('client');
        detailPromise = Promise.resolve({ adminData: null, tenantUserData: null, staffData: null, auditorData: null });
    }

    // Run tenant + detail queries in parallel
    const [tenantResult, detail] = await Promise.all([tenantPromise, detailPromise]);

    if (tenantResult.data) {
      setCurrentTenant(tenantResult.data as unknown as Tenant);
      dbg('[Auth] Tenant loaded:', tenantResult.data.id);
    } else {
      dbg('[Auth] No tenant_id in user role data');
    }

    setPlatformAdminUser(detail.adminData);
    setTenantUser(detail.tenantUserData);
    setStaffAccount(detail.staffData);
    setAuditorProfile(detail.auditorData);
  };

  const resetRoleState = () => {
    setUserRole(null);
    setRoleCategory(null);
    setRoleDetail(null);
    setStaffAccount(null);
    setAuditorProfile(null);
    setPlatformAdminUser(null);
    setTenantUser(null);
    setUserRoleRecord(null);
  };

  useEffect(() => {
    let initComplete = false;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserRole(session.user.id);
      }

      setLoading(false);
      initComplete = true;
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !initComplete) return;

      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserRole(session.user.id);
        } else {
          resetRoleState();
          setCurrentTenant(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    resetRoleState();
    setCurrentTenant(null);
  };

  const refetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserRole(session.user.id);
    }
  };

  // Derived boolean flags — kept for backwards compatibility with existing consumers.
  // For new code, compare roleCategory directly.
  const isStaff = roleCategory === 'staff_user';
  const isTenantAdmin = roleCategory === 'tenant_admin';
  const isClient = roleCategory === 'client';
  const isAuditor = roleCategory === 'auditor';
  const isPlatformAdmin = roleCategory === 'superadmin';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      roleCategory,
      roleDetail,
      isStaff,
      isTenantAdmin,
      isClient,
      isAuditor,
      staffAccount,
      auditorProfile,
      isPlatformAdmin,
      platformAdminUser,
      currentTenant,
      tenantId: currentTenant?.id || null,
      tenantUser,
      userRoleRecord,
      signIn,
      signOut,
      refetch
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { UserRole, RoleCategory, AuditorProfile };
