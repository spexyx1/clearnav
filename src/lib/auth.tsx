import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';
import { resolveTenantFromDomain, isPlatformAdminDomain } from './tenantResolver';

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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  isStaff: boolean;
  isTenantAdmin: boolean;
  staffAccount: StaffAccount | null;
  isPlatformAdmin: boolean;
  platformAdminUser: PlatformAdminUser | null;
  currentTenant: Tenant | null;
  tenantUser: TenantUser | null;
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
  const [isStaff, setIsStaff] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformAdminUser, setPlatformAdminUser] = useState<PlatformAdminUser | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);

  const loadUserRole = async (userId: string, resolvedTenant: Tenant | null) => {
    if (isPlatformAdminDomain()) {
      const { data: adminData } = await supabase
        .from('platform_admin_users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminData) {
        setIsPlatformAdmin(true);
        setPlatformAdminUser(adminData);
        setUserRole('platform_admin');
        setIsStaff(false);
        setIsTenantAdmin(false);
        setStaffAccount(null);
        return;
      }
    }

    const { data: staffData } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('auth_user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (staffData) {
      setIsStaff(true);
      setUserRole(staffData.role);
      setStaffAccount(staffData);
      setIsPlatformAdmin(false);
      setPlatformAdminUser(null);

      if (resolvedTenant && staffData.tenant_id === resolvedTenant.id) {
        const { data: tenantUserData } = await supabase
          .from('tenant_users')
          .select('*')
          .eq('user_id', userId)
          .eq('tenant_id', resolvedTenant.id)
          .maybeSingle();

        setTenantUser(tenantUserData);
        setIsTenantAdmin(
          !!(tenantUserData && (tenantUserData.role === 'admin' || tenantUserData.role === 'owner'))
        );
      } else {
        setIsTenantAdmin(false);
      }
    } else {
      if (resolvedTenant) {
        const { data: tenantUserData } = await supabase
          .from('tenant_users')
          .select('*')
          .eq('user_id', userId)
          .eq('tenant_id', resolvedTenant.id)
          .maybeSingle();

        setTenantUser(tenantUserData);

        if (tenantUserData && (tenantUserData.role === 'admin' || tenantUserData.role === 'owner')) {
          setIsTenantAdmin(true);
          setIsStaff(false);
          setUserRole('admin');
          setStaffAccount(null);
          setIsPlatformAdmin(false);
          setPlatformAdminUser(null);
          return;
        }
      }

      const { data: clientData } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (clientData) {
        setIsStaff(false);
        setIsTenantAdmin(false);
        setUserRole('client');
        setStaffAccount(null);
        setIsPlatformAdmin(false);
        setPlatformAdminUser(null);
      } else {
        setIsTenantAdmin(false);
      }
    }
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
          setUserRole(null);
          setIsStaff(false);
          setIsTenantAdmin(false);
          setStaffAccount(null);
          setIsPlatformAdmin(false);
          setPlatformAdminUser(null);
          setTenantUser(null);
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
    setUserRole(null);
    setIsStaff(false);
    setIsTenantAdmin(false);
    setStaffAccount(null);
    setIsPlatformAdmin(false);
    setPlatformAdminUser(null);
    setCurrentTenant(null);
    setTenantUser(null);
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
      isStaff,
      isTenantAdmin,
      staffAccount,
      isPlatformAdmin,
      platformAdminUser,
      currentTenant,
      tenantUser,
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
