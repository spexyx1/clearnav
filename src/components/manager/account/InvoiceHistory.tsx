import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Clock, XCircle, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  due_date: string;
  paid_at: string;
  items: any[];
  notes: string;
  created_at: string;
}

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!tenantUser) return;

      const { data } = await supabase
        .from('invoice_records')
        .select('*')
        .eq('tenant_id', tenantUser.tenant_id)
        .order('created_at', { ascending: false });

      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'refunded':
        return <XCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500 bg-opacity-10 text-green-400 border-green-500';
      case 'pending':
        return 'bg-yellow-500 bg-opacity-10 text-yellow-400 border-yellow-500';
      case 'failed':
        return 'bg-red-500 bg-opacity-10 text-red-400 border-red-500';
      case 'refunded':
        return 'bg-blue-500 bg-opacity-10 text-blue-400 border-blue-500';
      default:
        return 'bg-slate-500 bg-opacity-10 text-slate-400 border-slate-500';
    }
  };

  const getTotalAmount = () => {
    return invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Invoice History</h2>
        <p className="text-slate-400 text-sm">
          View and download your billing invoices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center space-x-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">Total Paid</span>
          </div>
          <p className="text-3xl font-bold text-white">
            ${getTotalAmount().toFixed(2)}
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400 text-sm">Total Invoices</span>
          </div>
          <p className="text-3xl font-bold text-white">{invoices.length}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center space-x-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-slate-400 text-sm">Pending</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {invoices.filter(inv => inv.status === 'pending').length}
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No invoices yet</h3>
          <p className="text-slate-400">
            Your billing invoices will appear here once generated
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">
                        {new Date(invoice.period_start).toLocaleDateString()} -{' '}
                        {new Date(invoice.period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white">
                        ${Number(invoice.amount).toFixed(2)} {invoice.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs border capitalize ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {getStatusIcon(invoice.status)}
                        <span>{invoice.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mr-3"
                      >
                        View
                      </button>
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Invoice Details</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Invoice Number</p>
                  <p className="text-white font-semibold">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Status</p>
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs border capitalize ${getStatusColor(
                      selectedInvoice.status
                    )}`}
                  >
                    {getStatusIcon(selectedInvoice.status)}
                    <span>{selectedInvoice.status}</span>
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Billing Period</p>
                  <p className="text-white">
                    {new Date(selectedInvoice.period_start).toLocaleDateString()} -{' '}
                    {new Date(selectedInvoice.period_end).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Due Date</p>
                  <p className="text-white">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Line Items</h3>
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {selectedInvoice.items.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-white">{item.description}</td>
                            <td className="px-4 py-3 text-sm text-white text-right">
                              ${Number(item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-slate-300 font-semibold">Total Amount</span>
                  <span className="text-white font-bold">
                    ${Number(selectedInvoice.amount).toFixed(2)} {selectedInvoice.currency}
                  </span>
                </div>
              </div>

              {selectedInvoice.paid_at && (
                <div className="bg-green-500 bg-opacity-10 border border-green-500 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-300 font-medium">
                      Paid on {new Date(selectedInvoice.paid_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {selectedInvoice.notes && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Notes</p>
                  <p className="text-white text-sm">{selectedInvoice.notes}</p>
                </div>
              )}

              {selectedInvoice.pdf_url && (
                <div className="flex justify-end">
                  <a
                    href={selectedInvoice.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download PDF</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
