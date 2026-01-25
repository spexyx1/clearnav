import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface LoginPageProps {
  onBack: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await signIn(email, password);

    setLoading(false);

    if (signInError) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-sm"></div>
            <span className="text-2xl font-light tracking-wider text-white">GREY<span className="font-semibold">ALPHA</span></span>
          </div>

          <h2 className="text-2xl font-light text-white mb-2">
            Client <span className="font-semibold">Portal</span>
          </h2>
          <p className="text-slate-400 mb-8">
            Sign in to access your account and investment information.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded font-medium hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-sm text-slate-500 text-center">
              Need assistance? Contact us at{' '}
              <a href="mailto:support@greyalpha.co" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                support@greyalpha.co
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
