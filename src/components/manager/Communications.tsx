import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Send, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Communications() {
  const [communications, setCommunications] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [commRes, templatesRes] = await Promise.all([
      supabase.from('communication_log').select('*').order('sent_at', { ascending: false }).limit(50),
      supabase.from('email_templates').select('*').eq('is_active', true),
    ]);
    setCommunications(commRes.data || []);
    setTemplates(templatesRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          Communications <span className="font-semibold">Center</span>
        </h2>
        <p className="text-slate-400">Email and SMS communications with contacts and clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="p-6 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg text-left hover:shadow-lg transition-all">
          <Mail className="w-8 h-8 text-white mb-3" />
          <div className="text-white font-semibold text-lg">Send Email</div>
          <div className="text-blue-100 text-sm mt-1">Compose and send emails</div>
        </button>

        <button className="p-6 bg-gradient-to-br from-green-600 to-teal-600 rounded-lg text-left hover:shadow-lg transition-all">
          <MessageSquare className="w-8 h-8 text-white mb-3" />
          <div className="text-white font-semibold text-lg">Send SMS</div>
          <div className="text-green-100 text-sm mt-1">Send text messages</div>
        </button>

        <button className="p-6 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg text-left hover:shadow-lg transition-all">
          <FileText className="w-8 h-8 text-white mb-3" />
          <div className="text-white font-semibold text-lg">Templates</div>
          <div className="text-orange-100 text-sm mt-1">{templates.length} templates</div>
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Communications</h3>
        <div className="space-y-3">
          {communications.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Send className="w-8 h-8 mx-auto mb-2" />
              No communications sent yet
            </div>
          ) : (
            communications.map((comm) => (
              <div key={comm.id} className="p-4 bg-slate-800/50 rounded border border-slate-700/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {comm.channel === 'email' ? (
                        <Mail className="w-4 h-4 text-blue-400" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-green-400" />
                      )}
                      <span className="text-white font-medium">{comm.subject || 'SMS Message'}</span>
                    </div>
                    <div className="text-sm text-slate-400">To: {comm.to_address}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Status: <span className="capitalize">{comm.status}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(comm.sent_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
