import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';
import { resolveTenantFromDomain, isPlatformAdminDomain } from './tenantResolver';
import { detectAllUserRoles, determineRedirect, UserRoles } from './roleManager';

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
  allUserRoles: UserRoles | null;
  availableTenants: Tenant[];
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
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
  const [allUserRoles, setAllUserRoles] = useState<UserRoles | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);

  const loadUserRole = async (userId: string, resolvedTenant: Tenant | null, skipRedirect = false) => {
    const roles = await detectAllUserRoles(userId);
    setAllUserRoles(roles);

    const tenants: Tenant[] = [];
    roles.tenantAccesses.forEach(access => tenants.push(access.tenant));
    roles.clientTenants.forEach(tenant => {
      if (!tenants.find(t => t.id === tenant.id)) {
        tenants.push(tenant);
      }
    });
    setAvailableTenants(tenants);

    if (roles.isPlatformAdmin && isPlatformAdminDomain()) {
      setIsPlatformAdmin(true);
      setPlatformAdminUser(roles.platformAdminUser);
      setUserRole('platform_admin');
      setIsStaff(false);
      setIsTenantAdmin(false);
      setStaffAccount(null);
      setTenantUser(null);
      return;
    }

    const currentTenantAccess = roles.tenantAccesses.find(
      access => resolvedTenant && access.tenant.id === resolvedTenant.id
    );

    if (currentTenantAccess) {
      setIsStaff(currentTenantAccess.isStaff);
      setIsTenantAdmin(currentTenantAccess.isAdmin);
      setUserRole(currentTenantAccess.userRole);
      setStaffAccount(currentTenantAccess.staffAccount);
      setTenantUser(currentTenantAccess.tenantUser);
      setIsPlatformAdmin(false);
      setPlatformAdminUser(null);
      return;
    }

    if (roles.isClient && resolvedTenant) {
      const isClientOfTenant = roles.clientTenants.some(t => t.id === resolvedTenant.id);
      if (isClientOfTenant) {
        setIsStaff(false);
        setIsTenantAdmin(false);
        setUserRole('client');
        setStaffAccount(null);
        setIsPlatformAdmin(false);
        setPlatformAdminUser(null);
        setTenantUser(null);
        return;
      }
    }

    if (!skipRedirect) {
      const redirect = determineRedirect(roles, window.location.href);
      if (redirect.shouldRedirect && redirect.url) {
        window.location.href = redirect.url;
        return;
      }
    }

    setIsStaff(false);
    setIsTenantAdmin(false);
    setUserRole(null);
    setStaffAccount(null);
    setIsPlatformAdmin(false);
    setPlatformAdminUser(null);
    setTenantUser(null);
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
    setAllUserRoles(null);
    setAvailableTenants([]);
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

  const switchTenant = async (tenantSubdomain: string) => {
    const baseUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
    window.location.href = `${baseUrl}?tenant=${tenantSubdomain}`;
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
      allUserRoles,
      availableTenants,
      signIn,
      signOut,
      refetch,
      switchTenant
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
