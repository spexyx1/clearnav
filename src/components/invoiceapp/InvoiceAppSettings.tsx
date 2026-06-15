import { useState, useEffect, useRef } from 'react';
import { Building2, CreditCard, FileText, Plus, Trash2, CreditCard as Edit2, Loader2, X, AlertCircle, CheckCircle, Save, Globe, Phone, Mail, Hash, Palette, Percent, Shield, Eye, EyeOff, Lock, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InvoiceSettings, CURRENCIES } from '../manager/invoicing/types';
import { InvoiceAppProfile, TermsTemplate } from './types';

interface Props {
  userId: string;
  profile: InvoiceAppProfile | null;
  onProfileUpdate: (p: InvoiceAppProfile) => void;
}

type Tab = 'business' | 'payment' | 'defaults' | 'terms' | 'security';

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

export default function InvoiceAppSettings({ userId, profile, onProfileUpdate }: Props) {
  const [tab, setTab] = useState<Tab>('business');
  const [settings, setSettings] = useState<Partial<InvoiceSettings>>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logo upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Terms templates
  const [templates, setTemplates] = useState<TermsTemplate[]>([]);
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TermsTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', body: '' });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);

  // Security (guest account protection)
  const [secPassword, setSecPassword] = useState('');
  const [secConfirm, setSecConfirm] = useState('');
  const [secShowPass, setSecShowPass] = useState(false);
  const [secSaving, setSecSaving] = useState(false);
  const [secSaved, setSecSaved] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [userId]);

  async function loadAll() {
    setLoading(true);
    const [settingsRes, templatesRes] = await Promise.all([
      supabase.from('invoice_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('invoice_terms_templates').select('*').eq('user_id', userId).order('name'),
    ]);
    if (settingsRes.data) {
      setSettingsId(settingsRes.data.id);
      setSettings(settingsRes.data as InvoiceSettings);
    }
    setTemplates(templatesRes.data ?? []);
    setLoading(false);
  }

  async function uploadLogo(file: File) {
    setLogoError(null);
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be under 2 MB.');
      return;
    }
    setLogoUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${userId}/logo.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('invoice-logos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setLogoError(upErr.message);
      setLogoUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('invoice-logos').getPublicUrl(path);
    // Bust cache so the new image shows immediately
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setField('logo_url', publicUrl);
    setLogoUploading(false);
  }

  function setField(k: keyof InvoiceSettings, v: string | number | null) {
    setSettings(prev => ({ ...prev, [k]: v }));
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = { ...settings, user_id: userId, tenant_id: null };

    let err: any;
    if (settingsId) {
      const res = await supabase
        .from('invoice_settings')
        .update(payload)
        .eq('id', settingsId);
      err = res.error;
    } else {
      const res = await supabase
        .from('invoice_settings')
        .insert(payload)
        .select()
        .single();
      err = res.error;
      if (!err && res.data) setSettingsId(res.data.id);
    }

    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm({ name: '', body: '' });
    setTemplateError(null);
    setTemplateModal(true);
  }

  function openEditTemplate(t: TermsTemplate) {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, body: t.body });
    setTemplateError(null);
    setTemplateModal(true);
  }

  async function saveTemplate() {
    if (!templateForm.name.trim()) { setTemplateError('Name is required.'); return; }
    if (!templateForm.body.trim()) { setTemplateError('Content is required.'); return; }
    setTemplateSaving(true);
    setTemplateError(null);

    const payload = {
      user_id: userId,
      name: templateForm.name.trim(),
      body: templateForm.body.trim(),
    };

    if (editingTemplate) {
      const { error: e } = await supabase
        .from('invoice_terms_templates')
        .update(payload)
        .eq('id', editingTemplate.id);
      if (e) { setTemplateError(e.message); setTemplateSaving(false); return; }
    } else {
      const { error: e } = await supabase
        .from('invoice_terms_templates')
        .insert(payload);
      if (e) { setTemplateError(e.message); setTemplateSaving(false); return; }
    }

    setTemplateSaving(false);
    setTemplateModal(false);
    const { data } = await supabase
      .from('invoice_terms_templates')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    setTemplates(data ?? []);
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    setDeletingTemplate(id);
    await supabase.from('invoice_terms_templates').delete().eq('id', id);
    setDeletingTemplate(null);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  async function secureAccount() {
    setSecError(null);
    if (secPassword.length < 8) { setSecError('Password must be at least 8 characters.'); return; }
    if (secPassword !== secConfirm) { setSecError('Passwords do not match.'); return; }
    if (!profile?.username) { setSecError('No username found on your account.'); return; }

    setSecSaving(true);

    const { data: fnData, error: fnErr } = await supabase.functions.invoke('invoice-app-auth', {
      body: { mode: 'secure_guest', password: secPassword },
    });

    if (fnErr) {
      let msg = 'Failed to secure account.';
      try {
        const body = await (fnErr as any).context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      setSecError(msg);
      setSecSaving(false);
      return;
    }

    if (fnData?.error) {
      setSecError(fnData.error);
      setSecSaving(false);
      return;
    }

    if (fnData?.profile) onProfileUpdate(fnData.profile as InvoiceAppProfile);

    // Update saved credentials so auto-sign-in on this device uses the new password
    try {
      const saved = localStorage.getItem('invoice_app_creds');
      if (saved) {
        const creds = JSON.parse(saved);
        localStorage.setItem('invoice_app_creds', JSON.stringify({
          ...creds,
          temp_password: secPassword,
        }));
      }
    } catch { /* ignore */ }

    setSecSaved(true);
    setSecPassword('');
    setSecConfirm('');
    setSecSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your business profile and invoice defaults</p>
      </div>

      {/* Tab strip */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        <TabButton label="Business" active={tab === 'business'} onClick={() => setTab('business')} />
        <TabButton label="Payment" active={tab === 'payment'} onClick={() => setTab('payment')} />
        <TabButton label="Defaults" active={tab === 'defaults'} onClick={() => setTab('defaults')} />
        <TabButton label="Terms Templates" active={tab === 'terms'} onClick={() => setTab('terms')} />
        {profile?.is_guest && (
          <TabButton label="Secure Account" active={tab === 'security'} onClick={() => setTab('security')} />
        )}
      </div>

      {tab !== 'terms' && tab !== 'security' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Business tab */}
          {tab === 'business' && (
            <div className="space-y-4">
              <SectionTitle icon={<Building2 className="w-4 h-4" />} title="Business Identity" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingField label="Business Name">
                  <input
                    value={settings.business_name ?? ''}
                    onChange={e => setField('business_name', e.target.value)}
                    placeholder="Your Company Name"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Tax / EIN / Corporate ID">
                  <input
                    value={settings.business_tax_id ?? ''}
                    onChange={e => setField('business_tax_id', e.target.value)}
                    placeholder="12-3456789"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Business Email">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={settings.business_email ?? ''}
                      onChange={e => setField('business_email', e.target.value)}
                      placeholder="billing@company.com"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </SettingField>
                <SettingField label="Business Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={settings.business_phone ?? ''}
                      onChange={e => setField('business_phone', e.target.value)}
                      placeholder="+1 555 000 0000"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </SettingField>
                <SettingField label="Website">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={settings.business_website ?? ''}
                      onChange={e => setField('business_website', e.target.value)}
                      placeholder="https://yourcompany.com"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </SettingField>
                <SettingField label="Logo">
                  <div className="space-y-2">
                    {/* Preview */}
                    {settings.logo_url ? (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <img
                          src={settings.logo_url}
                          alt="Business logo"
                          className="h-12 max-w-[160px] object-contain rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setField('logo_url', null)}
                          className="ml-auto p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove logo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
                        <div className="flex flex-col items-center gap-1">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-xs">No logo uploaded</span>
                        </div>
                      </div>
                    )}

                    {/* Upload button */}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) uploadLogo(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 w-full justify-center"
                    >
                      {logoUploading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Upload className="w-4 h-4" />
                      }
                      {logoUploading ? 'Uploading…' : settings.logo_url ? 'Replace Logo' : 'Upload Logo'}
                    </button>
                    {logoError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />{logoError}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">PNG, JPG, SVG or WebP — max 2 MB</p>
                  </div>
                </SettingField>
                <SettingField label="Accent Color">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.accent_color ?? '#2563eb'}
                      onChange={e => setField('accent_color', e.target.value)}
                      className="w-12 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      value={settings.accent_color ?? '#2563eb'}
                      onChange={e => setField('accent_color', e.target.value)}
                      placeholder="#2563eb"
                      className={`${inputCls} flex-1`}
                    />
                  </div>
                </SettingField>
                <SettingField label="Invoice Number Prefix">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={settings.number_prefix ?? ''}
                      onChange={e => setField('number_prefix', e.target.value)}
                      placeholder="INV-"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </SettingField>
              </div>

              <SectionTitle icon={<Building2 className="w-4 h-4" />} title="Business Address" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingField label="Address Line 1" className="sm:col-span-2">
                  <input
                    value={settings.business_address_line1 ?? ''}
                    onChange={e => setField('business_address_line1', e.target.value)}
                    placeholder="123 Main Street"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Address Line 2" className="sm:col-span-2">
                  <input
                    value={settings.business_address_line2 ?? ''}
                    onChange={e => setField('business_address_line2', e.target.value)}
                    placeholder="Suite 100"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="City">
                  <input
                    value={settings.business_city ?? ''}
                    onChange={e => setField('business_city', e.target.value)}
                    placeholder="New York"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="State / Province">
                  <input
                    value={settings.business_state ?? ''}
                    onChange={e => setField('business_state', e.target.value)}
                    placeholder="NY"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Zip / Postal Code">
                  <input
                    value={settings.business_zip ?? ''}
                    onChange={e => setField('business_zip', e.target.value)}
                    placeholder="10001"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Country">
                  <input
                    value={settings.business_country ?? ''}
                    onChange={e => setField('business_country', e.target.value)}
                    placeholder="United States"
                    className={inputCls}
                  />
                </SettingField>
              </div>
            </div>
          )}

          {/* Payment tab */}
          {tab === 'payment' && (
            <div className="space-y-4">
              <SectionTitle icon={<CreditCard className="w-4 h-4" />} title="Bank / ACH Details" />
              <p className="text-sm text-gray-500 -mt-2">
                These details appear on invoices so clients can pay via bank transfer or ACH.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingField label="Account Name">
                  <input
                    value={settings.bank_account_name ?? ''}
                    onChange={e => setField('bank_account_name', e.target.value)}
                    placeholder="Your Company Name"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Bank Name">
                  <input
                    value={settings.bank_name ?? ''}
                    onChange={e => setField('bank_name', e.target.value)}
                    placeholder="Chase Bank"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Account Number">
                  <input
                    value={settings.bank_account_number ?? ''}
                    onChange={e => setField('bank_account_number', e.target.value)}
                    placeholder="000123456789"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Routing Number (ACH)">
                  <input
                    value={settings.bank_routing_number ?? ''}
                    onChange={e => setField('bank_routing_number', e.target.value)}
                    placeholder="021000021"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="SWIFT / BIC">
                  <input
                    value={settings.bank_swift_bic ?? ''}
                    onChange={e => setField('bank_swift_bic', e.target.value)}
                    placeholder="CHASUS33"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="IBAN">
                  <input
                    value={settings.bank_iban ?? ''}
                    onChange={e => setField('bank_iban', e.target.value)}
                    placeholder="GB29NWBK60161331926819"
                    className={inputCls}
                  />
                </SettingField>
                <SettingField label="Extra Bank Instructions" className="sm:col-span-2">
                  <input
                    value={settings.bank_extra_instructions ?? ''}
                    onChange={e => setField('bank_extra_instructions', e.target.value)}
                    placeholder="Reference your invoice number when paying"
                    className={inputCls}
                  />
                </SettingField>
              </div>

              <SectionTitle icon={<FileText className="w-4 h-4" />} title="Payment Instructions" />
              <textarea
                value={settings.payment_instructions ?? ''}
                onChange={e => setField('payment_instructions', e.target.value)}
                rows={4}
                placeholder="Additional payment instructions shown on invoices..."
                className={`${inputCls} resize-none`}
              />
            </div>
          )}

          {/* Defaults tab */}
          {tab === 'defaults' && (
            <div className="space-y-4">
              <SectionTitle icon={<FileText className="w-4 h-4" />} title="Invoice Defaults" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingField label="Default Currency">
                  <select
                    value={settings.default_currency ?? 'USD'}
                    onChange={e => setField('default_currency', e.target.value)}
                    className={`${inputCls} bg-white`}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </SettingField>
                <SettingField label="Default Payment Terms (days)">
                  <div className="relative">
                    <input
                      type="number" min="0"
                      value={settings.default_due_days ?? 30}
                      onChange={e => setField('default_due_days', parseInt(e.target.value) || 0)}
                      className={inputCls}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">days</span>
                  </div>
                </SettingField>
                <SettingField label="Default Tax Rate (%)">
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number" min="0" max="100" step="any"
                      value={settings.default_tax_rate ?? 0}
                      onChange={e => setField('default_tax_rate', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </SettingField>
              </div>
              <SettingField label="Default Terms &amp; Conditions">
                <textarea
                  value={settings.default_terms ?? ''}
                  onChange={e => setField('default_terms', e.target.value)}
                  rows={4}
                  placeholder="Default terms and conditions..."
                  className={`${inputCls} resize-none`}
                />
              </SettingField>
              <SettingField label="Default Footer">
                <input
                  value={settings.default_footer ?? ''}
                  onChange={e => setField('default_footer', e.target.value)}
                  placeholder="Thank you for your business!"
                  className={inputCls}
                />
              </SettingField>
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>
        </div>
      )}

      {/* Terms Templates tab */}
      {tab === 'terms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Save reusable terms and conditions to quickly apply to invoices.
            </p>
            <button
              onClick={openCreateTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No templates yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Create reusable terms and conditions for your invoices
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-3 whitespace-pre-wrap">{t.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditTemplate(t)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        disabled={deletingTemplate === t.id}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                      >
                        {deletingTemplate === t.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security tab (guest users only) */}
      {tab === 'security' && profile?.is_guest && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 max-w-lg">
          {secSaved ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Account Secured</h3>
              <p className="text-sm text-gray-500">
                Your invoices are now protected with a password. Sign in with your username and password from any device.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base font-bold text-gray-900">Secure Your Account</h2>
                </div>
                <p className="text-sm text-gray-500">
                  Set a password to protect your invoices and access them from any device using your username.
                </p>
              </div>

              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500 mb-0.5">Your username</p>
                <p className="text-sm font-semibold text-gray-900">@{profile.username}</p>
              </div>

              {secError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {secError}
                </div>
              )}

              <div className="space-y-4">
                <SettingField label="New Password">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={secShowPass ? 'text' : 'password'}
                      value={secPassword}
                      onChange={e => setSecPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={`${inputCls} pl-9 pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setSecShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {secShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </SettingField>

                <SettingField label="Confirm Password">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={secShowPass ? 'text' : 'password'}
                      value={secConfirm}
                      onChange={e => setSecConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </SettingField>
              </div>

              <button
                onClick={secureAccount}
                disabled={secSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {secSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Set Password & Secure Account
              </button>
            </>
          )}
        </div>
      )}

      {/* Template modal */}
      {templateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Terms Template'}
              </h3>
              <button onClick={() => setTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {templateError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {templateError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Template Name *</label>
                <input
                  value={templateForm.name}
                  onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Standard Terms, Freelance Agreement"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Content *</label>
                <textarea
                  value={templateForm.body}
                  onChange={e => setTemplateForm(p => ({ ...p, body: e.target.value }))}
                  rows={8}
                  placeholder="Payment is due within 30 days of invoice date..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setTemplateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={templateSaving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {templateSaving
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : (editingTemplate ? 'Save Changes' : 'Create Template')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-700 pb-1 border-b border-gray-100">
      <div className="text-blue-600">{icon}</div>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

function SettingField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
