/**
 * Single source of truth for KYC/AML verification status strings.
 * Import getKycMeta() in any component that needs to display KYC status.
 * The STATUS key is what Didit returns; label is what the user sees.
 */

export type KycStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Approved'
  | 'Declined'
  | 'In Review'
  | 'Abandoned';

export type KycTone = 'neutral' | 'info' | 'success' | 'danger' | 'warn';

export interface KycStatusMeta {
  label: string;
  tone: KycTone;
}

export const KYC_STATUS_META: Record<KycStatus, KycStatusMeta> = {
  'Not Started': { label: 'Not Started',    tone: 'neutral' },
  'In Progress': { label: 'In Progress',    tone: 'info' },
  'Approved':    { label: 'Verified',       tone: 'success' },
  'Declined':    { label: 'Declined',       tone: 'danger' },
  'In Review':   { label: 'Under Review',   tone: 'warn' },
  'Abandoned':   { label: 'Not Completed',  tone: 'neutral' },
};

export function getKycMeta(status: string | null): KycStatusMeta {
  if (!status) return KYC_STATUS_META['Not Started'];
  return KYC_STATUS_META[status as KycStatus] ?? KYC_STATUS_META['Not Started'];
}

/** Convenience boolean helpers */
export const isKycApproved  = (s: string | null) => s === 'Approved';
export const isKycDeclined  = (s: string | null) => s === 'Declined';
export const isKycInProgress = (s: string | null) => s === 'In Progress';
export const isKycInReview   = (s: string | null) => s === 'In Review';
