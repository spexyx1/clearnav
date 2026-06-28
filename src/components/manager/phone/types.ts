export interface TenantPhoneNumber {
  id: string;
  tenant_id: string;
  phone_number: string;
  phone_number_e164: string;
  telnyx_phone_number_id: string | null;
  number_type: 'local' | 'toll_free' | 'international';
  country_code: string;
  area_code: string | null;
  label: string | null;
  forward_to: string | null;
  forward_to_secondary: string | null;
  forward_whisper_enabled: boolean;
  forward_ring_timeout_secs: number;
  business_hours_enabled: boolean;
  business_hours: BusinessHours;
  timezone: string;
  after_hours_action: 'voicemail' | 'forward_secondary' | 'do_not_disturb';
  voicemail_enabled: boolean;
  voicemail_greeting_text: string;
  recording_enabled: boolean;
  monthly_cost_usd: number;
  per_minute_inbound_usd: number;
  per_minute_outbound_usd: number;
  status: 'active' | 'suspended' | 'releasing' | 'released';
  next_renewal_date: string | null;
  provisioned_at: string;
  released_at: string | null;
  created_at: string;
}

export interface BusinessHours {
  mon?: DaySchedule;
  tue?: DaySchedule;
  wed?: DaySchedule;
  thu?: DaySchedule;
  fri?: DaySchedule;
  sat?: DaySchedule;
  sun?: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface AvailableNumber {
  phone_number: string;
  phone_number_display: string;
  number_type: string;
  country_code: string;
  cost: {
    monthly_cost: string;
    upfront_cost: string;
    currency: string;
  };
}

export interface PhoneCallLog {
  id: string;
  tenant_id: string;
  phone_number_id: string | null;
  direction: 'inbound' | 'outbound';
  from_number: string | null;
  to_number: string | null;
  forwarded_to: string | null;
  caller_name: string | null;
  status: 'initiated' | 'ringing' | 'answered' | 'voicemail' | 'missed' | 'failed' | 'busy' | 'no_answer';
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  cost_usd: number | null;
  created_at: string;
}

export interface Voicemail {
  id: string;
  tenant_id: string;
  phone_number_id: string | null;
  call_log_id: string | null;
  from_number: string | null;
  caller_name: string | null;
  duration_seconds: number;
  recording_url: string | null;
  transcription: string | null;
  is_read: boolean;
  received_at: string;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { enabled: true,  start: '09:00', end: '17:00' },
  tue: { enabled: true,  start: '09:00', end: '17:00' },
  wed: { enabled: true,  start: '09:00', end: '17:00' },
  thu: { enabled: true,  start: '09:00', end: '17:00' },
  fri: { enabled: true,  start: '09:00', end: '17:00' },
  sat: { enabled: false, start: '09:00', end: '13:00' },
  sun: { enabled: false, start: '09:00', end: '13:00' },
};

export const COUNTRY_OPTIONS = [
  { code: 'US', label: 'United States (+1)' },
  { code: 'CA', label: 'Canada (+1)' },
  { code: 'GB', label: 'United Kingdom (+44)' },
  { code: 'AU', label: 'Australia (+61)' },
  { code: 'DE', label: 'Germany (+49)' },
  { code: 'FR', label: 'France (+33)' },
  { code: 'NL', label: 'Netherlands (+31)' },
  { code: 'ES', label: 'Spain (+34)' },
  { code: 'IT', label: 'Italy (+39)' },
  { code: 'SE', label: 'Sweden (+46)' },
  { code: 'SG', label: 'Singapore (+65)' },
  { code: 'HK', label: 'Hong Kong (+852)' },
  { code: 'JP', label: 'Japan (+81)' },
  { code: 'NZ', label: 'New Zealand (+64)' },
  { code: 'IE', label: 'Ireland (+353)' },
];

export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Pacific/Auckland',
];

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatPhoneNumber(e164: string | null | undefined): string {
  if (!e164) return '—';
  if (e164.startsWith('+1') && e164.length === 12) {
    const n = e164.slice(2);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return e164;
}
