import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function DebugLogin() {
  const [email, setEmail] = useState('info@greyalpha.co');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      setResult({
        success: !error,
        error: error?.message,
        user: data?.user,
        session: data?.session ? 'Session exists' : null
      });
    } catch (e: any) {
      setResult({
        success: false,
        error: e.message
      });
    }

    setLoading(false);
  };

  const checkUser = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: users } = await supabase
        .from('staff_accounts')
        .select('email, full_name, role, status, tenant_id')
        .eq('email', email);

      setResult({
        info: 'User lookup from staff_accounts',
        users
      });
    } catch (e: any) {
      setResult({
        error: e.message
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Login Debug Tool</h1>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Login</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={testLogin}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Login'}
              </button>

              <button
                onClick={checkUser}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium disabled:opacity-50"
              >
                Check User Info
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            <pre className="text-sm bg-slate-950 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Known Test Account</h3>
          <p className="text-slate-300 mb-2">Email: info@greyalpha.co</p>
          <p className="text-slate-400 text-sm">
            Try different passwords to find the correct one, or use Supabase dashboard to reset it.
          </p>
        </div>
      </div>
    </div>
  );
}
