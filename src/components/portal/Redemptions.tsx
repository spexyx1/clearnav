import { useEffect, useState } from 'react';
import { ArrowDownCircle, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface RedemptionsProps {
  profile: any;
}

export default function Redemptions({ profile }: RedemptionsProps) {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    redemption_type: 'partial' as 'partial' | 'full',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadRedemptions();
    }
  }, [user]);

  const loadRedemptions = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('redemption_requests')
      .select('*')
      .eq('client_id', user?.id)
      .order('requested_date', { ascending: false });

    setRedemptions(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const amount = parseFloat(formData.amount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      setSubmitting(false);
      return;
    }

    if (formData.redemption_type === 'partial' && profile && amount > profile.current_value) {
      setError('Redemption amount cannot exceed current portfolio value');
      setSubmitting(false);
      return;
    }

    const { error: submitError } = await supabase
      .from('redemption_requests')
      .insert([{
        client_id: user?.id,
        amount,
        redemption_type: formData.redemption_type,
        reason: formData.reason || null
      }]);

    setSubmitting(false);

    if (submitError) {
      setError('Failed to submit redemption request. Please try again.');
      return;
    }

    setShowForm(false);
    setFormData({ amount: '', redemption_type: 'partial', reason: '' });
    loadRedemptions();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'approved':
        return <AlertCircle className="w-5 h-5 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      approved: { label: 'Approved', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light text-white">
          Redemption <span className="font-semibold">Requests</span>
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded font-medium hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 flex items-center space-x-2"
        >
          <ArrowDownCircle className="w-5 h-5" />
          <span>New Redemption Request</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Request Redemption</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Redemption Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, redemption_type: 'partial' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.redemption_type === 'partial'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-white font-medium">Partial Redemption</div>
                  <div className="text-sm text-slate-400 mt-1">Withdraw a specific amount</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, redemption_type: 'full' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.redemption_type === 'full'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-white font-medium">Full Redemption</div>
                  <div className="text-sm text-slate-400 mt-1">Close entire position</div>
                </button>
              </div>
            </div>

            {formData.redemption_type === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  max={profile?.current_value || undefined}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="0.00"
                />
                {profile && (
                  <div className="mt-2 text-sm text-slate-400">
                    Available: ${profile.current_value.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                placeholder="Please provide any additional details..."
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded font-medium hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 border border-slate-700 text-white rounded font-medium hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Request History</h3>

        {redemptions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No redemption requests found
          </div>
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">{getStatusIcon(redemption.status)}</div>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-semibold text-white text-lg">
                          ${redemption.amount.toLocaleString()}
                        </span>
                        {getStatusBadge(redemption.status)}
                      </div>
                      <div className="text-sm text-slate-400">
                        {redemption.redemption_type === 'full' ? 'Full' : 'Partial'} Redemption
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    {new Date(redemption.requested_date).toLocaleDateString()}
                  </div>
                </div>

                {redemption.reason && (
                  <div className="mt-3 p-3 bg-slate-900/50 rounded text-sm text-slate-300">
                    {redemption.reason}
                  </div>
                )}

                {redemption.notes && (
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
                    <strong>Note:</strong> {redemption.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
