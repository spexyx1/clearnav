import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, Edit, Trash2, Filter, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  lifecycle_stage: string;
  estimated_investment_amount?: number | null;
  created_at: string;
  staff_accounts?: {
    full_name: string;
  };
}

export default function ContactList() {
  const { staffAccount } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [stageFilter]);

  const loadContacts = async () => {
    setLoading(true);
    let query = supabase
      .from('crm_contacts')
      .select('id, full_name, email, phone, company, lifecycle_stage, estimated_investment_amount, created_at, staff_accounts!crm_contacts_assigned_to_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (stageFilter !== 'all') {
      query = query.eq('lifecycle_stage', stageFilter);
    }

    const { data } = await query;
    setContacts(data || []);
    setLoading(false);
  };

  const filteredContacts = contacts.filter(contact =>
    (contact.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStageColor = (stage: string): string => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      prospect: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      qualified: 'bg-green-500/20 text-green-300 border-green-500/30',
      onboarding: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      active_client: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      inactive: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return colors[stage] || colors.lead;
  };

  const createContact = async (contactData: any) => {
    await supabase.from('crm_contacts').insert({
      ...contactData,
      assigned_to: staffAccount?.id,
    });
    await loadContacts();
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Contact <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Manage leads, prospects, and client relationships</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Stages</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="qualified">Qualified</option>
          <option value="onboarding">Onboarding</option>
          <option value="active_client">Active Client</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Est. Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No contacts found. Click "Add Contact" to get started.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{contact.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{contact.email}</div>
                        {contact.phone && <div className="text-xs text-slate-500">{contact.phone}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{contact.company || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getStageColor(contact.lifecycle_stage)}`}>
                          {contact.lifecycle_stage.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">
                          {contact.estimated_investment_amount
                            ? `$${(contact.estimated_investment_amount / 1000).toFixed(0)}k`
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{contact.staff_accounts?.full_name || 'Unassigned'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                            <Phone className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
