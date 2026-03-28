export type SecurityEventType =
  | 'login_attempt'
  | 'biometric_auth'
  | 'data_access'
  | 'security_violation'
  | 'tampering_detected'
  | 'runtime_protection'
  | 'server_validation_failed'
  | 'financial_transaction'
  | 'ledger_integrity'
  | 'fraud_detection'
  | 'acid_violation'
  | 'keychain_access'
  | 'secure_enclave_operation'
  | 'incident_created'
  | 'soc_alert'
  | 'devsecops_pipeline'
  | 'xss_protection'
  | 'csrf_protection'
  | 'cookie_security'
  | 'e2ee_message'
  | 'key_exchange'
  | 'message_encryption'
  | 'message_decryption'
  | 'forward_secrecy';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  details: unknown;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  mitigationAction?: string;
  serverReported?: boolean;
  transactionId?: string;
  ledgerHash?: string;
  integrityVerified?: boolean;
  secureEnclaveUsed?: boolean;
  keychainProtected?: boolean;
  incidentId?: string;
  alertId?: string;
  pipelineId?: string;
}

export type SecurityEventListener = (event: SecurityEvent) => void;

class SecurityEventBus {
  private listeners: Set<SecurityEventListener> = new Set();
  private buffer: SecurityEvent[] = [];
  private readonly maxBuffer = 1000;

  publish(event: SecurityEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer = this.buffer.slice(-this.maxBuffer);
    }
    for (const cb of this.listeners) {
      try {
        cb(event);
      } catch (e) {
        console.error('SecurityEvent listener error', e);
      }
    }
  }

  subscribe(listener: SecurityEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecent(severity?: SecurityEvent['severity']): SecurityEvent[] {
    if (!severity) return [...this.buffer];
    return this.buffer.filter(e => e.severity === severity);
  }
}

export const securityEventBus = new SecurityEventBus();
