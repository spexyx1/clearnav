import { forwardRef } from 'react';

export interface KYCLetterData {
  referenceNumber: string;
  issuedAt: string;
  recipientName: string;
  tenantName: string;
  tenantEmail?: string | null;
  tenantAddress?: string | null;
  clientName: string;
  verificationDate: string | null;
  idVerificationStatus: string | null;
  amlScreeningStatus: string | null;
  diditSessionId: string | null;
  complianceOfficerName?: string | null;
  complianceOfficerTitle?: string | null;
  signatureImageUrl?: string | null;
}

interface KYCVerificationLetterProps {
  data: KYCLetterData;
}

function formatStatus(s: string | null): string {
  if (!s) return 'Not completed';
  const map: Record<string, string> = {
    Approved: 'Passed',
    Declined: 'Failed',
    'In Review': 'Under Manual Review',
    'In Progress': 'In Progress',
    'Not Started': 'Not Started',
    Abandoned: 'Incomplete',
    passed: 'Passed',
    failed: 'Failed',
    clear: 'Clear — No Adverse Findings',
    hit: 'Review Required — Adverse Findings Detected',
  };
  return map[s] || s;
}

const KYCVerificationLetter = forwardRef<HTMLDivElement, KYCVerificationLetterProps>(
  ({ data }, ref) => {
    const issueDate = new Date(data.issuedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const verDate = data.verificationDate
      ? new Date(data.verificationDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Not recorded';

    return (
      <div
        ref={ref}
        className="kyc-letter-root"
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: '10.5pt',
          color: '#111827',
          backgroundColor: '#ffffff',
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          padding: '22mm 20mm 18mm 20mm',
          boxSizing: 'border-box',
          lineHeight: '1.55',
        }}
      >
        <div style={{ borderBottom: '3px solid #0e7490', paddingBottom: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #0891b2, #0d9488)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0e7490', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.3px' }}>
                  ClearNAV
                </div>
                <div style={{ fontSize: '8.5pt', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  Fund Administration &amp; KYC Compliance Platform
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              <div>clearnav.io</div>
              <div>compliance@clearnav.io</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '22px', fontSize: '9pt', color: '#374151', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div>
            <span style={{ color: '#9ca3af' }}>Reference: </span>
            <strong style={{ color: '#111827' }}>{data.referenceNumber}</strong>
          </div>
          <div>
            <span style={{ color: '#9ca3af' }}>Date of Issue: </span>
            <strong style={{ color: '#111827' }}>{issueDate}</strong>
          </div>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '9pt', color: '#6b7280', marginBottom: '2px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>TO:</div>
          <div style={{ fontWeight: 700, fontSize: '11pt', color: '#111827' }}>
            {data.recipientName || '\u00A0'}
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '13pt',
            color: '#0e7490',
            letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
            marginBottom: '6px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          KYC / AML Screening Verification
        </div>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #0891b2, #0d9488, transparent)', marginBottom: '22px', borderRadius: '1px' }} />

        <p style={{ marginBottom: '16px' }}>
          This letter is issued by ClearNAV to confirm that the individual named below has been subjected to formal
          Know Your Customer (KYC) identity verification and Anti-Money Laundering (AML) screening procedures,
          conducted through the ClearNAV compliance platform, on behalf of the registered fund manager or operator
          described herein.
        </p>

        <div
          style={{
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '9.5pt', color: '#0f766e', marginBottom: '10px', fontFamily: 'system-ui, -apple-system, sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>
            Fund / Manager Details
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '38%', paddingBottom: '6px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Registered Entity Name:</td>
                <td style={{ paddingBottom: '6px', fontWeight: 600, color: '#111827' }}>{data.tenantName}</td>
              </tr>
              {data.tenantEmail && (
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Official Email:</td>
                  <td style={{ paddingBottom: '6px', color: '#111827' }}>{data.tenantEmail}</td>
                </tr>
              )}
              {data.tenantAddress && (
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Registered Address:</td>
                  <td style={{ paddingBottom: '6px', color: '#111827' }}>{data.tenantAddress}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Platform:</td>
                <td style={{ color: '#111827' }}>ClearNAV Fund Administration Platform</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '9.5pt', color: '#374151', marginBottom: '10px', fontFamily: 'system-ui, -apple-system, sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>
            Verified Individual
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '38%', paddingBottom: '6px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Full Legal Name:</td>
                <td style={{ paddingBottom: '6px', fontWeight: 700, color: '#111827', fontSize: '11pt' }}>{data.clientName}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '6px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Verification Completed:</td>
                <td style={{ paddingBottom: '6px', color: '#111827' }}>{verDate}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '6px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Identity Verification:</td>
                <td style={{ paddingBottom: '6px', fontWeight: 600, color: data.idVerificationStatus === 'Approved' || data.idVerificationStatus === 'passed' ? '#065f46' : '#374151' }}>
                  {formatStatus(data.idVerificationStatus)}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '6px', color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>AML Screening:</td>
                <td style={{ paddingBottom: '6px', fontWeight: 600, color: data.amlScreeningStatus === 'Approved' || data.amlScreeningStatus === 'clear' ? '#065f46' : '#374151' }}>
                  {formatStatus(data.amlScreeningStatus)}
                </td>
              </tr>
              {data.diditSessionId && (
                <tr>
                  <td style={{ color: '#6b7280', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt' }}>Session Reference:</td>
                  <td style={{ color: '#6b7280', fontSize: '8.5pt', wordBreak: 'break-all' as const }}>{data.diditSessionId}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ marginBottom: '18px' }}>
          ClearNAV confirms that the above-named individual has undergone identity document verification and AML
          screening via the ClearNAV compliance platform, powered by Didit. The verification process included
          government-issued document capture, biometric liveness detection, and screening against international
          Politically Exposed Persons (PEP) lists, sanctions databases, and adverse media sources.
        </p>

        <p style={{ marginBottom: '24px' }}>
          This letter is issued solely for the purpose of confirming that a formal compliance screening process was
          completed. It does not constitute a legal opinion, guarantee of identity, or endorsement of any investment
          activity. Records are retained by ClearNAV in accordance with applicable data protection and anti-money
          laundering regulations.
        </p>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ marginBottom: '28px' }}>Yours faithfully,</p>

          <div style={{ minHeight: '56px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end' }}>
            {data.signatureImageUrl ? (
              <img
                src={data.signatureImageUrl}
                alt="Compliance Officer Signature"
                style={{ maxHeight: '52px', maxWidth: '220px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ width: '220px', borderBottom: '1.5px solid #111827', marginBottom: '2px' }} />
            )}
          </div>

          <div style={{ fontWeight: 700, color: '#111827', fontSize: '10.5pt' }}>
            {data.complianceOfficerName || 'Compliance Officer'}
          </div>
          <div style={{ color: '#6b7280', fontSize: '9.5pt', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {data.complianceOfficerTitle || 'Chief Compliance Officer'}
          </div>
          <div style={{ color: '#6b7280', fontSize: '9.5pt', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            ClearNAV
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '12px',
            fontSize: '7.5pt',
            color: '#9ca3af',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.5',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              This document is confidential and issued for compliance verification purposes only. Unauthorised reproduction,
              distribution, or alteration is strictly prohibited. Ref: {data.referenceNumber}
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
              Page 1 of 1
            </div>
          </div>
        </div>
      </div>
    );
  }
);

KYCVerificationLetter.displayName = 'KYCVerificationLetter';

export default KYCVerificationLetter;
