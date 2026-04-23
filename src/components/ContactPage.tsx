import { Mail, MapPin, ArrowLeft } from 'lucide-react';
import PageFooter from './shared/PageFooter';

interface ContactPageProps {
  onBack: () => void;
}

const CONTACTS = [
  {
    label: 'General Support',
    email: 'support@clearnav.cv',
    description: 'Questions about the platform, accounts, or getting started.',
  },
  {
    label: 'Legal',
    email: 'legal@clearnav.cv',
    description: 'Terms of service, contractual matters, or legal inquiries.',
  },
  {
    label: 'Privacy',
    email: 'privacy@clearnav.cv',
    description: 'Data requests, privacy policy questions, or GDPR matters.',
  },
  {
    label: 'Compliance',
    email: 'compliance@clearnav.cv',
    description: 'Regulatory, AML/KYC, or compliance-related inquiries.',
  },
  {
    label: 'Operations',
    email: 'ops@clearnav.cv',
    description: 'Platform operations, infrastructure, or technical escalations.',
  },
];

export default function ContactPage({ onBack }: ContactPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-3xl font-light text-white mb-2">
          Contact <span className="font-semibold">ClearNAV</span>
        </h1>
        <p className="text-slate-400 mb-12 text-sm">
          Use the appropriate address below — we route each inbox to the right team.
        </p>

        <div className="space-y-3 mb-16">
          {CONTACTS.map(({ label, email, description }) => (
            <div
              key={email}
              className="flex items-start gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-slate-200 hover:text-teal-400 transition-colors"
                >
                  {email}
                </a>
                <p className="text-xs text-slate-500 mt-1">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-start gap-4">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Registered Office</p>
              <p className="text-sm text-slate-300 font-medium">Grey Alpha LLC</p>
              <p className="text-xs text-slate-500">Wyoming Limited Liability Company</p>
              <p className="text-xs text-slate-500 mt-1.5">640 South Broadway Suite 40</p>
              <p className="text-xs text-slate-500">Los Angeles, CA 90014</p>
            </div>
          </div>
        </div>
      </div>

      <PageFooter companyName="ClearNAV" theme="dark" />
    </div>
  );
}
