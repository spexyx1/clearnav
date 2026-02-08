/**
 * Multi-Factor Authentication Service
 *
 * Provides comprehensive MFA/2FA implementation with:
 * - TOTP (Time-based One-Time Password) using authenticator apps
 * - SMS-based verification
 * - Email-based verification
 * - Backup recovery codes
 * - Trusted device management
 */

import { supabase } from './supabase';
import { EncryptionService } from './encryption';

export interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface MFAConfig {
  userId: string;
  tenantId: string;
  method: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
  recoveryEmail?: string;
}

export class MFAService {
  private static readonly TOTP_WINDOW = 1; // Accept codes from 1 period before/after
  private static readonly TOTP_PERIOD = 30; // 30 seconds per code
  private static readonly BACKUP_CODE_COUNT = 10;

  /**
   * Generates a TOTP secret for a user
   */
  static async generateTOTPSecret(userId: string, email: string, issuer: string = 'ClearNav'): Promise<TOTPSetup> {
    // Generate a random base32 secret
    const secret = this.generateBase32Secret();

    // Create the TOTP URL for QR code generation
    const totpUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${this.TOTP_PERIOD}`;

    // Generate QR code URL (using a QR code service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(totpUrl)}`;

    return {
      secret,
      qrCodeUrl,
      manualEntryKey: this.formatSecretForDisplay(secret),
    };
  }

  /**
   * Verifies a TOTP code
   */
  static async verifyTOTP(secret: string, code: string): Promise<boolean> {
    const currentTime = Math.floor(Date.now() / 1000);

    // Check current time window and adjacent windows
    for (let i = -this.TOTP_WINDOW; i <= this.TOTP_WINDOW; i++) {
      const timeStep = Math.floor(currentTime / this.TOTP_PERIOD) + i;
      const expectedCode = await this.generateTOTPCode(secret, timeStep);

      if (code === expectedCode) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates a TOTP code for a given time step
   */
  private static async generateTOTPCode(secret: string, timeStep: number): Promise<string> {
    const key = this.base32Decode(secret);
    const time = new ArrayBuffer(8);
    const timeView = new DataView(time);
    timeView.setUint32(4, timeStep, false);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, time);
    const signatureArray = new Uint8Array(signature);

    const offset = signatureArray[signatureArray.length - 1] & 0x0f;
    const binary =
      ((signatureArray[offset] & 0x7f) << 24) |
      ((signatureArray[offset + 1] & 0xff) << 16) |
      ((signatureArray[offset + 2] & 0xff) << 8) |
      (signatureArray[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Enables MFA for a user
   */
  static async enableMFA(config: MFAConfig, totpSecret?: string): Promise<void> {
    const encryptedSecret = totpSecret ? await EncryptionService.encryptField(totpSecret) : null;

    const { error } = await supabase.from('mfa_settings').upsert({
      user_id: config.userId,
      tenant_id: config.tenantId,
      mfa_enabled: true,
      mfa_method: config.method,
      totp_secret: encryptedSecret,
      phone_number: config.phoneNumber,
      recovery_email: config.recoveryEmail,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to enable MFA: ${error.message}`);
    }
  }

  /**
   * Verifies and activates TOTP for a user
   */
  static async verifyAndActivateTOTP(userId: string, secret: string, code: string): Promise<boolean> {
    const isValid = await this.verifyTOTP(secret, code);

    if (!isValid) {
      return false;
    }

    // Mark TOTP as verified
    const { error } = await supabase
      .from('mfa_settings')
      .update({
        totp_verified: true,
        totp_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to verify TOTP: ${error.message}`);
    }

    return true;
  }

  /**
   * Generates backup recovery codes
   */
  static async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      // Generate 8-character alphanumeric code
      const code = this.generateRecoveryCode();
      codes.push(code);
    }

    // Hash codes before storing
    const hashedCodes = await Promise.all(
      codes.map((code) => EncryptionService.hash(code))
    );

    const { error } = await supabase
      .from('mfa_settings')
      .update({
        backup_codes: hashedCodes,
        backup_codes_used: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to generate backup codes: ${error.message}`);
    }

    return codes;
  }

  /**
   * Verifies a backup recovery code
   */
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const { data: settings, error } = await supabase
      .from('mfa_settings')
      .select('backup_codes, backup_codes_used')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !settings) {
      return false;
    }

    const hashedCode = await EncryptionService.hash(code);
    const codeIndex = settings.backup_codes?.indexOf(hashedCode);

    if (codeIndex === -1 || codeIndex === undefined) {
      return false;
    }

    // Remove the used code
    const updatedCodes = [...(settings.backup_codes || [])];
    updatedCodes.splice(codeIndex, 1);

    await supabase
      .from('mfa_settings')
      .update({
        backup_codes: updatedCodes,
        backup_codes_used: (settings.backup_codes_used || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return true;
  }

  /**
   * Checks if MFA is enabled and required for a user
   */
  static async isMFARequired(userId: string): Promise<{ required: boolean; method?: string }> {
    const { data: settings, error } = await supabase
      .from('mfa_settings')
      .select('mfa_enabled, mfa_method, enforce_mfa')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !settings) {
      return { required: false };
    }

    return {
      required: settings.mfa_enabled && settings.enforce_mfa,
      method: settings.mfa_method,
    };
  }

  /**
   * Gets MFA settings for a user
   */
  static async getMFASettings(userId: string) {
    const { data, error } = await supabase
      .from('mfa_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get MFA settings: ${error.message}`);
    }

    return data;
  }

  /**
   * Disables MFA for a user
   */
  static async disableMFA(userId: string): Promise<void> {
    const { error } = await supabase
      .from('mfa_settings')
      .update({
        mfa_enabled: false,
        totp_secret: null,
        totp_verified: false,
        backup_codes: [],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to disable MFA: ${error.message}`);
    }
  }

  /**
   * Adds a trusted device for a user
   */
  static async addTrustedDevice(
    userId: string,
    deviceFingerprint: string,
    deviceName: string,
    trustDurationDays: number = 30
  ): Promise<void> {
    const { data: settings } = await supabase
      .from('mfa_settings')
      .select('trusted_devices')
      .eq('user_id', userId)
      .maybeSingle();

    const trustedDevices = settings?.trusted_devices || [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + trustDurationDays);

    trustedDevices.push({
      fingerprint: deviceFingerprint,
      name: deviceName,
      addedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    await supabase
      .from('mfa_settings')
      .update({
        trusted_devices: trustedDevices,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Checks if a device is trusted
   */
  static async isTrustedDevice(userId: string, deviceFingerprint: string): Promise<boolean> {
    const { data: settings } = await supabase
      .from('mfa_settings')
      .select('trusted_devices')
      .eq('user_id', userId)
      .maybeSingle();

    if (!settings?.trusted_devices) {
      return false;
    }

    const now = new Date();
    const trustedDevice = settings.trusted_devices.find(
      (device: any) => device.fingerprint === deviceFingerprint && new Date(device.expiresAt) > now
    );

    return !!trustedDevice;
  }

  /**
   * Removes a trusted device
   */
  static async removeTrustedDevice(userId: string, deviceFingerprint: string): Promise<void> {
    const { data: settings } = await supabase
      .from('mfa_settings')
      .select('trusted_devices')
      .eq('user_id', userId)
      .maybeSingle();

    if (!settings?.trusted_devices) {
      return;
    }

    const trustedDevices = settings.trusted_devices.filter(
      (device: any) => device.fingerprint !== deviceFingerprint
    );

    await supabase
      .from('mfa_settings')
      .update({
        trusted_devices: trustedDevices,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Utility: Generates a random base32 secret
   */
  private static generateBase32Secret(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);

    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += chars[randomBytes[i] % chars.length];
    }

    return secret;
  }

  /**
   * Utility: Formats secret for manual entry (groups of 4)
   */
  private static formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }

  /**
   * Utility: Decodes base32 string to bytes
   */
  private static base32Decode(base32: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    base32 = base32.toUpperCase().replace(/=+$/, '');

    let bits = '';
    for (let i = 0; i < base32.length; i++) {
      const val = chars.indexOf(base32[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits += val.toString(2).padStart(5, '0');
    }

    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
    }

    return bytes;
  }

  /**
   * Utility: Generates a recovery code
   */
  private static generateRecoveryCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking characters
    const length = 8;
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);

    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[randomBytes[i] % chars.length];
    }

    return code;
  }
}

/**
 * Device Fingerprinting Service
 * Creates unique identifiers for devices to enable trusted device management
 */
export class DeviceFingerprintService {
  /**
   * Generates a device fingerprint based on browser and system properties
   */
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
      !!window.sessionStorage,
      !!window.localStorage,
      navigator.platform,
    ];

    // Get canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('ClearNav', 2, 15);
      components.push(canvas.toDataURL());
    }

    const fingerprintData = components.join('|||');
    return await EncryptionService.hash(fingerprintData);
  }

  /**
   * Gets device information for display
   */
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

    const deviceType = /Mobile|Android|iPhone|iPad/.test(ua) ? 'Mobile' : 'Desktop';

    return { browser, os, deviceType };
  }
}
