import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';
import { resolveTenantFromDomain, isPlatformAdminDomain } from './tenantResolver';

type UserRole = 'general_manager' | 'compliance_manager' | 'accountant' | 'cfo' | 'legal_counsel' | 'admin' | 'client' | 'platform_admin';
type RoleCategory = 'superadmin' | 'tenant_admin' | 'client' | 'staff_user';
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  roleCategory: RoleCategory | null;
  roleDetail: string | null;
  isStaff: boolean;
  isTenantAdmin: boolean;
  isClient: boolean;
  staffAccount: StaffAccount | null;
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
  const [isStaff, setIsStaff] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformAdminUser, setPlatformAdminUser] = useState<PlatformAdminUser | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [userRoleRecord, setUserRoleRecord] = useState<UserRoleRecord | null>(null);

  const loadUserRole = async (userId: string, resolvedTenant: Tenant | null) => {
    // Query user_roles table as single source of truth
    const { data: userRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (roleError || !userRoleData) {
      console.error('Failed to load user role:', roleError);
      resetRoleState();
      return;
    }

    // Store the user role record
    setUserRoleRecord(userRoleData);
    setRoleCategory(userRoleData.role_category as RoleCategory);
    setRoleDetail(userRoleData.role_detail);

    // If no tenant resolved from domain but user has a tenant_id, load that tenant
    if (!resolvedTenant && userRoleData.tenant_id) {
      const { data: userTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userRoleData.tenant_id)
        .maybeSingle();
      if (userTenant) {
        setCurrentTenant(userTenant);
        resolvedTenant = userTenant;
      }
    }

    // Set flags based on role_category
    switch (userRoleData.role_category) {
      case 'superadmin':
        setIsPlatformAdmin(true);
        setIsStaff(false);
        setIsTenantAdmin(false);
        setIsClient(false);
        setUserRole('platform_admin');

        // Fetch platform admin details
        const { data: adminData } = await supabase
          .from('platform_admin_users')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        setPlatformAdminUser(adminData);
        setStaffAccount(null);
        setTenantUser(null);
        break;

      case 'tenant_admin':
        setIsTenantAdmin(true);
        setIsPlatformAdmin(false);
        setIsStaff(false);
        setIsClient(false);
        setUserRole('admin');

        // Fetch tenant user details
        if (resolvedTenant && userRoleData.tenant_id === resolvedTenant.id) {
          const { data: tenantUserData } = await supabase
            .from('tenant_users')
            .select('*')
            .eq('user_id', userId)
            .eq('tenant_id', resolvedTenant.id)
            .maybeSingle();
          setTenantUser(tenantUserData);
        }
        setPlatformAdminUser(null);
        setStaffAccount(null);
        break;

      case 'staff_user':
        setIsStaff(true);
        setIsPlatformAdmin(false);
        setIsTenantAdmin(false);
        setIsClient(false);
        setUserRole(userRoleData.role_detail as UserRole);

        // Fetch staff account details
        const { data: staffData } = await supabase
          .from('staff_accounts')
          .select('*')
          .eq('auth_user_id', userId)
          .eq('status', 'active')
          .maybeSingle();
        setStaffAccount(staffData);
        setPlatformAdminUser(null);
        setTenantUser(null);
        break;

      case 'client':
        setIsClient(true);
        setIsPlatformAdmin(false);
        setIsStaff(false);
        setIsTenantAdmin(false);
        setUserRole('client');
        setPlatformAdminUser(null);
        setStaffAccount(null);
        setTenantUser(null);
        break;

      default:
        resetRoleState();
    }
  };

  const resetRoleState = () => {
    setUserRole(null);
    setRoleCategory(null);
    setRoleDetail(null);
    setIsStaff(false);
    setIsTenantAdmin(false);
    setIsClient(false);
    setStaffAccount(null);
    setIsPlatformAdmin(false);
    setPlatformAdminUser(null);
    setTenantUser(null);
    setUserRoleRecord(null);
  };

  useEffect(() => {
    let initComplete = false;

    const initAuth = async () => {
      const [{ data: { session } }, resolved] = await Promise.all([
        supabase.auth.getSession(),
        resolveTenantFromDomain(window.location.hostname)
      ]);

      setSession(session);
      setUser(session?.user ?? null);
      setCurrentTenant(resolved.tenant);

      if (session?.user) {
        await loadUserRole(session.user.id, resolved.tenant);
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

        const resolved = await resolveTenantFromDomain(window.location.hostname);
        setCurrentTenant(resolved.tenant);

        if (session?.user) {
          await loadUserRole(session.user.id, resolved.tenant);
        } else {
          resetRoleState();
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
    const [{ data: { session } }, resolved] = await Promise.all([
      supabase.auth.getSession(),
      resolveTenantFromDomain(window.location.hostname)
    ]);
    setCurrentTenant(resolved.tenant);
    if (session?.user) {
      await loadUserRole(session.user.id, resolved.tenant);
    }
  };

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
      staffAccount,
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
