import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Clock, FileText } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;

interface ComplianceMonitoring {
  id: string;
  fund_id: string;
  framework_id: string;
  monitoring_date: string;
  overall_status: string;
  diversification_status: string;
  leverage_status: string;
  concentration_status: string;
  investor_qualification_status: string;
  restriction_violations: any[];
  breach_details: any[];
  remediation_actions: any[];
  last_checked_at: string;
  next_check_date: string;
}

interface RegulatoryFramework {
  id: string;
  framework_code: string;
  framework_name: string;
  jurisdiction: string;
}

interface FrameworkComplianceAlertsProps {
  fundId: string;
  tenantId: string;
}

export default function FrameworkComplianceAlerts({ fundId, tenantId }: FrameworkComplianceAlertsProps) {
  const [complianceData, setComplianceData] = useState<ComplianceMonitoring[]>([]);
  const [frameworks, setFrameworks] = useState<Record<string, RegulatoryFramework>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadComplianceData();
  }, [fundId]);

  const loadComplianceData = async () => {
    try {
      const [complianceResult, frameworksResult] = await Promise.all([
        supabase
          .from('compliance_monitoring')
          .select('*')
          .eq('fund_id', fundId)
          .order('monitoring_date', { ascending: false }),
        supabase
          .from('regulatory_frameworks')
          .select('*')
      ]);

      if (complianceResult.error) throw complianceResult.error;
      if (frameworksResult.error) throw frameworksResult.error;

      setComplianceData(complianceResult.data || []);

      const frameworkMap: Record<string, RegulatoryFramework> = {};
      (frameworksResult.data || []).forEach(f => {
        frameworkMap[f.id] = f;
      });
      setFrameworks(frameworkMap);
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'breach':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'breach':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'breach':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = filterStatus === 'all'
    ? complianceData
    : complianceData.filter(d => d.overall_status === filterStatus);

  const overallSummary = {
    total: complianceData.length,
    compliant: complianceData.filter(d => d.overall_status === 'compliant').length,
    warning: complianceData.filter(d => d.overall_status === 'warning').length,
    breach: complianceData.filter(d => d.overall_status === 'breach').length,
    under_review: complianceData.filter(d => d.overall_status === 'under_review').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (complianceData.length === 0) {
    return (
      <div className="text-center p-8 bg-white border border-gray-200 rounded-lg">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Compliance Data</h3>
        <p className="mt-1 text-sm text-gray-500">
          Compliance monitoring data will appear here once frameworks are configured and checks are run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Multi-Framework Compliance Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time compliance status across all regulatory frameworks
          </p>
        </div>
        <button
          onClick={loadComplianceData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Frameworks</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overallSummary.total}</p>
            </div>
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Compliant</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{overallSummary.compliant}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Warnings</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{overallSummary.warning}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Breaches</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{overallSummary.breach}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="compliant">Compliant</option>
            <option value="warning">Warning</option>
            <option value="breach">Breach</option>
            <option value="under_review">Under Review</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredData.map((compliance) => {
          const framework = frameworks[compliance.framework_id];
          if (!framework) return null;

          return (
            <div
              key={compliance.id}
              className={`border-2 rounded-lg overflow-hidden ${getStatusColor(compliance.overall_status)}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(compliance.overall_status)}
                    <div>
                      <h3 className="font-semibold text-lg">{framework.framework_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-600">{framework.framework_code}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">{framework.jurisdiction}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(compliance.overall_status)}`}>
                      {compliance.overall_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Diversification</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(compliance.diversification_status)}
                      <span className="text-sm font-medium capitalize">{compliance.diversification_status}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Leverage</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(compliance.leverage_status)}
                      <span className="text-sm font-medium capitalize">{compliance.leverage_status}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Concentration</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(compliance.concentration_status)}
                      <span className="text-sm font-medium capitalize">{compliance.concentration_status}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Investor Qualification</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(compliance.investor_qualification_status)}
                      <span className="text-sm font-medium capitalize">{compliance.investor_qualification_status}</span>
                    </div>
                  </div>
                </div>

                {compliance.breach_details && compliance.breach_details.length > 0 && (
                  <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-3">
                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                      <XCircle className="h-4 w-4 mr-2" />
                      Breach Details ({compliance.breach_details.length})
                    </h4>
                    <ul className="space-y-1">
                      {compliance.breach_details.slice(0, 3).map((breach: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          • {breach.description || breach.rule || 'Compliance breach detected'}
                        </li>
                      ))}
                      {compliance.breach_details.length > 3 && (
                        <li className="text-sm text-gray-600">
                          + {compliance.breach_details.length - 3} more breaches
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {compliance.remediation_actions && compliance.remediation_actions.length > 0 && (
                  <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-3">
                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Remediation Actions ({compliance.remediation_actions.length})
                    </h4>
                    <ul className="space-y-1">
                      {compliance.remediation_actions.slice(0, 3).map((action: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          • {action.action || action.description || 'Remediation required'}
                        </li>
                      ))}
                      {compliance.remediation_actions.length > 3 && (
                        <li className="text-sm text-gray-600">
                          + {compliance.remediation_actions.length - 3} more actions
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-current border-opacity-20">
                  <div className="flex items-center space-x-4">
                    <span>
                      Last Checked: {new Date(compliance.last_checked_at).toLocaleString()}
                    </span>
                    {compliance.next_check_date && (
                      <span>
                        Next Check: {new Date(compliance.next_check_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {overallSummary.breach > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900">Critical Compliance Breaches Detected</h4>
              <p className="text-sm text-red-800 mt-1">
                You have {overallSummary.breach} framework{overallSummary.breach !== 1 ? 's' : ''} with compliance breaches.
                Immediate action is required to remediate these issues. Failure to address breaches may result
                in regulatory penalties or loss of registration status.
              </p>
              <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Generate Remediation Report
              </button>
            </div>
          </div>
        </div>
      )}

      {overallSummary.warning > 0 && overallSummary.breach === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900">Compliance Warnings</h4>
              <p className="text-sm text-yellow-800 mt-1">
                You have {overallSummary.warning} framework{overallSummary.warning !== 1 ? 's' : ''} with warnings.
                While not critical, these should be addressed to maintain optimal compliance status.
              </p>
            </div>
          </div>
        </div>
      )}

      {overallSummary.total > 0 && overallSummary.breach === 0 && overallSummary.warning === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-900">Full Compliance Achieved</h4>
              <p className="text-sm text-green-800 mt-1">
                Congratulations! All {overallSummary.total} regulatory framework{overallSummary.total !== 1 ? 's are' : ' is'} in full compliance.
                Continue monitoring to maintain this status.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
