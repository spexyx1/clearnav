import React, { useState, useEffect, useCallback } from 'react';
import { Users as Users2, Search, Filter, Plus, ChevronDown, X, CheckCircle, XCircle, Clock, AlertCircle, Eye, FileText, BookOpen, Star, Shield, RefreshCw, Loader2, ArrowLeft, Send, Trash2, CreditCard as Edit3, ChevronRight, Award, Briefcase, BarChart2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type PartnerType =
  | 'accountant'
  | 'auditor'
  | 'legal'
  | 'compliance_consultant'
  | 'fund_administrator'
  | 'tax_advisor'
  | 'other';

type AppStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'test_pending'
  | 'test_passed'
  | 'test_failed'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

type CertStatus = 'active' | 'suspended' | 'revoked' | 'expired';

interface PartnerApplication {
  id: string;
  applicant_user_id: string | null;
  firm_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  partner_type: PartnerType;
  partner_type_other: string | null;
  years_experience: number | null;
  certifications: string[] | null;
  jurisdictions: string[] | null;
  background_statement: string | null;
  status: AppStatus;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TestQuestion {
  id: string;
  section: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
  is_active: boolean;
  sort_order: number;
}

interface TestAttempt {
  id: string;
  application_id: string;
  attempt_number: number;
  total_score: number | null;
  passing_score: number;
  passed: boolean | null;
  section_scores: Record<string, number>;
  started_at: string;
  completed_at: string | null;
  time_taken_minutes: number | null;
  notes: string | null;
  created_at: string;
  application?: PartnerApplication;
}

interface PartnerProfile {
  id: string;
  firm_name: string;
  contact_name: string;
  contact_email: string;
  partner_type: PartnerType;
  certification_status: CertStatus;
  billing_status: string;
  annual_fee_cents: number;
  total_engagements: number;
  active_tenants_count: number;
  average_rating: number | null;
  is_publicly_listed: boolean;
  certified_at: string | null;
  certification_expires_at: string | null;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  accountant: 'Accountant',
  auditor: 'Auditor',
  legal: 'Legal Counsel',
  compliance_consultant: 'Compliance Consultant',
  fund_administrator: 'Fund Administrator',
  tax_advisor: 'Tax Advisor',
  other: 'Other',
};

const PARTNER_TYPE_COLORS: Record<PartnerType, string> = {
  accountant: 'bg-blue-100 text-blue-800',
  auditor: 'bg-emerald-100 text-emerald-800',
  legal: 'bg-slate-100 text-slate-800',
  compliance_consultant: 'bg-amber-100 text-amber-800',
  fund_administrator: 'bg-cyan-100 text-cyan-800',
  tax_advisor: 'bg-orange-100 text-orange-800',
  other: 'bg-slate-100 text-slate-700',
};

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:        { label: 'Draft',        color: 'bg-slate-100 text-slate-700',   icon: FileText },
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-800',     icon: Send },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  test_pending: { label: 'Test Pending', color: 'bg-amber-100 text-amber-800',   icon: BookOpen },
  test_passed:  { label: 'Test Passed',  color: 'bg-cyan-100 text-cyan-800',     icon: CheckCircle },
  test_failed:  { label: 'Test Failed',  color: 'bg-red-100 text-red-800',       icon: XCircle },
  approved:     { label: 'Approved',     color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-800',       icon: XCircle },
  withdrawn:    { label: 'Withdrawn',    color: 'bg-slate-100 text-slate-600',   icon: X },
};

const CERT_STATUS_CONFIG: Record<CertStatus, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-800' },
  suspended: { label: 'Suspended', color: 'bg-yellow-100 text-yellow-800' },
  revoked:   { label: 'Revoked',   color: 'bg-red-100 text-red-800' },
  expired:   { label: 'Expired',   color: 'bg-slate-100 text-slate-600' },
};

const SECTION_LABELS: Record<string, string> = {
  compliance_knowledge:  'Compliance Knowledge',
  platform_knowledge:    'Platform Knowledge',
  professional_ethics:   'Professional Ethics',
  technical_proficiency: 'Technical Proficiency',
};

type SubTab = 'applications' | 'tests' | 'partners' | 'test_results';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Application Detail Panel ─────────────────────────────────────────────────

function ApplicationDetail({
  app,
  attempts,
  onBack,
  onStatusChange,
}: {
  app: PartnerApplication;
  attempts: TestAttempt[];
  onBack: () => void;
  onStatusChange: (id: string, status: AppStatus, notes?: string, reason?: string) => Promise<void>;
}) {
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [testScore, setTestScore] = useState('');
  const [testNotes, setTestNotes] = useState('');
  const [recordingTest, setRecordingTest] = useState(false);

  const appAttempts = attempts.filter(a => a.application_id === app.id);
  const latestAttempt = appAttempts[0];

  async function handleAction(newStatus: AppStatus) {
    setSaving(true);
    await onStatusChange(app.id, newStatus, actionNotes || undefined, rejectionReason || undefined);
    setSaving(false);
    setShowRejectForm(false);
    setActionNotes('');
  }

  async function handleRecordTest() {
    const score = parseFloat(testScore);
    if (isNaN(score) || score < 0 || score > 100) return;
    setRecordingTest(true);
    try {
      const passed = score >= 75;
      await supabase.from('partner_test_attempts').insert({
        application_id: app.id,
        attempt_number: appAttempts.length + 1,
        total_score: score,
        passing_score: 75,
        passed,
        completed_at: new Date().toISOString(),
        notes: testNotes || null,
      });
      const newStatus: AppStatus = passed ? 'test_passed' : 'test_failed';
      await onStatusChange(app.id, newStatus, `Test recorded. Score: ${score}%`);
    } finally {
      setRecordingTest(false);
      setTestScore('');
      setTestNotes('');
    }
  }

  const canMoveToReview = app.status === 'submitted';
  const canSendTest = app.status === 'under_review' || app.status === 'test_failed';
  const canApprove = app.status === 'test_passed';
  const canReject = ['submitted', 'under_review', 'test_pending', 'test_passed', 'test_failed'].includes(app.status);

  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{app.firm_name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTNER_TYPE_COLORS[app.partner_type]}`}>
              {PARTNER_TYPE_LABELS[app.partner_type]}
            </span>
            <StatusBadge status={app.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: application info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h4 className="font-semibold text-slate-900">Applicant Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500 mb-0.5">Contact</div>
                <div className="font-medium text-slate-900">{app.contact_name}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Email</div>
                <div className="font-medium text-slate-900">{app.contact_email}</div>
              </div>
              {app.contact_phone && (
                <div>
                  <div className="text-slate-500 mb-0.5">Phone</div>
                  <div className="font-medium text-slate-900">{app.contact_phone}</div>
                </div>
              )}
              {app.website && (
                <div>
                  <div className="text-slate-500 mb-0.5">Website</div>
                  <a href={app.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                    {app.website}
                  </a>
                </div>
              )}
              {app.years_experience !== null && (
                <div>
                  <div className="text-slate-500 mb-0.5">Experience</div>
                  <div className="font-medium text-slate-900">{app.years_experience} years</div>
                </div>
              )}
              <div>
                <div className="text-slate-500 mb-0.5">Applied</div>
                <div className="font-medium text-slate-900">
                  {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : new Date(app.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {app.certifications && app.certifications.length > 0 && (
              <div>
                <div className="text-slate-500 text-sm mb-1">Certifications</div>
                <div className="flex flex-wrap gap-1.5">
                  {app.certifications.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {app.jurisdictions && app.jurisdictions.length > 0 && (
              <div>
                <div className="text-slate-500 text-sm mb-1">Jurisdictions</div>
                <div className="flex flex-wrap gap-1.5">
                  {app.jurisdictions.map((j, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">{j}</span>
                  ))}
                </div>
              </div>
            )}

            {app.background_statement && (
              <div>
                <div className="text-slate-500 text-sm mb-1">Background Statement</div>
                <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {app.background_statement}
                </p>
              </div>
            )}

            {app.reviewer_notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-yellow-800 text-xs font-medium mb-1">Reviewer Notes</div>
                <p className="text-yellow-900 text-sm">{app.reviewer_notes}</p>
              </div>
            )}

            {app.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-800 text-xs font-medium mb-1">Rejection Reason</div>
                <p className="text-red-900 text-sm">{app.rejection_reason}</p>
              </div>
            )}
          </div>

          {/* Test history */}
          {appAttempts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h4 className="font-semibold text-slate-900 mb-3">Test History</h4>
              <div className="space-y-3">
                {appAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Attempt #{attempt.attempt_number}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString() : 'In progress'}
                      </div>
                    </div>
                    <div className="text-right">
                      {attempt.total_score !== null && (
                        <div className={`text-lg font-bold ${attempt.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                          {attempt.total_score}%
                        </div>
                      )}
                      <div className={`text-xs font-medium ${attempt.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                        {attempt.passed === null ? 'Pending' : attempt.passed ? 'Passed' : 'Failed'} (min {attempt.passing_score}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: actions panel */}
        <div className="space-y-4">
          {/* Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="font-semibold text-slate-900 mb-3">Status Timeline</h4>
            <div className="space-y-2 text-sm">
              {[
                { s: 'submitted', label: 'Application Submitted' },
                { s: 'under_review', label: 'Under Review' },
                { s: 'test_pending', label: 'Test Sent' },
                { s: 'test_passed', label: 'Test Passed' },
                { s: 'approved', label: 'Approved' },
              ].map(({ s, label }) => {
                const statuses: AppStatus[] = ['submitted', 'under_review', 'test_pending', 'test_passed', 'approved'];
                const currentIdx = statuses.indexOf(app.status as AppStatus);
                const thisIdx = statuses.indexOf(s as AppStatus);
                const done = currentIdx >= thisIdx;
                const active = currentIdx === thisIdx;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}>
                      {done && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={active ? 'font-medium text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-slate-900">Actions</h4>

            <textarea
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              placeholder="Optional notes for this action..."
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none text-slate-700 placeholder-slate-400"
            />

            {canMoveToReview && (
              <button
                onClick={() => handleAction('under_review')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                Move to Review
              </button>
            )}

            {canSendTest && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium text-slate-600">Record Test Result</div>
                <input
                  type="number"
                  value={testScore}
                  onChange={e => setTestScore(e.target.value)}
                  placeholder="Score (0-100)"
                  min={0}
                  max={100}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <input
                  value={testNotes}
                  onChange={e => setTestNotes(e.target.value)}
                  placeholder="Test notes (optional)"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  onClick={handleRecordTest}
                  disabled={recordingTest || !testScore}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {recordingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  Record Test Score
                </button>
              </div>
            )}

            {canApprove && (
              <button
                onClick={() => handleAction('approved')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Certify
              </button>
            )}

            {canReject && !showRejectForm && (
              <button
                onClick={() => setShowRejectForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject Application
              </button>
            )}

            {showRejectForm && (
              <div className="space-y-2 border border-red-200 rounded-lg p-3 bg-red-50">
                <div className="text-xs font-medium text-red-700">Rejection Reason (required)</div>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none bg-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction('rejected')}
                    disabled={saving || !rejectionReason}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-2 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Question Form ────────────────────────────────────────────────────────────

function QuestionForm({
  question,
  onSave,
  onCancel,
}: {
  question?: TestQuestion;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [section, setSection] = useState(question?.section || 'compliance_knowledge');
  const [questionText, setQuestionText] = useState(question?.question_text || '');
  const [questionType, setQuestionType] = useState(question?.question_type || 'multiple_choice');
  const [difficulty, setDifficulty] = useState(question?.difficulty || 'standard');
  const [options, setOptions] = useState<{ id: string; text: string }[]>(
    question?.options || [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ]
  );
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || 'a');
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!questionText.trim()) return;
    setSaving(true);
    try {
      if (question) {
        await supabase.from('partner_verification_tests').update({
          section, question_text: questionText, question_type: questionType,
          difficulty, options, correct_answer: correctAnswer, explanation: explanation || null,
        }).eq('id', question.id);
      } else {
        await supabase.from('partner_verification_tests').insert({
          section, question_text: questionText, question_type: questionType,
          difficulty, options, correct_answer: correctAnswer, explanation: explanation || null,
        });
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h4 className="font-semibold text-slate-900">{question ? 'Edit Question' : 'New Question'}</h4>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Section</label>
          <select value={section} onChange={e => setSection(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            {Object.entries(SECTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select value={questionType} onChange={e => setQuestionType(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="multiple_choice">Multiple Choice</option>
            <option value="scenario">Scenario</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Difficulty</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="standard">Standard</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Question</label>
        <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
          placeholder="Enter question text..." />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600">Answer Options</label>
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input type="radio" name="correct" value={opt.id} checked={correctAnswer === opt.id}
              onChange={() => setCorrectAnswer(opt.id)}
              className="text-emerald-600 focus:ring-emerald-500" />
            <span className="text-xs font-mono text-slate-500 w-4">{opt.id.toUpperCase()}.</span>
            <input value={opt.text} onChange={e => {
              const updated = [...options];
              updated[i] = { ...opt, text: e.target.value };
              setOptions(updated);
            }}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder={`Option ${opt.id.toUpperCase()}`} />
          </div>
        ))}
        <p className="text-xs text-slate-400">Select the radio button next to the correct answer.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Explanation (shown after answering)</label>
        <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
          placeholder="Explain why this answer is correct..." />
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || !questionText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {question ? 'Save Changes' : 'Add Question'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CollaboratorManager() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('applications');

  // Applications state
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<AppStatus | ''>('');
  const [appTypeFilter, setAppTypeFilter] = useState<PartnerType | ''>('');
  const [selectedApp, setSelectedApp] = useState<PartnerApplication | null>(null);
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);

  // Test questions state
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TestQuestion | null>(null);
  const [sectionFilter, setSectionFilter] = useState('');

  // Partners state
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnerSearch, setPartnerSearch] = useState('');

  // Test results state
  const [allAttempts, setAllAttempts] = useState<TestAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const { data } = await supabase
        .from('partner_applications')
        .select('*')
        .order('created_at', { ascending: false });
      setApplications((data || []) as PartnerApplication[]);
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const loadTestAttempts = useCallback(async () => {
    const { data } = await supabase
      .from('partner_test_attempts')
      .select('*')
      .order('created_at', { ascending: false });
    setTestAttempts((data || []) as TestAttempt[]);
    setAllAttempts((data || []) as TestAttempt[]);
    setAttemptsLoading(false);
  }, []);

  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const { data } = await supabase
        .from('partner_verification_tests')
        .select('*')
        .order('sort_order', { ascending: true });
      setQuestions((data || []) as TestQuestion[]);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const loadPartners = useCallback(async () => {
    setPartnersLoading(true);
    try {
      const { data } = await supabase
        .from('partner_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setPartners((data || []) as PartnerProfile[]);
    } finally {
      setPartnersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
    loadTestAttempts();
  }, [loadApplications, loadTestAttempts]);

  useEffect(() => {
    if (subTab === 'tests') loadQuestions();
    if (subTab === 'partners') loadPartners();
    if (subTab === 'test_results') setAttemptsLoading(false);
  }, [subTab, loadQuestions, loadPartners]);

  // ── Status change handler ─────────────────────────────────────────────────────

  async function handleStatusChange(
    id: string,
    newStatus: AppStatus,
    notes?: string,
    reason?: string
  ) {
    const updates: Partial<PartnerApplication> = {
      status: newStatus,
      ...(notes ? { reviewer_notes: notes } : {}),
      ...(reason ? { rejection_reason: reason } : {}),
      ...(newStatus === 'under_review' ? { reviewed_at: new Date().toISOString(), reviewer_id: user?.id } : {}),
      ...(newStatus === 'approved' ? { approved_at: new Date().toISOString() } : {}),
    };
    await supabase.from('partner_applications').update(updates).eq('id', id);

    // Log the action
    await supabase.from('partner_activity_log').insert({
      application_id: id,
      actor_id: user?.id,
      action: `status_changed_to_${newStatus}`,
      to_status: newStatus,
      notes: notes || null,
    });

    // If approved, create a partner profile
    if (newStatus === 'approved') {
      const app = applications.find(a => a.id === id);
      if (app) {
        await supabase.from('partner_profiles').upsert({
          application_id: id,
          firm_name: app.firm_name,
          contact_name: app.contact_name,
          contact_email: app.contact_email,
          contact_phone: app.contact_phone,
          website: app.website,
          partner_type: app.partner_type,
          certifications: app.certifications,
          jurisdictions: app.jurisdictions,
          certification_status: 'active',
          certified_at: new Date().toISOString(),
        }, { onConflict: 'application_id' });
      }
    }

    await loadApplications();
    if (selectedApp?.id === id) {
      const { data } = await supabase.from('partner_applications').select('*').eq('id', id).maybeSingle();
      if (data) setSelectedApp(data as PartnerApplication);
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return;
    await supabase.from('partner_verification_tests').delete().eq('id', id);
    loadQuestions();
  }

  async function handleTogglePartnerStatus(id: string, current: CertStatus) {
    const newStatus: CertStatus = current === 'active' ? 'suspended' : 'active';
    await supabase.from('partner_profiles').update({ certification_status: newStatus }).eq('id', id);
    loadPartners();
  }

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const filteredApps = applications.filter(a => {
    if (appStatusFilter && a.status !== appStatusFilter) return false;
    if (appTypeFilter && a.partner_type !== appTypeFilter) return false;
    if (appSearch) {
      const q = appSearch.toLowerCase();
      if (!a.firm_name.toLowerCase().includes(q) &&
          !a.contact_name.toLowerCase().includes(q) &&
          !a.contact_email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredQuestions = sectionFilter
    ? questions.filter(q => q.section === sectionFilter)
    : questions;

  const filteredPartners = partners.filter(p => {
    if (!partnerSearch) return true;
    const q = partnerSearch.toLowerCase();
    return p.firm_name.toLowerCase().includes(q) ||
           p.contact_name.toLowerCase().includes(q) ||
           p.contact_email.toLowerCase().includes(q);
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const pendingCount = applications.filter(a => ['submitted', 'under_review', 'test_pending'].includes(a.status)).length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const activePartnersCount = partners.filter(p => p.certification_status === 'active').length;
  const passRate = allAttempts.length > 0
    ? Math.round((allAttempts.filter(a => a.passed).length / allAttempts.length) * 100)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────────

  const subTabs: { id: SubTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'applications', label: 'Applications', icon: FileText, badge: pendingCount || undefined },
    { id: 'tests', label: 'Verification Tests', icon: BookOpen },
    { id: 'partners', label: 'Active Partners', icon: Award, badge: activePartnersCount || undefined },
    { id: 'test_results', label: 'Test Results', icon: BarChart2 },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Collaborator Management</h2>
        <p className="text-slate-600 mt-1">
          Manage 3rd-party partner applications, verification tests, and certified collaborators
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Review', value: pendingCount, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: Clock },
          { label: 'Approved', value: approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
          { label: 'Active Partners', value: activePartnersCount, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Award },
          { label: 'Test Pass Rate', value: `${passRate}%`, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', icon: BarChart2 },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`border rounded-xl p-4 ${bg}`}>
            <div className="flex items-center justify-between mb-1">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {subTabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              subTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Applications Tab ─────────────────────────────────────────────────── */}
      {subTab === 'applications' && (
        <>
          {selectedApp ? (
            <ApplicationDetail
              app={selectedApp}
              attempts={testAttempts}
              onBack={() => setSelectedApp(null)}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={appSearch}
                    onChange={e => setAppSearch(e.target.value)}
                    placeholder="Search applications..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={appStatusFilter}
                    onChange={e => setAppStatusFilter(e.target.value as AppStatus | '')}
                    className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white"
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={appTypeFilter}
                    onChange={e => setAppTypeFilter(e.target.value as PartnerType | '')}
                    className="pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white"
                  >
                    <option value="">All Types</option>
                    {Object.entries(PARTNER_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <button onClick={loadApplications} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <RefreshCw className={`w-4 h-4 text-slate-500 ${appsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {appsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Users2 className="w-12 h-12 mb-3 opacity-30" />
                    <div className="font-medium text-slate-500">No applications found</div>
                    <p className="text-sm mt-1 text-slate-400">
                      {applications.length === 0
                        ? 'Applications will appear here once submitted'
                        : 'Try adjusting your filters'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {['Firm', 'Type', 'Contact', 'Applied', 'Status', ''].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApps.map(app => (
                          <tr
                            key={app.id}
                            onClick={() => setSelectedApp(app)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-900">{app.firm_name}</div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTNER_TYPE_COLORS[app.partner_type]}`}>
                                {PARTNER_TYPE_LABELS[app.partner_type]}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-sm text-slate-700">{app.contact_name}</div>
                              <div className="text-xs text-slate-400">{app.contact_email}</div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-500">
                              {new Date(app.submitted_at || app.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={app.status} />
                            </td>
                            <td className="px-5 py-4">
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                      {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Verification Tests Tab ───────────────────────────────────────────── */}
      {subTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white"
                >
                  <option value="">All Sections</option>
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <button onClick={loadQuestions} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <RefreshCw className={`w-4 h-4 text-slate-500 ${questionsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
              onClick={() => { setEditingQuestion(null); setShowQuestionForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

          {showQuestionForm && (
            <QuestionForm
              question={editingQuestion || undefined}
              onSave={() => { setShowQuestionForm(false); setEditingQuestion(null); loadQuestions(); }}
              onCancel={() => { setShowQuestionForm(false); setEditingQuestion(null); }}
            />
          )}

          {/* Section summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(SECTION_LABELS).map(([key, label]) => {
              const count = questions.filter(q => q.section === key && q.is_active).length;
              return (
                <button
                  key={key}
                  onClick={() => setSectionFilter(sectionFilter === key ? '' : key)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    sectionFilter === key
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </button>
              );
            })}
          </div>

          {/* Questions list */}
          {questionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-400">#{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                          {SECTION_LABELS[q.section]}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          q.difficulty === 'advanced' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs">
                          {q.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Scenario'}
                        </span>
                        {!q.is_active && (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800">{q.question_text}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {q.options.map((opt) => (
                          <div key={opt.id} className={`text-xs px-2 py-1 rounded ${
                            opt.id === q.correct_answer
                              ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                              : 'text-slate-500'
                          }`}>
                            <span className="font-mono mr-1">{opt.id.toUpperCase()}.</span>
                            {opt.text}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-xs text-slate-500 italic">{q.explanation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingQuestion(q); setShowQuestionForm(true); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredQuestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <BookOpen className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm text-slate-500">No questions in this section yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Active Partners Tab ──────────────────────────────────────────────── */}
      {subTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={partnerSearch}
                onChange={e => setPartnerSearch(e.target.value)}
                placeholder="Search partners..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button onClick={loadPartners} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <RefreshCw className={`w-4 h-4 text-slate-500 ${partnersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {partnersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Award className="w-12 h-12 mb-3 opacity-30" />
              <div className="font-medium text-slate-500">No certified partners yet</div>
              <p className="text-sm mt-1 text-slate-400">Approved applications automatically create partner profiles</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Partner', 'Type', 'Certification', 'Billing', 'Engagements', 'Rating', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPartners.map(partner => (
                      <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">{partner.firm_name}</div>
                          <div className="text-xs text-slate-500">{partner.contact_email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTNER_TYPE_COLORS[partner.partner_type as PartnerType]}`}>
                            {PARTNER_TYPE_LABELS[partner.partner_type as PartnerType]}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CERT_STATUS_CONFIG[partner.certification_status].color}`}>
                            {CERT_STATUS_CONFIG[partner.certification_status].label}
                          </span>
                          {partner.certified_at && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Since {new Date(partner.certified_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            partner.billing_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            partner.billing_status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {partner.billing_status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          <div>{partner.total_engagements} total</div>
                          <div className="text-xs text-slate-400">{partner.active_tenants_count} active</div>
                        </td>
                        <td className="px-5 py-4">
                          {partner.average_rating !== null ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-medium text-slate-700">{Number(partner.average_rating).toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No ratings</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleTogglePartnerStatus(partner.id, partner.certification_status)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                              partner.certification_status === 'active'
                                ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {partner.certification_status === 'active' ? 'Suspend' : 'Reinstate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                  {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Test Results Tab ─────────────────────────────────────────────────── */}
      {subTab === 'test_results' && (
        <div className="space-y-4">
          {attemptsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : allAttempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
              <div className="font-medium text-slate-500">No test results yet</div>
              <p className="text-sm mt-1 text-slate-400">Test scores appear here once recorded for applicants</p>
            </div>
          ) : (
            <>
              {/* Pass rate summary */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Attempts', value: allAttempts.length, color: 'text-slate-700' },
                  { label: 'Passed', value: allAttempts.filter(a => a.passed).length, color: 'text-emerald-600' },
                  { label: 'Failed', value: allAttempts.filter(a => a.passed === false).length, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <div className={`text-3xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Applicant / Firm', 'Attempt', 'Score', 'Result', 'Date', 'Notes'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allAttempts.map(attempt => {
                        const app = applications.find(a => a.id === attempt.application_id);
                        return (
                          <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-900">{app?.firm_name || '—'}</div>
                              <div className="text-xs text-slate-400">{app?.contact_name}</div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600">
                              #{attempt.attempt_number}
                            </td>
                            <td className="px-5 py-4">
                              {attempt.total_score !== null ? (
                                <div>
                                  <div className={`text-lg font-bold ${attempt.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {attempt.total_score}%
                                  </div>
                                  <div className="text-xs text-slate-400">min {attempt.passing_score}%</div>
                                </div>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-5 py-4">
                              {attempt.passed === null ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Pending</span>
                              ) : attempt.passed ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Passed</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Failed</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-500">
                              {attempt.completed_at
                                ? new Date(attempt.completed_at).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-500">
                              {attempt.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
