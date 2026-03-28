import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'security' | 'performance' | 'business' | 'system' | 'audit' | 'compliance';
  source: string;
  message: string;
  metadata: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  tags: string[];
  environment: 'development' | 'staging' | 'production';
  version: string;
  platform: string;
  deviceInfo?: DeviceInfo;
  location?: LocationInfo;
  correlationId?: string;
}

interface DeviceInfo {
  deviceId: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  model?: string;
  manufacturer?: string;
  isEmulator?: boolean;
  isRooted?: boolean;
}

interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  ip?: string;
}

interface LoggingProvider {
  name: string;
  type: 'elk' | 'datadog' | 'sentry' | 'splunk' | 'cloudwatch' | 'custom';
  enabled: boolean;
  config: Record<string, any>;
  endpoint?: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number; // milliseconds
  retryAttempts: number;
  timeout: number;
}

interface LoggingConfiguration {
  providers: LoggingProvider[];
  globalTags: string[];
  sampling: {
    enabled: boolean;
    rate: number; // 0-1
    rules: SamplingRule[];
  };
  filtering: {
    enabled: boolean;
    rules: FilterRule[];
  };
  enrichment: {
    enabled: boolean;
    includeDeviceInfo: boolean;
    includeLocationInfo: boolean;
    includeUserContext: boolean;
    customEnrichers: string[];
  };
  retention: {
    local: number; // days
    remote: number; // days
  };
  privacy: {
    maskPII: boolean;
    excludeFields: string[];
    hashUserIds: boolean;
  };
  performance: {
    maxBatchSize: number;
    maxQueueSize: number;
    compressionEnabled: boolean;
    asyncProcessing: boolean;
  };
}

interface SamplingRule {
  condition: string;
  rate: number;
  priority: number;
}

interface FilterRule {
  condition: string;
  action: 'include' | 'exclude' | 'transform';
  transformation?: string;
  priority: number;
}

interface LogMetrics {
  totalLogs: number;
  logsByLevel: Record<LogEntry['level'], number>;
  logsByCategory: Record<LogEntry['category'], number>;
  logsBySource: Record<string, number>;
  errorRate: number;
  averageProcessingTime: number;
  queueSize: number;
  failedDeliveries: number;
  successfulDeliveries: number;
  lastFlushTime: number;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // milliseconds
  actions: AlertAction[];
  lastTriggered?: number;
}

interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'incident' | 'notification';
  config: Record<string, any>;
}

class CentralizedLoggingService {
  private static instance: CentralizedLoggingService;
  private configuration: LoggingConfiguration;
  private logQueue: LogEntry[] = [];
  private metrics: LogMetrics;
  private alertRules: Map<string, AlertRule> = new Map();
  
  // Processing state
  private isProcessing: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private serviceActive: boolean = false;
  private isAlertDispatching: boolean = false;
  
  // Providers
  private providers: Map<string, LoggingProvider> = new Map();
  
  // Context
  private currentUserId?: string;
  private currentSessionId?: string;
  private deviceInfo?: DeviceInfo;

  private constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.metrics = this.initializeMetrics();
    this.initializeDefaultProviders();
    this.initializeDefaultAlertRules();
  }

  static getInstance(): CentralizedLoggingService {
    if (!CentralizedLoggingService.instance) {
      CentralizedLoggingService.instance = new CentralizedLoggingService();
    }
    return CentralizedLoggingService.instance;
  }

  // ===== INITIALIZATION =====

  async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();
      await this.initializeDeviceInfo();
      await this.startLogProcessing();
      this.serviceActive = true;
      
      // Log service initialization
      this.log('info', 'system', 'Centralized Logging Service initialized', {
        providers: Array.from(this.providers.keys()),
        configuration: this.configuration
      });
      
      console.log('📊 Centralized Logging Service initialized');
    } catch (error) {
      console.error('Failed to initialize Centralized Logging Service:', error);
      throw error;
    }
  }

  private getDefaultConfiguration(): LoggingConfiguration {
    return {
      providers: [],
      globalTags: ['mobile_app', 'react_native'],
      sampling: {
        enabled: true,
        rate: 1.0, // Log everything in development
        rules: [
          {
            condition: 'level = debug',
            rate: 0.1, // Sample 10% of debug logs
            priority: 1
          },
          {
            condition: 'level = error OR level = critical',
            rate: 1.0, // Always log errors
            priority: 10
          }
        ]
      },
      filtering: {
        enabled: true,
        rules: [
          {
            condition: 'category = security AND level = critical',
            action: 'include',
            priority: 10
          },
          {
            condition: 'message CONTAINS password',
            action: 'exclude',
            priority: 5
          }
        ]
      },
      enrichment: {
        enabled: true,
        includeDeviceInfo: true,
        includeLocationInfo: false, // Privacy consideration
        includeUserContext: true,
        customEnrichers: []
      },
      retention: {
        local: 7, // 7 days local storage
        remote: 90 // 90 days remote storage
      },
      privacy: {
        maskPII: true,
        excludeFields: ['password', 'token', 'secret', 'key'],
        hashUserIds: true
      },
      performance: {
        maxBatchSize: 100,
        maxQueueSize: 1000,
        compressionEnabled: true,
        asyncProcessing: true
      }
    };
  }

  private initializeMetrics(): LogMetrics {
    return {
      totalLogs: 0,
      logsByLevel: { debug: 0, info: 0, warn: 0, error: 0, critical: 0 },
      logsByCategory: { security: 0, performance: 0, business: 0, system: 0, audit: 0, compliance: 0 },
      logsBySource: {},
      errorRate: 0,
      averageProcessingTime: 0,
      queueSize: 0,
      failedDeliveries: 0,
      successfulDeliveries: 0,
      lastFlushTime: 0
    };
  }

  private initializeDefaultProviders(): void {
    // ELK Stack Provider
    const elkProvider: LoggingProvider = {
      name: 'elk_stack',
      type: 'elk',
      enabled: false, // Disabled by default - requires configuration
      config: {
        elasticsearchUrl: 'https://elasticsearch.example.com',
        index: 'mobile-app-logs',
        username: '',
        password: ''
      },
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      retryAttempts: 3,
      timeout: 10000
    };

    // Datadog Provider
    const datadogProvider: LoggingProvider = {
      name: 'datadog',
      type: 'datadog',
      enabled: false,
      config: {
        site: 'datadoghq.com',
        service: 'mobile-app',
        env: 'production'
      },
      endpoint: 'https://http-intake.logs.datadoghq.com/v1/input',
      batchSize: 100,
      flushInterval: 15000, // 15 seconds
      retryAttempts: 3,
      timeout: 10000
    };

    // Sentry Provider
    const sentryProvider: LoggingProvider = {
      name: 'sentry',
      type: 'sentry',
      enabled: false,
      config: {
        dsn: '',
        environment: 'production',
        release: '1.0.0'
      },
      batchSize: 25,
      flushInterval: 10000, // 10 seconds
      retryAttempts: 3,
      timeout: 5000
    };

    // Local Storage Provider (always enabled for development)
    const localProvider: LoggingProvider = {
      name: 'local_storage',
      type: 'custom',
      enabled: true,
      config: {
        maxSize: 10 * 1024 * 1024, // 10MB
        compression: true
      },
      batchSize: 50,
      flushInterval: 60000, // 1 minute
      retryAttempts: 1,
      timeout: 1000
    };

    this.providers.set(elkProvider.name, elkProvider);
    this.providers.set(datadogProvider.name, datadogProvider);
    this.providers.set(sentryProvider.name, sentryProvider);
    this.providers.set(localProvider.name, localProvider);
  }

  private initializeDefaultAlertRules(): void {
    const criticalErrorRule: AlertRule = {
      id: 'critical_errors',
      name: 'Critical Error Alert',
      description: 'Alert when critical errors occur',
      condition: 'level = critical',
      severity: 'critical',
      enabled: true,
      cooldown: 5 * 60 * 1000, // 5 minutes
      actions: [
        {
          type: 'incident',
          config: {
            severity: 'critical',
            category: 'system_compromise'
          }
        }
      ]
    };

    const securityViolationRule: AlertRule = {
      id: 'security_violations',
      name: 'Security Violation Alert',
      description: 'Alert on security-related events',
      condition: 'category = security AND level IN (error, critical)',
      severity: 'high',
      enabled: true,
      cooldown: 2 * 60 * 1000, // 2 minutes
      actions: [
        {
          type: 'incident',
          config: {
            severity: 'high',
            category: 'unauthorized_access'
          }
        }
      ]
    };

    this.alertRules.set(criticalErrorRule.id, criticalErrorRule);
    this.alertRules.set(securityViolationRule.id, securityViolationRule);
  }

  private async initializeDeviceInfo(): Promise<void> {
    try {
      this.deviceInfo = {
        deviceId: await this.getDeviceId(),
        platform: Platform.OS,
        osVersion: String((Platform as any).Version ?? 'web'),
        appVersion: '1.0.0', // Would get from app config
        isEmulator: await this.isEmulator(),
        isRooted: await this.isRooted()
      };
    } catch (error) {
      console.error('Failed to initialize device info:', error);
    }
  }

  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      return `fallback_${Date.now()}`;
    }
  }

  private async isEmulator(): Promise<boolean> {
    // Mock implementation - in production, use proper device detection
    return Platform.OS === 'web' || __DEV__;
  }

  private async isRooted(): Promise<boolean> {
    // Mock implementation - in production, use proper root detection
    return false;
  }

  // ===== LOGGING API =====

  log(
    level: LogEntry['level'],
    source: string,
    message: string,
    metadata: Record<string, any> = {},
    category: LogEntry['category'] = 'system'
  ): void {
    try {
      const logEntry = this.createLogEntry(level, source, message, metadata, category);
      
      // Apply sampling
      if (!this.shouldSample(logEntry)) {
        return;
      }
      
      // Apply filtering
      if (!this.shouldInclude(logEntry)) {
        return;
      }
      
      // Enrich log entry
      this.enrichLogEntry(logEntry);
      
      // Add to queue
      this.addToQueue(logEntry);
      
      // Update metrics
      this.updateMetrics(logEntry);
      
      // Check alert rules
      this.checkAlertRules(logEntry);
      
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  debug(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('debug', source, message, metadata);
  }

  info(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('info', source, message, metadata);
  }

  warn(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('warn', source, message, metadata);
  }

  error(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('error', source, message, metadata);
  }

  critical(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('critical', source, message, metadata);
  }

  // Specialized logging methods
  logSecurity(level: LogEntry['level'], source: string, message: string, metadata?: Record<string, any>): void {
    this.log(level, source, message, metadata, 'security');
  }

  logPerformance(level: LogEntry['level'], source: string, message: string, metadata?: Record<string, any>): void {
    this.log(level, source, message, metadata, 'performance');
  }

  logAudit(level: LogEntry['level'], source: string, message: string, metadata?: Record<string, any>): void {
    this.log(level, source, message, metadata, 'audit');
  }

  logCompliance(level: LogEntry['level'], source: string, message: string, metadata?: Record<string, any>): void {
    this.log(level, source, message, metadata, 'compliance');
  }

  // ===== LOG PROCESSING =====

  private createLogEntry(
    level: LogEntry['level'],
    source: string,
    message: string,
    metadata: Record<string, any>,
    category: LogEntry['category']
  ): LogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      source,
      message: this.sanitizeMessage(message),
      metadata: this.sanitizeMetadata(metadata),
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
      tags: [...this.configuration.globalTags],
      environment: __DEV__ ? 'development' : 'production',
      version: '1.0.0',
      platform: Platform.OS,
      deviceInfo: this.deviceInfo,
      correlationId: this.generateCorrelationId()
    };
  }

  private sanitizeMessage(message: string): string {
    if (!this.configuration.privacy.maskPII) {
      return message;
    }
    
    // Mask common PII patterns
    let sanitized = message;
    
    // Email addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    
    // Phone numbers
    sanitized = sanitized.replace(/\b\d{3}-?\d{3}-?\d{4}\b/g, '[PHONE]');
    
    // Credit card numbers
    sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
    
    return sanitized;
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    
    // Remove excluded fields
    for (const field of this.configuration.privacy.excludeFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    // Hash user IDs if configured
    if (this.configuration.privacy.hashUserIds && sanitized.userId) {
      sanitized.userId = this.hashValue(sanitized.userId);
    }
    
    return sanitized;
  }

  private hashValue(value: string): string {
    // Simple hash function - in production, use proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldSample(logEntry: LogEntry): boolean {
    if (!this.configuration.sampling.enabled) {
      return true;
    }
    
    // Check sampling rules
    for (const rule of this.configuration.sampling.rules) {
      if (this.evaluateCondition(rule.condition, logEntry)) {
        return Math.random() < rule.rate;
      }
    }
    
    // Default sampling rate
    return Math.random() < this.configuration.sampling.rate;
  }

  private shouldInclude(logEntry: LogEntry): boolean {
    if (!this.configuration.filtering.enabled) {
      return true;
    }
    
    // Apply filter rules in priority order
    const sortedRules = this.configuration.filtering.rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition, logEntry)) {
        return rule.action === 'include';
      }
    }
    
    return true; // Include by default
  }

  private evaluateCondition(condition: string, logEntry: LogEntry): boolean {
    // Simple condition evaluation - in production, use proper expression parser
    try {
      // Replace placeholders with actual values
      let evaluableCondition = condition
        .replace(/level/g, `"${logEntry.level}"`)
        .replace(/category/g, `"${logEntry.category}"`)
        .replace(/source/g, `"${logEntry.source}"`)
        .replace(/message/g, `"${logEntry.message}"`)
        .replace(/CONTAINS/g, 'includes')
        .replace(/IN \(([^)]+)\)/g, (match, values) => {
          const valueArray = values.split(',').map((v: string) => v.trim().replace(/"/g, ''));
          return `in [${valueArray.map((v: string) => `"${v}"`).join(',')}]`;
        });
      
      // Basic evaluation for common patterns
      if (condition.includes('level = debug')) return logEntry.level === 'debug';
      if (condition.includes('level = error')) return logEntry.level === 'error';
      if (condition.includes('level = critical')) return logEntry.level === 'critical';
      if (condition.includes('category = security')) return logEntry.category === 'security';
      if (condition.includes('message CONTAINS password')) return logEntry.message.toLowerCase().includes('password');
      
      return false;
    } catch (error) {
      console.error('Failed to evaluate condition:', condition, error);
      return false;
    }
  }

  private enrichLogEntry(logEntry: LogEntry): void {
    if (!this.configuration.enrichment.enabled) {
      return;
    }
    
    // Add device info
    if (this.configuration.enrichment.includeDeviceInfo && this.deviceInfo) {
      logEntry.deviceInfo = this.deviceInfo;
    }
    
    // Add location info (if enabled and available)
    if (this.configuration.enrichment.includeLocationInfo) {
      logEntry.location = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
    
    // Add user context
    if (this.configuration.enrichment.includeUserContext) {
      logEntry.userId = this.currentUserId;
      logEntry.sessionId = this.currentSessionId;
    }
  }

  private addToQueue(logEntry: LogEntry): void {
    // Check queue size limit
    if (this.logQueue.length >= this.configuration.performance.maxQueueSize) {
      // Remove oldest entries
      this.logQueue.splice(0, this.logQueue.length - this.configuration.performance.maxQueueSize + 1);
    }
    
    this.logQueue.push(logEntry);
    
    // Trigger immediate flush for critical logs
    if (logEntry.level === 'critical') {
      this.flushLogs();
    }
  }

  private updateMetrics(logEntry: LogEntry): void {
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[logEntry.level]++;
    this.metrics.logsByCategory[logEntry.category]++;
    
    if (!this.metrics.logsBySource[logEntry.source]) {
      this.metrics.logsBySource[logEntry.source] = 0;
    }
    this.metrics.logsBySource[logEntry.source]++;
    
    this.metrics.queueSize = this.logQueue.length;
    
    // Calculate error rate
    const errorLogs = this.metrics.logsByLevel.error + this.metrics.logsByLevel.critical;
    this.metrics.errorRate = this.metrics.totalLogs > 0 ? errorLogs / this.metrics.totalLogs : 0;
  }

  private checkAlertRules(logEntry: LogEntry): void {
    if (this.isAlertDispatching) {
      return;
    }
    const now = Date.now();
    
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldown) {
        continue;
      }
      
      // Evaluate condition
      if (this.evaluateCondition(rule.condition, logEntry)) {
        this.triggerAlert(rule, logEntry);
      }
    }
  }

  private async triggerAlert(rule: AlertRule, logEntry: LogEntry): Promise<void> {
    try {
      this.isAlertDispatching = true;
      rule.lastTriggered = Date.now();
      
      console.warn(`🚨 Alert triggered: ${rule.name} - ${logEntry.message}`);
      
      // Execute alert actions
      for (const action of rule.actions) {
        await this.executeAlertAction(action, rule, logEntry);
      }
      
    } catch (error) {
      console.error(`Failed to trigger alert ${rule.id}:`, error);
    } finally {
      this.isAlertDispatching = false;
    }
  }

  private async executeAlertAction(action: AlertAction, rule: AlertRule, logEntry: LogEntry): Promise<void> {
    try {
      switch (action.type) {
        case 'incident': {
          let incidentService: any = null;
          try {
            const mod: any = await import('./IncidentResponseService');
            const maybeService = mod?.default?.getInstance?.();
            if (maybeService) {
              incidentService = maybeService;
            } else {
              console.warn('IncidentResponseService not ready, skipping incident creation');
              return;
            }
          } catch (e) {
            console.warn('Failed to dynamically load IncidentResponseService, skipping incident creation', e);
            return;
          }

          await incidentService.createIncident(
            `Alert: ${rule.name}`,
            `Alert triggered by log entry: ${logEntry.message}`,
            (action.config?.severity as any) || 'medium',
            (action.config?.category as any) || 'system_compromise',
            [{
              type: 'behavior_pattern',
              value: logEntry.source,
              confidence: 'high',
              source: 'centralized_logging',
              firstSeen: logEntry.timestamp,
              lastSeen: logEntry.timestamp,
              isMalicious: true
            }]
          );
          break;
        }
        case 'notification':
          console.log(`📧 Notification: ${rule.name} - ${logEntry.message}`);
          break;
        default:
          console.log(`Unknown alert action: ${action.type}`);
      }
    } catch (err) {
      console.error('executeAlertAction failed', err);
    }
  }

  // ===== LOG DELIVERY =====

  private async startLogProcessing(): Promise<void> {
    // Start periodic flushing
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, 30000); // Flush every 30 seconds
    
    console.log('📤 Log processing started');
  }

  private async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      // Get logs to flush
      const logsToFlush = this.logQueue.splice(0, this.configuration.performance.maxBatchSize);
      
      // Send to each enabled provider
      const deliveryPromises = Array.from(this.providers.values())
        .filter(provider => provider.enabled)
        .map(provider => this.deliverToProvider(provider, logsToFlush));
      
      await Promise.allSettled(deliveryPromises);
      
      this.metrics.lastFlushTime = Date.now();
      this.metrics.averageProcessingTime = Date.now() - startTime;
      
    } catch (error) {
      console.error('Failed to flush logs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async deliverToProvider(provider: LoggingProvider, logs: LogEntry[]): Promise<void> {
    try {
      switch (provider.type) {
        case 'elk':
          await this.deliverToELK(provider, logs);
          break;
        case 'datadog':
          await this.deliverToDatadog(provider, logs);
          break;
        case 'sentry':
          await this.deliverToSentry(provider, logs);
          break;
        case 'custom':
          if (provider.name === 'local_storage') {
            await this.deliverToLocalStorage(provider, logs);
          }
          break;
        default:
          console.warn(`Unknown provider type: ${provider.type}`);
      }
      
      this.metrics.successfulDeliveries += logs.length;
      
    } catch (error) {
      console.error(`Failed to deliver logs to ${provider.name}:`, error);
      this.metrics.failedDeliveries += logs.length;
      
      // Retry logic could be implemented here
    }
  }

  private async deliverToELK(provider: LoggingProvider, logs: LogEntry[]): Promise<void> {
    if (!provider.endpoint) {
      throw new Error('ELK endpoint not configured');
    }
    
    const payload = {
      logs: logs.map(log => ({
        '@timestamp': new Date(log.timestamp).toISOString(),
        level: log.level,
        message: log.message,
        source: log.source,
        category: log.category,
        metadata: log.metadata,
        tags: log.tags
      }))
    };
    
    // In production, send to actual ELK endpoint
    console.log(`📤 Sending ${logs.length} logs to ELK Stack`);
  }

  private async deliverToDatadog(provider: LoggingProvider, logs: LogEntry[]): Promise<void> {
    if (!provider.endpoint || !provider.apiKey) {
      throw new Error('Datadog configuration incomplete');
    }
    
    const payload = logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      service: provider.config.service,
      source: log.source,
      tags: log.tags.join(','),
      attributes: log.metadata
    }));
    
    // In production, send to actual Datadog endpoint
    console.log(`📤 Sending ${logs.length} logs to Datadog`);
  }

  private async deliverToSentry(provider: LoggingProvider, logs: LogEntry[]): Promise<void> {
    // Sentry typically handles errors and exceptions
    const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'critical');
    
    for (const log of errorLogs) {
      // In production, send to actual Sentry
      console.log(`📤 Sending error to Sentry: ${log.message}`);
    }
  }

  private async deliverToLocalStorage(provider: LoggingProvider, logs: LogEntry[]): Promise<void> {
    try {
      const existingLogs = await AsyncStorage.getItem('centralized_logs') || '[]';
      const parsedLogs = JSON.parse(existingLogs);
      
      parsedLogs.push(...logs);
      
      // Keep only recent logs to manage storage size
      const maxLogs = 1000;
      if (parsedLogs.length > maxLogs) {
        parsedLogs.splice(0, parsedLogs.length - maxLogs);
      }
      
      await AsyncStorage.setItem('centralized_logs', JSON.stringify(parsedLogs));
      
    } catch (error) {
      console.error('Failed to store logs locally:', error);
      throw error;
    }
  }

  // ===== CONFIGURATION MANAGEMENT =====

  async updateConfiguration(newConfig: Partial<LoggingConfiguration>): Promise<void> {
    this.configuration = { ...this.configuration, ...newConfig };
    await this.saveConfiguration();
    
    this.log('info', 'centralized_logging', 'Configuration updated', { newConfig });
  }

  async updateProvider(providerName: string, updates: Partial<LoggingProvider>): Promise<void> {
    const provider = this.providers.get(providerName);
    if (provider) {
      Object.assign(provider, updates);
      await this.saveConfiguration();
      
      this.log('info', 'centralized_logging', 'Provider updated', { providerName, updates });
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem('logging_configuration');
      if (configData) {
        const savedConfig = JSON.parse(configData);
        this.configuration = { ...this.configuration, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load logging configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('logging_configuration', JSON.stringify(this.configuration));
    } catch (error) {
      console.error('Failed to save logging configuration:', error);
    }
  }

  // ===== CONTEXT MANAGEMENT =====

  setUserContext(userId: string, sessionId: string): void {
    this.currentUserId = userId;
    this.currentSessionId = sessionId;
    
    this.log('info', 'centralized_logging', 'User context set', { userId, sessionId });
  }

  clearUserContext(): void {
    this.currentUserId = undefined;
    this.currentSessionId = undefined;
    
    this.log('info', 'centralized_logging', 'User context cleared');
  }

  // ===== PUBLIC API =====

  getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  getConfiguration(): LoggingConfiguration {
    return { ...this.configuration };
  }

  getProviders(): LoggingProvider[] {
    return Array.from(this.providers.values());
  }

  async getRecentLogs(limit: number = 100): Promise<LogEntry[]> {
    try {
      const logsData = await AsyncStorage.getItem('centralized_logs');
      if (logsData) {
        const logs = JSON.parse(logsData);
        return logs.slice(-limit);
      }
      return [];
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }

  async searchLogs(query: string, limit: number = 50): Promise<LogEntry[]> {
    try {
      const logs = await this.getRecentLogs(1000);
      const filtered = logs.filter(log => 
        log.message.toLowerCase().includes(query.toLowerCase()) ||
        log.source.toLowerCase().includes(query.toLowerCase()) ||
        log.category.toLowerCase().includes(query.toLowerCase())
      );
      
      return filtered.slice(-limit);
    } catch (error) {
      console.error('Failed to search logs:', error);
      return [];
    }
  }

  isActive(): boolean {
    return this.serviceActive;
  }

  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining logs
    await this.flushLogs();
    
    this.serviceActive = false;
    
    this.log('info', 'centralized_logging', 'Centralized Logging Service cleanup completed');
  }
}

export default CentralizedLoggingService;
export type { LogEntry, LoggingProvider, LoggingConfiguration, LogMetrics, AlertRule };