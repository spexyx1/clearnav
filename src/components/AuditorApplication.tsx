import { useState } from 'react';
import { Building2, User, Award, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FormData {
  firmName: string;
  registrationNumber: string;
  jurisdiction: string;
  website: string;
  yearsInOperation: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  professionalTitle: string;
  specializations: string[];
  yearsOfExperience: string;
  certificationsHeld: Array<{ name: string; issuer: string; number: string }>;
  methodologyDescription: string;
  motivationStatement: string;
  password: string;
  confirmPassword: string;
  feeAcknowledged: boolean;
  examAcknowledged: boolean;
  standardsAcknowledged: boolean;
}

const SPECIALIZATIONS = [
  'Fund Valuation',
  'Share Price Verification',
  'NAV Auditing',
  'Compliance Review',
  'Financial Statement Audit',
  'Forensic Analysis',
];

const JURISDICTIONS = [
  'United States',
  'United Kingdom',
  'European Union',
  'Canada',
  'Australia',
  'Singapore',
  'Hong Kong',
  'Switzerland',
  'Other',
];

export default function AuditorApplication() {
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firmName: '',
    registrationNumber: '',
    jurisdiction: '',
    website: '',
    yearsInOperation: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    professionalTitle: '',
    specializations: [],
    yearsOfExperience: '',
    certificationsHeld: [{ name: '', issuer: '', number: '' }],
    methodologyDescription: '',
    motivationStatement: '',
    password: '',
    confirmPassword: '',
    feeAcknowledged: false,
    examAcknowledged: false,
    standardsAcknowledged: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certificationsHeld: [...prev.certificationsHeld, { name: '', issuer: '', number: '' }],
    }));
  };

  const updateCertification = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      certificationsHeld: prev.certificationsHeld.map((cert, i) =>
        i === index ? { ...cert, [field]: value } : cert
      ),
    }));
  };

  const removeCertification = (index: number) => {
    if (formData.certificationsHeld.length > 1) {
      setFormData(prev => ({
        ...prev,
        certificationsHeld: prev.certificationsHeld.filter((_, i) => i !== index),
      }));
    }
  };

  const validateSection = (section: number): boolean => {
    switch (section) {
      case 1:
        return !!(
          formData.firmName &&
          formData.jurisdiction &&
          formData.yearsInOperation &&
          parseInt(formData.yearsInOperation) > 0
        );
      case 2:
        return !!(
          formData.contactName &&
          formData.contactEmail &&
          formData.contactEmail.includes('@') &&
          formData.professionalTitle
        );
      case 3:
        return !!(
          formData.specializations.length > 0 &&
          formData.yearsOfExperience &&
          parseInt(formData.yearsOfExperience) > 0 &&
          formData.certificationsHeld.some(c => c.name && c.issuer) &&
          formData.methodologyDescription &&
          formData.methodologyDescription.length >= 50
        );
      case 4:
        return !!(
          formData.motivationStatement &&
          formData.motivationStatement.length >= 100 &&
          formData.feeAcknowledged &&
          formData.examAcknowledged &&
          formData.standardsAcknowledged
        );
      case 5:
        return !!(
          formData.password &&
          formData.password.length >= 8 &&
          formData.password === formData.confirmPassword
        );
      default:
        return true;
    }
  };

  const nextSection = () => {
    if (validateSection(currentSection)) {
      setCurrentSection(prev => Math.min(prev + 1, 5));
      setError(null);
    } else {
      setError('Please complete all required fields in this section');
    }
  };

  const prevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateSection(5)) {
      setError('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.contactEmail,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      // Insert application
      const { data: applicationData, error: applicationError } = await supabase
        .from('auditor_applications')
        .insert({
          user_id: authData.user.id,
          firm_name: formData.firmName,
          registration_number: formData.registrationNumber || null,
          jurisdiction: formData.jurisdiction,
          website: formData.website || null,
          years_in_operation: parseInt(formData.yearsInOperation),
          contact_name: formData.contactName,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone || null,
          professional_title: formData.professionalTitle,
          specializations: formData.specializations,
          years_of_experience: parseInt(formData.yearsOfExperience),
          certifications_held: formData.certificationsHeld.filter(c => c.name && c.issuer),
          methodology_description: formData.methodologyDescription,
          motivation_statement: formData.motivationStatement,
          fee_acknowledged: formData.feeAcknowledged,
          exam_acknowledged: formData.examAcknowledged,
          standards_acknowledged: formData.standardsAcknowledged,
          status: 'submitted',
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      // Insert user role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        email: formData.contactEmail,
        role_category: 'auditor',
        role_detail: null,
        tenant_id: null,
        status: 'inactive',
      });

      if (roleError) throw roleError;

      setApplicationId(applicationData.id);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-teal-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white">Application Submitted Successfully</h1>

            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
              <p className="text-slate-300 mb-4">
                Thank you for applying to become a certified ClearNav exchange auditor. Your application has been received and assigned reference number:
              </p>
              <div className="bg-slate-800 border border-teal-500/30 rounded px-4 py-3 mb-4">
                <p className="text-teal-400 font-mono text-lg">{applicationId?.substring(0, 8).toUpperCase()}</p>
              </div>
              <p className="text-sm text-slate-400">
                Please save this reference number for your records.
              </p>
            </div>

            <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-6 text-left space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                Next Steps
              </h2>
              <ol className="space-y-3 text-slate-300 list-decimal list-inside">
                <li>
                  <strong className="text-white">Application Review</strong> - Our platform team will review your application within 3-5 business days
                </li>
                <li>
                  <strong className="text-white">Certification Exam</strong> - Upon approval, you will receive an invitation to take the certification exam
                </li>
                <li>
                  <strong className="text-white">Fee Enrollment</strong> - Set up your annual certification fee billing ($2,500/year, billed monthly at ~$208.34/month)
                </li>
                <li>
                  <strong className="text-white">Approval & Portal Access</strong> - Once approved, you will gain access to the Auditor Portal to manage assignments
                </li>
              </ol>
            </div>

            <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
              <p className="text-teal-200 text-sm">
                <strong>Expected Timeline:</strong> Most applications are processed within 1-2 weeks from submission to final approval
              </p>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Auditor Certification Application</h1>
          <p className="text-slate-400">Join the ClearNav Exchange Auditor Partner Program</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                    step < currentSection
                      ? 'bg-teal-600 text-white'
                      : step === currentSection
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step < currentSection ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
                {step < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentSection ? 'bg-teal-600' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Firm Info</span>
            <span>Contact</span>
            <span>Background</span>
            <span>Motivation</span>
            <span>Account</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Form Sections */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          {/* Section 1: Firm Information */}
          {currentSection === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-6 h-6 text-teal-400" />
                <h2 className="text-2xl font-bold text-white">Firm Information</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Firm/Company Name *
                </label>
                <input
                  type="text"
                  value={formData.firmName}
                  onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Enter your firm name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Professional registration or license number"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Jurisdiction *
                  </label>
                  <select
                    value={formData.jurisdiction}
                    onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="">Select jurisdiction</option>
                    {JURISDICTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Years in Operation *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.yearsInOperation}
                    onChange={(e) => setFormData({ ...formData, yearsInOperation: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    placeholder="Years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="https://yourfirm.com"
                />
              </div>
            </div>
          )}

          {/* Section 2: Contact Details */}
          {currentSection === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-teal-400" />
                <h2 className="text-2xl font-bold text-white">Contact Details</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="your@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Professional Title *
                  </label>
                  <input
                    type="text"
                    value={formData.professionalTitle}
                    onChange={(e) => setFormData({ ...formData, professionalTitle: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    placeholder="e.g., Managing Partner"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Professional Background */}
          {currentSection === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-6 h-6 text-teal-400" />
                <h2 className="text-2xl font-bold text-white">Professional Background</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Specializations * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SPECIALIZATIONS.map((spec) => (
                    <label
                      key={spec}
                      className={`flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.specializations.includes(spec)
                          ? 'bg-teal-500/20 border-teal-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.specializations.includes(spec)}
                        onChange={() => toggleSpecialization(spec)}
                        className="w-4 h-4 text-teal-600 bg-slate-800 border-slate-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm">{spec}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Years of Relevant Auditing Experience *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Years"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Professional Certifications Held * (e.g., CPA, CFA, CISA, CIA)
                </label>
                <div className="space-y-3">
                  {formData.certificationsHeld.map((cert, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => updateCertification(index, 'name', e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                        placeholder="Certification name"
                      />
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                        placeholder="Issuing body"
                      />
                      <input
                        type="text"
                        value={cert.number}
                        onChange={(e) => updateCertification(index, 'number', e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                        placeholder="Number (optional)"
                      />
                      {formData.certificationsHeld.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCertification(index)}
                          className="px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCertification}
                    className="px-4 py-2 bg-teal-600/20 border border-teal-500/30 text-teal-400 rounded-lg hover:bg-teal-600/30 transition-colors text-sm"
                  >
                    + Add Another Certification
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Brief Description of Audit Methodology and Approach * (minimum 50 characters)
                </label>
                <textarea
                  value={formData.methodologyDescription}
                  onChange={(e) => setFormData({ ...formData, methodologyDescription: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
                  placeholder="Describe your approach to auditing fund valuations, NAV calculations, and ensuring accuracy..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  {formData.methodologyDescription.length} / 50 minimum characters
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Motivation and Commitment */}
          {currentSection === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-teal-400" />
                <h2 className="text-2xl font-bold text-white">Motivation and Commitment</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Why do you want to partner with the ClearNav platform? * (minimum 100 characters)
                </label>
                <textarea
                  value={formData.motivationStatement}
                  onChange={(e) => setFormData({ ...formData, motivationStatement: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
                  placeholder="Explain your motivation for joining the platform, what value you can provide, and your commitment to maintaining high standards..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  {formData.motivationStatement.length} / 100 minimum characters
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-3">Program Requirements</h3>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.feeAcknowledged}
                    onChange={(e) => setFormData({ ...formData, feeAcknowledged: e.target.checked })}
                    className="w-5 h-5 mt-0.5 text-teal-600 bg-slate-800 border-slate-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-slate-300 text-sm">
                    I acknowledge and agree to the annual certification fee of <strong className="text-white">$2,500/year</strong>, billed monthly at approximately <strong className="text-white">$208.34/month</strong>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.examAcknowledged}
                    onChange={(e) => setFormData({ ...formData, examAcknowledged: e.target.checked })}
                    className="w-5 h-5 mt-0.5 text-teal-600 bg-slate-800 border-slate-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-slate-300 text-sm">
                    I agree to complete the certification exam covering valuation principles, regulatory knowledge, ethics, attention to detail, and platform knowledge with a passing score of <strong className="text-white">80% or higher</strong>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.standardsAcknowledged}
                    onChange={(e) => setFormData({ ...formData, standardsAcknowledged: e.target.checked })}
                    className="w-5 h-5 mt-0.5 text-teal-600 bg-slate-800 border-slate-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-slate-300 text-sm">
                    I agree to abide by the ClearNav platform standards, maintain independence and objectivity, and uphold the highest professional and ethical standards in all audit engagements
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Section 5: Account Setup */}
          {currentSection === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-teal-400" />
                <h2 className="text-2xl font-bold text-white">Account Setup</h2>
              </div>

              <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 mb-6">
                <p className="text-teal-200 text-sm">
                  Create your account credentials to access the Auditor Portal once your application is approved
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">Using the email address from your contact details</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password * (minimum 8 characters)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Enter a secure password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Confirm your password"
                />
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
            <button
              onClick={prevSection}
              disabled={currentSection === 1}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentSection < 5 ? (
              <button
                onClick={nextSection}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !validateSection(5)}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
