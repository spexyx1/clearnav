import React, { useState, useEffect } from 'react';
import { Globe, DollarSign, FileText, Check, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface TaxJurisdiction {
  id: string;
  jurisdiction_code: string;
  jurisdiction_name: string;
  country_code: string;
  tax_system_type: string;
  has_tax_treaty_network: boolean;
  treaty_countries: string[];
  default_withholding_rates: Record<string, number>;
  allowed_tax_lot_methods: string[];
  crs_participating: boolean;
  fatca_participating: boolean;
}

interface FundTaxProfile {
  id?: string;
  fund_id: string;
  primary_tax_jurisdiction_id: string;
  additional_tax_jurisdictions: string[];
  tax_residence_countries: string[];
  tax_classification_by_jurisdiction: Record<string, string>;
  tax_transparency_status: string;
  fatca_status?: string;
  fatca_giin?: string;
  crs_reporting_status?: string;
  tax_optimization_enabled: boolean;
  default_tax_lot_method: string;
  loss_harvesting_enabled: boolean;
  wash_sale_tracking_enabled: boolean;
  treaty_benefit_optimization: boolean;
}

interface TaxJurisdictionManagerProps {
  fundId: string;
  tenantId: string;
}

export default function TaxJurisdictionManager({ fundId, tenantId }: TaxJurisdictionManagerProps) {
  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([]);
  const [taxProfile, setTaxProfile] = useState<FundTaxProfile>({
    fund_id: fundId,
    primary_tax_jurisdiction_id: '',
    additional_tax_jurisdictions: [],
    tax_residence_countries: [],
    tax_classification_by_jurisdiction: {},
    tax_transparency_status: 'pass_through',
    tax_optimization_enabled: true,
    default_tax_lot_method: 'FIFO',
    loss_harvesting_enabled: true,
    wash_sale_tracking_enabled: true,
    treaty_benefit_optimization: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'optimization' | 'reporting'>('basic');

  useEffect(() => {
    loadData();
  }, [fundId]);

  const loadData = async () => {
    try {
      const [jurisdictionsResult, profileResult] = await Promise.all([
        supabase.from('tax_jurisdictions').select('*').order('jurisdiction_name'),
        supabase.from('fund_tax_profiles').select('*').eq('fund_id', fundId).maybeSingle()
      ]);

      if (jurisdictionsResult.error) throw jurisdictionsResult.error;
      setJurisdictions(jurisdictionsResult.data || []);

      if (profileResult.data) {
        setTaxProfile(profileResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!taxProfile.primary_tax_jurisdiction_id) {
      alert('Please select a primary tax jurisdiction');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...taxProfile,
        tenant_id: tenantId,
        fund_id: fundId
      };

      if (taxProfile.id) {
        const { error } = await supabase
          .from('fund_tax_profiles')
          .update(dataToSave)
          .eq('id', taxProfile.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('fund_tax_profiles')
          .insert([dataToSave])
          .select()
          .single();
        if (error) throw error;
        setTaxProfile({ ...taxProfile, id: data.id });
      }

      alert('Tax profile saved successfully');
    } catch (error) {
      console.error('Error saving tax profile:', error);
      alert('Failed to save tax profile');
    } finally {
      setSaving(false);
    }
  };

  const getPrimaryJurisdiction = () => {
    return jurisdictions.find(j => j.id === taxProfile.primary_tax_jurisdiction_id);
  };

  const toggleAdditionalJurisdiction = (jurisdictionId: string) => {
    const updated = taxProfile.additional_tax_jurisdictions.includes(jurisdictionId)
      ? taxProfile.additional_tax_jurisdictions.filter(id => id !== jurisdictionId)
      : [...taxProfile.additional_tax_jurisdictions, jurisdictionId];
    setTaxProfile({ ...taxProfile, additional_tax_jurisdictions: updated });
  };

  const updateTaxClassification = (jurisdictionId: string, classification: string) => {
    setTaxProfile({
      ...taxProfile,
      tax_classification_by_jurisdiction: {
        ...taxProfile.tax_classification_by_jurisdiction,
        [jurisdictionId]: classification
      }
    });
  };

  const getTaxSystemBadgeColor = (type: string) => {
    switch (type) {
      case 'territorial': return 'bg-green-100 text-green-800';
      case 'worldwide': return 'bg-blue-100 text-blue-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tax Jurisdiction Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure fund tax residency, classifications, and optimization strategies
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !taxProfile.primary_tax_jurisdiction_id}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Tax Profile'}
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="h-4 w-4 inline mr-2" />
            Basic Configuration
          </button>
          <button
            onClick={() => setActiveTab('optimization')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'optimization'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Tax Optimization
          </button>
          <button
            onClick={() => setActiveTab('reporting')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reporting'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Reporting & Compliance
          </button>
        </nav>
      </div>

      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Tax Jurisdiction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Primary Tax Residence
                </label>
                <select
                  value={taxProfile.primary_tax_jurisdiction_id}
                  onChange={(e) => setTaxProfile({ ...taxProfile, primary_tax_jurisdiction_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a jurisdiction...</option>
                  {jurisdictions.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.jurisdiction_name} ({j.jurisdiction_code}) - {j.tax_system_type}
                    </option>
                  ))}
                </select>
              </div>

              {getPrimaryJurisdiction() && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900">
                        {getPrimaryJurisdiction()?.jurisdiction_name}
                      </h4>
                      <div className="mt-2 space-y-1 text-sm text-blue-800">
                        <p>Tax System: <span className="capitalize">{getPrimaryJurisdiction()?.tax_system_type.replace('_', ' ')}</span></p>
                        <p>Treaty Network: {getPrimaryJurisdiction()?.has_tax_treaty_network ? `Yes (${getPrimaryJurisdiction()?.treaty_countries.length} countries)` : 'No'}</p>
                        <p>FATCA Participating: {getPrimaryJurisdiction()?.fatca_participating ? 'Yes' : 'No'}</p>
                        <p>CRS Participating: {getPrimaryJurisdiction()?.crs_participating ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Transparency Status
                </label>
                <select
                  value={taxProfile.tax_transparency_status}
                  onChange={(e) => setTaxProfile({ ...taxProfile, tax_transparency_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pass_through">Pass-Through (Partnership/LLC)</option>
                  <option value="corporate">Corporate (C-Corp)</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="transparent">Transparent</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Pass-through entities typically don't pay entity-level tax; income flows to investors
                </p>
              </div>

              {taxProfile.primary_tax_jurisdiction_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Classification in {getPrimaryJurisdiction()?.jurisdiction_name}
                  </label>
                  <input
                    type="text"
                    value={taxProfile.tax_classification_by_jurisdiction[taxProfile.primary_tax_jurisdiction_id] || ''}
                    onChange={(e) => updateTaxClassification(taxProfile.primary_tax_jurisdiction_id, e.target.value)}
                    placeholder="e.g., RIC, Partnership, Corporation, Trust"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Tax Jurisdictions</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select additional jurisdictions where the fund has tax presence (PE, registration, etc.)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {jurisdictions
                .filter(j => j.id !== taxProfile.primary_tax_jurisdiction_id)
                .map(jurisdiction => {
                  const isSelected = taxProfile.additional_tax_jurisdictions.includes(jurisdiction.id);
                  return (
                    <button
                      key={jurisdiction.id}
                      onClick={() => toggleAdditionalJurisdiction(jurisdiction.id)}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {jurisdiction.jurisdiction_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {jurisdiction.jurisdiction_code}
                          </div>
                          <div className={`inline-block px-2 py-0.5 text-xs rounded mt-2 ${getTaxSystemBadgeColor(jurisdiction.tax_system_type)}`}>
                            {jurisdiction.tax_system_type}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'optimization' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Lot Method</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Tax Lot Method
                </label>
                <select
                  value={taxProfile.default_tax_lot_method}
                  onChange={(e) => setTaxProfile({ ...taxProfile, default_tax_lot_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="FIFO">First In, First Out (FIFO)</option>
                  <option value="LIFO">Last In, First Out (LIFO)</option>
                  <option value="HIFO">Highest In, First Out (HIFO)</option>
                  <option value="SPECIFIC_ID">Specific Identification</option>
                  <option value="AVERAGE_COST">Average Cost</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Different jurisdictions allow different methods. The system will automatically apply jurisdiction-specific rules.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Strategies</h3>
            <div className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxProfile.tax_optimization_enabled}
                  onChange={(e) => setTaxProfile({ ...taxProfile, tax_optimization_enabled: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Enable Tax Optimization</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Automatically optimize tax lot selection to minimize tax liability
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxProfile.loss_harvesting_enabled}
                  onChange={(e) => setTaxProfile({ ...taxProfile, loss_harvesting_enabled: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Tax Loss Harvesting</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Automatically identify and realize losses to offset gains
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxProfile.wash_sale_tracking_enabled}
                  onChange={(e) => setTaxProfile({ ...taxProfile, wash_sale_tracking_enabled: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Wash Sale Rule Tracking</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Track wash sales (US: 30 days, UK: 30 days, etc.) to prevent disallowed losses
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxProfile.treaty_benefit_optimization}
                  onChange={(e) => setTaxProfile({ ...taxProfile, treaty_benefit_optimization: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Treaty Benefit Optimization</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Automatically apply tax treaty benefits to reduce withholding taxes
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reporting' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">FATCA Reporting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FATCA Status
                </label>
                <input
                  type="text"
                  value={taxProfile.fatca_status || ''}
                  onChange={(e) => setTaxProfile({ ...taxProfile, fatca_status: e.target.value })}
                  placeholder="e.g., Reporting Model 1 FFI, Participating FFI"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FATCA GIIN
                </label>
                <input
                  type="text"
                  value={taxProfile.fatca_giin || ''}
                  onChange={(e) => setTaxProfile({ ...taxProfile, fatca_giin: e.target.value })}
                  placeholder="Global Intermediary Identification Number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CRS Reporting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CRS Reporting Status
                </label>
                <input
                  type="text"
                  value={taxProfile.crs_reporting_status || ''}
                  onChange={(e) => setTaxProfile({ ...taxProfile, crs_reporting_status: e.target.value })}
                  placeholder="e.g., Reporting Financial Institution"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900">Tax Reporting Requirements</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Based on your jurisdiction selections, you may be required to file tax returns and
                  reports in multiple countries. The system will generate jurisdiction-specific tax
                  documents automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
