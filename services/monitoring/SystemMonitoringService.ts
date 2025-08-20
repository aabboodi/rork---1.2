import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MLLoggingService from '@/services/recommendation/MLLoggingService';

interface SystemMetrics {
  // Performance Metrics
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  
  // Application Metrics
  activeUsers: number;
  sessionDuration: number;
  apiCallsPerSecond: number;
  databaseConnections: number;
  cacheHitRate: number;
  
  // Security Metrics
  securityEvents: number;
  failedLogins: number;
  suspiciousActivity: number;
  encryptionStatus: boolean;
  
  // ML/AI Metrics
  modelAccuracy: number;
  predictionLatency: number;
  dataQuality: number;
  retrainingFrequency: number;
  
  // Business Metrics
  userEngagement: number;
  contentQuality: number;
  recommendationCTR: number;
  userSatisfaction: number;
  
  timestamp: number;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: keyof SystemMetrics;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // milliseconds
  lastTriggered?: number;
  actions: AlertAction[];
}

interface AlertAction {
  type: 'log' | 'notification' | 'email' | 'webhook' | 'auto_scale' | 'circuit_breaker';
  config: Record<string, any>;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: number;
  actions: string[];
}

interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  dependencies: ServiceDependency[];
}

interface ServiceDependency {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  critical: boolean;
}

interface PerformanceBaseline {
  metric: keyof SystemMetrics;
  baseline: number;
  variance: number;
  trend: 'improving' | 'stable' | 'degrading';
  lastUpdated: number;
}

class SystemMonitoringService {
  private static instance: SystemMonitoringService;
  private metrics: SystemMetrics[] = [];
  private alertRules: AlertRule[] = [];
  private activeAlerts: Alert[] = [];
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private performanceBaselines: Map<string, PerformanceBaseline> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private serviceMonitoring: boolean = false;
  
  // Service instances
  private securityManager: any;
  private mlLoggingService: MLLoggingService;
  private devSecOpsService: any;

  private constructor() {
    this.mlLoggingService = MLLoggingService.getInstance();
    this.initializeDefaultAlertRules();
    this.initializeServiceHealth();
  }

  static getInstance(): SystemMonitoringService {
    if (!SystemMonitoringService.instance) {
      SystemMonitoringService.instance = new SystemMonitoringService();
    }
    return SystemMonitoringService.instance;
  }

  // ===== SYSTEM MONITORING =====

  async startMonitoring(): Promise<void> {
    if (this.serviceMonitoring) {
      console.log('Monitoring already started');
      return;
    }

    this.serviceMonitoring = true;
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.checkAlerts();
      await this.updateServiceHealth();
      await this.updatePerformanceBaselines();
    }, 30000); // Every 30 seconds

    // Initial collection
    await this.collectMetrics();
    await this.loadPersistedData();
    
    console.log('System monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.serviceMonitoring) {
      return;
    }

    this.serviceMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await this.persistData();
    console.log('System monitoring stopped');
  }

  private async collectMetrics(): Promise<SystemMetrics> {
    try {
      const timestamp = Date.now();
      
      // Collect performance metrics
      const performanceMetrics = await this.collectPerformanceMetrics();
      
      // Collect application metrics
      const applicationMetrics = await this.collectApplicationMetrics();
      
      // Collect security metrics
      const securityMetrics = await this.collectSecurityMetrics();
      
      // Collect ML/AI metrics
      const mlMetrics = await this.collectMLMetrics();
      
      // Collect business metrics
      const businessMetrics = await this.collectBusinessMetrics();

      const metrics: SystemMetrics = {
        cpuUsage: performanceMetrics.cpuUsage ?? 0,
        memoryUsage: performanceMetrics.memoryUsage ?? 0,
        diskUsage: performanceMetrics.diskUsage ?? 0,
        networkLatency: performanceMetrics.networkLatency || 0,
        responseTime: performanceMetrics.responseTime || 0,
        throughput: performanceMetrics.throughput || 0,
        errorRate: performanceMetrics.errorRate || 0,
        activeUsers: applicationMetrics.activeUsers || 0,
        sessionDuration: applicationMetrics.sessionDuration || 0,
        apiCallsPerSecond: applicationMetrics.apiCallsPerSecond || 0,
        databaseConnections: applicationMetrics.databaseConnections || 0,
        cacheHitRate: applicationMetrics.cacheHitRate || 0,
        securityEvents: securityMetrics.securityEvents || 0,
        failedLogins: securityMetrics.failedLogins || 0,
        suspiciousActivity: securityMetrics.suspiciousActivity || 0,
        encryptionStatus: securityMetrics.encryptionStatus || false,
        modelAccuracy: mlMetrics.modelAccuracy || 0,
        predictionLatency: mlMetrics.predictionLatency || 0,
        dataQuality: mlMetrics.dataQuality || 0,
        retrainingFrequency: mlMetrics.retrainingFrequency || 0,
        userEngagement: businessMetrics.userEngagement || 0,
        contentQuality: businessMetrics.contentQuality || 0,
        recommendationCTR: businessMetrics.recommendationCTR || 0,
        userSatisfaction: businessMetrics.userSatisfaction || 0,
        timestamp
      };

      // Store metrics
      this.metrics.push(metrics);
      
      // Keep only last 1000 metrics (about 8 hours at 30s intervals)
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      return metrics;
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  private async collectPerformanceMetrics(): Promise<Partial<SystemMetrics>> {
    // Mock implementation - in real app, would use actual system APIs
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkLatency: Math.random() * 100 + 10,
      responseTime: Math.random() * 500 + 50,
      throughput: Math.random() * 1000 + 100,
      errorRate: Math.random() * 5
    };
  }

  private async collectApplicationMetrics(): Promise<Partial<SystemMetrics>> {
    // Get metrics from various services
    const mlMetrics = this.mlLoggingService.getMetrics();
    
    return {
      activeUsers: Math.floor(Math.random() * 1000) + 100,
      sessionDuration: Math.random() * 3600000 + 300000, // 5 minutes to 1 hour
      apiCallsPerSecond: Math.random() * 100 + 10,
      databaseConnections: Math.floor(Math.random() * 50) + 5,
      cacheHitRate: Math.random() * 0.3 + 0.7 // 70-100%
    };
  }

  private async ensureDependencies(): Promise<void> {
    if (!this.securityManager) {
      try {
        const registry = (await import('@/services/ServiceRegistry')).default;
        const fromRegistry = registry.get<any>('SecurityManager');
        if (fromRegistry) {
          this.securityManager = fromRegistry;
        } else {
          const mod = await import('@/services/security/SecurityManager');
          this.securityManager = mod.default.getInstance();
        }
      } catch (e) {
        console.warn('SystemMonitoringService: failed to load SecurityManager', e);
      }
    }
    if (!this.devSecOpsService) {
      try {
        const mod = await import('@/services/security/DevSecOpsIntegrationService');
        this.devSecOpsService = mod?.default?.getInstance?.();
        if (!this.devSecOpsService) {
          console.warn('SystemMonitoringService: DevSecOpsIntegrationService not ready');
        }
      } catch (e) {
        console.warn('SystemMonitoringService: failed to load DevSecOpsIntegrationService', e);
      }
    }
  }

  private async collectSecurityMetrics(): Promise<Partial<SystemMetrics>> {
    await this.ensureDependencies();
    const securityStatus = this.securityManager?.getSecurityStatus?.() ?? {};
    
    return {
      securityEvents: (securityStatus as any).monitoring?.recentSecurityEvents || 0,
      failedLogins: Math.floor(Math.random() * 10),
      suspiciousActivity: (securityStatus as any).monitoring?.criticalEvents || 0,
      encryptionStatus: (securityStatus as any).cryptography?.masterKeyInitialized || false
    };
  }

  private async collectMLMetrics(): Promise<Partial<SystemMetrics>> {
    const mlMetrics = this.mlLoggingService.getMetrics();
    const retrainingMetrics = this.mlLoggingService.getRetrainingDataMetrics();
    
    return {
      modelAccuracy: Math.random() * 0.2 + 0.8, // 80-100%
      predictionLatency: mlMetrics.performanceMetrics?.logGenerationTime || 0,
      dataQuality: retrainingMetrics.averageDataQuality || 0,
      retrainingFrequency: retrainingMetrics.totalDataPointsCollected || 0
    };
  }

  private async collectBusinessMetrics(): Promise<Partial<SystemMetrics>> {
    return {
      userEngagement: Math.random() * 0.3 + 0.7, // 70-100%
      contentQuality: Math.random() * 0.2 + 0.8, // 80-100%
      recommendationCTR: Math.random() * 0.1 + 0.05, // 5-15%
      userSatisfaction: Math.random() * 0.2 + 0.8 // 80-100%
    };
  }

  // ===== ALERTING SYSTEM =====

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        description: 'CPU usage exceeds 80%',
        metric: 'cpuUsage',
        operator: 'gt',
        threshold: 80,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        actions: [
          { type: 'log', config: { level: 'warn' } },
          { type: 'notification', config: { title: 'High CPU Usage Alert' } }
        ]
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85%',
        metric: 'memoryUsage',
        operator: 'gt',
        threshold: 85,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300000,
        actions: [
          { type: 'log', config: { level: 'warn' } },
          { type: 'auto_scale', config: { action: 'scale_up' } }
        ]
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        metric: 'errorRate',
        operator: 'gt',
        threshold: 5,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 180000, // 3 minutes
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'notification', config: { title: 'Critical Error Rate Alert' } },
          { type: 'circuit_breaker', config: { service: 'api' } }
        ]
      },
      {
        id: 'security_events',
        name: 'Security Events',
        description: 'Multiple security events detected',
        metric: 'securityEvents',
        operator: 'gt',
        threshold: 10,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 60000, // 1 minute
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'notification', config: { title: 'Security Alert' } }
        ]
      },
      {
        id: 'low_model_accuracy',
        name: 'Low Model Accuracy',
        description: 'ML model accuracy below 75%',
        metric: 'modelAccuracy',
        operator: 'lt',
        threshold: 0.75,
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 3600000, // 1 hour
        actions: [
          { type: 'log', config: { level: 'warn' } },
          { type: 'notification', config: { title: 'Model Performance Alert' } }
        ]
      }
    ];
  }

  private async checkAlerts(): Promise<void> {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const now = Date.now();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown period
      if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldownPeriod) {
        continue;
      }

      const currentValue = latestMetrics[rule.metric];
      const shouldTrigger = this.evaluateAlertCondition(currentValue, rule.operator, rule.threshold);

      if (shouldTrigger) {
        await this.triggerAlert(rule, currentValue);
      }
    }
  }

  private evaluateAlertCondition(value: number | boolean, operator: string, threshold: number): boolean {
    const numericValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    
    switch (operator) {
      case 'gt': return numericValue > threshold;
      case 'lt': return numericValue < threshold;
      case 'eq': return numericValue === threshold;
      case 'gte': return numericValue >= threshold;
      case 'lte': return numericValue <= threshold;
      default: return false;
    }
  }

  private async triggerAlert(rule: AlertRule, currentValue: number | boolean): Promise<void> {
    const numericValue = typeof currentValue === 'boolean' ? (currentValue ? 1 : 0) : currentValue;
    
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue: numericValue,
      threshold: rule.threshold,
      severity: rule.severity,
      message: `${rule.description}. Current value: ${currentValue}, Threshold: ${rule.threshold}`,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      actions: []
    };

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, alert);
        alert.actions.push(action.type);
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }

    // Store alert
    this.activeAlerts.push(alert);
    
    // Update rule last triggered time
    rule.lastTriggered = Date.now();

    console.log(`Alert triggered: ${alert.message}`);
  }

  private async executeAlertAction(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.type) {
      case 'log':
        const level = action.config.level || 'info';
        if (level === 'warn') {
          console.warn(`ALERT: ${alert.message}`);
        } else if (level === 'error') {
          console.error(`ALERT: ${alert.message}`);
        } else {
          console.log(`ALERT: ${alert.message}`);
        }
        break;
        
      case 'notification':
        // In a real app, this would show a system notification
        console.log(`NOTIFICATION: ${action.config.title} - ${alert.message}`);
        break;
        
      case 'email':
        // In a real app, this would send an email
        console.log(`EMAIL ALERT: ${alert.message}`);
        break;
        
      case 'webhook':
        // In a real app, this would call a webhook
        console.log(`WEBHOOK: ${action.config.url} - ${alert.message}`);
        break;
        
      case 'auto_scale':
        console.log(`AUTO SCALE: ${action.config.action} triggered by ${alert.message}`);
        break;
        
      case 'circuit_breaker':
        console.log(`CIRCUIT BREAKER: ${action.config.service} triggered by ${alert.message}`);
        break;
    }
  }

  // ===== SERVICE HEALTH MONITORING =====

  private initializeServiceHealth(): void {
    const services = [
      'SecurityManager',
      'MLLoggingService',
      'DevSecOpsService',
      'RecommendationEngine',
      'NetworkSecurity',
      'CryptoService'
    ];

    services.forEach(serviceName => {
      this.serviceHealth.set(serviceName, {
        serviceName,
        status: 'unknown',
        lastCheck: 0,
        responseTime: 0,
        errorRate: 0,
        uptime: 0,
        dependencies: []
      });
    });
  }

  private async updateServiceHealth(): Promise<void> {
    for (const [serviceName, health] of this.serviceHealth) {
      try {
        const startTime = Date.now();
        const status = await this.checkServiceHealth(serviceName);
        const responseTime = Date.now() - startTime;

        health.status = status;
        health.lastCheck = Date.now();
        health.responseTime = responseTime;
        health.uptime = this.calculateUptime(serviceName);
        
      } catch (error) {
        health.status = 'unhealthy';
        health.lastCheck = Date.now();
        console.error(`Health check failed for ${serviceName}:`, error);
      }
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    // Mock health checks - in real app, would ping actual services
    switch (serviceName) {
      case 'SecurityManager':
        await this.ensureDependencies();
        const securityStatus = this.securityManager?.getSecurityStatus?.();
        return securityStatus ? 'healthy' : 'unhealthy';
        
      case 'MLLoggingService':
        const mlStatus = this.mlLoggingService.getServiceStatus();
        return mlStatus?.isInitialized ? 'healthy' : 'unhealthy';
        
      case 'DevSecOpsService':
        await this.ensureDependencies();
        const devSecOpsStatus = this.devSecOpsService?.getSecurityDashboard?.();
        return devSecOpsStatus ? 'healthy' : 'unhealthy';
        
      default:
        // Random health for other services
        const random = Math.random();
        if (random > 0.9) return 'unhealthy';
        if (random > 0.8) return 'degraded';
        return 'healthy';
    }
  }

  private calculateUptime(serviceName: string): number {
    // Mock uptime calculation
    return Math.random() * 0.05 + 0.95; // 95-100% uptime
  }

  // ===== PERFORMANCE BASELINES =====

  private async updatePerformanceBaselines(): Promise<void> {
    if (this.metrics.length < 10) return; // Need at least 10 data points

    const recentMetrics = this.metrics.slice(-10); // Last 10 metrics
    const metricsToBaseline: (keyof SystemMetrics)[] = [
      'cpuUsage', 'memoryUsage', 'responseTime', 'throughput', 'errorRate'
    ];

    for (const metric of metricsToBaseline) {
      const values = recentMetrics.map(m => m[metric] as number).filter(v => typeof v === 'number');
      
      if (values.length > 0) {
        const baseline = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = this.calculateVariance(values, baseline);
        const trend = this.calculateTrend(values);

        this.performanceBaselines.set(metric, {
          metric,
          baseline,
          variance,
          trend,
          lastUpdated: Date.now()
        });
      }
    }
  }

  private calculateVariance(values: number[], mean: number): number {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 3) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.05) return 'degrading';
    if (change < -0.05) return 'improving';
    return 'stable';
  }

  // ===== DATA PERSISTENCE =====

  private async persistData(): Promise<void> {
    try {
      await AsyncStorage.setItem('system_metrics', JSON.stringify(this.metrics.slice(-100))); // Last 100 metrics
      await AsyncStorage.setItem('alert_rules', JSON.stringify(this.alertRules));
      await AsyncStorage.setItem('active_alerts', JSON.stringify(this.activeAlerts));
    } catch (error) {
      console.error('Failed to persist monitoring data:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const metricsData = await AsyncStorage.getItem('system_metrics');
      const alertRulesData = await AsyncStorage.getItem('alert_rules');
      const alertsData = await AsyncStorage.getItem('active_alerts');

      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }

      if (alertRulesData) {
        const persistedRules = JSON.parse(alertRulesData);
        // Merge with default rules, keeping user customizations
        this.alertRules = this.mergeAlertRules(this.alertRules, persistedRules);
      }

      if (alertsData) {
        this.activeAlerts = JSON.parse(alertsData);
      }
    } catch (error) {
      console.error('Failed to load persisted monitoring data:', error);
    }
  }

  private mergeAlertRules(defaultRules: AlertRule[], persistedRules: AlertRule[]): AlertRule[] {
    const merged = [...defaultRules];
    
    persistedRules.forEach(persistedRule => {
      const existingIndex = merged.findIndex(rule => rule.id === persistedRule.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = persistedRule;
      } else {
        merged.push(persistedRule);
      }
    });
    
    return merged;
  }

  // ===== PUBLIC API =====

  getMetrics(timeRange?: { start: number; end: number }): SystemMetrics[] {
    if (!timeRange) {
      return [...this.metrics];
    }
    
    return this.metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getActiveAlerts(): Alert[] {
    return this.activeAlerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return [...this.activeAlerts];
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      await this.persistData();
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      await this.persistData();
    }
  }

  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.alertRules.push(newRule);
    await this.persistData();
    
    return newRule.id;
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex >= 0) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      await this.persistData();
    }
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
    await this.persistData();
  }

  getServiceHealth(): Map<string, ServiceHealth> {
    return new Map(this.serviceHealth);
  }

  getPerformanceBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.performanceBaselines);
  }

  getSystemStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: { healthy: number; degraded: number; unhealthy: number };
    alerts: { critical: number; high: number; medium: number; low: number };
    uptime: number;
  } {
    const services = Array.from(this.serviceHealth.values());
    const serviceStats = {
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length
    };

    const activeAlerts = this.getActiveAlerts();
    const alertStats = {
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      high: activeAlerts.filter(a => a.severity === 'high').length,
      medium: activeAlerts.filter(a => a.severity === 'medium').length,
      low: activeAlerts.filter(a => a.severity === 'low').length
    };

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (serviceStats.unhealthy > 0 || alertStats.critical > 0) {
      overall = 'unhealthy';
    } else if (serviceStats.degraded > 0 || alertStats.high > 0) {
      overall = 'degraded';
    }

    const avgUptime = services.length > 0 
      ? services.reduce((sum, s) => sum + s.uptime, 0) / services.length 
      : 1;

    return {
      overall,
      services: serviceStats,
      alerts: alertStats,
      uptime: avgUptime
    };
  }

  isMonitoring(): boolean {
    return this.serviceMonitoring;
  }
}

export default SystemMonitoringService;