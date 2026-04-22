import { createClient } from '@/lib/supabase/client';
import { EncryptionService } from './encryption';
import { AuditLogger, AuditEventType, AuditSeverity } from './auditLogger';

export interface SessionConfig {
  userId: string;
  tenantId?: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  sessionDurationMinutes?: number;
  allowConcurrentSessions?: boolean;
}

export interface SessionInfo {
  id: string;
  sessionToken: string;
  deviceFingerprint: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  country?: string;
  city?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  isTrusted: boolean;
}

export class SessionSecurityService {
  private static readonly DEFAULT_SESSION_DURATION = 30;
  private static readonly INACTIVITY_TIMEOUT = 30;
  private static readonly MAX_CONCURRENT_SESSIONS = 5;

  static async createSession(config: SessionConfig): Promise<{ sessionToken: string; sessionId: string }> {
    const supabase = createClient();
    const sessionToken = EncryptionService.generateToken(32);
    const sessionDuration = config.sessionDurationMinutes || this.DEFAULT_SESSION_DURATION;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + sessionDuration);
    const deviceInfo = this.parseUserAgent(config.userAgent);

    if (!config.allowConcurrentSessions) {
      await this.terminateOtherSessions(config.userId);
    } else {
      await this.enforceConcurrentSessionLimit(config.userId);
    }

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: config.userId,
        tenant_id: config.tenantId,
        session_token: sessionToken,
        device_fingerprint: config.deviceFingerprint,
        device_name: `${deviceInfo.browser} on ${deviceInfo.os}`,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ip_address: config.ipAddress,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        is_trusted: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);

    await AuditLogger.log({
      eventType: AuditEventType.LOGIN_SUCCESS,
      severity: AuditSeverity.INFO,
      context: { userId: config.userId, tenantId: config.tenantId, ipAddress: config.ipAddress, userAgent: config.userAgent, deviceFingerprint: config.deviceFingerprint, sessionId: data.id },
      metadata: { action: 'create_session', resource: 'session', resourceId: data.id },
    });

    return { sessionToken, sessionId: data.id };
  }

  static async terminateSession(sessionToken: string, reason: string): Promise<void> {
    const supabase = createClient();
    const { data } = await supabase.from('user_sessions').select('user_id, id').eq('session_token', sessionToken).maybeSingle();
    await supabase.from('user_sessions').update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: reason }).eq('session_token', sessionToken);
    if (data) {
      await AuditLogger.log({ eventType: AuditEventType.LOGOUT, severity: AuditSeverity.INFO, context: { userId: data.user_id, sessionId: data.id }, metadata: { action: 'terminate_session', reason } });
    }
  }

  static async terminateOtherSessions(userId: string, exceptSessionToken?: string): Promise<void> {
    const supabase = createClient();
    let query = supabase.from('user_sessions').update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'terminated_by_user' }).eq('user_id', userId).eq('is_active', true);
    if (exceptSessionToken) query = query.neq('session_token', exceptSessionToken);
    await query;
  }

  static async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('user_sessions').select('*').eq('user_id', userId).eq('is_active', true).order('last_activity', { ascending: false });
    if (error || !data) return [];
    return data.map((s) => ({
      id: s.id, sessionToken: s.session_token, deviceFingerprint: s.device_fingerprint,
      deviceName: s.device_name, browser: s.browser, os: s.os, ipAddress: s.ip_address,
      country: s.country, city: s.city, createdAt: new Date(s.created_at),
      lastActivity: new Date(s.last_activity), expiresAt: new Date(s.expires_at),
      isActive: s.is_active, isTrusted: s.is_trusted,
    }));
  }

  static async isAccountLocked(email: string): Promise<{ locked: boolean; until?: Date }> {
    const supabase = createClient();
    const { data } = await supabase.from('login_attempts').select('lockout_until').eq('email', email).eq('account_locked', true).order('attempted_at', { ascending: false }).limit(1).maybeSingle();
    if (!data?.lockout_until) return { locked: false };
    const lockoutUntil = new Date(data.lockout_until);
    return lockoutUntil > new Date() ? { locked: true, until: lockoutUntil } : { locked: false };
  }

  private static async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const supabase = createClient();
    const { data: sessions } = await supabase.from('user_sessions').select('id, created_at').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true });
    if (sessions && sessions.length >= this.MAX_CONCURRENT_SESSIONS) {
      const toTerminate = sessions.slice(0, sessions.length - this.MAX_CONCURRENT_SESSIONS + 1);
      await supabase.from('user_sessions').update({ is_active: false, logged_out_at: new Date().toISOString(), logout_reason: 'max_sessions_exceeded' }).in('id', toTerminate.map((s) => s.id));
    }
  }

  private static parseUserAgent(userAgent: string): { browser: string; os: string } {
    let browser = 'Unknown';
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    return { browser, os };
  }
}
