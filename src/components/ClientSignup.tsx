import React, { useState } from 'react';
import { Building2, User, Mail, Phone, Lock, ArrowRight, Check, Rocket, ArrowLeft } from 'lucide-react';
import { provisionTenant, SignupData } from '../lib/tenantProvisioning';
import SubdomainValidator from './SubdomainValidator';
import TenantQuestionnaire from './TenantQuestionnaire';

interface ClientSignupProps {
  onBack?: () => void;
}

export default function ClientSignup({ onBack }: ClientSignupProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    phone: '',
    requestedSlug: '',
    password: '',
    confirmPassword: '',
  });

  const [isSlugValid, setIsSlugValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    slug: string;
    subdomainUrl: string;
  } | null>(null);

  const handleCompanyNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      companyName: name,
      requestedSlug: prev.requestedSlug || name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSlugValid) {
      setError('Please choose a valid subdomain');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    const signupData: SignupData = {
      companyName: formData.companyName,
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      phone: formData.phone || undefined,
      requestedSlug: formData.requestedSlug,
      password: formData.password,
    };

    const result = await provisionTenant(signupData);

    if (result.success && result.slug && result.subdomainUrl && result.tenantId) {
      setTenantId(result.tenantId);
      setSuccess({
        slug: result.slug,
        subdomainUrl: result.subdomainUrl,
      });
      setShowQuestionnaire(true);
      setIsLoading(false);
    } else {
      setError(result.error || 'Failed to create your account. Please try again.');
      setIsLoading(false);
    }
  };

  const handleQuestionnaireComplete = () => {
    setShowQuestionnaire(false);
  };

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false);
  };

  if (showQuestionnaire && tenantId) {
    return (
      <TenantQuestionnaire
        tenantId={tenantId}
        onComplete={handleQuestionnaireComplete}
        onSkip={handleQuestionnaireSkip}
      />
    );
  }

  if (success && !showQuestionnaire) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Welcome to ClearNav!
            </h1>

            <p className="text-lg text-slate-600 mb-8">
              Your investment fund portal has been created successfully
            </p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
              <p className="text-sm text-slate-700 mb-3">Your portal is ready at:</p>
              <a
                href={success.subdomainUrl}
                className="text-xl md:text-2xl font-mono font-bold text-blue-600 hover:text-blue-700 break-all"
              >
                {success.subdomainUrl}
              </a>
            </div>

            <div className="space-y-4 mb-8 text-left bg-slate-50 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-3">What happens next?</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <p className="text-slate-700">
                    Check your email for a verification link
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <p className="text-slate-700">
                    Verify your email address
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <p className="text-slate-700">
                    Log in to your portal and start managing your fund
                  </p>
                </div>
              </div>
            </div>

            <a
              href={success.subdomainUrl}
              className="inline-flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              <span>Go to My Portal</span>
              <ArrowRight className="w-5 h-5" />
            </a>

            <p className="text-sm text-slate-500 mt-6">
              You have a 30-day free trial to explore all features
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </button>
        )}

        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              Start Your Free Trial
            </h1>
          </div>
          <p className="text-xl text-slate-600">
            Create your investment fund portal in under 2 minutes
          </p>
          <p className="text-slate-500 mt-2">
            30-day free trial • No credit card required • Cancel anytime
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                <span>Company Information</span>
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="Acme Capital Partners"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>

              <SubdomainValidator
                value={formData.requestedSlug}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, requestedSlug: value }))
                }
                onValidationChange={setIsSlugValid}
              />
            </div>

            <div className="space-y-6 pt-6 border-t-2 border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <User className="w-6 h-6 text-blue-600" />
                <span>Contact Information</span>
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactName: e.target.value }))
                      }
                      placeholder="John Smith"
                      required
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
                    }
                    placeholder="john@acmecapital.com"
                    required
                    className="w-full pl-11 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t-2 border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <Lock className="w-6 h-6 text-blue-600" />
                <span>Account Security</span>
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Re-enter password"
                      required
                      minLength={8}
                      className="w-full pl-11 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading || !isSlugValid}
                className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-lg font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Your Portal...</span>
                  </>
                ) : (
                  <>
                    <span>Create My Portal</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-500 mt-4">
                Already have an account?{' '}
                <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </a>
              </p>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
