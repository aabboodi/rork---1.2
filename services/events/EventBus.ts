import EE from 'eventemitter3';

/**
 * PII Detection and Sanitization Utilities
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
};

/**
 * Sanitize PII from event payloads
 */
function sanitizePII(obj: any, depth = 0): any {
  if (depth > 10) return '[DEEP_OBJECT]'; // Prevent infinite recursion
  
  if (typeof obj === 'string') {
    let sanitized = obj;
    sanitized = sanitized.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.creditCard, '[CARD_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.ipAddress, '[IP_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.uuid, '[UUID_REDACTED]');
    return sanitized;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePII(item, depth + 1));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys entirely
      if (['password', 'token', 'secret', 'key', 'auth', 'credential'].some(sensitive => 
        key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[SENSITIVE_REDACTED]';
      } else {
        sanitized[key] = sanitizePII(value, depth + 1);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Event Security Configuration
 */
interface EventSecurityConfig {
  enablePIIProtection: boolean;
  enableEventLogging: boolean;
  enableRateLimiting: boolean;
  maxEventsPerSecond: number;
  trustedSources: Set<string>;
}

const DEFAULT_SECURITY_CONFIG: EventSecurityConfig = {
  enablePIIProtection: true,
  enableEventLogging: __DEV__,
  enableRateLimiting: true,
  maxEventsPerSecond: 100,
  trustedSources: new Set(['system', 'security', 'monitoring'])
};

/**
 * Event map defining all possible events and their payload types
 * This ensures type safety across the entire application
 * All events are designed to be PII-free by default
 */
export type EventMap = {
  // Security Events - PII-free by design
  'security:incident': { 
    severity: 'low' | 'medium' | 'high' | 'critical'; 
    type: string;
    incidentId: string; // Use incident ID instead of raw details
    category: 'authentication' | 'authorization' | 'data_access' | 'network' | 'malware' | 'other';
    timestamp: number;
    userHash?: string; // Hashed user identifier, not actual userId
    deviceFingerprint?: string; // Device fingerprint, not device details
  };
  'security:breach': {
    type: 'data' | 'access' | 'authentication' | 'authorization';
    severity: 'low' | 'medium' | 'high' | 'critical';
    breachId: string; // Unique breach identifier
    affectedSystems: string[]; // System names, not sensitive data
    timestamp: number;
    mitigationStatus: 'detected' | 'contained' | 'resolved';
  };
  'security:threat-detected': {
    threatType: 'malware' | 'phishing' | 'injection' | 'brute_force' | 'anomaly' | 'other';
    confidence: number; // 0-1 confidence score
    threatId: string; // Unique threat identifier
    sourceCategory: 'network' | 'application' | 'user_behavior' | 'system';
    timestamp: number;
    riskScore: number; // Calculated risk score
  };
  'security:key-rotation': {
    keyId: string;
    status: 'started' | 'completed' | 'failed';
    timestamp: number;
  };
  'security:device-binding': {
    deviceId: string;
    action: 'bound' | 'unbound' | 'verification-failed';
    timestamp: number;
  };
  'security:alert': { 
    level: string; 
    message: string; 
    source: string;
    timestamp: number;
  };
  
  // Monitoring Events
  'monitor:metric': { 
    name: string; 
    value: number; 
    tags?: Record<string, string>;
    timestamp: number;
  };
  'monitor:performance': {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: any;
    timestamp: number;
  };
  'monitor:error': {
    error: Error;
    context: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
  };
  'monitor:health-check': {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: any;
    timestamp: number;
  };
  'performance:metric': { 
    metric: string; 
    value: number; 
    timestamp: number;
  };
  
  // AI/ML Events
  'ai:model-loaded': {
    modelId: string;
    modelType: string;
    loadTime: number;
    timestamp: number;
  };
  'ai:inference-completed': {
    modelId: string;
    inputSize: number;
    outputSize: number;
    duration: number;
    timestamp: number;
  };
  'ai:inference': { 
    model: string; 
    latency: number; 
    accuracy?: number;
    timestamp: number;
  };
  'ai:training-started': {
    modelId: string;
    datasetSize: number;
    timestamp: number;
  };
  'ai:training-completed': {
    modelId: string;
    accuracy?: number;
    loss?: number;
    duration: number;
    timestamp: number;
  };
  
  // User Events
  'user:login': {
    userHash: string; // Hashed user identifier
    method: 'password' | 'biometric' | 'mfa' | 'sso';
    deviceFingerprint: string; // Device fingerprint, not actual device ID
    sessionId: string; // Session identifier
    timestamp: number;
    location?: {
      country?: string; // Only country-level location
      timezone?: string;
    };
  };
  'user:logout': {
    userHash: string; // Hashed user identifier
    sessionId: string;
    reason: 'manual' | 'timeout' | 'security' | 'device_change';
    sessionDuration: number; // Session length in milliseconds
    timestamp: number;
  };
  'user:action': {
    userHash: string; // Hashed user identifier
    action: string; // Action type (no sensitive data)
    category: 'navigation' | 'transaction' | 'settings' | 'content' | 'security';
    sessionId: string;
    timestamp: number;
    metadata?: Record<string, string | number | boolean>; // Only primitive types
  };
  
  // System Events
  'system:startup': {
    version: string;
    environment: string;
    timestamp: number;
  };
  'system:shutdown': {
    reason: string;
    timestamp: number;
  };
  'system:config-changed': {
    key: string;
    oldValue?: any;
    newValue: any;
    timestamp: number;
  };
  'system:health': { 
    component: string; 
    status: 'healthy' | 'degraded' | 'critical';
    timestamp: number;
  };
  
  // Network Events
  'network:request': {
    url: string;
    method: string;
    statusCode?: number;
    duration?: number;
    timestamp: number;
  };
  'network:error': {
    url: string;
    error: string;
    timestamp: number;
  };
  
  // Data Events
  'data:sync-started': {
    type: string;
    timestamp: number;
  };
  'data:sync-completed': {
    type: string;
    recordsProcessed: number;
    duration: number;
    timestamp: number;
  };
  'data:backup-created': {
    backupId: string;
    size: number;
    timestamp: number;
  };
};

/**
 * Centralized Event Bus for React Native/Expo applications
 * Replaces Node.js EventEmitter with a mobile-compatible solution
 * 
 * Features:
 * - Type-safe event handling
 * - Singleton pattern for global access
 * - Memory leak prevention
 * - Performance monitoring
 * - Error handling
 * - PII protection and sanitization
 * - Rate limiting and security controls
 * - Event audit logging
 */
export class EventBus {
  private static _inst: EventBus;
  private ee = new EE();
  private listenerCounts = new Map<string, number>();
  private maxListeners = 50; // Prevent memory leaks
  private securityConfig: EventSecurityConfig = { ...DEFAULT_SECURITY_CONFIG };
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private eventAuditLog: { event: string; timestamp: number; source?: string }[] = [];
  private maxAuditLogSize = 1000;
  
  /**
   * Get the singleton instance of EventBus
   */
  static get instance(): EventBus {
    if (!EventBus._inst) {
      EventBus._inst = new EventBus();
    }
    return EventBus._inst;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Set up error handling for the event emitter
    this.ee.on('error', (error: Error) => {
      console.error('[EventBus] Error in event handler:', error);
      // Log security-relevant errors
      this.auditLog('error', 'system');
    });
    
    // Clean up rate limit map periodically
    setInterval(() => this.cleanupRateLimits(), 60000); // Every minute
    
    // Clean up audit log periodically
    setInterval(() => this.cleanupAuditLog(), 300000); // Every 5 minutes
  }
  
  /**
   * Subscribe to an event with type safety
   */
  on<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void): void {
    // Check listener count to prevent memory leaks
    const currentCount = this.listenerCounts.get(evt as string) || 0;
    if (currentCount >= this.maxListeners) {
      console.warn(`[EventBus] Maximum listeners (${this.maxListeners}) reached for event: ${evt as string}`);
      return;
    }
    
    this.ee.on(evt as string, fn as any);
    this.listenerCounts.set(evt as string, currentCount + 1);
  }
  
  /**
   * Subscribe to an event once with type safety
   */
  once<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void): void {
    const wrappedListener = (payload: EventMap[K]) => {
      const currentCount = this.listenerCounts.get(evt as string) || 0;
      this.listenerCounts.set(evt as string, Math.max(0, currentCount - 1));
      fn(payload);
    };
    
    this.ee.once(evt as string, wrappedListener as any);
    const currentCount = this.listenerCounts.get(evt as string) || 0;
    this.listenerCounts.set(evt as string, currentCount + 1);
  }
  
  /**
   * Unsubscribe from an event with type safety
   */
  off<K extends keyof EventMap>(evt: K, fn: (p: EventMap[K]) => void): void {
    this.ee.off(evt as string, fn as any);
    const currentCount = this.listenerCounts.get(evt as string) || 0;
    this.listenerCounts.set(evt as string, Math.max(0, currentCount - 1));
  }
  
  /**
   * Emit an event with type safety, PII protection, and security controls
   */
  emit<K extends keyof EventMap>(evt: K, payload: EventMap[K], source?: string): void {
    try {
      // Rate limiting check
      if (this.securityConfig.enableRateLimiting && !this.checkRateLimit(evt as string)) {
        console.warn(`[EventBus] Rate limit exceeded for event: ${evt as string}`);
        return;
      }
      
      // Ensure timestamp is set if not provided
      if (!payload.timestamp) {
        (payload as any).timestamp = Date.now();
      }
      
      // PII sanitization
      let sanitizedPayload = payload;
      if (this.securityConfig.enablePIIProtection) {
        sanitizedPayload = sanitizePII(payload) as EventMap[K];
      }
      
      // Audit logging
      this.auditLog(evt as string, source);
      
      // Security event validation
      this.validateEventSecurity(evt as string, sanitizedPayload, source);
      
      // Emit the sanitized event
      this.ee.emit(evt as string, sanitizedPayload);
      
      // Log in development mode
      if (this.securityConfig.enableEventLogging) {
        console.log(`[EventBus] Event emitted: ${evt as string}`, {
          source,
          timestamp: sanitizedPayload.timestamp,
          payloadKeys: Object.keys(sanitizedPayload)
        });
      }
    } catch (error) {
      console.error(`[EventBus] Error emitting event ${evt as string}:`, error);
      this.auditLog('emit_error', source);
    }
  }
  
  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners<K extends keyof EventMap>(evt?: K): void {
    if (evt) {
      this.ee.removeAllListeners(evt as string);
      this.listenerCounts.set(evt as string, 0);
    } else {
      this.ee.removeAllListeners();
      this.listenerCounts.clear();
    }
  }
  
  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof EventMap>(evt: K): number {
    return this.ee.listenerCount(evt as string);
  }
  
  /**
   * Get all event names that have listeners
   */
  eventNames(): (keyof EventMap)[] {
    return this.ee.eventNames() as (keyof EventMap)[];
  }
  
  /**
   * Set the maximum number of listeners per event
   */
  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }
  
  /**
   * Get performance statistics
   */
  getStats(): {
    totalEvents: number;
    activeListeners: number;
    eventCounts: Record<string, number>;
  } {
    const eventCounts: Record<string, number> = {};
    let totalListeners = 0;
    
    for (const [event, count] of this.listenerCounts.entries()) {
      eventCounts[event] = count;
      totalListeners += count;
    }
    
    return {
      totalEvents: this.listenerCounts.size,
      activeListeners: totalListeners,
      eventCounts
    };
  }
  
  /**
   * Clear all listeners and reset the event bus
   * Useful for testing or app reset scenarios
   */
  reset(): void {
    this.removeAllListeners();
    this.listenerCounts.clear();
    this.rateLimitMap.clear();
    this.eventAuditLog = [];
  }
  
  /**
   * Configure security settings
   */
  configureSecurity(config: Partial<EventSecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
  }
  
  /**
   * Check rate limiting for events
   */
  private checkRateLimit(eventType: string): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / 1000) * 1000; // 1-second window
    
    const rateLimit = this.rateLimitMap.get(eventType);
    if (!rateLimit || rateLimit.resetTime < windowStart) {
      this.rateLimitMap.set(eventType, { count: 1, resetTime: windowStart + 1000 });
      return true;
    }
    
    if (rateLimit.count >= this.securityConfig.maxEventsPerSecond) {
      return false;
    }
    
    rateLimit.count++;
    return true;
  }
  
  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [eventType, rateLimit] of this.rateLimitMap.entries()) {
      if (rateLimit.resetTime < now) {
        this.rateLimitMap.delete(eventType);
      }
    }
  }
  
  /**
   * Audit log for security monitoring
   */
  private auditLog(eventType: string, source?: string): void {
    this.eventAuditLog.push({
      event: eventType,
      timestamp: Date.now(),
      source
    });
    
    // Keep audit log size manageable
    if (this.eventAuditLog.length > this.maxAuditLogSize) {
      this.eventAuditLog = this.eventAuditLog.slice(-this.maxAuditLogSize / 2);
    }
  }
  
  /**
   * Clean up old audit log entries
   */
  private cleanupAuditLog(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.eventAuditLog = this.eventAuditLog.filter(entry => entry.timestamp > cutoff);
  }
  
  /**
   * Validate event security based on source and content
   */
  private validateEventSecurity(eventType: string, payload: any, source?: string): void {
    // Check if source is trusted for sensitive events
    if (eventType.startsWith('security:') || eventType.startsWith('system:')) {
      if (source && !this.securityConfig.trustedSources.has(source)) {
        console.warn(`[EventBus] Untrusted source '${source}' attempting to emit sensitive event: ${eventType}`);
      }
    }
    
    // Additional payload validation for critical events
    if (eventType.includes('breach') || eventType.includes('incident')) {
      if (!payload.timestamp || typeof payload.timestamp !== 'number') {
        throw new Error(`[EventBus] Security event ${eventType} missing valid timestamp`);
      }
    }
  }
  
  /**
   * Get security audit information
   */
  getSecurityAudit(): {
    recentEvents: { event: string; timestamp: number; source?: string }[];
    rateLimitStatus: Record<string, { count: number; resetTime: number }>;
    securityConfig: EventSecurityConfig;
  } {
    const rateLimitStatus: Record<string, { count: number; resetTime: number }> = {};
    for (const [eventType, rateLimit] of this.rateLimitMap.entries()) {
      rateLimitStatus[eventType] = { ...rateLimit };
    }
    
    return {
      recentEvents: [...this.eventAuditLog].slice(-50), // Last 50 events
      rateLimitStatus,
      securityConfig: { ...this.securityConfig }
    };
  }
  
  /**
   * Manually sanitize data (utility function)
   */
  static sanitizePII(data: any): any {
    return sanitizePII(data);
  }
}

/**
 * Convenience function to get the EventBus instance
 */
export const eventBus = EventBus.instance;

/**
 * Type-safe event emitter hook for React components
 */
export function useEventBus() {
  return {
    on: EventBus.instance.on.bind(EventBus.instance),
    once: EventBus.instance.once.bind(EventBus.instance),
    off: EventBus.instance.off.bind(EventBus.instance),
    emit: EventBus.instance.emit.bind(EventBus.instance),
    removeAllListeners: EventBus.instance.removeAllListeners.bind(EventBus.instance),
    configureSecurity: EventBus.instance.configureSecurity.bind(EventBus.instance),
    getSecurityAudit: EventBus.instance.getSecurityAudit.bind(EventBus.instance)
  };
}

/**
 * Security-focused event emitter for sensitive operations
 * Automatically includes source tracking and enhanced validation
 */
export function useSecureEventBus(source: string) {
  return {
    on: EventBus.instance.on.bind(EventBus.instance),
    once: EventBus.instance.once.bind(EventBus.instance),
    off: EventBus.instance.off.bind(EventBus.instance),
    emit: <K extends keyof EventMap>(evt: K, payload: EventMap[K]) => 
      EventBus.instance.emit(evt, payload, source),
    removeAllListeners: EventBus.instance.removeAllListeners.bind(EventBus.instance)
  };
}

export default EventBus;