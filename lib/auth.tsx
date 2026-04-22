'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

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
  permissions: unknown;
  tenant_id?: string;
}

interface AuditorProfile {
  id: string;
  user_id: string;
  firm_name: string;
  bio: string | null;
  specializations: unknown;
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
  isStaff: boolean;
  isTenantAdmin: boolean;
  isClient: boolean;
  isAuditor: boolean;
  staffAccount: StaffAccount | null;
  auditorProfile: AuditorProfile | null;
  isPlatformAdmin: boolean;
  platformAdminUser: PlatformAdminUser | null;
  currentTenant: Tenant | null;
  tenantId: string | null;
  tenantUser: TenantUser | null;
  userRoleRecord: UserRoleRecord | null;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleCategory, setRoleCategory] = useState<RoleCategory | null>(null);
  const [roleDetail, setRoleDetail] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isAuditor, setIsAuditor] = useState(false);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);
  const [auditorProfile, setAuditorProfile] = useState<AuditorProfile | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformAdminUser, setPlatformAdminUser] = useState<PlatformAdminUser | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [userRoleRecord, setUserRoleRecord] = useState<UserRoleRecord | null>(null);

  const resetRoleState = () => {
    setUserRole(null); setRoleCategory(null); setRoleDetail(null);
    setIsStaff(false); setIsTenantAdmin(false); setIsClient(false); setIsAuditor(false);
    setStaffAccount(null); setAuditorProfile(null); setIsPlatformAdmin(false);
    setPlatformAdminUser(null); setTenantUser(null); setUserRoleRecord(null);
  };

  const loadUserRole = async (userId: string) => {
    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !roleData) { resetRoleState(); return; }
    setUserRoleRecord(roleData);
    setRoleCategory(roleData.role_category as RoleCategory);
    setRoleDetail(roleData.role_detail);

    if (roleData.tenant_id) {
      const { data: tenantData } = await supabase.from('platform_tenants').select('*').eq('id', roleData.tenant_id).maybeSingle();
      if (tenantData) setCurrentTenant(tenantData);
    }

    switch (roleData.role_category) {
      case 'superadmin':
        setIsPlatformAdmin(true); setIsStaff(false); setIsTenantAdmin(false); setIsClient(false); setIsAuditor(false);
        setUserRole('platform_admin');
        const { data: adminData } = await supabase.from('platform_admin_users').select('*').eq('user_id', userId).maybeSingle();
        setPlatformAdminUser(adminData); setStaffAccount(null); setTenantUser(null); setAuditorProfile(null);
        break;
      case 'tenant_admin':
        setIsTenantAdmin(true); setIsPlatformAdmin(false); setIsStaff(false); setIsClient(false); setIsAuditor(false);
        setUserRole('admin');
        if (roleData.tenant_id) {
          const { data: tuData } = await supabase.from('tenant_users').select('*').eq('user_id', userId).eq('tenant_id', roleData.tenant_id).maybeSingle();
          setTenantUser(tuData);
        }
        setPlatformAdminUser(null); setStaffAccount(null); setAuditorProfile(null);
        break;
      case 'staff_user':
        setIsStaff(true); setIsPlatformAdmin(false); setIsTenantAdmin(false); setIsClient(false); setIsAuditor(false);
        setUserRole(roleData.role_detail as UserRole);
        const { data: staffData } = await supabase.from('staff_accounts').select('*').eq('auth_user_id', userId).eq('status', 'active').maybeSingle();
        setStaffAccount(staffData); setPlatformAdminUser(null); setTenantUser(null); setAuditorProfile(null);
        break;
      case 'client':
        setIsClient(true); setIsPlatformAdmin(false); setIsStaff(false); setIsTenantAdmin(false); setIsAuditor(false);
        setUserRole('client'); setPlatformAdminUser(null); setStaffAccount(null); setTenantUser(null); setAuditorProfile(null);
        break;
      case 'auditor':
        setIsAuditor(true); setIsPlatformAdmin(false); setIsStaff(false); setIsTenantAdmin(false); setIsClient(false);
        setUserRole('auditor');
        const { data: auditorData } = await supabase.from('auditor_profiles').select('*').eq('user_id', userId).maybeSingle();
        setAuditorProfile(auditorData); setPlatformAdminUser(null); setStaffAccount(null); setTenantUser(null);
        break;
      default:
        resetRoleState();
    }
  };

  useEffect(() => {
    let initComplete = false;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) await loadUserRole(session.user.id);
      setLoading(false);
      initComplete = true;
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !initComplete) return;
      (async () => {
        setSession(session); setUser(session?.user ?? null);
        if (session?.user) await loadUserRole(session.user.id);
        else { resetRoleState(); setCurrentTenant(null); }
      })();
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (session?.user) await loadUserRole(session.user.id);
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, userRole, roleCategory, roleDetail,
      isStaff, isTenantAdmin, isClient, isAuditor,
      staffAccount, auditorProfile, isPlatformAdmin, platformAdminUser,
      currentTenant, tenantId: currentTenant?.id || null, tenantUser, userRoleRecord,
      signIn, signOut, refetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export type { UserRole, RoleCategory, AuditorProfile };
