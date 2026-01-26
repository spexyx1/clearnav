import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Building2, Scale, FileText, Briefcase, DollarSign, Users, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuestionnaireData {
  organizationType: string;
  organizationTypeOther?: string;
  accountingStandards: string[];
  requiresPerformanceLetters: boolean;
  performanceLetterFrequency?: string;
  investmentComplexity: string;
  hasIlliquidInvestments: boolean;
  structureTypes: string[];
  entityJurisdictions: string[];
  aumRange: string;
  numberOfInvestors: string;
  regulatoryStatus: string[];
  requiresConsolidatedReporting: boolean;
  reportingCurrencies: string[];
  customRequirements: string;
}

interface TenantQuestionnaireProps {
  tenantId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function TenantQuestionnaire({ tenantId, onComplete, onSkip }: TenantQuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuestionnaireData>({
    organizationType: '',
    accountingStandards: [],
    requiresPerformanceLetters: false,
    investmentComplexity: '',
    hasIlliquidInvestments: false,
    structureTypes: [],
    entityJurisdictions: [],
    aumRange: '',
    numberOfInvestors: '',
    regulatoryStatus: [],
    requiresConsolidatedReporting: false,
    reportingCurrencies: ['USD'],
    customRequirements: '',
  });

  const totalSteps = 5;

  const toggleArrayItem = (field: keyof QuestionnaireData, value: string) => {
    setFormData((prev) => {
      const currentArray = (prev[field] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: saveError } = await supabase.from('tenant_profiles').upsert({
        tenant_id: tenantId,
        organization_type: formData.organizationType,
        organization_type_other: formData.organizationTypeOther,
        accounting_standards: formData.accountingStandards,
        requires_performance_letters: formData.requiresPerformanceLetters,
        performance_letter_frequency: formData.performanceLetterFrequency,
        investment_complexity: formData.investmentComplexity,
        has_illiquid_investments: formData.hasIlliquidInvestments,
        structure_types: formData.structureTypes,
        entity_jurisdictions: formData.entityJurisdictions,
        aum_range: formData.aumRange,
        number_of_investors: formData.numberOfInvestors,
        regulatory_status: formData.regulatoryStatus,
        requires_consolidated_reporting: formData.requiresConsolidatedReporting,
        reporting_currencies: formData.reportingCurrencies,
        custom_requirements: formData.customRequirements,
        completed_at: new Date().toISOString(),
      });

      if (saveError) throw saveError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tenant_users')
          .update({ onboarding_status: 'completed' })
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId);
      }

      onComplete();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.organizationType &&
          (formData.organizationType !== 'other' || formData.organizationTypeOther);
      case 2:
        return formData.accountingStandards.length > 0;
      case 3:
        return formData.investmentComplexity;
      case 4:
        return formData.aumRange && formData.numberOfInvestors;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900">Complete Your Profile</h1>
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-slate-600 hover:text-slate-900 text-sm font-medium"
              >
                Skip for now
              </button>
            )}
          </div>
          <p className="text-slate-600">
            Help us tailor ClearNav to your specific needs and requirements
          </p>

          <div className="mt-6 flex items-center space-x-2">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full transition-all ${
                  idx + 1 <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Step {step} of {totalSteps}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Organization Type</h2>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'institutional_fund', label: 'Institutional Fund' },
                  { value: 'private_equity', label: 'Private Equity' },
                  { value: 'family_office', label: 'Family Office' },
                  { value: 'hedge_fund', label: 'Hedge Fund' },
                  { value: 'venture_capital', label: 'Venture Capital' },
                  { value: 'other', label: 'Other' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.organizationType === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="organizationType"
                      value={option.value}
                      checked={formData.organizationType === option.value}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, organizationType: e.target.value }))
                      }
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="ml-3 text-slate-700 font-medium">{option.label}</span>
                  </label>
                ))}
              </div>

              {formData.organizationType === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Please specify
                  </label>
                  <input
                    type="text"
                    value={formData.organizationTypeOther || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, organizationTypeOther: e.target.value }))
                    }
                    placeholder="Enter organization type"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Scale className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Accounting & Reporting</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Accounting Standards (select all that apply)
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'gaap', label: 'US GAAP' },
                    { value: 'ifrs', label: 'IFRS' },
                    { value: 'both', label: 'Both GAAP and IFRS' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.accountingStandards.includes(option.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.accountingStandards.includes(option.value)}
                        onChange={() => toggleArrayItem('accountingStandards', option.value)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="ml-3 text-slate-700 font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all border-slate-200 hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.requiresPerformanceLetters}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, requiresPerformanceLetters: e.target.checked }))
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-slate-700 font-medium">
                    Requires Performance Letters
                  </span>
                </label>
              </div>

              {formData.requiresPerformanceLetters && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Performance Letter Frequency
                  </label>
                  <select
                    value={formData.performanceLetterFrequency || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, performanceLetterFrequency: e.target.value }))
                    }
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Reporting Currencies (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD'].map((currency) => (
                    <label
                      key={currency}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.reportingCurrencies.includes(currency)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.reportingCurrencies.includes(currency)}
                        onChange={() => toggleArrayItem('reportingCurrencies', currency)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-slate-700 font-medium">{currency}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Investment Profile</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Investment Complexity
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'simple', label: 'Simple', desc: 'Stocks, bonds, basic derivatives' },
                    { value: 'moderate', label: 'Moderate', desc: 'Multi-asset portfolios, options' },
                    { value: 'complex', label: 'Complex', desc: 'Structured products, OTC derivatives' },
                    { value: 'highly_complex', label: 'Highly Complex', desc: 'Exotic derivatives, private markets' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.investmentComplexity === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="investmentComplexity"
                        value={option.value}
                        checked={formData.investmentComplexity === option.value}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, investmentComplexity: e.target.value }))
                        }
                        className="w-5 h-5 text-blue-600 mt-0.5"
                      />
                      <div className="ml-3">
                        <div className="text-slate-900 font-medium">{option.label}</div>
                        <div className="text-sm text-slate-500">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all border-slate-200 hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.hasIlliquidInvestments}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, hasIlliquidInvestments: e.target.checked }))
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-slate-700 font-medium">
                    Has Illiquid Investments
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Structure Types (select all that apply)
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'master_feeder', label: 'Master-Feeder' },
                    { value: 'parallel_funds', label: 'Parallel Funds' },
                    { value: 'side_pockets', label: 'Side Pockets' },
                    { value: 'spvs', label: 'Special Purpose Vehicles (SPVs)' },
                    { value: 'blocker_corps', label: 'Blocker Corporations' },
                    { value: 'single_entity', label: 'Single Entity' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.structureTypes.includes(option.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.structureTypes.includes(option.value)}
                        onChange={() => toggleArrayItem('structureTypes', option.value)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="ml-3 text-slate-700 font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Entity Jurisdictions (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'us', label: 'United States' },
                    { value: 'delaware', label: 'Delaware' },
                    { value: 'cayman', label: 'Cayman Islands' },
                    { value: 'bvi', label: 'British Virgin Islands' },
                    { value: 'luxembourg', label: 'Luxembourg' },
                    { value: 'ireland', label: 'Ireland' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.entityJurisdictions.includes(option.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.entityJurisdictions.includes(option.value)}
                        onChange={() => toggleArrayItem('entityJurisdictions', option.value)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-slate-700 text-sm font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Fund Size & Compliance</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Assets Under Management (AUM)
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'under_10m', label: 'Under $10M' },
                    { value: '10m_50m', label: '$10M - $50M' },
                    { value: '50m_100m', label: '$50M - $100M' },
                    { value: '100m_500m', label: '$100M - $500M' },
                    { value: '500m_1b', label: '$500M - $1B' },
                    { value: 'over_1b', label: 'Over $1B' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.aumRange === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="aumRange"
                        value={option.value}
                        checked={formData.aumRange === option.value}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, aumRange: e.target.value }))
                        }
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ml-3 text-slate-700 font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Number of Investors
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'under_10', label: 'Under 10' },
                    { value: '10_50', label: '10 - 50' },
                    { value: '50_100', label: '50 - 100' },
                    { value: '100_500', label: '100 - 500' },
                    { value: 'over_500', label: 'Over 500' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.numberOfInvestors === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="numberOfInvestors"
                        value={option.value}
                        checked={formData.numberOfInvestors === option.value}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, numberOfInvestors: e.target.value }))
                        }
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ml-3 text-slate-700 font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Regulatory Status (select all that apply)
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'sec_registered', label: 'SEC Registered' },
                    { value: 'cftc_registered', label: 'CFTC Registered' },
                    { value: 'exempt', label: 'Exempt' },
                    { value: 'international', label: 'International (Non-US)' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.regulatoryStatus.includes(option.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.regulatoryStatus.includes(option.value)}
                        onChange={() => toggleArrayItem('regulatoryStatus', option.value)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="ml-3 text-slate-700 font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all border-slate-200 hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.requiresConsolidatedReporting}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, requiresConsolidatedReporting: e.target.checked }))
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-slate-700 font-medium">
                    Requires Consolidated Reporting
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Additional Requirements</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Custom Requirements or Special Needs
                </label>
                <textarea
                  value={formData.customRequirements}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customRequirements: e.target.value }))
                  }
                  placeholder="Tell us about any specific requirements, integrations, or features you need..."
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">What happens next?</h3>
                    <ul className="text-sm text-slate-700 space-y-2">
                      <li>• Your profile will be reviewed by our team</li>
                      <li>• We'll configure ClearNav to match your requirements</li>
                      <li>• You'll receive personalized onboarding support</li>
                      <li>• Custom features can be enabled based on your needs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-slate-100">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center space-x-2 px-6 py-3 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Previous</span>
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Profile</span>
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
