import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type UserRole = 'general_manager' | 'compliance_manager' | 'accountant' | 'cfo' | 'legal_counsel' | 'admin' | 'client';

interface StaffAccount {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  permissions: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  isStaff: boolean;
  staffAccount: StaffAccount | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);

  const loadUserRole = async (userId: string) => {
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
    } else {
      const { data: clientData } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (clientData) {
        setIsStaff(false);
        setUserRole('client');
        setStaffAccount(null);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserRole(session.user.id);
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserRole(session.user.id);
        } else {
          setUserRole(null);
          setIsStaff(false);
          setStaffAccount(null);
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
    setStaffAccount(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, isStaff, staffAccount, signIn, signOut }}>
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
