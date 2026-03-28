import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type SecurityManager from './SecurityManager';
import type SystemMonitoringService from '@/services/monitoring/SystemMonitoringService';

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'malware' | 'data_breach' | 'unauthorized_access' | 'ddos' | 'social_engineering' | 'insider_threat' | 'system_compromise' | 'data_loss' | 'compliance_violation';
  status: 'detected' | 'triaged' | 'contained' | 'eradicated' | 'recovered' | 'closed';
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest, 5 = lowest
  
  // Timeline
  detectedAt: number;
  triagedAt?: number;
  containedAt?: number;
  eradicatedAt?: number;
  recoveredAt?: number;
  closedAt?: number;
  
  // Response details
  assignedTeam: 'SOC' | 'DevSecOps' | 'CISO' | 'Legal' | 'PR' | 'Executive';
  assignedTo?: string;
  escalationLevel: 1 | 2 | 3 | 4; // 1 = team lead, 4 = executive
  
  // Technical details
  affectedSystems: string[];
  affectedUsers: string[];
  attackVector?: string;
  indicators: ThreatIndicator[];
  evidence: IncidentEvidence[];
  
  // Response actions
  containmentActions: ResponseAction[];
  eradicationActions: ResponseAction[];
  recoveryActions: ResponseAction[];
  
  // Impact assessment
  businessImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  dataImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  financialImpact?: number;
  reputationalImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  
  // Compliance and legal
  regulatoryNotificationRequired: boolean;
  lawEnforcementNotificationRequired: boolean;
  customerNotificationRequired: boolean;
  
  // Lessons learned
  rootCause?: string;
  lessonsLearned?: string[];
  preventiveMeasures?: string[];
  
  // Metadata
  createdBy: string;
  lastUpdatedBy: string;
  lastUpdatedAt: number;
  tags: string[];
  relatedIncidents: string[];
}

interface ThreatIndicator {
  type: 'ip_address' | 'domain' | 'url' | 'file_hash' | 'email' | 'user_agent' | 'behavior_pattern';
  value: string;
  confidence: 'low' | 'medium' | 'high';
  source: string;
  firstSeen: number;
  lastSeen: number;
  isMalicious: boolean;
}

interface IncidentEvidence {
  id: string;
  type: 'log_file' | 'screenshot' | 'network_capture' | 'memory_dump' | 'disk_image' | 'document' | 'communication';
  description: string;
  location: string;
  collectedAt: number;
  collectedBy: string;
  chainOfCustody: ChainOfCustodyEntry[];
  hash?: string;
  size?: number;
}

interface ChainOfCustodyEntry {
  timestamp: number;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'destroyed';
  person: string;
  location: string;
  notes?: string;
}

interface ResponseAction {
  id: string;
  type: 'isolate_system' | 'block_ip' | 'disable_account' | 'patch_system' | 'backup_data' | 'notify_stakeholder' | 'collect_evidence' | 'analyze_logs' | 'restore_system' | 'update_security_controls';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  assignedTo: string;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  result?: string;
  priority: 1 | 2 | 3 | 4 | 5;
}

interface IncidentResponsePlan {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  phases: IncidentPhase[];
  escalationMatrix: EscalationRule[];
  communicationPlan: CommunicationPlan;
  slaTargets: SLATarget[];
  enabled: boolean;
  version: string;
  lastUpdated: number;
}

interface IncidentPhase {
  name: 'detection' | 'triage' | 'containment' | 'eradication' | 'recovery' | 'post_incident';
  description: string;
  objectives: string[];
  actions: string[];
  roles: string[];
  timeLimit?: number; // milliseconds
  successCriteria: string[];
}

interface EscalationRule {
  condition: string;
  fromLevel: number;
  toLevel: number;
  timeThreshold: number; // milliseconds
  notificationTargets: string[];
  automaticEscalation: boolean;
}

interface CommunicationPlan {
  internalNotifications: NotificationRule[];
  externalNotifications: NotificationRule[];
  mediaResponse: MediaResponsePlan;
  customerCommunication: CustomerCommunicationPlan;
}

interface NotificationRule {
  severity: SecurityIncident['severity'];
  recipients: string[];
  channels: ('email' | 'sms' | 'slack' | 'teams' | 'phone')[];
  template: string;
  timeframe: number; // milliseconds
}

interface MediaResponsePlan {
  spokesperson: string;
  approvalProcess: string[];
  templates: Record<string, string>;
  guidelines: string[];
}

interface CustomerCommunicationPlan {
  notificationThreshold: SecurityIncident['severity'];
  channels: string[];
  timeline: number;
  approvalRequired: boolean;
  templates: Record<string, string>;
}

interface SLATarget {
  severity: SecurityIncident['severity'];
  detectionTime: number; // milliseconds
  triageTime: number;
  containmentTime: number;
  eradicationTime: number;
  recoveryTime: number;
  totalResolutionTime: number;
}

interface IncidentMetrics {
  totalIncidents: number;
  incidentsBySeverity: Record<SecurityIncident['severity'], number>;
  incidentsByCategory: Record<SecurityIncident['category'], number>;
  averageDetectionTime: number;
  averageTriageTime: number;
  averageContainmentTime: number;
  averageResolutionTime: number;
  slaCompliance: number; // percentage
  falsePositiveRate: number;
  recurringIncidents: number;
  mttr: number; // Mean Time To Recovery
  mttd: number; // Mean Time To Detection
}

interface ThreatIntelligence {
  indicators: ThreatIndicator[];
  campaigns: ThreatCampaign[];
  actors: ThreatActor[];
  lastUpdated: number;
}

interface ThreatCampaign {
  id: string;
  name: string;
  description: string;
  tactics: string[];
  techniques: string[];
  indicators: string[];
  attribution?: string;
  firstSeen: number;
  lastSeen: number;
  active: boolean;
}

interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  motivation: string[];
  capabilities: string[];
  targets: string[];
  ttps: string[]; // Tactics, Techniques, and Procedures
  attribution: 'nation_state' | 'cybercriminal' | 'hacktivist' | 'insider' | 'unknown';
}

class IncidentResponseService {
  private static instance: IncidentResponseService;
  private incidents: Map<string, SecurityIncident> = new Map();
  private responsePlans: Map<string, IncidentResponsePlan> = new Map();
  private threatIntelligence: ThreatIntelligence;
  private metrics: IncidentMetrics;
  
  // Service dependencies
  private securityManager?: SecurityManager;
  private systemMonitoring?: SystemMonitoringService;
  
  // Monitoring and alerting
  private monitoringActive: boolean = false;
  private alertSubscribers: ((incident: SecurityIncident) => void)[] = [];
  private escalationTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Defer resolving runtime dependencies to initialize() to avoid circular initialization
    this.threatIntelligence = {
      indicators: [],
      campaigns: [],
      actors: [],
      lastUpdated: Date.now()
    };
    
    this.metrics = {
      totalIncidents: 0,
      incidentsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      incidentsByCategory: {
        malware: 0,
        data_breach: 0,
        unauthorized_access: 0,
        ddos: 0,
        social_engineering: 0,
        insider_threat: 0,
        system_compromise: 0,
        data_loss: 0,
        compliance_violation: 0
      },
      averageDetectionTime: 0,
      averageTriageTime: 0,
      averageContainmentTime: 0,
      averageResolutionTime: 0,
      slaCompliance: 0,
      falsePositiveRate: 0,
      recurringIncidents: 0,
      mttr: 0,
      mttd: 0
    };
    
    this.initializeDefaultPlans();
  }

  static getInstance(): IncidentResponseService {
    if (!IncidentResponseService.instance) {
      IncidentResponseService.instance = new IncidentResponseService();
    }
    return IncidentResponseService.instance;
  }

  // ===== INITIALIZATION =====

  async initialize(): Promise<void> {
    try {
      if (!this.securityManager) {
        const mod = await import('./SecurityManager');
        this.securityManager = mod.default.getInstance();
      }
      if (!this.systemMonitoring) {
        const mod2 = await import('@/services/monitoring/SystemMonitoringService');
        this.systemMonitoring = mod2.default.getInstance();
      }

      await this.loadPersistedData();
      await this.startIncidentMonitoring();
      this.monitoringActive = true;
      console.log('🚨 Incident Response Service initialized');
    } catch (error) {
      console.error('Failed to initialize Incident Response Service:', error);
      throw error;
    }
  }

  private initializeDefaultPlans(): void {
    // Critical Security Incident Response Plan
    const criticalPlan: IncidentResponsePlan = {
      id: 'critical_security_incident',
      name: 'Critical Security Incident Response',
      description: 'Response plan for critical security incidents requiring immediate action',
      triggerConditions: [
        'severity = critical',
        'category = data_breach',
        'category = system_compromise',
        'affected_users > 1000'
      ],
      phases: [
        {
          name: 'detection',
          description: 'Identify and confirm the security incident',
          objectives: [
            'Confirm incident validity',
            'Assess initial scope',
            'Classify incident severity'
          ],
          actions: [
            'Analyze security alerts',
            'Validate threat indicators',
            'Document initial findings'
          ],
          roles: ['SOC Analyst', 'Security Engineer'],
          timeLimit: 15 * 60 * 1000, // 15 minutes
          successCriteria: [
            'Incident confirmed as valid',
            'Initial severity assessment completed',
            'Stakeholders notified'
          ]
        },
        {
          name: 'triage',
          description: 'Prioritize and assign incident for response',
          objectives: [
            'Determine incident priority',
            'Assign response team',
            'Establish communication channels'
          ],
          actions: [
            'Assess business impact',
            'Assign incident commander',
            'Activate response team'
          ],
          roles: ['Incident Commander', 'SOC Manager'],
          timeLimit: 30 * 60 * 1000, // 30 minutes
          successCriteria: [
            'Response team activated',
            'Communication channels established',
            'Initial response strategy defined'
          ]
        },
        {
          name: 'containment',
          description: 'Limit the scope and impact of the incident',
          objectives: [
            'Stop incident progression',
            'Preserve evidence',
            'Minimize business impact'
          ],
          actions: [
            'Isolate affected systems',
            'Block malicious indicators',
            'Preserve forensic evidence'
          ],
          roles: ['Security Engineer', 'System Administrator', 'Network Engineer'],
          timeLimit: 2 * 60 * 60 * 1000, // 2 hours
          successCriteria: [
            'Incident contained',
            'Evidence preserved',
            'Systems stabilized'
          ]
        },
        {
          name: 'eradication',
          description: 'Remove the threat and vulnerabilities',
          objectives: [
            'Eliminate root cause',
            'Remove malicious artifacts',
            'Patch vulnerabilities'
          ],
          actions: [
            'Remove malware',
            'Patch systems',
            'Update security controls'
          ],
          roles: ['Security Engineer', 'System Administrator'],
          timeLimit: 4 * 60 * 60 * 1000, // 4 hours
          successCriteria: [
            'Threat eliminated',
            'Vulnerabilities patched',
            'Systems hardened'
          ]
        },
        {
          name: 'recovery',
          description: 'Restore normal operations',
          objectives: [
            'Restore affected systems',
            'Verify system integrity',
            'Resume normal operations'
          ],
          actions: [
            'Restore from backups',
            'Verify system integrity',
            'Monitor for recurrence'
          ],
          roles: ['System Administrator', 'Security Engineer'],
          timeLimit: 8 * 60 * 60 * 1000, // 8 hours
          successCriteria: [
            'Systems restored',
            'Operations resumed',
            'Monitoring enhanced'
          ]
        },
        {
          name: 'post_incident',
          description: 'Learn from the incident and improve',
          objectives: [
            'Document lessons learned',
            'Improve security controls',
            'Update procedures'
          ],
          actions: [
            'Conduct post-incident review',
            'Update security policies',
            'Implement improvements'
          ],
          roles: ['Incident Commander', 'Security Manager', 'CISO'],
          timeLimit: 7 * 24 * 60 * 60 * 1000, // 7 days
          successCriteria: [
            'Post-incident report completed',
            'Improvements implemented',
            'Procedures updated'
          ]
        }
      ],
      escalationMatrix: [
        {
          condition: 'severity = critical AND time_elapsed > 30_minutes',
          fromLevel: 1,
          toLevel: 2,
          timeThreshold: 30 * 60 * 1000,
          notificationTargets: ['SOC Manager', 'Security Manager'],
          automaticEscalation: true
        },
        {
          condition: 'severity = critical AND time_elapsed > 2_hours',
          fromLevel: 2,
          toLevel: 3,
          timeThreshold: 2 * 60 * 60 * 1000,
          notificationTargets: ['CISO', 'CTO'],
          automaticEscalation: true
        },
        {
          condition: 'business_impact = severe OR data_impact = severe',
          fromLevel: 3,
          toLevel: 4,
          timeThreshold: 4 * 60 * 60 * 1000,
          notificationTargets: ['CEO', 'Legal Counsel', 'PR Manager'],
          automaticEscalation: false
        }
      ],
      communicationPlan: {
        internalNotifications: [
          {
            severity: 'critical',
            recipients: ['SOC Team', 'Security Manager', 'CISO', 'CTO'],
            channels: ['email', 'sms', 'slack'],
            template: 'critical_incident_notification',
            timeframe: 15 * 60 * 1000 // 15 minutes
          }
        ],
        externalNotifications: [
          {
            severity: 'critical',
            recipients: ['Regulatory Bodies', 'Law Enforcement', 'Customers'],
            channels: ['email', 'phone'],
            template: 'external_breach_notification',
            timeframe: 72 * 60 * 60 * 1000 // 72 hours
          }
        ],
        mediaResponse: {
          spokesperson: 'Chief Communications Officer',
          approvalProcess: ['Legal Counsel', 'CEO'],
          templates: {
            initial_statement: 'We are investigating a potential security incident...',
            update_statement: 'We continue to investigate and will provide updates...',
            resolution_statement: 'The security incident has been resolved...'
          },
          guidelines: [
            'Do not speculate on cause or impact',
            'Emphasize customer protection measures',
            'Provide regular updates'
          ]
        },
        customerCommunication: {
          notificationThreshold: 'high',
          channels: ['email', 'in_app_notification', 'website_banner'],
          timeline: 24 * 60 * 60 * 1000, // 24 hours
          approvalRequired: true,
          templates: {
            breach_notification: 'We are writing to inform you of a security incident...',
            update_notification: 'We wanted to provide you with an update...',
            resolution_notification: 'We are pleased to inform you that the security incident has been resolved...'
          }
        }
      },
      slaTargets: [
        {
          severity: 'critical',
          detectionTime: 5 * 60 * 1000, // 5 minutes
          triageTime: 15 * 60 * 1000, // 15 minutes
          containmentTime: 1 * 60 * 60 * 1000, // 1 hour
          eradicationTime: 4 * 60 * 60 * 1000, // 4 hours
          recoveryTime: 8 * 60 * 60 * 1000, // 8 hours
          totalResolutionTime: 24 * 60 * 60 * 1000 // 24 hours
        },
        {
          severity: 'high',
          detectionTime: 15 * 60 * 1000, // 15 minutes
          triageTime: 30 * 60 * 1000, // 30 minutes
          containmentTime: 4 * 60 * 60 * 1000, // 4 hours
          eradicationTime: 8 * 60 * 60 * 1000, // 8 hours
          recoveryTime: 24 * 60 * 60 * 1000, // 24 hours
          totalResolutionTime: 72 * 60 * 60 * 1000 // 72 hours
        },
        {
          severity: 'medium',
          detectionTime: 30 * 60 * 1000, // 30 minutes
          triageTime: 2 * 60 * 60 * 1000, // 2 hours
          containmentTime: 8 * 60 * 60 * 1000, // 8 hours
          eradicationTime: 24 * 60 * 60 * 1000, // 24 hours
          recoveryTime: 72 * 60 * 60 * 1000, // 72 hours
          totalResolutionTime: 7 * 24 * 60 * 60 * 1000 // 7 days
        },
        {
          severity: 'low',
          detectionTime: 2 * 60 * 60 * 1000, // 2 hours
          triageTime: 8 * 60 * 60 * 1000, // 8 hours
          containmentTime: 24 * 60 * 60 * 1000, // 24 hours
          eradicationTime: 72 * 60 * 60 * 1000, // 72 hours
          recoveryTime: 7 * 24 * 60 * 60 * 1000, // 7 days
          totalResolutionTime: 30 * 24 * 60 * 60 * 1000 // 30 days
        }
      ],
      enabled: true,
      version: '1.0',
      lastUpdated: Date.now()
    };

    this.responsePlans.set(criticalPlan.id, criticalPlan);
  }

  // ===== INCIDENT MANAGEMENT =====

  async createIncident(
    title: string,
    description: string,
    severity: SecurityIncident['severity'],
    category: SecurityIncident['category'],
    indicators: ThreatIndicator[] = [],
    affectedSystems: string[] = [],
    affectedUsers: string[] = []
  ): Promise<string> {
    const incidentId = `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const incident: SecurityIncident = {
      id: incidentId,
      title,
      description,
      severity,
      category,
      status: 'detected',
      priority: this.calculatePriority(severity, category),
      
      // Timeline
      detectedAt: Date.now(),
      
      // Assignment
      assignedTeam: this.determineAssignedTeam(severity, category),
      escalationLevel: 1,
      
      // Technical details
      affectedSystems,
      affectedUsers,
      indicators,
      evidence: [],
      
      // Response actions
      containmentActions: [],
      eradicationActions: [],
      recoveryActions: [],
      
      // Impact assessment
      businessImpact: this.assessBusinessImpact(severity, affectedSystems, affectedUsers),
      dataImpact: this.assessDataImpact(category, affectedSystems),
      reputationalImpact: this.assessReputationalImpact(severity, category),
      
      // Compliance
      regulatoryNotificationRequired: this.requiresRegulatoryNotification(severity, category),
      lawEnforcementNotificationRequired: this.requiresLawEnforcementNotification(category),
      customerNotificationRequired: this.requiresCustomerNotification(severity, affectedUsers),
      
      // Metadata
      createdBy: 'system',
      lastUpdatedBy: 'system',
      lastUpdatedAt: Date.now(),
      tags: [],
      relatedIncidents: []
    };

    this.incidents.set(incidentId, incident);
    
    // Trigger automatic response
    await this.triggerIncidentResponse(incident);
    
    // Update metrics
    this.updateMetrics(incident);
    
    // Notify subscribers
    this.notifySubscribers(incident);
    
    // Persist data
    await this.persistData();
    
    console.log(`🚨 Security incident created: ${incidentId} - ${title} (${severity})`);
    return incidentId;
  }

  private calculatePriority(severity: SecurityIncident['severity'], category: SecurityIncident['category']): SecurityIncident['priority'] {
    // Priority matrix based on severity and category
    const priorityMatrix: Record<SecurityIncident['severity'], Record<SecurityIncident['category'], SecurityIncident['priority']>> = {
      critical: {
        data_breach: 1,
        system_compromise: 1,
        malware: 1,
        unauthorized_access: 1,
        ddos: 2,
        insider_threat: 1,
        data_loss: 1,
        compliance_violation: 2,
        social_engineering: 2
      },
      high: {
        data_breach: 1,
        system_compromise: 2,
        malware: 2,
        unauthorized_access: 2,
        ddos: 3,
        insider_threat: 2,
        data_loss: 2,
        compliance_violation: 3,
        social_engineering: 3
      },
      medium: {
        data_breach: 2,
        system_compromise: 3,
        malware: 3,
        unauthorized_access: 3,
        ddos: 4,
        insider_threat: 3,
        data_loss: 3,
        compliance_violation: 4,
        social_engineering: 4
      },
      low: {
        data_breach: 3,
        system_compromise: 4,
        malware: 4,
        unauthorized_access: 4,
        ddos: 5,
        insider_threat: 4,
        data_loss: 4,
        compliance_violation: 5,
        social_engineering: 5
      }
    };

    return priorityMatrix[severity][category];
  }

  private determineAssignedTeam(severity: SecurityIncident['severity'], category: SecurityIncident['category']): SecurityIncident['assignedTeam'] {
    if (severity === 'critical') {
      if (category === 'data_breach' || category === 'compliance_violation') {
        return 'CISO';
      }
      return 'SOC';
    }
    
    if (severity === 'high') {
      return 'SOC';
    }
    
    return 'DevSecOps';
  }

  private assessBusinessImpact(
    severity: SecurityIncident['severity'],
    affectedSystems: string[],
    affectedUsers: string[]
  ): SecurityIncident['businessImpact'] {
    if (severity === 'critical' || affectedUsers.length > 1000 || affectedSystems.includes('production')) {
      return 'severe';
    }
    if (severity === 'high' || affectedUsers.length > 100) {
      return 'significant';
    }
    if (severity === 'medium' || affectedUsers.length > 10) {
      return 'moderate';
    }
    if (affectedUsers.length > 0) {
      return 'minimal';
    }
    return 'none';
  }

  private assessDataImpact(category: SecurityIncident['category'], affectedSystems: string[]): SecurityIncident['dataImpact'] {
    if (category === 'data_breach' || category === 'data_loss') {
      return 'severe';
    }
    if (category === 'unauthorized_access' && affectedSystems.includes('database')) {
      return 'significant';
    }
    if (category === 'system_compromise') {
      return 'moderate';
    }
    return 'minimal';
  }

  private assessReputationalImpact(
    severity: SecurityIncident['severity'],
    category: SecurityIncident['category']
  ): SecurityIncident['reputationalImpact'] {
    if (severity === 'critical' && (category === 'data_breach' || category === 'system_compromise')) {
      return 'severe';
    }
    if (severity === 'high' && category === 'data_breach') {
      return 'significant';
    }
    if (severity === 'medium' || category === 'compliance_violation') {
      return 'moderate';
    }
    return 'minimal';
  }

  private requiresRegulatoryNotification(severity: SecurityIncident['severity'], category: SecurityIncident['category']): boolean {
    return (severity === 'critical' || severity === 'high') && 
           (category === 'data_breach' || category === 'compliance_violation');
  }

  private requiresLawEnforcementNotification(category: SecurityIncident['category']): boolean {
    return category === 'data_breach' || category === 'system_compromise' || category === 'malware';
  }

  private requiresCustomerNotification(severity: SecurityIncident['severity'], affectedUsers: string[]): boolean {
    return (severity === 'critical' || severity === 'high') && affectedUsers.length > 0;
  }

  // ===== INCIDENT RESPONSE WORKFLOW =====

  private async triggerIncidentResponse(incident: SecurityIncident): Promise<void> {
    try {
      // Find applicable response plan
      const plan = this.findApplicableResponsePlan(incident);
      
      if (plan) {
        console.log(`🚨 Triggering response plan: ${plan.name} for incident ${incident.id}`);
        
        // Start with detection phase
        await this.executePhase(incident, plan.phases[0]);
        
        // Auto-progress to triage if detection is successful
        if (incident.status === 'detected') {
          await this.progressToNextPhase(incident.id);
        }
      }
      
      // Start escalation monitoring
      this.startEscalationMonitoring(incident);
      
    } catch (error) {
      console.error(`Failed to trigger incident response for ${incident.id}:`, error);
    }
  }

  private findApplicableResponsePlan(incident: SecurityIncident): IncidentResponsePlan | null {
    for (const plan of this.responsePlans.values()) {
      if (!plan.enabled) continue;
      
      const isApplicable = plan.triggerConditions.some(condition => 
        this.evaluateCondition(condition, incident)
      );
      
      if (isApplicable) {
        return plan;
      }
    }
    
    return null;
  }

  private evaluateCondition(condition: string, incident: SecurityIncident): boolean {
    // Simple condition evaluation - in production, use a proper expression parser
    if (condition.includes('severity = critical')) {
      return incident.severity === 'critical';
    }
    if (condition.includes('category = data_breach')) {
      return incident.category === 'data_breach';
    }
    if (condition.includes('category = system_compromise')) {
      return incident.category === 'system_compromise';
    }
    if (condition.includes('affected_users > 1000')) {
      return incident.affectedUsers.length > 1000;
    }
    
    return false;
  }

  private async executePhase(incident: SecurityIncident, phase: IncidentPhase): Promise<void> {
    console.log(`🔄 Executing phase: ${phase.name} for incident ${incident.id}`);
    
    // Generate response actions based on phase
    const actions = await this.generatePhaseActions(incident, phase);
    
    // Add actions to incident
    switch (phase.name) {
      case 'containment':
        incident.containmentActions.push(...actions);
        break;
      case 'eradication':
        incident.eradicationActions.push(...actions);
        break;
      case 'recovery':
        incident.recoveryActions.push(...actions);
        break;
    }
    
    // Execute automatic actions
    for (const action of actions) {
      if (this.isAutomaticAction(action)) {
        await this.executeAction(incident, action);
      }
    }
  }

  private async generatePhaseActions(incident: SecurityIncident, phase: IncidentPhase): Promise<ResponseAction[]> {
    const actions: ResponseAction[] = [];
    
    switch (phase.name) {
      case 'containment':
        if (incident.category === 'malware' || incident.category === 'system_compromise') {
          actions.push({
            id: `action_${Date.now()}_1`,
            type: 'isolate_system',
            description: 'Isolate affected systems from network',
            status: 'pending',
            assignedTo: 'SOC Team',
            priority: 1
          });
        }
        
        if (incident.indicators.some(i => i.type === 'ip_address' && i.isMalicious)) {
          actions.push({
            id: `action_${Date.now()}_2`,
            type: 'block_ip',
            description: 'Block malicious IP addresses',
            status: 'pending',
            assignedTo: 'Network Team',
            priority: 1
          });
        }
        break;
        
      case 'eradication':
        if (incident.category === 'malware') {
          actions.push({
            id: `action_${Date.now()}_3`,
            type: 'patch_system',
            description: 'Apply security patches and remove malware',
            status: 'pending',
            assignedTo: 'Security Team',
            priority: 1
          });
        }
        break;
        
      case 'recovery':
        actions.push({
          id: `action_${Date.now()}_4`,
          type: 'restore_system',
          description: 'Restore systems from clean backups',
          status: 'pending',
          assignedTo: 'System Admin',
          priority: 1
        });
        break;
    }
    
    return actions;
  }

  private isAutomaticAction(action: ResponseAction): boolean {
    // Define which actions can be executed automatically
    const automaticActions = ['block_ip', 'collect_evidence', 'analyze_logs'];
    return automaticActions.includes(action.type);
  }

  private async executeAction(incident: SecurityIncident, action: ResponseAction): Promise<void> {
    try {
      action.status = 'in_progress';
      action.startedAt = Date.now();
      
      switch (action.type) {
        case 'block_ip':
          await this.blockMaliciousIPs(incident);
          break;
        case 'collect_evidence':
          await this.collectEvidence(incident);
          break;
        case 'analyze_logs':
          await this.analyzeLogs(incident);
          break;
        default:
          console.log(`Manual action required: ${action.description}`);
      }
      
      action.status = 'completed';
      action.completedAt = Date.now();
      action.result = 'Action completed successfully';
      
    } catch (error) {
      action.status = 'failed';
      action.result = `Action failed: ${error}`;
      console.error(`Failed to execute action ${action.id}:`, error);
    }
  }

  private async blockMaliciousIPs(incident: SecurityIncident): Promise<void> {
    const maliciousIPs = incident.indicators
      .filter(i => i.type === 'ip_address' && i.isMalicious)
      .map(i => i.value);
    
    for (const ip of maliciousIPs) {
      // In production, this would integrate with firewall/WAF
      console.log(`🚫 Blocking malicious IP: ${ip}`);
    }
  }

  private async collectEvidence(incident: SecurityIncident): Promise<void> {
    // Collect system logs, network captures, etc.
    const evidence: IncidentEvidence = {
      id: `evidence_${Date.now()}`,
      type: 'log_file',
      description: 'System logs during incident timeframe',
      location: '/var/log/security.log',
      collectedAt: Date.now(),
      collectedBy: 'Automated System',
      chainOfCustody: [{
        timestamp: Date.now(),
        action: 'collected',
        person: 'Automated System',
        location: 'Security Server',
        notes: 'Automatically collected during incident response'
      }]
    };
    
    incident.evidence.push(evidence);
    console.log(`📋 Evidence collected: ${evidence.description}`);
  }

  private async analyzeLogs(incident: SecurityIncident): Promise<void> {
    // Analyze logs for additional indicators
    console.log(`🔍 Analyzing logs for incident ${incident.id}`);
    
    // Mock log analysis - in production, integrate with SIEM
    const additionalIndicators: ThreatIndicator[] = [
      {
        type: 'behavior_pattern',
        value: 'unusual_login_pattern',
        confidence: 'medium',
        source: 'log_analysis',
        firstSeen: Date.now() - 3600000,
        lastSeen: Date.now(),
        isMalicious: true
      }
    ];
    
    incident.indicators.push(...additionalIndicators);
  }

  // ===== ESCALATION MANAGEMENT =====

  private startEscalationMonitoring(incident: SecurityIncident): void {
    const plan = this.findApplicableResponsePlan(incident);
    if (!plan) return;
    
    // Check escalation rules periodically
    const checkEscalation = () => {
      this.checkEscalationRules(incident, plan);
    };
    
    // Check every 5 minutes
    const escalationInterval = setInterval(checkEscalation, 5 * 60 * 1000);
    
    // Stop monitoring when incident is closed
    const stopMonitoring = () => {
      if (incident.status === 'closed') {
        clearInterval(escalationInterval);
      }
    };
    
    // Check every minute if incident is closed
    const statusInterval = setInterval(stopMonitoring, 60 * 1000);
  }

  private checkEscalationRules(incident: SecurityIncident, plan: IncidentResponsePlan): void {
    const now = Date.now();
    const timeElapsed = now - incident.detectedAt;
    
    for (const rule of plan.escalationMatrix) {
      if (rule.fromLevel === incident.escalationLevel && 
          timeElapsed > rule.timeThreshold &&
          this.evaluateCondition(rule.condition, incident)) {
        
        if (rule.automaticEscalation) {
          this.escalateIncident(incident.id, rule.toLevel, rule.notificationTargets);
        } else {
          this.notifyEscalationRequired(incident, rule);
        }
      }
    }
  }

  async escalateIncident(incidentId: string, newLevel: number, notificationTargets: string[]): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;
    
    const previousLevel = incident.escalationLevel;
    incident.escalationLevel = newLevel as 1 | 2 | 3 | 4;
    incident.lastUpdatedAt = Date.now();
    
    // Send notifications
    await this.sendEscalationNotifications(incident, notificationTargets);
    
    console.log(`⬆️ Incident ${incidentId} escalated from level ${previousLevel} to level ${newLevel}`);
    
    await this.persistData();
  }

  private notifyEscalationRequired(incident: SecurityIncident, rule: EscalationRule): void {
    console.log(`⚠️ Manual escalation required for incident ${incident.id} to level ${rule.toLevel}`);
    // In production, send notifications to appropriate personnel
  }

  private async sendEscalationNotifications(incident: SecurityIncident, targets: string[]): Promise<void> {
    for (const target of targets) {
      // In production, integrate with notification systems (email, SMS, Slack, etc.)
      console.log(`📧 Escalation notification sent to ${target} for incident ${incident.id}`);
    }
  }

  // ===== INCIDENT LIFECYCLE MANAGEMENT =====

  async progressToNextPhase(incidentId: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;
    
    const phaseOrder: SecurityIncident['status'][] = [
      'detected', 'triaged', 'contained', 'eradicated', 'recovered', 'closed'
    ];
    
    const currentIndex = phaseOrder.indexOf(incident.status);
    if (currentIndex < phaseOrder.length - 1) {
      const nextStatus = phaseOrder[currentIndex + 1];
      await this.updateIncidentStatus(incidentId, nextStatus);
    }
  }

  async updateIncidentStatus(incidentId: string, status: SecurityIncident['status']): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;
    
    incident.status = status;
    incident.lastUpdatedAt = Date.now();
    
    // Update timeline
    switch (status) {
      case 'triaged':
        incident.triagedAt = Date.now();
        break;
      case 'contained':
        incident.containedAt = Date.now();
        break;
      case 'eradicated':
        incident.eradicatedAt = Date.now();
        break;
      case 'recovered':
        incident.recoveredAt = Date.now();
        break;
      case 'closed':
        incident.closedAt = Date.now();
        break;
    }
    
    console.log(`📊 Incident ${incidentId} status updated to: ${status}`);
    
    await this.persistData();
  }

  // ===== MONITORING AND DETECTION =====

  private async startIncidentMonitoring(): Promise<void> {
    // Monitor security events from various sources
    setInterval(async () => {
      await this.monitorSecurityEvents();
      await this.updateThreatIntelligence();
      await this.checkSLACompliance();
    }, 60 * 1000); // Every minute
    
    console.log('🔍 Incident monitoring started');
  }

  private async monitorSecurityEvents(): Promise<void> {
    try {
      // Get security events from SecurityManager
      const securityEvents = this.securityManager?.getSecurityEvents('critical') ?? [];
      
      for (const event of securityEvents) {
        // Check if event should trigger an incident
        if (this.shouldCreateIncident(event)) {
          await this.createIncidentFromEvent(event);
        }
      }
      
    } catch (error) {
      console.error('Failed to monitor security events:', error);
    }
  }

  private shouldCreateIncident(event: any): boolean {
    // Define criteria for creating incidents from security events
    const incidentTriggers = [
      'security_violation',
      'tampering_detected',
      'runtime_protection',
      'server_validation_failed',
      'fraud_detection',
      'acid_violation'
    ];
    
    return incidentTriggers.includes(event.type) && event.severity === 'critical';
  }

  private async createIncidentFromEvent(event: any): Promise<void> {
    const title = `Security Event: ${event.type}`;
    const description = `Automated incident created from security event: ${JSON.stringify(event.details)}`;
    const severity: SecurityIncident['severity'] = event.severity === 'critical' ? 'critical' : 'high';
    const category = this.mapEventToCategory(event.type);
    
    const indicators: ThreatIndicator[] = [{
      type: 'behavior_pattern',
      value: event.type,
      confidence: 'high',
      source: 'security_manager',
      firstSeen: event.timestamp,
      lastSeen: event.timestamp,
      isMalicious: true
    }];
    
    await this.createIncident(title, description, severity, category, indicators);
  }

  private mapEventToCategory(eventType: string): SecurityIncident['category'] {
    const categoryMap: Record<string, SecurityIncident['category']> = {
      'security_violation': 'unauthorized_access',
      'tampering_detected': 'system_compromise',
      'runtime_protection': 'malware',
      'server_validation_failed': 'unauthorized_access',
      'fraud_detection': 'unauthorized_access',
      'acid_violation': 'data_loss'
    };
    
    return categoryMap[eventType] || 'system_compromise';
  }

  private async updateThreatIntelligence(): Promise<void> {
    // In production, integrate with threat intelligence feeds
    this.threatIntelligence.lastUpdated = Date.now();
  }

  private async checkSLACompliance(): Promise<void> {
    const now = Date.now();
    
    for (const incident of this.incidents.values()) {
      if (incident.status === 'closed') continue;
      
      const plan = this.findApplicableResponsePlan(incident);
      if (!plan) continue;
      
      const slaTarget = plan.slaTargets.find(target => target.severity === incident.severity);
      if (!slaTarget) continue;
      
      const timeElapsed = now - incident.detectedAt;
      
      // Check if SLA is breached
      if (this.isSLABreached(incident, slaTarget, timeElapsed)) {
        console.warn(`⚠️ SLA breach detected for incident ${incident.id}`);
        // In production, send SLA breach notifications
      }
    }
  }

  private isSLABreached(incident: SecurityIncident, slaTarget: SLATarget, timeElapsed: number): boolean {
    switch (incident.status) {
      case 'detected':
        return timeElapsed > slaTarget.detectionTime;
      case 'triaged':
        return timeElapsed > slaTarget.triageTime;
      case 'contained':
        return timeElapsed > slaTarget.containmentTime;
      case 'eradicated':
        return timeElapsed > slaTarget.eradicationTime;
      case 'recovered':
        return timeElapsed > slaTarget.recoveryTime;
      default:
        return false;
    }
  }

  // ===== METRICS AND REPORTING =====

  private updateMetrics(incident: SecurityIncident): void {
    this.metrics.totalIncidents++;
    this.metrics.incidentsBySeverity[incident.severity]++;
    this.metrics.incidentsByCategory[incident.category]++;
    
    // Calculate averages
    this.calculateAverageMetrics();
  }

  private calculateAverageMetrics(): void {
    const closedIncidents = Array.from(this.incidents.values()).filter(i => i.status === 'closed');
    
    if (closedIncidents.length === 0) return;
    
    // Calculate average times
    const detectionTimes = closedIncidents
      .filter(i => i.triagedAt)
      .map(i => i.triagedAt! - i.detectedAt);
    
    const triageTimes = closedIncidents
      .filter(i => i.containedAt && i.triagedAt)
      .map(i => i.containedAt! - i.triagedAt!);
    
    const containmentTimes = closedIncidents
      .filter(i => i.eradicatedAt && i.containedAt)
      .map(i => i.eradicatedAt! - i.containedAt!);
    
    const resolutionTimes = closedIncidents
      .filter(i => i.closedAt)
      .map(i => i.closedAt! - i.detectedAt);
    
    this.metrics.averageDetectionTime = this.calculateAverage(detectionTimes);
    this.metrics.averageTriageTime = this.calculateAverage(triageTimes);
    this.metrics.averageContainmentTime = this.calculateAverage(containmentTimes);
    this.metrics.averageResolutionTime = this.calculateAverage(resolutionTimes);
    
    // MTTR and MTTD
    this.metrics.mttr = this.metrics.averageResolutionTime;
    this.metrics.mttd = this.metrics.averageDetectionTime;
  }

  private calculateAverage(times: number[]): number {
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  // ===== DATA PERSISTENCE =====

  private async persistData(): Promise<void> {
    try {
      await AsyncStorage.setItem('incident_response_incidents', JSON.stringify(Array.from(this.incidents.entries())));
      await AsyncStorage.setItem('incident_response_plans', JSON.stringify(Array.from(this.responsePlans.entries())));
      await AsyncStorage.setItem('incident_response_metrics', JSON.stringify(this.metrics));
      await AsyncStorage.setItem('threat_intelligence', JSON.stringify(this.threatIntelligence));
    } catch (error) {
      console.error('Failed to persist incident response data:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const incidentsData = await AsyncStorage.getItem('incident_response_incidents');
      const plansData = await AsyncStorage.getItem('incident_response_plans');
      const metricsData = await AsyncStorage.getItem('incident_response_metrics');
      const threatData = await AsyncStorage.getItem('threat_intelligence');

      if (incidentsData) {
        this.incidents = new Map(JSON.parse(incidentsData));
      }
      if (plansData) {
        this.responsePlans = new Map(JSON.parse(plansData));
      }
      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }
      if (threatData) {
        this.threatIntelligence = JSON.parse(threatData);
      }
    } catch (error) {
      console.error('Failed to load persisted incident response data:', error);
    }
  }

  // ===== PUBLIC API =====

  getIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values()).sort((a, b) => b.detectedAt - a.detectedAt);
  }

  getIncident(incidentId: string): SecurityIncident | null {
    return this.incidents.get(incidentId) || null;
  }

  getActiveIncidents(): SecurityIncident[] {
    return this.getIncidents().filter(incident => incident.status !== 'closed');
  }

  getCriticalIncidents(): SecurityIncident[] {
    return this.getIncidents().filter(incident => incident.severity === 'critical');
  }

  getIncidentsByCategory(category: SecurityIncident['category']): SecurityIncident[] {
    return this.getIncidents().filter(incident => incident.category === category);
  }

  getMetrics(): IncidentMetrics {
    return { ...this.metrics };
  }

  getThreatIntelligence(): ThreatIntelligence {
    return { ...this.threatIntelligence };
  }

  getResponsePlans(): IncidentResponsePlan[] {
    return Array.from(this.responsePlans.values());
  }

  subscribeToIncidents(callback: (incident: SecurityIncident) => void): () => void {
    this.alertSubscribers.push(callback);
    
    return () => {
      const index = this.alertSubscribers.indexOf(callback);
      if (index > -1) {
        this.alertSubscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(incident: SecurityIncident): void {
    this.alertSubscribers.forEach(callback => {
      try {
        callback(incident);
      } catch (error) {
        console.error('Incident subscriber error:', error);
      }
    });
  }

  async addEvidence(incidentId: string, evidence: Omit<IncidentEvidence, 'id' | 'chainOfCustody'>): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;
    
    const newEvidence: IncidentEvidence = {
      ...evidence,
      id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chainOfCustody: [{
        timestamp: Date.now(),
        action: 'collected',
        person: evidence.collectedBy,
        location: evidence.location,
        notes: 'Evidence added to incident'
      }]
    };
    
    incident.evidence.push(newEvidence);
    incident.lastUpdatedAt = Date.now();
    
    await this.persistData();
  }

  async addThreatIndicator(incidentId: string, indicator: ThreatIndicator): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;
    
    incident.indicators.push(indicator);
    incident.lastUpdatedAt = Date.now();
    
    // Add to global threat intelligence
    this.threatIntelligence.indicators.push(indicator);
    this.threatIntelligence.lastUpdated = Date.now();
    
    await this.persistData();
  }

  async closeIncident(incidentId: string, resolution: string, lessonsLearned: string[]): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;
    
    incident.status = 'closed';
    incident.closedAt = Date.now();
    incident.rootCause = resolution;
    incident.lessonsLearned = lessonsLearned;
    incident.lastUpdatedAt = Date.now();
    
    console.log(`✅ Incident ${incidentId} closed: ${resolution}`);
    
    await this.persistData();
  }

  isMonitoring(): boolean {
    return this.monitoringActive;
  }

  async cleanup(): Promise<void> {
    if (this.escalationTimer) {
      clearTimeout(this.escalationTimer);
      this.escalationTimer = null;
    }
    
    await this.persistData();
    this.monitoringActive = false;
    
    console.log('Incident Response Service cleanup completed');
  }
}

export default IncidentResponseService;
export type { SecurityIncident, IncidentResponsePlan, ThreatIndicator, IncidentEvidence, ResponseAction, IncidentMetrics };