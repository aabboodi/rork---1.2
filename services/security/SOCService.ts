import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IncidentResponseService from './IncidentResponseService';
import CentralizedLoggingService from './CentralizedLoggingService';
import SystemMonitoringService from '@/services/monitoring/SystemMonitoringService';

interface SOCAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'threat_detection' | 'anomaly' | 'compliance' | 'performance' | 'availability';
  source: string;
  timestamp: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedAnalyst?: string;
  escalationLevel: 1 | 2 | 3; // 1 = L1 Analyst, 2 = L2 Analyst, 3 = L3 Senior
  
  // Technical details
  indicators: ThreatIndicator[];
  affectedAssets: string[];
  riskScore: number; // 0-100
  confidence: number; // 0-100
  
  // Response tracking
  firstResponseTime?: number;
  investigationStarted?: number;
  resolutionTime?: number;
  
  // Analysis
  falsePositive: boolean;
  rootCause?: string;
  mitigationActions: string[];
  lessonsLearned?: string[];
  
  // Correlation
  relatedAlerts: string[];
  correlationScore?: number;
}

interface ThreatIndicator {
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'behavior';
  value: string;
  confidence: 'low' | 'medium' | 'high';
  source: string;
  isMalicious: boolean;
  firstSeen: number;
  lastSeen: number;
}

interface SOCMetrics {
  totalAlerts: number;
  alertsBySeverity: Record<SOCAlert['severity'], number>;
  alertsByCategory: Record<SOCAlert['category'], number>;
  alertsByStatus: Record<SOCAlert['status'], number>;
  
  // Response times
  averageFirstResponseTime: number;
  averageInvestigationTime: number;
  averageResolutionTime: number;
  
  // Quality metrics
  falsePositiveRate: number;
  escalationRate: number;
  slaCompliance: number;
  
  // Analyst performance
  analystWorkload: Record<string, number>;
  analystPerformance: Record<string, AnalystMetrics>;
}

interface AnalystMetrics {
  alertsHandled: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  falsePositiveRate: number;
  escalationRate: number;
  qualityScore: number;
}

interface SOCPlaybook {
  id: string;
  name: string;
  description: string;
  category: SOCAlert['category'];
  severity: SOCAlert['severity'];
  triggerConditions: string[];
  investigationSteps: PlaybookStep[];
  containmentActions: PlaybookStep[];
  eradicationActions: PlaybookStep[];
  recoveryActions: PlaybookStep[];
  enabled: boolean;
  version: string;
  lastUpdated: number;
}

interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  type: 'manual' | 'automated' | 'decision';
  estimatedTime: number; // minutes
  requiredSkills: string[];
  tools: string[];
  outputs: string[];
  nextSteps: string[];
}

interface ThreatHunt {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  huntType: 'proactive' | 'reactive' | 'intelligence_driven';
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  
  // Scope
  timeRange: { start: number; end: number };
  dataSource: string[];
  targetAssets: string[];
  
  // Execution
  huntQueries: HuntQuery[];
  findings: HuntFinding[];
  
  // Results
  threatsFound: number;
  falsePositives: number;
  newDetectionRules: string[];
  
  // Team
  leadAnalyst: string;
  participants: string[];
  
  // Timeline
  startedAt: number;
  completedAt?: number;
  estimatedDuration: number; // hours
}

interface HuntQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  dataSource: string;
  executedAt?: number;
  results?: number;
  findings?: string[];
}

interface HuntFinding {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: 'low' | 'medium' | 'high';
  indicators: ThreatIndicator[];
  evidence: string[];
  recommendedActions: string[];
  createdIncident?: string;
}

interface SOCDashboard {
  overview: {
    totalAlerts: number;
    openAlerts: number;
    criticalAlerts: number;
    averageResponseTime: number;
    slaCompliance: number;
  };
  alertTrends: {
    last24h: number;
    last7d: number;
    last30d: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  topThreats: {
    category: string;
    count: number;
    severity: SOCAlert['severity'];
  }[];
  analystStatus: {
    analyst: string;
    status: 'available' | 'busy' | 'offline';
    currentAlerts: number;
    shift: string;
  }[];
  activeHunts: ThreatHunt[];
  recentIncidents: any[];
}

class SOCService {
  private static instance: SOCService;
  private alerts: Map<string, SOCAlert> = new Map();
  private playbooks: Map<string, SOCPlaybook> = new Map();
  private threatHunts: Map<string, ThreatHunt> = new Map();
  private metrics: SOCMetrics;
  
  // Service dependencies
  private incidentResponse: IncidentResponseService;
  private logging: CentralizedLoggingService;
  private systemMonitoring: SystemMonitoringService;
  
  // SOC operations
  private serviceActive: boolean = false;
  private alertProcessingTimer: NodeJS.Timeout | null = null;
  private threatHuntTimer: NodeJS.Timeout | null = null;
  
  // Analysts and shifts
  private analysts: Map<string, AnalystMetrics> = new Map();
  private currentShift: string = 'day'; // day, night, weekend

  private constructor() {
    this.incidentResponse = IncidentResponseService.getInstance();
    this.logging = CentralizedLoggingService.getInstance();
    this.systemMonitoring = SystemMonitoringService.getInstance();
    
    this.metrics = this.initializeMetrics();
    this.initializeDefaultPlaybooks();
    this.initializeAnalysts();
  }

  static getInstance(): SOCService {
    if (!SOCService.instance) {
      SOCService.instance = new SOCService();
    }
    return SOCService.instance;
  }

  // ===== INITIALIZATION =====

  async initialize(): Promise<void> {
    try {
      await this.loadPersistedData();
      await this.startSOCOperations();
      this.serviceActive = true;
      
      this.logging.logSecurity('info', 'soc_service', 'SOC Service initialized', {
        playbooks: this.playbooks.size,
        analysts: this.analysts.size
      });
      
      console.log('🛡️ SOC Service initialized');
    } catch (error) {
      console.error('Failed to initialize SOC Service:', error);
      throw error;
    }
  }

  private initializeMetrics(): SOCMetrics {
    return {
      totalAlerts: 0,
      alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      alertsByCategory: { 
        threat_detection: 0, 
        anomaly: 0, 
        compliance: 0, 
        performance: 0, 
        availability: 0 
      },
      alertsByStatus: { open: 0, investigating: 0, resolved: 0, false_positive: 0 },
      averageFirstResponseTime: 0,
      averageInvestigationTime: 0,
      averageResolutionTime: 0,
      falsePositiveRate: 0,
      escalationRate: 0,
      slaCompliance: 0,
      analystWorkload: {},
      analystPerformance: {}
    };
  }

  private initializeDefaultPlaybooks(): void {
    // Malware Detection Playbook
    const malwarePlaybook: SOCPlaybook = {
      id: 'malware_detection',
      name: 'Malware Detection Response',
      description: 'Standard response procedures for malware detection alerts',
      category: 'threat_detection',
      severity: 'high',
      triggerConditions: [
        'malware_detected = true',
        'antivirus_alert = true',
        'suspicious_file_behavior = true'
      ],
      investigationSteps: [
        {
          id: 'initial_triage',
          title: 'Initial Triage',
          description: 'Verify the malware detection and assess initial scope',
          type: 'manual',
          estimatedTime: 15,
          requiredSkills: ['malware_analysis', 'incident_response'],
          tools: ['SIEM', 'EDR', 'Sandbox'],
          outputs: ['triage_report', 'scope_assessment'],
          nextSteps: ['detailed_analysis']
        },
        {
          id: 'detailed_analysis',
          title: 'Detailed Malware Analysis',
          description: 'Perform in-depth analysis of the malware sample',
          type: 'manual',
          estimatedTime: 60,
          requiredSkills: ['malware_analysis', 'reverse_engineering'],
          tools: ['Sandbox', 'Disassembler', 'Network_Analysis'],
          outputs: ['malware_report', 'iocs'],
          nextSteps: ['containment']
        }
      ],
      containmentActions: [
        {
          id: 'isolate_systems',
          title: 'Isolate Infected Systems',
          description: 'Isolate all systems showing signs of infection',
          type: 'automated',
          estimatedTime: 5,
          requiredSkills: ['system_administration'],
          tools: ['EDR', 'Network_Segmentation'],
          outputs: ['isolation_report'],
          nextSteps: ['eradication']
        }
      ],
      eradicationActions: [
        {
          id: 'remove_malware',
          title: 'Remove Malware',
          description: 'Remove malware from infected systems',
          type: 'manual',
          estimatedTime: 30,
          requiredSkills: ['malware_removal', 'system_administration'],
          tools: ['Antivirus', 'EDR', 'System_Tools'],
          outputs: ['removal_report'],
          nextSteps: ['recovery']
        }
      ],
      recoveryActions: [
        {
          id: 'restore_systems',
          title: 'Restore Systems',
          description: 'Restore systems to normal operation',
          type: 'manual',
          estimatedTime: 45,
          requiredSkills: ['system_administration', 'backup_restoration'],
          tools: ['Backup_Systems', 'Monitoring_Tools'],
          outputs: ['restoration_report'],
          nextSteps: ['post_incident']
        }
      ],
      enabled: true,
      version: '1.0',
      lastUpdated: Date.now()
    };

    this.playbooks.set(malwarePlaybook.id, malwarePlaybook);
  }

  private initializeAnalysts(): void {
    const analysts = [
      { name: 'L1_Analyst_1', level: 1 },
      { name: 'L1_Analyst_2', level: 1 },
      { name: 'L2_Analyst_1', level: 2 },
      { name: 'L3_Senior_1', level: 3 }
    ];

    analysts.forEach(analyst => {
      this.analysts.set(analyst.name, {
        alertsHandled: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        falsePositiveRate: 0,
        escalationRate: 0,
        qualityScore: 100
      });
    });
  }

  // ===== ALERT MANAGEMENT =====

  async createAlert(
    title: string,
    description: string,
    severity: SOCAlert['severity'],
    category: SOCAlert['category'],
    source: string,
    indicators: ThreatIndicator[] = [],
    affectedAssets: string[] = []
  ): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: SOCAlert = {
      id: alertId,
      title,
      description,
      severity,
      category,
      source,
      timestamp: Date.now(),
      status: 'open',
      escalationLevel: 1,
      indicators,
      affectedAssets,
      riskScore: this.calculateRiskScore(severity, indicators, affectedAssets),
      confidence: this.calculateConfidence(indicators),
      falsePositive: false,
      mitigationActions: [],
      relatedAlerts: []
    };

    this.alerts.set(alertId, alert);
    
    // Auto-assign to available analyst
    await this.assignAlert(alertId);
    
    // Check for applicable playbooks
    await this.checkPlaybooks(alert);
    
    // Correlate with existing alerts
    await this.correlateAlert(alert);
    
    // Update metrics
    this.updateMetrics(alert);
    
    // Log alert creation
    this.logging.logSecurity('warn', 'soc_service', `SOC Alert created: ${title}`, {
      alertId,
      severity,
      category,
      riskScore: alert.riskScore
    });
    
    // Check if incident should be created
    if (alert.severity === 'critical' || alert.riskScore > 80) {
      await this.createIncidentFromAlert(alert);
    }
    
    console.log(`🚨 SOC Alert created: ${alertId} - ${title} (${severity})`);
    return alertId;
  }

  private calculateRiskScore(
    severity: SOCAlert['severity'],
    indicators: ThreatIndicator[],
    affectedAssets: string[]
  ): number {
    let score = 0;
    
    // Base score from severity
    switch (severity) {
      case 'critical': score += 40; break;
      case 'high': score += 30; break;
      case 'medium': score += 20; break;
      case 'low': score += 10; break;
    }
    
    // Score from indicators
    const maliciousIndicators = indicators.filter(i => i.isMalicious).length;
    score += maliciousIndicators * 10;
    
    // Score from affected assets
    score += Math.min(affectedAssets.length * 5, 30);
    
    return Math.min(score, 100);
  }

  private calculateConfidence(indicators: ThreatIndicator[]): number {
    if (indicators.length === 0) return 50;
    
    const confidenceScores = indicators.map(indicator => {
      switch (indicator.confidence) {
        case 'high': return 90;
        case 'medium': return 70;
        case 'low': return 40;
        default: return 50;
      }
    });
    
    return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
  }

  private async assignAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;
    
    // Find available analyst based on workload and escalation level
    const availableAnalysts = Array.from(this.analysts.entries())
      .filter(([name, metrics]) => {
        const currentWorkload = this.metrics.analystWorkload[name] || 0;
        return currentWorkload < 10; // Max 10 alerts per analyst
      })
      .sort((a, b) => (this.metrics.analystWorkload[a[0]] || 0) - (this.metrics.analystWorkload[b[0]] || 0));
    
    if (availableAnalysts.length > 0) {
      const assignedAnalyst = availableAnalysts[0][0];
      alert.assignedAnalyst = assignedAnalyst;
      
      // Update workload
      this.metrics.analystWorkload[assignedAnalyst] = (this.metrics.analystWorkload[assignedAnalyst] || 0) + 1;
      
      this.logging.logSecurity('info', 'soc_service', `Alert assigned to analyst`, {
        alertId,
        analyst: assignedAnalyst
      });
    }
  }

  private async checkPlaybooks(alert: SOCAlert): Promise<void> {
    for (const playbook of this.playbooks.values()) {
      if (!playbook.enabled) continue;
      
      if (playbook.category === alert.category && playbook.severity === alert.severity) {
        this.logging.logSecurity('info', 'soc_service', `Playbook applicable for alert`, {
          alertId: alert.id,
          playbookId: playbook.id,
          playbookName: playbook.name
        });
        
        // In production, this would trigger playbook execution
        break;
      }
    }
  }

  private async correlateAlert(alert: SOCAlert): Promise<void> {
    const timeWindow = 60 * 60 * 1000; // 1 hour
    const now = Date.now();
    
    // Find related alerts within time window
    const relatedAlerts = Array.from(this.alerts.values())
      .filter(existingAlert => 
        existingAlert.id !== alert.id &&
        Math.abs(existingAlert.timestamp - alert.timestamp) < timeWindow &&
        this.areAlertsRelated(alert, existingAlert)
      );
    
    if (relatedAlerts.length > 0) {
      alert.relatedAlerts = relatedAlerts.map(a => a.id);
      alert.correlationScore = this.calculateCorrelationScore(alert, relatedAlerts);
      
      this.logging.logSecurity('info', 'soc_service', `Alert correlated with existing alerts`, {
        alertId: alert.id,
        relatedAlerts: alert.relatedAlerts.length,
        correlationScore: alert.correlationScore
      });
    }
  }

  private areAlertsRelated(alert1: SOCAlert, alert2: SOCAlert): boolean {
    // Check for common indicators
    const commonIndicators = alert1.indicators.filter(i1 =>
      alert2.indicators.some(i2 => i1.value === i2.value && i1.type === i2.type)
    );
    
    // Check for common affected assets
    const commonAssets = alert1.affectedAssets.filter(asset =>
      alert2.affectedAssets.includes(asset)
    );
    
    // Check for same category
    const sameCategory = alert1.category === alert2.category;
    
    return commonIndicators.length > 0 || commonAssets.length > 0 || sameCategory;
  }

  private calculateCorrelationScore(alert: SOCAlert, relatedAlerts: SOCAlert[]): number {
    let score = 0;
    
    relatedAlerts.forEach(relatedAlert => {
      // Score based on common indicators
      const commonIndicators = alert.indicators.filter(i1 =>
        relatedAlert.indicators.some(i2 => i1.value === i2.value)
      );
      score += commonIndicators.length * 20;
      
      // Score based on common assets
      const commonAssets = alert.affectedAssets.filter(asset =>
        relatedAlert.affectedAssets.includes(asset)
      );
      score += commonAssets.length * 15;
      
      // Score based on category match
      if (alert.category === relatedAlert.category) {
        score += 10;
      }
    });
    
    return Math.min(score, 100);
  }

  private async createIncidentFromAlert(alert: SOCAlert): Promise<void> {
    try {
      const incidentTitle = `SOC Alert Escalation: ${alert.title}`;
      const incidentDescription = `Escalated from SOC alert ${alert.id}: ${alert.description}`;
      
      const incidentCategory = this.mapAlertCategoryToIncident(alert.category);
      const incidentSeverity = alert.severity;
      
      await this.incidentResponse.createIncident(
        incidentTitle,
        incidentDescription,
        incidentSeverity,
        incidentCategory,
        alert.indicators,
        alert.affectedAssets
      );
      
      this.logging.logSecurity('warn', 'soc_service', `Incident created from SOC alert`, {
        alertId: alert.id,
        incidentTitle
      });
      
    } catch (error) {
      console.error('Failed to create incident from alert:', error);
    }
  }

  private mapAlertCategoryToIncident(category: SOCAlert['category']): any {
    const mapping = {
      'threat_detection': 'malware',
      'anomaly': 'unauthorized_access',
      'compliance': 'compliance_violation',
      'performance': 'system_compromise',
      'availability': 'ddos'
    };
    
    return mapping[category] || 'system_compromise';
  }

  // ===== THREAT HUNTING =====

  async createThreatHunt(
    name: string,
    description: string,
    hypothesis: string,
    huntType: ThreatHunt['huntType'],
    timeRange: { start: number; end: number },
    dataSource: string[],
    targetAssets: string[]
  ): Promise<string> {
    const huntId = `hunt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const hunt: ThreatHunt = {
      id: huntId,
      name,
      description,
      hypothesis,
      huntType,
      status: 'planning',
      timeRange,
      dataSource,
      targetAssets,
      huntQueries: [],
      findings: [],
      threatsFound: 0,
      falsePositives: 0,
      newDetectionRules: [],
      leadAnalyst: 'L3_Senior_1', // Default assignment
      participants: [],
      startedAt: Date.now(),
      estimatedDuration: 8 // 8 hours default
    };

    this.threatHunts.set(huntId, hunt);
    
    this.logging.logSecurity('info', 'soc_service', `Threat hunt created: ${name}`, {
      huntId,
      huntType,
      hypothesis
    });
    
    console.log(`🔍 Threat hunt created: ${huntId} - ${name}`);
    return huntId;
  }

  async addHuntQuery(
    huntId: string,
    name: string,
    description: string,
    query: string,
    dataSource: string
  ): Promise<void> {
    const hunt = this.threatHunts.get(huntId);
    if (!hunt) return;
    
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const huntQuery: HuntQuery = {
      id: queryId,
      name,
      description,
      query,
      dataSource
    };
    
    hunt.huntQueries.push(huntQuery);
    
    this.logging.logSecurity('info', 'soc_service', `Hunt query added`, {
      huntId,
      queryId,
      queryName: name
    });
  }

  async executeHuntQuery(huntId: string, queryId: string): Promise<void> {
    const hunt = this.threatHunts.get(huntId);
    if (!hunt) return;
    
    const query = hunt.huntQueries.find(q => q.id === queryId);
    if (!query) return;
    
    try {
      // Mock query execution - in production, this would execute against actual data sources
      query.executedAt = Date.now();
      query.results = Math.floor(Math.random() * 100); // Mock results count
      query.findings = [`Finding from ${query.name}`]; // Mock findings
      
      this.logging.logSecurity('info', 'soc_service', `Hunt query executed`, {
        huntId,
        queryId,
        results: query.results
      });
      
    } catch (error) {
      console.error(`Failed to execute hunt query ${queryId}:`, error);
    }
  }

  async addHuntFinding(
    huntId: string,
    title: string,
    description: string,
    severity: HuntFinding['severity'],
    confidence: HuntFinding['confidence'],
    indicators: ThreatIndicator[],
    evidence: string[]
  ): Promise<void> {
    const hunt = this.threatHunts.get(huntId);
    if (!hunt) return;
    
    const findingId = `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const finding: HuntFinding = {
      id: findingId,
      title,
      description,
      severity,
      confidence,
      indicators,
      evidence,
      recommendedActions: this.generateRecommendedActions(severity, indicators)
    };
    
    hunt.findings.push(finding);
    hunt.threatsFound++;
    
    // Create alert from significant findings
    if (severity === 'high' || severity === 'critical') {
      const alertId = await this.createAlert(
        `Threat Hunt Finding: ${title}`,
        description,
        severity,
        'threat_detection',
        'threat_hunt',
        indicators
      );
      
      finding.createdIncident = alertId;
    }
    
    this.logging.logSecurity('warn', 'soc_service', `Threat hunt finding added`, {
      huntId,
      findingId,
      severity,
      title
    });
  }

  private generateRecommendedActions(severity: HuntFinding['severity'], indicators: ThreatIndicator[]): string[] {
    const actions: string[] = [];
    
    if (severity === 'critical' || severity === 'high') {
      actions.push('Immediately isolate affected systems');
      actions.push('Create security incident');
      actions.push('Notify security management');
    }
    
    if (indicators.some(i => i.type === 'ip' && i.isMalicious)) {
      actions.push('Block malicious IP addresses');
    }
    
    if (indicators.some(i => i.type === 'hash' && i.isMalicious)) {
      actions.push('Add file hashes to threat intelligence');
    }
    
    actions.push('Update detection rules');
    actions.push('Document findings in threat intelligence');
    
    return actions;
  }

  // ===== SOC OPERATIONS =====

  private async startSOCOperations(): Promise<void> {
    // Start alert processing
    this.alertProcessingTimer = setInterval(async () => {
      await this.processAlerts();
      await this.updateAnalystMetrics();
      await this.checkSLACompliance();
    }, 60000); // Every minute
    
    // Start threat hunt monitoring
    this.threatHuntTimer = setInterval(async () => {
      await this.monitorThreatHunts();
    }, 300000); // Every 5 minutes
    
    console.log('🛡️ SOC operations started');
  }

  private async processAlerts(): Promise<void> {
    const openAlerts = Array.from(this.alerts.values()).filter(alert => alert.status === 'open');
    
    for (const alert of openAlerts) {
      // Check for SLA breaches
      await this.checkAlertSLA(alert);
      
      // Auto-escalate if needed
      await this.checkAutoEscalation(alert);
    }
  }

  private async checkAlertSLA(alert: SOCAlert): Promise<void> {
    const now = Date.now();
    const alertAge = now - alert.timestamp;
    
    // SLA targets based on severity
    const slaTargets = {
      critical: 15 * 60 * 1000, // 15 minutes
      high: 30 * 60 * 1000, // 30 minutes
      medium: 2 * 60 * 60 * 1000, // 2 hours
      low: 8 * 60 * 60 * 1000 // 8 hours
    };
    
    const slaTarget = slaTargets[alert.severity];
    
    if (alertAge > slaTarget && !alert.firstResponseTime) {
      this.logging.logSecurity('warn', 'soc_service', `Alert SLA breach detected`, {
        alertId: alert.id,
        severity: alert.severity,
        alertAge: alertAge,
        slaTarget: slaTarget
      });
      
      // Auto-escalate SLA breaches
      await this.escalateAlert(alert.id);
    }
  }

  private async checkAutoEscalation(alert: SOCAlert): Promise<void> {
    const now = Date.now();
    const alertAge = now - alert.timestamp;
    
    // Auto-escalation rules
    if (alert.severity === 'critical' && alertAge > 30 * 60 * 1000 && alert.escalationLevel < 3) {
      await this.escalateAlert(alert.id);
    } else if (alert.severity === 'high' && alertAge > 2 * 60 * 60 * 1000 && alert.escalationLevel < 2) {
      await this.escalateAlert(alert.id);
    }
  }

  private async escalateAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.escalationLevel >= 3) return;
    
    alert.escalationLevel = (alert.escalationLevel + 1) as 1 | 2 | 3;
    
    // Reassign to higher level analyst
    const higherLevelAnalysts = Array.from(this.analysts.keys())
      .filter(name => name.includes(`L${alert.escalationLevel}`));
    
    if (higherLevelAnalysts.length > 0) {
      alert.assignedAnalyst = higherLevelAnalysts[0];
    }
    
    this.logging.logSecurity('warn', 'soc_service', `Alert escalated`, {
      alertId,
      newEscalationLevel: alert.escalationLevel,
      newAssignee: alert.assignedAnalyst
    });
  }

  private async updateAnalystMetrics(): Promise<void> {
    // Update analyst performance metrics
    for (const [analystName, metrics] of this.analysts) {
      const analystAlerts = Array.from(this.alerts.values())
        .filter(alert => alert.assignedAnalyst === analystName);
      
      metrics.alertsHandled = analystAlerts.length;
      
      // Calculate average response time
      const responseTimes = analystAlerts
        .filter(alert => alert.firstResponseTime)
        .map(alert => alert.firstResponseTime! - alert.timestamp);
      
      if (responseTimes.length > 0) {
        metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }
      
      // Calculate false positive rate
      const falsePositives = analystAlerts.filter(alert => alert.falsePositive).length;
      metrics.falsePositiveRate = analystAlerts.length > 0 ? falsePositives / analystAlerts.length : 0;
      
      // Update performance metrics
      this.metrics.analystPerformance[analystName] = metrics;
    }
  }

  private async checkSLACompliance(): Promise<void> {
    const allAlerts = Array.from(this.alerts.values());
    const resolvedAlerts = allAlerts.filter(alert => alert.status === 'resolved');
    
    if (resolvedAlerts.length === 0) return;
    
    const slaCompliantAlerts = resolvedAlerts.filter(alert => {
      const slaTargets = {
        critical: 15 * 60 * 1000,
        high: 30 * 60 * 1000,
        medium: 2 * 60 * 60 * 1000,
        low: 8 * 60 * 60 * 1000
      };
      
      const responseTime = alert.firstResponseTime ? alert.firstResponseTime - alert.timestamp : Infinity;
      return responseTime <= slaTargets[alert.severity];
    });
    
    this.metrics.slaCompliance = slaCompliantAlerts.length / resolvedAlerts.length;
  }

  private async monitorThreatHunts(): Promise<void> {
    const activeHunts = Array.from(this.threatHunts.values())
      .filter(hunt => hunt.status === 'active');
    
    for (const hunt of activeHunts) {
      const huntAge = Date.now() - hunt.startedAt;
      const estimatedDuration = hunt.estimatedDuration * 60 * 60 * 1000; // Convert hours to ms
      
      if (huntAge > estimatedDuration) {
        this.logging.logSecurity('warn', 'soc_service', `Threat hunt exceeding estimated duration`, {
          huntId: hunt.id,
          huntAge: huntAge,
          estimatedDuration: estimatedDuration
        });
      }
    }
  }

  private updateMetrics(alert: SOCAlert): void {
    this.metrics.totalAlerts++;
    this.metrics.alertsBySeverity[alert.severity]++;
    this.metrics.alertsByCategory[alert.category]++;
    this.metrics.alertsByStatus[alert.status]++;
  }

  // ===== DATA PERSISTENCE =====

  private async persistData(): Promise<void> {
    try {
      await AsyncStorage.setItem('soc_alerts', JSON.stringify(Array.from(this.alerts.entries())));
      await AsyncStorage.setItem('soc_playbooks', JSON.stringify(Array.from(this.playbooks.entries())));
      await AsyncStorage.setItem('soc_threat_hunts', JSON.stringify(Array.from(this.threatHunts.entries())));
      await AsyncStorage.setItem('soc_metrics', JSON.stringify(this.metrics));
      await AsyncStorage.setItem('soc_analysts', JSON.stringify(Array.from(this.analysts.entries())));
    } catch (error) {
      console.error('Failed to persist SOC data:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const alertsData = await AsyncStorage.getItem('soc_alerts');
      const playbooksData = await AsyncStorage.getItem('soc_playbooks');
      const huntsData = await AsyncStorage.getItem('soc_threat_hunts');
      const metricsData = await AsyncStorage.getItem('soc_metrics');
      const analystsData = await AsyncStorage.getItem('soc_analysts');

      if (alertsData) {
        this.alerts = new Map(JSON.parse(alertsData));
      }
      if (playbooksData) {
        this.playbooks = new Map(JSON.parse(playbooksData));
      }
      if (huntsData) {
        this.threatHunts = new Map(JSON.parse(huntsData));
      }
      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }
      if (analystsData) {
        this.analysts = new Map(JSON.parse(analystsData));
      }
    } catch (error) {
      console.error('Failed to load persisted SOC data:', error);
    }
  }

  // ===== PUBLIC API =====

  getSOCDashboard(): SOCDashboard {
    const now = Date.now();
    const allAlerts = Array.from(this.alerts.values());
    const openAlerts = allAlerts.filter(alert => alert.status === 'open');
    const criticalAlerts = allAlerts.filter(alert => alert.severity === 'critical');
    
    // Calculate alert trends
    const last24h = allAlerts.filter(alert => now - alert.timestamp < 24 * 60 * 60 * 1000).length;
    const last7d = allAlerts.filter(alert => now - alert.timestamp < 7 * 24 * 60 * 60 * 1000).length;
    const last30d = allAlerts.filter(alert => now - alert.timestamp < 30 * 24 * 60 * 60 * 1000).length;
    
    // Calculate top threats
    const threatCounts = new Map<string, number>();
    allAlerts.forEach(alert => {
      const count = threatCounts.get(alert.category) || 0;
      threatCounts.set(alert.category, count + 1);
    });
    
    const topThreats = Array.from(threatCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
        severity: 'medium' as SOCAlert['severity'] // Simplified
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Get analyst status
    const analystStatus = Array.from(this.analysts.keys()).map(analyst => ({
      analyst,
      status: 'available' as const, // Simplified
      currentAlerts: this.metrics.analystWorkload[analyst] || 0,
      shift: this.currentShift
    }));
    
    // Get active hunts
    const activeHunts = Array.from(this.threatHunts.values())
      .filter(hunt => hunt.status === 'active')
      .slice(0, 5);
    
    // Get recent incidents
    const recentIncidents = this.incidentResponse.getActiveIncidents().slice(0, 5);

    return {
      overview: {
        totalAlerts: this.metrics.totalAlerts,
        openAlerts: openAlerts.length,
        criticalAlerts: criticalAlerts.length,
        averageResponseTime: this.metrics.averageFirstResponseTime,
        slaCompliance: this.metrics.slaCompliance
      },
      alertTrends: {
        last24h,
        last7d,
        last30d,
        trend: last24h > last7d / 7 ? 'increasing' : last24h < last7d / 7 ? 'decreasing' : 'stable'
      },
      topThreats,
      analystStatus,
      activeHunts,
      recentIncidents
    };
  }

  getAlerts(): SOCAlert[] {
    return Array.from(this.alerts.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  getAlert(alertId: string): SOCAlert | null {
    return this.alerts.get(alertId) || null;
  }

  getThreatHunts(): ThreatHunt[] {
    return Array.from(this.threatHunts.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  getThreatHunt(huntId: string): ThreatHunt | null {
    return this.threatHunts.get(huntId) || null;
  }

  getMetrics(): SOCMetrics {
    return { ...this.metrics };
  }

  async updateAlertStatus(alertId: string, status: SOCAlert['status'], notes?: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;
    
    const previousStatus = alert.status;
    alert.status = status;
    
    // Update timeline
    const now = Date.now();
    if (status === 'investigating' && !alert.investigationStarted) {
      alert.investigationStarted = now;
      if (!alert.firstResponseTime) {
        alert.firstResponseTime = now;
      }
    } else if (status === 'resolved' && !alert.resolutionTime) {
      alert.resolutionTime = now;
    }
    
    // Update metrics
    this.metrics.alertsByStatus[previousStatus]--;
    this.metrics.alertsByStatus[status]++;
    
    this.logging.logSecurity('info', 'soc_service', `Alert status updated`, {
      alertId,
      previousStatus,
      newStatus: status,
      notes
    });
    
    await this.persistData();
  }

  async markAlertFalsePositive(alertId: string, reason: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;
    
    alert.falsePositive = true;
    alert.status = 'false_positive';
    alert.rootCause = reason;
    
    // Update analyst metrics
    if (alert.assignedAnalyst) {
      const analystMetrics = this.analysts.get(alert.assignedAnalyst);
      if (analystMetrics) {
        const totalAlerts = analystMetrics.alertsHandled;
        const falsePositives = Array.from(this.alerts.values())
          .filter(a => a.assignedAnalyst === alert.assignedAnalyst && a.falsePositive).length;
        
        analystMetrics.falsePositiveRate = totalAlerts > 0 ? falsePositives / totalAlerts : 0;
      }
    }
    
    this.logging.logSecurity('info', 'soc_service', `Alert marked as false positive`, {
      alertId,
      reason,
      analyst: alert.assignedAnalyst
    });
    
    await this.persistData();
  }

  isActive(): boolean {
    return this.serviceActive;
  }

  async cleanup(): Promise<void> {
    if (this.alertProcessingTimer) {
      clearInterval(this.alertProcessingTimer);
      this.alertProcessingTimer = null;
    }
    
    if (this.threatHuntTimer) {
      clearInterval(this.threatHuntTimer);
      this.threatHuntTimer = null;
    }
    
    await this.persistData();
    this.serviceActive = false;
    
    this.logging.logSecurity('info', 'soc_service', 'SOC Service cleanup completed');
  }
}

export default SOCService;
export type { SOCAlert, ThreatHunt, SOCMetrics, SOCDashboard, ThreatIndicator };