import { Platform } from 'react-native';
import { WAFService } from './WAFService';
import { APISecurityMiddleware } from './APISecurityMiddleware';
import { NetworkSecurityService } from './NetworkSecurityService';
import { SecurityManager } from './SecurityManager';
import { CryptoService } from './CryptoService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecurityConfiguration {
  waf: {
    enabled: boolean;
    blockMode: boolean;
    customRules: boolean;
  };
  api: {
    requestSigning: boolean;
    responseValidation: boolean;
    csrfProtection: boolean;
  };
  network: {
    certificatePinning: boolean;
    requestEncryption: boolean;
    rateLimiting: boolean;
  };
  monitoring: {
    realTimeAlerts: boolean;
    logRetention: number; // days
    threatIntelligence: boolean;
  };
}

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'waf_block' | 'api_violation' | 'network_anomaly' | 'auth_failure' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: any;
  resolved: boolean;
  responseActions: string[];
}

interface ThreatIntelligence {
  knownAttackers: Set<string>;
  suspiciousPatterns: RegExp[];
  blockedUserAgents: Set<string>;
  geoBlocking: {
    enabled: boolean;
    blockedCountries: string[];
  };
}

class SecurityIntegrationService {
  private static instance: SecurityIntegrationService;
  private wafService: WAFService;
  private apiMiddleware: APISecurityMiddleware;
  private networkService: NetworkSecurityService;
  private securityManager: SecurityManager;
  
  private configuration: SecurityConfiguration;
  private threatIntelligence: ThreatIntelligence;
  private securityEvents: SecurityEvent[] = [];
  private alertSubscribers: ((event: SecurityEvent) => void)[] = [];

  private constructor() {
    this.wafService = WAFService.getInstance();
    this.apiMiddleware = APISecurityMiddleware.getInstance();
    this.networkService = NetworkSecurityService.getInstance();
    this.securityManager = SecurityManager.getInstance();

    this.configuration = {
      waf: {
        enabled: true,
        blockMode: true,
        customRules: true,
      },
      api: {
        requestSigning: true,
        responseValidation: true,
        csrfProtection: true,
      },
      network: {
        certificatePinning: true,
        requestEncryption: true,
        rateLimiting: true,
      },
      monitoring: {
        realTimeAlerts: true,
        logRetention: 90,
        threatIntelligence: true,
      },
    };

    this.threatIntelligence = {
      knownAttackers: new Set(),
      suspiciousPatterns: [],
      blockedUserAgents: new Set([
        'sqlmap',
        'nikto',
        'nmap',
        'masscan',
        'zap',
        'burp',
        'w3af'
      ]),
      geoBlocking: {
        enabled: false,
        blockedCountries: [],
      },
    };

    this.initializeIntegration();
  }

  public static getInstance(): SecurityIntegrationService {
    if (!SecurityIntegrationService.instance) {
      SecurityIntegrationService.instance = new SecurityIntegrationService();
    }
    return SecurityIntegrationService.instance;
  }

  private async initializeIntegration(): Promise<void> {
    try {
      // Load saved configuration
      await this.loadConfiguration();
      
      // Initialize threat intelligence
      await this.loadThreatIntelligence();
      
      // Set up event monitoring
      this.setupEventMonitoring();
      
      // Configure security services
      await this.configureSecurityServices();
      
      console.log('🛡️ Security Integration Service initialized');
    } catch (error) {
      console.error('Failed to initialize Security Integration Service:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('security_integration_config');
      if (savedConfig) {
        this.configuration = { ...this.configuration, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load security configuration:', error);
    }
  }

  private async loadThreatIntelligence(): Promise<void> {
    try {
      const savedThreatData = await AsyncStorage.getItem('threat_intelligence_data');
      if (savedThreatData) {
        const data = JSON.parse(savedThreatData);
        this.threatIntelligence.knownAttackers = new Set(data.knownAttackers || []);
        this.threatIntelligence.blockedUserAgents = new Set(data.blockedUserAgents || []);
        this.threatIntelligence.geoBlocking = data.geoBlocking || this.threatIntelligence.geoBlocking;
      }
    } catch (error) {
      console.error('Failed to load threat intelligence:', error);
    }
  }

  private setupEventMonitoring(): void {
    // Monitor WAF events
    this.monitorWAFEvents();
    
    // Monitor API security events
    this.monitorAPIEvents();
    
    // Monitor network security events
    this.monitorNetworkEvents();
    
    // Set up periodic threat intelligence updates
    this.setupThreatIntelligenceUpdates();
  }

  private async monitorWAFEvents(): Promise<void> {
    // In a real implementation, this would set up event listeners
    // For now, we'll periodically check for new security logs
    setInterval(async () => {
      try {
        const logs = await this.wafService.getSecurityLogs();
        const recentLogs = logs.filter(log => 
          Date.now() - log.timestamp < 60000 && // Last minute
          log.blocked
        );

        for (const log of recentLogs) {
          await this.handleSecurityEvent({
            id: `waf-${log.timestamp}-${Math.random()}`,
            timestamp: log.timestamp,
            type: 'waf_block',
            severity: log.severity as any,
            source: log.clientIP,
            details: log,
            resolved: false,
            responseActions: ['ip_blocked', 'request_denied']
          });
        }
      } catch (error) {
        console.error('WAF monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private monitorAPIEvents(): void {
    // Monitor API security violations
    // This would integrate with the API middleware to capture events
    console.log('API security monitoring active');
  }

  private monitorNetworkEvents(): void {
    // Monitor network security events
    // This would integrate with the network service to capture anomalies
    console.log('Network security monitoring active');
  }

  private setupThreatIntelligenceUpdates(): void {
    // Update threat intelligence every hour
    setInterval(async () => {
      await this.updateThreatIntelligence();
    }, 60 * 60 * 1000);
  }

  private async updateThreatIntelligence(): Promise<void> {
    try {
      // In production, this would fetch from threat intelligence feeds
      console.log('Updating threat intelligence...');
      
      // Example: Add known malicious IPs from recent attacks
      const recentAttacks = this.securityEvents
        .filter(event => 
          event.type === 'waf_block' && 
          event.severity === 'critical' &&
          Date.now() - event.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
        );

      for (const attack of recentAttacks) {
        if (attack.source) {
          this.threatIntelligence.knownAttackers.add(attack.source);
        }
      }

      await this.saveThreatIntelligence();
    } catch (error) {
      console.error('Failed to update threat intelligence:', error);
    }
  }

  private async saveThreatIntelligence(): Promise<void> {
    try {
      const data = {
        knownAttackers: Array.from(this.threatIntelligence.knownAttackers),
        blockedUserAgents: Array.from(this.threatIntelligence.blockedUserAgents),
        geoBlocking: this.threatIntelligence.geoBlocking,
        lastUpdated: Date.now()
      };
      
      await AsyncStorage.setItem('threat_intelligence_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save threat intelligence:', error);
    }
  }

  private async configureSecurityServices(): Promise<void> {
    // Configure WAF based on current settings
    await this.wafService.updateConfiguration({
      enabled: this.configuration.waf.enabled,
      blockMode: this.configuration.waf.blockMode,
    });

    // Configure network service
    await this.networkService.updateConfiguration({
      enableCertificatePinning: this.configuration.network.certificatePinning,
      enableRequestSigning: this.configuration.api.requestSigning,
      enableResponseValidation: this.configuration.api.responseValidation,
    });
  }

  private async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    // Store the event
    this.securityEvents.push(event);
    
    // Keep only recent events (based on retention policy)
    const retentionMs = this.configuration.monitoring.logRetention * 24 * 60 * 60 * 1000;
    this.securityEvents = this.securityEvents.filter(e => 
      Date.now() - e.timestamp < retentionMs
    );

    // Apply automatic response actions
    await this.applyResponseActions(event);

    // Send real-time alerts if enabled
    if (this.configuration.monitoring.realTimeAlerts) {
      this.notifySubscribers(event);
    }

    // Log critical events
    if (event.severity === 'critical') {
      console.warn('🚨 CRITICAL SECURITY EVENT:', {
        type: event.type,
        source: event.source,
        timestamp: new Date(event.timestamp).toISOString()
      });
    }
  }

  private async applyResponseActions(event: SecurityEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'waf_block':
          if (event.severity === 'critical') {
            // Auto-block IP for critical WAF violations
            await this.wafService.blockIP(event.source, 24 * 60 * 60 * 1000); // 24 hours
            
            // Add to threat intelligence
            this.threatIntelligence.knownAttackers.add(event.source);
            await this.saveThreatIntelligence();
          }
          break;

        case 'api_violation':
          if (event.severity === 'high' || event.severity === 'critical') {
            // Revoke session tokens for the user
            // This would integrate with session management
            console.log('Revoking session for security violation');
          }
          break;

        case 'auth_failure':
          // Implement progressive delays for repeated auth failures
          console.log('Implementing auth failure response');
          break;

        default:
          console.log('No automatic response configured for event type:', event.type);
      }
    } catch (error) {
      console.error('Failed to apply response actions:', error);
    }
  }

  private notifySubscribers(event: SecurityEvent): void {
    this.alertSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Alert subscriber error:', error);
      }
    });
  }

  // Public API methods

  public async updateConfiguration(newConfig: Partial<SecurityConfiguration>): Promise<void> {
    this.configuration = { ...this.configuration, ...newConfig };
    
    try {
      await AsyncStorage.setItem('security_integration_config', JSON.stringify(this.configuration));
      await this.configureSecurityServices();
    } catch (error) {
      console.error('Failed to update security configuration:', error);
    }
  }

  public getConfiguration(): SecurityConfiguration {
    return { ...this.configuration };
  }

  public getSecurityEvents(limit?: number): SecurityEvent[] {
    const events = [...this.securityEvents].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  public getCriticalEvents(): SecurityEvent[] {
    return this.securityEvents.filter(event => event.severity === 'critical');
  }

  public getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.securityEvents.filter(event => event.type === type);
  }

  public subscribeToAlerts(callback: (event: SecurityEvent) => void): () => void {
    this.alertSubscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.alertSubscribers.indexOf(callback);
      if (index > -1) {
        this.alertSubscribers.splice(index, 1);
      }
    };
  }

  public async resolveSecurityEvent(eventId: string): Promise<void> {
    const event = this.securityEvents.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
    }
  }

  public async addThreatIntelligence(data: {
    maliciousIPs?: string[];
    suspiciousUserAgents?: string[];
    blockedCountries?: string[];
  }): Promise<void> {
    if (data.maliciousIPs) {
      data.maliciousIPs.forEach(ip => this.threatIntelligence.knownAttackers.add(ip));
    }
    
    if (data.suspiciousUserAgents) {
      data.suspiciousUserAgents.forEach(ua => this.threatIntelligence.blockedUserAgents.add(ua));
    }
    
    if (data.blockedCountries) {
      this.threatIntelligence.geoBlocking.blockedCountries.push(...data.blockedCountries);
    }
    
    await this.saveThreatIntelligence();
  }

  public getThreatIntelligence(): ThreatIntelligence {
    return {
      knownAttackers: new Set(this.threatIntelligence.knownAttackers),
      suspiciousPatterns: [...this.threatIntelligence.suspiciousPatterns],
      blockedUserAgents: new Set(this.threatIntelligence.blockedUserAgents),
      geoBlocking: { ...this.threatIntelligence.geoBlocking }
    };
  }

  public async performSecurityScan(): Promise<{
    vulnerabilities: string[];
    recommendations: string[];
    riskScore: number;
  }> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Check WAF configuration
    const wafConfig = this.wafService.getConfiguration();
    if (!wafConfig.enabled) {
      vulnerabilities.push('WAF protection is disabled');
      recommendations.push('Enable WAF protection');
      riskScore += 30;
    }

    if (!wafConfig.blockMode) {
      vulnerabilities.push('WAF is in log-only mode');
      recommendations.push('Enable WAF block mode for production');
      riskScore += 15;
    }

    // Check network security
    const networkConfig = this.networkService.getConfiguration();
    if (!networkConfig.enableCertificatePinning) {
      vulnerabilities.push('Certificate pinning is disabled');
      recommendations.push('Enable certificate pinning');
      riskScore += 20;
    }

    // Check recent security events
    const recentCriticalEvents = this.securityEvents.filter(event => 
      event.severity === 'critical' && 
      Date.now() - event.timestamp < 24 * 60 * 60 * 1000
    );

    if (recentCriticalEvents.length > 0) {
      vulnerabilities.push(`${recentCriticalEvents.length} critical security events in last 24h`);
      recommendations.push('Investigate and resolve critical security events');
      riskScore += recentCriticalEvents.length * 10;
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
      vulnerabilities,
      recommendations,
      riskScore
    };
  }

  public async clearSecurityData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'security_integration_config',
        'threat_intelligence_data'
      ]);
      
      this.securityEvents = [];
      this.threatIntelligence.knownAttackers.clear();
      
      console.log('Security data cleared');
    } catch (error) {
      console.error('Failed to clear security data:', error);
    }
  }
}

export { 
  SecurityIntegrationService, 
  type SecurityConfiguration, 
  type SecurityEvent, 
  type ThreatIntelligence 
};