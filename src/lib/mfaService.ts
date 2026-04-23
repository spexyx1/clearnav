/**
 * Multi-Factor Authentication Service
 *
 * TOTP (Time-based One-Time Password) using the Web Crypto API.
 * QR codes are generated client-side — no secrets are ever sent to third parties.
 */

import { supabase } from './supabase';
import { hash } from './encryption';

export interface TOTPSetup {
  secret: string;
  /** otpauth:// URI — pass to a QR library (e.g. qrcode) to render the code */
  otpauthUrl: string;
  manualEntryKey: string;
}

export interface MFAConfig {
  userId: string;
  tenantId: string;
  method: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
  recoveryEmail?: string;
}

const TOTP_WINDOW = 1;
const TOTP_PERIOD = 30;
const BACKUP_CODE_COUNT = 10;
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// ─── TOTP helpers ────────────────────────────────────────────────────────────

function generateBase32Secret(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => BASE32_CHARS[b % BASE32_CHARS.length]).join('');
}

function base32Decode(base32: string): Uint8Array {
  const s = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (const ch of s) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function totpCode(secret: string, timeStep: number): Promise<string> {
  const key = base32Decode(secret);
  const time = new ArrayBuffer(8);
  new DataView(time).setUint32(4, timeStep, false);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, time));
  const off = sig[sig.length - 1] & 0x0f;
  const bin =
    ((sig[off] & 0x7f) << 24) |
    ((sig[off + 1] & 0xff) << 16) |
    ((sig[off + 2] & 0xff) << 8) |
    (sig[off + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, '0');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class MFAService {
  /**
   * Generate a TOTP secret. Render `otpauthUrl` with a QR library (e.g. `qrcode`)
   * on the client — the secret is never sent to any external service.
   */
  static generateTOTPSecret(email: string, issuer = 'ClearNAV'): TOTPSetup {
    const secret = generateBase32Secret();
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${TOTP_PERIOD}`;
    const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') ?? secret;
    return { secret, otpauthUrl, manualEntryKey };
  }

  static async verifyTOTP(secret: string, code: string): Promise<boolean> {
    const step = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
      if (code === (await totpCode(secret, step + i))) return true;
    }
    return false;
  }

  static async enableMFA(config: MFAConfig, totpSecret?: string): Promise<void> {
    const { error } = await supabase.from('mfa_settings').upsert({
      user_id: config.userId,
      tenant_id: config.tenantId,
      mfa_enabled: true,
      mfa_method: config.method,
      totp_secret: totpSecret ?? null,
      phone_number: config.phoneNumber,
      recovery_email: config.recoveryEmail,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to enable MFA: ${error.message}`);
  }

  static async verifyAndActivateTOTP(userId: string, secret: string, code: string): Promise<boolean> {
    if (!(await this.verifyTOTP(secret, code))) return false;
    const { error } = await supabase
      .from('mfa_settings')
      .update({ totp_verified: true, totp_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to verify TOTP: ${error.message}`);
    return true;
  }

  static async generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      return Array.from(bytes, (b) => chars[b % chars.length]).join('');
    });
    const hashed = await Promise.all(codes.map(hash));
    const { error } = await supabase
      .from('mfa_settings')
      .update({ backup_codes: hashed, backup_codes_used: 0, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to generate backup codes: ${error.message}`);
    return codes;
  }

  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const { data: settings, error } = await supabase
      .from('mfa_settings')
      .select('backup_codes, backup_codes_used')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !settings) return false;
    const hashed = await hash(code);
    const idx = (settings.backup_codes as string[] | null)?.indexOf(hashed) ?? -1;
    if (idx === -1) return false;
    const updated = [...(settings.backup_codes as string[])];
    updated.splice(idx, 1);
    await supabase
      .from('mfa_settings')
      .update({ backup_codes: updated, backup_codes_used: (settings.backup_codes_used ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return true;
  }

  static async isMFARequired(userId: string): Promise<{ required: boolean; method?: string }> {
    const { data, error } = await supabase
      .from('mfa_settings')
      .select('mfa_enabled, mfa_method, enforce_mfa')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return { required: false };
    return { required: data.mfa_enabled && data.enforce_mfa, method: data.mfa_method };
  }

  static async getMFASettings(userId: string) {
    const { data, error } = await supabase
      .from('mfa_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`Failed to get MFA settings: ${error.message}`);
    return data;
  }

  static async disableMFA(userId: string): Promise<void> {
    const { error } = await supabase
      .from('mfa_settings')
      .update({ mfa_enabled: false, totp_secret: null, totp_verified: false, backup_codes: [], updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to disable MFA: ${error.message}`);
  }

  static async addTrustedDevice(userId: string, fingerprint: string, name: string, trustDays = 30): Promise<void> {
    const { data } = await supabase.from('mfa_settings').select('trusted_devices').eq('user_id', userId).maybeSingle();
    const devices = (data?.trusted_devices as unknown[]) ?? [];
    const expires = new Date();
    expires.setDate(expires.getDate() + trustDays);
    devices.push({ fingerprint, name, addedAt: new Date().toISOString(), expiresAt: expires.toISOString() });
    await supabase.from('mfa_settings').update({ trusted_devices: devices, updated_at: new Date().toISOString() }).eq('user_id', userId);
  }

  static async isTrustedDevice(userId: string, fingerprint: string): Promise<boolean> {
    const { data } = await supabase.from('mfa_settings').select('trusted_devices').eq('user_id', userId).maybeSingle();
    if (!data?.trusted_devices) return false;
    const now = new Date();
    return (data.trusted_devices as Array<{ fingerprint: string; expiresAt: string }>).some(
      (d) => d.fingerprint === fingerprint && new Date(d.expiresAt) > now
    );
  }

  static async removeTrustedDevice(userId: string, fingerprint: string): Promise<void> {
    const { data } = await supabase.from('mfa_settings').select('trusted_devices').eq('user_id', userId).maybeSingle();
    if (!data?.trusted_devices) return;
    const updated = (data.trusted_devices as Array<{ fingerprint: string }>).filter((d) => d.fingerprint !== fingerprint);
    await supabase.from('mfa_settings').update({ trusted_devices: updated, updated_at: new Date().toISOString() }).eq('user_id', userId);
  }
}

// ─── Device fingerprinting ────────────────────────────────────────────────────

export class DeviceFingerprintService {
  static async generateFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.hardwareConcurrency,
      navigator.maxTouchPoints,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      String(!!window.sessionStorage),
      String(!!window.localStorage),
      navigator.platform,
    ];
    // Canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('CN', 2, 15);
      components.push(canvas.toDataURL());
    }
    return hash(components.join('|||'));
  }

  static getDeviceInfo(): { browser: string; os: string; deviceType: string } {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';
    return { browser, os, deviceType: /Mobile|Android|iPhone|iPad/.test(ua) ? 'Mobile' : 'Desktop' };
  }
}
