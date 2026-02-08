/**
 * Session Security Service
 *
 * Enhanced session management with:
 * - Device fingerprinting
 * - Geographic anomaly detection
 * - Concurrent session management
 * - Sliding session expiration
 * - Session hijacking detection
 */

import { supabase } from './supabase';
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
  private static readonly DEFAULT_SESSION_DURATION = 30; // minutes
  private static readonly INACTIVITY_TIMEOUT = 30; // minutes
  private static readonly MAX_CONCURRENT_SESSIONS = 5;
  private static readonly SUSPICIOUS_IP_CHANGE_THRESHOLD = 1000; // km

  /**
   * Creates a new session with security checks
   */
  static async createSession(config: SessionConfig): Promise<{ sessionToken: string; sessionId: string }> {
    const sessionToken = EncryptionService.generateToken(32);
    const sessionDuration = config.sessionDurationMinutes || this.DEFAULT_SESSION_DURATION;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + sessionDuration);

    // Get device info
    const deviceInfo = this.parseUserAgent(config.userAgent);

    // Check for concurrent sessions
    if (!config.allowConcurrentSessions) {
      await this.terminateOtherSessions(config.userId);
    } else {
      await this.enforceConcurrentSessionLimit(config.userId);
    }

    // Get geolocation data
    const geoData = await this.getGeolocation(config.ipAddress);

    // Create session record
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
        country: geoData?.country,
        city: geoData?.city,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        is_trusted: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    // Log session creation
    await AuditLogger.log({
      eventType: AuditEventType.LOGIN_SUCCESS,
      severity: AuditSeverity.INFO,
      context: {
        userId: config.userId,
        tenantId: config.tenantId,
        ipAddress: config.ipAddress,
        userAgent: config.userAgent,
        deviceFingerprint: config.deviceFingerprint,
        sessionId: data.id,
      },
      metadata: {
        action: 'create_session',
        resource: 'session',
        resourceId: data.id,
      },
    });

    return {
      sessionToken,
      sessionId: data.id,
    };
  }

  /**
   * Validates a session and checks for anomalies
   */
  static async validateSession(
    sessionToken: string,
    currentIp: string,
    currentFingerprint: string
  ): Promise<{ valid: boolean; session?: SessionInfo; reason?: string }> {
    const { data: session, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !session) {
      return { valid: false, reason: 'Session not found' };
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      await this.terminateSession(sessionToken, 'expired');
      return { valid: false, reason: 'Session expired' };
    }

    // Check for session hijacking - fingerprint mismatch
    if (session.device_fingerprint !== currentFingerprint) {
      await this.handleSuspiciousActivity(
        session.user_id,
        session.id,
        'fingerprint_mismatch',
        {
          expectedFingerprint: session.device_fingerprint,
          actualFingerprint: currentFingerprint,
        }
      );
      await this.terminateSession(sessionToken, 'suspicious_activity');
      return { valid: false, reason: 'Device fingerprint mismatch' };
    }

    // Check for suspicious IP change
    if (session.ip_address !== currentIp) {
      const suspicious = await this.detectSuspiciousIPChange(
        session.ip_address,
        currentIp,
        session.country || ''
      );

      if (suspicious) {
        await this.handleSuspiciousActivity(
          session.user_id,
          session.id,
          'suspicious_ip_change',
          {
            originalIp: session.ip_address,
            newIp: currentIp,
          }
        );
        return { valid: false, reason: 'Suspicious IP change detected' };
      }
    }

    // Update last activity
    await this.updateLastActivity(sessionToken);

    return {
      valid: true,
      session: {
        id: session.id,
        sessionToken: session.session_token,
        deviceFingerprint: session.device_fingerprint,
        deviceName: session.device_name,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ip_address,
        country: session.country,
        city: session.city,
        createdAt: new Date(session.created_at),
        lastActivity: new Date(session.last_activity),
        expiresAt: new Date(session.expires_at),
        isActive: session.is_active,
        isTrusted: session.is_trusted,
      },
    };
  }

  /**
   * Updates session last activity time (sliding expiration)
   */
  static async updateLastActivity(sessionToken: string): Promise<void> {
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + this.INACTIVITY_TIMEOUT);

    await supabase
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString(),
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('session_token', sessionToken);
  }

  /**
   * Terminates a specific session
   */
  static async terminateSession(sessionToken: string, reason: string): Promise<void> {
    const { data } = await supabase
      .from('user_sessions')
      .select('user_id, id')
      .eq('session_token', sessionToken)
      .maybeSingle();

    await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        logged_out_at: new Date().toISOString(),
        logout_reason: reason,
      })
      .eq('session_token', sessionToken);

    if (data) {
      await AuditLogger.log({
        eventType: AuditEventType.LOGOUT,
        severity: AuditSeverity.INFO,
        context: {
          userId: data.user_id,
          sessionId: data.id,
        },
        metadata: {
          action: 'terminate_session',
          reason,
        },
      });
    }
  }

  /**
   * Terminates all sessions for a user except the current one
   */
  static async terminateOtherSessions(userId: string, exceptSessionToken?: string): Promise<void> {
    let query = supabase
      .from('user_sessions')
      .update({
        is_active: false,
        logged_out_at: new Date().toISOString(),
        logout_reason: 'terminated_by_user',
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (exceptSessionToken) {
      query = query.neq('session_token', exceptSessionToken);
    }

    await query;
  }

  /**
   * Gets all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((session) => ({
      id: session.id,
      sessionToken: session.session_token,
      deviceFingerprint: session.device_fingerprint,
      deviceName: session.device_name,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ip_address,
      country: session.country,
      city: session.city,
      createdAt: new Date(session.created_at),
      lastActivity: new Date(session.last_activity),
      expiresAt: new Date(session.expires_at),
      isActive: session.is_active,
      isTrusted: session.is_trusted,
    }));
  }

  /**
   * Enforces maximum concurrent session limit
   */
  private static async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (sessions && sessions.length >= this.MAX_CONCURRENT_SESSIONS) {
      // Terminate oldest sessions
      const sessionsToTerminate = sessions.slice(0, sessions.length - this.MAX_CONCURRENT_SESSIONS + 1);

      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          logged_out_at: new Date().toISOString(),
          logout_reason: 'max_sessions_exceeded',
        })
        .in(
          'id',
          sessionsToTerminate.map((s) => s.id)
        );
    }
  }

  /**
   * Detects suspicious IP address changes
   */
  private static async detectSuspiciousIPChange(
    originalIp: string,
    newIp: string,
    originalCountry: string
  ): Promise<boolean> {
    // For now, simple check - different countries is suspicious
    // In production, use proper geolocation service to calculate distance
    const newGeoData = await this.getGeolocation(newIp);

    if (newGeoData?.country && originalCountry && newGeoData.country !== originalCountry) {
      return true;
    }

    return false;
  }

  /**
   * Handles suspicious activity detection
   */
  private static async handleSuspiciousActivity(
    userId: string,
    sessionId: string,
    activityType: string,
    details: Record<string, any>
  ): Promise<void> {
    // Log security alert
    await AuditLogger.logSecurityAlert(
      `Suspicious activity detected: ${activityType}`,
      AuditSeverity.WARNING,
      {
        userId,
        sessionId,
      },
      details
    );

    // Create security alert
    await supabase.from('security_alerts').insert({
      alert_type: 'SUSPICIOUS_LOGIN',
      severity: 'HIGH',
      user_id: userId,
      title: `Suspicious ${activityType} detected`,
      description: `Potential session hijacking or unauthorized access detected for session ${sessionId}`,
      metadata: details,
      status: 'open',
    });
  }

  /**
   * Records a login attempt
   */
  static async recordLoginAttempt(
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint: string,
    failureReason?: string,
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    // Check for brute force attack
    const { data: recentAttempts } = await supabase
      .from('login_attempts')
      .select('id')
      .eq('email', email)
      .eq('success', false)
      .gte('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

    const attemptCount = recentAttempts?.length || 0;
    const isAccountLocked = attemptCount >= 5;
    const isSuspicious = attemptCount >= 3;

    const suspicionReasons: string[] = [];
    let riskScore = 0;

    if (isSuspicious) {
      suspicionReasons.push('multiple_failed_attempts');
      riskScore += 30;
    }

    if (isAccountLocked) {
      suspicionReasons.push('account_locked');
      riskScore = 100;
    }

    await supabase.from('login_attempts').insert({
      email,
      user_id: userId,
      tenant_id: tenantId,
      success,
      failure_reason: failureReason,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
      is_suspicious: isSuspicious,
      suspicion_reasons: suspicionReasons,
      risk_score: riskScore,
      account_locked: isAccountLocked,
      lockout_until: isAccountLocked
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
        : null,
    });

    // Create security alert for brute force
    if (isAccountLocked) {
      await supabase.from('security_alerts').insert({
        alert_type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'CRITICAL',
        user_id: userId,
        title: 'Brute force attack detected',
        description: `Multiple failed login attempts detected for ${email}. Account has been locked.`,
        metadata: { email, ipAddress, attemptCount },
        status: 'open',
      });
    }
  }

  /**
   * Checks if an account is locked due to failed login attempts
   */
  static async isAccountLocked(email: string): Promise<{ locked: boolean; until?: Date }> {
    const { data } = await supabase
      .from('login_attempts')
      .select('lockout_until')
      .eq('email', email)
      .eq('account_locked', true)
      .order('attempted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data || !data.lockout_until) {
      return { locked: false };
    }

    const lockoutUntil = new Date(data.lockout_until);
    if (lockoutUntil > new Date()) {
      return { locked: true, until: lockoutUntil };
    }

    return { locked: false };
  }

  /**
   * Parses user agent string to extract device info
   */
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

  /**
   * Gets geolocation data for an IP address
   * In production, use a proper geolocation API like MaxMind or IP2Location
   */
  private static async getGeolocation(
    ipAddress: string
  ): Promise<{ country?: string; city?: string } | null> {
    // This is a placeholder - in production, integrate with a geolocation service
    // For now, return null
    return null;
  }

  /**
   * Cleans up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const { data } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        logged_out_at: new Date().toISOString(),
        logout_reason: 'expired',
      })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())
      .select();

    return data?.length || 0;
  }
}
