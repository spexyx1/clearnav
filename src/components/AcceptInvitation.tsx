import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AcceptInvitation() {
  const [invitation, setInvitation] = useState<any>(null);
  const [invitationSource, setInvitationSource] = useState<'user' | 'staff'>('user');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);

  const [signupForm, setSignupForm] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    loadInvitation(token);
  }, []);

  const loadInvitation = async (token: string) => {
    const { data: userData, error: userError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (userData) {
      if (new Date(userData.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }
      setInvitation(userData);
      setInvitationSource('user');
      setLoading(false);
      return;
    }

    const { data: staffData } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('token', token)
      .in('status', ['pending', 'sent'])
      .maybeSingle();

    if (staffData) {
      if (staffData.expires_at && new Date(staffData.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }
      setInvitation(staffData);
      setInvitationSource('staff');
      if (staffData.full_name) {
        setSignupForm(prev => ({ ...prev, fullName: staffData.full_name }));
      }
      setLoading(false);
      return;
    }

    setError('Invitation not found or has already been used');
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setRegistering(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: signupForm.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      if (invitationSource === 'staff') {
        const roleDetail = invitation.role || 'admin';

        const { error: userRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            email: invitation.email,
            role_category: 'staff_user',
            role_detail: roleDetail,
            tenant_id: invitation.tenant_id,
            status: 'active',
            metadata: {
              created_via: 'staff_invitation',
              invitation_id: invitation.id,
              full_name: signupForm.fullName,
            },
          });

        if (userRoleError) throw new Error('Failed to create user role');

        const { error: staffError } = await supabase
          .from('staff_accounts')
          .insert({
            auth_user_id: authData.user.id,
            email: invitation.email,
            full_name: signupForm.fullName,
            role: roleDetail,
            status: 'active',
            tenant_id: invitation.tenant_id,
            permissions: invitation.permissions || {},
          });

        if (staffError) throw new Error('Failed to create staff account');

        await supabase
          .from('staff_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        await supabase.from('tenant_users').insert({
          user_id: authData.user.id,
          tenant_id: invitation.tenant_id,
          role: 'admin',
          invited_via: invitation.id,
          onboarding_status: 'completed',
        });
      } else {
        const userType = invitation.metadata?.user_type || 'client';
        const roleCategory = userType === 'staff' ? 'staff_user' : 'client';
        const roleDetail = userType === 'staff' ? invitation.role : null;

        const { error: userRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            email: invitation.email,
            role_category: roleCategory,
            role_detail: roleDetail,
            tenant_id: invitation.tenant_id,
            status: 'active',
            metadata: {
              created_via: 'invitation',
              invitation_id: invitation.id,
              full_name: signupForm.fullName,
            },
          });

        if (userRoleError) throw new Error('Failed to create user role');

        if (userType === 'staff') {
          const { error: staffError } = await supabase
            .from('staff_accounts')
            .insert({
              auth_user_id: authData.user.id,
              email: invitation.email,
              full_name: signupForm.fullName,
              role: invitation.role,
              status: 'active',
              tenant_id: invitation.tenant_id,
            });

          if (staffError) throw new Error('Failed to create staff account');
        } else {
          const accountNumber = `GA${String(Math.floor(Math.random() * 90000) + 10000)}`;
          const { error: clientError } = await supabase
            .from('client_profiles')
            .insert({
              id: authData.user.id,
              email: invitation.email,
              full_name: signupForm.fullName,
              account_number: accountNumber,
              total_invested: 0,
              current_value: 0,
              inception_date: new Date().toISOString(),
              tenant_id: invitation.tenant_id,
            });

          if (clientError) throw new Error('Failed to create client profile');
        }

        await supabase
          .from('user_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        if (invitation.tenant_id) {
          await supabase.from('tenant_users').insert({
            user_id: authData.user.id,
            tenant_id: invitation.tenant_id,
            role: userType === 'staff' ? 'admin' : 'user',
            invited_via: invitation.id,
            onboarding_status: userType === 'client' ? 'in_progress' : 'completed',
          });
        }
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to complete registration');
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-900 border border-red-800 rounded-lg p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Invalid Invitation</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
            >
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-900 border border-green-800 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome Aboard!</h2>
            <p className="text-slate-400 mb-6">
              Your account has been created successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roleDisplay = (invitation.role || '').replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded mx-auto mb-4" />
            <h1 className="text-3xl font-light text-white mb-2">
              CLEAR<span className="font-semibold">NAV</span>
            </h1>
            <p className="text-slate-400">Complete your registration</p>
          </div>

          <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded">
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-400">Invitation for:</span>
            </div>
            <p className="text-white font-medium">{invitation.email}</p>
            <p className="text-sm text-slate-400 mt-1">
              Role: <span className="text-cyan-400 capitalize">{roleDisplay}</span>
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={signupForm.fullName}
                onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                placeholder="Choose a secure password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={signupForm.confirmPassword}
                onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={registering}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {registering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <a href="/" className="text-cyan-400 hover:text-cyan-300">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
