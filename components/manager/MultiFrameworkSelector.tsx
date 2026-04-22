import React, { useState, useEffect } from 'react';
import { Shield, Check, AlertCircle, Globe, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;

interface RegulatoryFramework {
  id: string;
  framework_code: string;
  framework_name: string;
  jurisdiction: string;
  regulatory_body: string;
  description: string;
  framework_type: string;
}

interface FrameworkSelection {
  framework_id: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  registration_status: string;
  exemption_type?: string;
  registration_number?: string;
  marketing_jurisdictions: string[];
}

interface MultiFrameworkSelectorProps {
  fundId?: string;
  tenantId: string;
  onSelectionChange?: (selections: FrameworkSelection[]) => void;
  initialSelections?: FrameworkSelection[];
}

export default function MultiFrameworkSelector({
  fundId,
  tenantId,
  onSelectionChange,
  initialSelections = []
}: MultiFrameworkSelectorProps) {
  const [frameworks, setFrameworks] = useState<RegulatoryFramework[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkSelection[]>(initialSelections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>('all');

  useEffect(() => {
    loadFrameworks();
    if (fundId) {
      loadExistingSelections();
    }
  }, [fundId]);

  const loadFrameworks = async () => {
    try {
      const { data, error } = await supabase
        .from('regulatory_frameworks')
        .select('*')
        .eq('is_active', true)
        .order('jurisdiction', { ascending: true });

      if (error) throw error;
      setFrameworks(data || []);
    } catch (error) {
      console.error('Error loading frameworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSelections = async () => {
    if (!fundId) return;

    try {
      const { data, error } = await supabase
        .from('regulatory_framework_fund_mappings')
        .select('*')
        .eq('fund_id', fundId);

      if (error) throw error;
      if (data && data.length > 0) {
        setSelectedFrameworks(data.map(d => ({
          framework_id: d.framework_id,
          priority: d.priority,
          registration_status: d.registration_status,
          exemption_type: d.exemption_type,
          registration_number: d.registration_number,
          marketing_jurisdictions: d.marketing_jurisdictions || []
        })));
      }
    } catch (error) {
      console.error('Error loading existing selections:', error);
    }
  };

  const isSelected = (frameworkId: string) => {
    return selectedFrameworks.some(s => s.framework_id === frameworkId);
  };

  const getSelectionPriority = (frameworkId: string): 'primary' | 'secondary' | 'tertiary' | null => {
    const selection = selectedFrameworks.find(s => s.framework_id === frameworkId);
    return selection ? selection.priority : null;
  };

  const toggleFramework = (framework: RegulatoryFramework) => {
    if (isSelected(framework.id)) {
      const updated = selectedFrameworks.filter(s => s.framework_id !== framework.id);
      setSelectedFrameworks(updated);
      onSelectionChange?.(updated);
    } else {
      const hasPrimary = selectedFrameworks.some(s => s.priority === 'primary');
      const newSelection: FrameworkSelection = {
        framework_id: framework.id,
        priority: hasPrimary ? 'secondary' : 'primary',
        registration_status: 'planning',
        marketing_jurisdictions: []
      };
      const updated = [...selectedFrameworks, newSelection];
      setSelectedFrameworks(updated);
      onSelectionChange?.(updated);
    }
  };

  const updatePriority = (frameworkId: string, priority: 'primary' | 'secondary' | 'tertiary') => {
    const updated = selectedFrameworks.map(s => {
      if (s.framework_id === frameworkId) {
        return { ...s, priority };
      }
      if (priority === 'primary' && s.priority === 'primary') {
        return { ...s, priority: 'secondary' as const };
      }
      return s;
    });
    setSelectedFrameworks(updated);
    onSelectionChange?.(updated);
  };

  const updateRegistrationStatus = (frameworkId: string, status: string) => {
    const updated = selectedFrameworks.map(s =>
      s.framework_id === frameworkId ? { ...s, registration_status: status } : s
    );
    setSelectedFrameworks(updated);
    onSelectionChange?.(updated);
  };

  const updateExemptionType = (frameworkId: string, exemptionType: string) => {
    const updated = selectedFrameworks.map(s =>
      s.framework_id === frameworkId ? { ...s, exemption_type: exemptionType } : s
    );
    setSelectedFrameworks(updated);
    onSelectionChange?.(updated);
  };

  const saveSelections = async () => {
    if (!fundId) return;

    setSaving(true);
    try {
      await supabase
        .from('regulatory_framework_fund_mappings')
        .delete()
        .eq('fund_id', fundId);

      const mappings = selectedFrameworks.map(s => ({
        tenant_id: tenantId,
        fund_id: fundId,
        framework_id: s.framework_id,
        priority: s.priority,
        registration_status: s.registration_status,
        exemption_type: s.exemption_type,
        registration_number: s.registration_number,
        marketing_jurisdictions: s.marketing_jurisdictions
      }));

      const { error } = await supabase
        .from('regulatory_framework_fund_mappings')
        .insert(mappings);

      if (error) throw error;
      alert('Framework selections saved successfully');
    } catch (error) {
      console.error('Error saving selections:', error);
      alert('Failed to save framework selections');
    } finally {
      setSaving(false);
    }
  };

  const jurisdictions = Array.from(new Set(frameworks.map(f => f.jurisdiction))).sort();

  const filteredFrameworks = filterJurisdiction === 'all'
    ? frameworks
    : frameworks.filter(f => f.jurisdiction === filterJurisdiction);

  const groupedFrameworks = filteredFrameworks.reduce((acc, framework) => {
    if (!acc[framework.jurisdiction]) {
      acc[framework.jurisdiction] = [];
    }
    acc[framework.jurisdiction].push(framework);
    return acc;
  }, {} as Record<string, RegulatoryFramework[]>);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'primary': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'secondary': return 'bg-green-100 text-green-800 border-green-300';
      case 'tertiary': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getFrameworkTypeIcon = (type: string) => {
    switch (type) {
      case 'securities_regulation': return <FileText className="h-4 w-4" />;
      case 'fund_regulation': return <Shield className="h-4 w-4" />;
      case 'tax_regulation': return <Globe className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
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
          <h2 className="text-2xl font-bold text-gray-900">Regulatory Framework Selection</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select all applicable regulatory frameworks for this fund. The primary framework determines
            the main compliance requirements.
          </p>
        </div>
        {fundId && (
          <button
            onClick={saveSelections}
            disabled={saving || selectedFrameworks.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Selections'}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Jurisdiction:</label>
            <select
              value={filterJurisdiction}
              onChange={(e) => setFilterJurisdiction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Jurisdictions</option>
              {jurisdictions.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            {selectedFrameworks.length} framework{selectedFrameworks.length !== 1 ? 's' : ''} selected
          </div>
        </div>

        {selectedFrameworks.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="font-medium text-sm text-blue-900 mb-2">Selected Frameworks:</div>
            <div className="flex flex-wrap gap-2">
              {selectedFrameworks.map(selection => {
                const framework = frameworks.find(f => f.id === selection.framework_id);
                if (!framework) return null;
                return (
                  <div
                    key={selection.framework_id}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selection.priority)}`}
                  >
                    {framework.framework_code} ({selection.priority})
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(groupedFrameworks).map(([jurisdiction, frameworkList]) => (
          <div key={jurisdiction} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{jurisdiction}</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {frameworkList.map(framework => {
                const selected = isSelected(framework.id);
                const priority = getSelectionPriority(framework.id);
                const isExpanded = expandedFramework === framework.id;

                return (
                  <div key={framework.id} className="hover:bg-gray-50 transition-colors">
                    <div className="p-4">
                      <div className="flex items-start space-x-4">
                        <button
                          onClick={() => toggleFramework(framework)}
                          className={`mt-1 flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 hover:border-blue-600'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {framework.framework_name}
                                </h4>
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                  {framework.framework_code}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {getFrameworkTypeIcon(framework.framework_type)}
                                  <span className="text-xs text-gray-500 capitalize">
                                    {framework.framework_type.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{framework.description}</p>
                              <p className="text-xs text-gray-500 mt-1">{framework.regulatory_body}</p>
                            </div>
                            {selected && (
                              <button
                                onClick={() => setExpandedFramework(isExpanded ? null : framework.id)}
                                className="ml-4 p-1 text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>

                          {selected && priority && (
                            <div className="mt-3 flex items-center space-x-4">
                              <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                  Priority:
                                </label>
                                <select
                                  value={priority}
                                  onChange={(e) => updatePriority(framework.id, e.target.value as any)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="primary">Primary</option>
                                  <option value="secondary">Secondary</option>
                                  <option value="tertiary">Tertiary</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                  Registration Status:
                                </label>
                                <select
                                  value={selectedFrameworks.find(s => s.framework_id === framework.id)?.registration_status || 'planning'}
                                  onChange={(e) => updateRegistrationStatus(framework.id, e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="planning">Planning</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="registered">Registered</option>
                                  <option value="exempt">Exempt</option>
                                </select>
                              </div>
                              {(framework.framework_code.includes('3C') || framework.framework_code.includes('REG')) && (
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Exemption Type:
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedFrameworks.find(s => s.framework_id === framework.id)?.exemption_type || ''}
                                    onChange={(e) => updateExemptionType(framework.id, e.target.value)}
                                    placeholder="e.g., 3(c)(7), Reg D 506(b)"
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent w-40"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {selected && isExpanded && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-3">
                              <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                  Registration Number:
                                </label>
                                <input
                                  type="text"
                                  placeholder="Enter registration number"
                                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                  Marketing Jurisdictions:
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., US, UK, DE, FR (comma-separated)"
                                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedFrameworks.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900">Compliance Requirements</h4>
              <p className="text-sm text-yellow-800 mt-1">
                Selected frameworks will aggregate compliance requirements. When rules conflict,
                the most restrictive rule from any applicable framework will apply. Review the
                compliance dashboard to see consolidated requirements.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
