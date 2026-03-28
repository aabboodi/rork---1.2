import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import CentralizedLoggingService from './CentralizedLoggingService';
import SecurityNotificationService from './SecurityNotificationService';

export interface SecurityBreach {
  id: string;
  type: 'unauthorized_access' | 'suspicious_activity' | 'data_breach' | 'malware_detected' | 'phishing_attempt' | 'brute_force' | 'privilege_escalation' | 'data_exfiltration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  description: string;
  affectedResources: string[];
  sourceIP?: string;
  userAgent?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
  mitigationSteps: string[];
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  evidence: {
    logs: string[];
    screenshots?: string[];
    networkTraces?: string[];
  };
  impactAssessment: {
    usersAffected: number;
    dataCompromised: string[];
    systemsAffected: string[];
    estimatedDamage: 'minimal' | 'moderate' | 'significant' | 'severe';
  };
}

export interface SecurityAlert {
  id: string;
  type: 'breach' | 'threat' | 'vulnerability' | 'policy_violation' | 'system_anomaly';
  priority: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionRequired: boolean;
  actions?: {
    label: string;
    action: string;
    destructive?: boolean;
  }[];
  expiresAt?: number;
  category: string;
  metadata?: Record<string, any>;
}

class SecurityBreachService {
  private static instance: SecurityBreachService;
  private breaches: SecurityBreach[] = [];
  private alerts: SecurityAlert[] = [];
  private loggingService: CentralizedLoggingService;
  private notificationService: SecurityNotificationService;
  private readonly STORAGE_KEY = 'security_breaches';
  private readonly ALERTS_STORAGE_KEY = 'security_alerts';
  private readonly MAX_BREACHES = 1000;
  private readonly MAX_ALERTS = 500;

  private constructor() {
    this.loggingService = CentralizedLoggingService.getInstance();
    this.notificationService = SecurityNotificationService.getInstance();
    this.loadStoredData();
  }

  static getInstance(): SecurityBreachService {
    if (!SecurityBreachService.instance) {
      SecurityBreachService.instance = new SecurityBreachService();
    }
    return SecurityBreachService.instance;
  }

  private async loadStoredData(): Promise<void> {
    try {
      const [breachesData, alertsData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.ALERTS_STORAGE_KEY)
      ]);

      if (breachesData) {
        this.breaches = JSON.parse(breachesData);
      }

      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    }
  }

  private async saveBreaches(): Promise<void> {
    try {
      if (this.breaches.length > this.MAX_BREACHES) {
        this.breaches = this.breaches
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_BREACHES);
      }
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.breaches));
    } catch (error) {
      console.error('Failed to save breaches:', error);
    }
  }

  private async saveAlerts(): Promise<void> {
    try {
      // Keep only the most recent alerts
      if (this.alerts.length > this.MAX_ALERTS) {
        this.alerts = this.alerts
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.MAX_ALERTS);
      }
      await AsyncStorage.setItem(this.ALERTS_STORAGE_KEY, JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }

  async reportBreach(breach: Omit<SecurityBreach, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const breachId = `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullBreach: SecurityBreach = {
      ...breach,
      id: breachId,
      timestamp: Date.now(),
      resolved: false,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version.toString(),
      }
    };

    this.breaches.unshift(fullBreach);
    await this.saveBreaches();

    // Log the breach
    this.loggingService.logSecurity(
      breach.severity === 'critical' ? 'critical' : breach.severity === 'high' ? 'error' : 'warn',
      'security_breach_service',
      `Security breach detected: ${breach.description}`,
      {
        breachId,
        type: breach.type,
        affectedResources: breach.affectedResources,
        impactAssessment: breach.impactAssessment
      }
    );

    // Create alert
    await this.createAlert({
      type: 'breach',
      priority: this.mapSeverityToPriority(breach.severity),
      title: `Security Breach Detected`,
      message: breach.description,
      actionRequired: breach.severity === 'critical' || breach.severity === 'high',
      category: 'security',
      actions: [
        {
          label: 'View Details',
          action: `breach_details_${breachId}`
        },
        {
          label: 'Mark as Resolved',
          action: `resolve_breach_${breachId}`
        }
      ],
      metadata: { breachId }
    });

    // Send high-visibility notification via SecurityNotificationService for critical breaches
    if (breach.severity === 'critical') {
      await this.notificationService.sendSecurityAlert({
        type: 'SECURITY_BREACH',
        severity: 'CRITICAL',
        title: 'Critical Security Breach',
        message: breach.description,
        actionRequired: true,
        metadata: { breachId, type: breach.type }
      } as any);
    }

    return breachId;
  }

  async createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'read'>): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullAlert: SecurityAlert = {
      ...alert,
      id: alertId,
      timestamp: Date.now(),
      read: false
    };

    this.alerts.unshift(fullAlert);
    await this.saveAlerts();

    // Send in-app notification
    await this.notificationService.sendSecurityNotification({
      title: alert.title,
      message: alert.message,
      priority: alert.priority,
      category: alert.category,
      actionRequired: alert.actionRequired
    });

    return alertId;
  }

  private async sendCriticalBreachNotification(breach: SecurityBreach): Promise<void> {
    try {
      const isExpoGo = (await import('expo-constants')).default?.appOwnership === 'expo';
      if (Platform.OS === 'web' || isExpoGo) {
        if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 Critical Security Breach', {
            body: `${breach.description}. Immediate action required.`,
            tag: breach.id
          });
        }
        return;
      }
      const NotificationsMod = await import('expo-notifications');
      await NotificationsMod.scheduleNotificationAsync({
        content: {
          title: '🚨 Critical Security Breach',
          body: `${breach.description}. Immediate action required.`,
          categoryIdentifier: 'SECURITY_CRITICAL',
          data: {
            type: 'security_breach',
            breachId: breach.id,
            severity: breach.severity
          }
        },
        trigger: null
      });
    } catch (error) {
      console.warn('expo-notifications not available, skipping critical push');
    }
  }

  private mapSeverityToPriority(severity: SecurityBreach['severity']): SecurityAlert['priority'] {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'critical';
      default: return 'info';
    }
  }

  async resolveBreach(breachId: string, resolvedBy: string): Promise<boolean> {
    const breachIndex = this.breaches.findIndex(b => b.id === breachId);
    if (breachIndex === -1) return false;

    this.breaches[breachIndex].resolved = true;
    this.breaches[breachIndex].resolvedAt = Date.now();
    this.breaches[breachIndex].resolvedBy = resolvedBy;

    await this.saveBreaches();

    // Log resolution
    await this.loggingService.logSecurityEvent({
      type: 'breach_resolved',
      severity: 'info',
      message: `Security breach ${breachId} resolved by ${resolvedBy}`,
      metadata: { breachId, resolvedBy }
    });

    return true;
  }

  async markAlertAsRead(alertId: string): Promise<boolean> {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) return false;

    this.alerts[alertIndex].read = true;
    await this.saveAlerts();
    return true;
  }

  async dismissAlert(alertId: string): Promise<boolean> {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) return false;

    this.alerts.splice(alertIndex, 1);
    await this.saveAlerts();
    return true;
  }

  getBreaches(filter?: {
    type?: SecurityBreach['type'];
    severity?: SecurityBreach['severity'];
    resolved?: boolean;
    limit?: number;
  }): SecurityBreach[] {
    let filtered = [...this.breaches];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(b => b.type === filter.type);
      }
      if (filter.severity) {
        filtered = filtered.filter(b => b.severity === filter.severity);
      }
      if (filter.resolved !== undefined) {
        filtered = filtered.filter(b => b.resolved === filter.resolved);
      }
      if (filter.limit) {
        filtered = filtered.slice(0, filter.limit);
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getAlerts(filter?: {
    type?: SecurityAlert['type'];
    priority?: SecurityAlert['priority'];
    read?: boolean;
    actionRequired?: boolean;
    limit?: number;
  }): SecurityAlert[] {
    let filtered = [...this.alerts];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(a => a.type === filter.type);
      }
      if (filter.priority) {
        filtered = filtered.filter(a => a.priority === filter.priority);
      }
      if (filter.read !== undefined) {
        filtered = filtered.filter(a => a.read === filter.read);
      }
      if (filter.actionRequired !== undefined) {
        filtered = filtered.filter(a => a.actionRequired === filter.actionRequired);
      }
      if (filter.limit) {
        filtered = filtered.slice(0, filter.limit);
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getUnreadAlertsCount(): number {
    return this.alerts.filter(a => !a.read).length;
  }

  getCriticalBreachesCount(): number {
    return this.breaches.filter(b => b.severity === 'critical' && !b.resolved).length;
  }

  getSecurityHealthScore(): number {
    const totalBreaches = this.breaches.length;
    const unresolvedCritical = this.breaches.filter(b => b.severity === 'critical' && !b.resolved).length;
    const unresolvedHigh = this.breaches.filter(b => b.severity === 'high' && !b.resolved).length;
    const unresolvedMedium = this.breaches.filter(b => b.severity === 'medium' && !b.resolved).length;

    if (totalBreaches === 0) return 100;

    // Calculate score based on unresolved breaches
    let score = 100;
    score -= unresolvedCritical * 30; // Critical breaches heavily impact score
    score -= unresolvedHigh * 15;
    score -= unresolvedMedium * 5;

    return Math.max(0, Math.min(100, score));
  }

  async simulateBreach(type: SecurityBreach['type'], severity: SecurityBreach['severity'] = 'medium'): Promise<string> {
    // For testing purposes only
    const simulatedBreach: Omit<SecurityBreach, 'id' | 'timestamp' | 'resolved'> = {
      type,
      severity,
      description: `Simulated ${type} breach for testing`,
      affectedResources: ['test_resource'],
      mitigationSteps: [
        'Review security logs',
        'Update security policies',
        'Monitor for additional threats'
      ],
      evidence: {
        logs: [`Simulated log entry for ${type} breach`]
      },
      impactAssessment: {
        usersAffected: 0,
        dataCompromised: [],
        systemsAffected: ['test_system'],
        estimatedDamage: 'minimal'
      }
    };

    return await this.reportBreach(simulatedBreach);
  }

  async clearOldData(olderThanDays: number = 90): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Remove old resolved breaches
    this.breaches = this.breaches.filter(b => 
      !b.resolved || b.timestamp > cutoffTime
    );
    
    // Remove old read alerts
    this.alerts = this.alerts.filter(a => 
      !a.read || a.timestamp > cutoffTime
    );

    await Promise.all([
      this.saveBreaches(),
      this.saveAlerts()
    ]);
  }
}

export default SecurityBreachService;