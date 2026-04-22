import { createClient } from '@/lib/supabase/client';
import { EncryptionService } from './encryption';

export enum AuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  DATA_READ = 'DATA_READ',
  DATA_CREATED = 'DATA_CREATED',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_DELETED = 'DATA_DELETED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_ALERT = 'SECURITY_ALERT',
  ENCRYPTION_KEY_ROTATED = 'ENCRYPTION_KEY_ROTATED',
  VAULT_ACCESS = 'VAULT_ACCESS',
  GDPR_DATA_REQUEST = 'GDPR_DATA_REQUEST',
  DATA_RETENTION_EXECUTED = 'DATA_RETENTION_EXECUTED',
  COMPLIANCE_REPORT_GENERATED = 'COMPLIANCE_REPORT_GENERATED',
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  SYSTEM_CONFIGURATION_CHANGED = 'SYSTEM_CONFIGURATION_CHANGED',
  CAPITAL_CALL_CREATED = 'CAPITAL_CALL_CREATED',
  DISTRIBUTION_PROCESSED = 'DISTRIBUTION_PROCESSED',
  NAV_CALCULATED = 'NAV_CALCULATED',
  FEE_CALCULATED = 'FEE_CALCULATED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditContext {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  sessionId?: string;
  deviceFingerprint?: string;
}

export interface AuditMetadata {
  resource?: string;
  resourceId?: string;
  action?: string;
  changes?: Record<string, unknown>;
  reason?: string;
  additionalData?: Record<string, unknown>;
}

export interface AuditEvent {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  timestamp: Date;
  context: AuditContext;
  metadata: AuditMetadata;
  previousHash?: string;
  currentHash?: string;
}

export class AuditLogger {
  private static previousHash: string | null = null;
  private static batchQueue: AuditEvent[] = [];
  private static batchSize = 10;
  private static batchTimeout: ReturnType<typeof setTimeout> | null = null;

  static async log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'previousHash' | 'currentHash'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date(),
      previousHash: this.previousHash ?? undefined,
    };
    auditEvent.currentHash = await this.computeHash(auditEvent);
    this.previousHash = auditEvent.currentHash;
    this.batchQueue.push(auditEvent);
    if (this.batchQueue.length >= this.batchSize) {
      await this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushBatch(), 5000);
    }
  }

  private static async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    const events = [...this.batchQueue];
    this.batchQueue = [];
    if (this.batchTimeout) { clearTimeout(this.batchTimeout); this.batchTimeout = null; }
    try {
      const supabase = createClient();
      await supabase.from('audit_logs').insert(
        events.map((e) => ({
          event_type: e.eventType,
          severity: e.severity,
          timestamp: e.timestamp.toISOString(),
          user_id: e.context.userId,
          tenant_id: e.context.tenantId,
          ip_address: e.context.ipAddress,
          user_agent: e.context.userAgent,
          session_id: e.context.sessionId,
          resource: e.metadata.resource,
          resource_id: e.metadata.resourceId,
          action: e.metadata.action,
          changes: e.metadata.changes,
          reason: e.metadata.reason,
          additional_data: e.metadata.additionalData,
          previous_hash: e.previousHash,
          current_hash: e.currentHash,
        }))
      );
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  }

  private static async computeHash(event: AuditEvent): Promise<string> {
    return EncryptionService.hash(JSON.stringify({
      eventType: event.eventType,
      timestamp: event.timestamp.toISOString(),
      context: event.context,
      metadata: event.metadata,
      previousHash: event.previousHash,
    }));
  }

  static async logLogin(userId: string, tenantId: string, context: Partial<AuditContext>, success: boolean): Promise<void> {
    await this.log({
      eventType: success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      context: { userId, tenantId, ...context },
      metadata: { action: 'login' },
    });
  }

  static async logDataAccess(resource: string, resourceId: string, action: 'read' | 'create' | 'update' | 'delete', context: AuditContext, changes?: Record<string, unknown>): Promise<void> {
    const eventTypeMap = { read: AuditEventType.DATA_READ, create: AuditEventType.DATA_CREATED, update: AuditEventType.DATA_UPDATED, delete: AuditEventType.DATA_DELETED };
    await this.log({ eventType: eventTypeMap[action], severity: action === 'delete' ? AuditSeverity.WARNING : AuditSeverity.INFO, context, metadata: { resource, resourceId, action, changes } });
  }

  static async logSecurityAlert(description: string, severity: AuditSeverity, context: AuditContext, additionalData?: Record<string, unknown>): Promise<void> {
    await this.log({ eventType: AuditEventType.SECURITY_ALERT, severity, context, metadata: { action: 'security_alert', reason: description, additionalData } });
  }

  static async logFinancialEvent(eventType: AuditEventType, resource: string, resourceId: string, context: AuditContext, amount?: number, additionalData?: Record<string, unknown>): Promise<void> {
    await this.log({ eventType, severity: AuditSeverity.WARNING, context, metadata: { resource, resourceId, additionalData: { amount, ...additionalData } } });
  }
}
