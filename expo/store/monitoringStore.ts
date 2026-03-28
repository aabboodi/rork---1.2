import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SystemMonitoringService from '@/services/monitoring/SystemMonitoringService';
import PerformanceMonitoringService from '@/services/monitoring/PerformanceMonitoringService';
import DataGovernanceService from '@/services/governance/DataGovernanceService';
import { IncidentResponseService } from '@/services/security/IncidentResponseService';
import { CentralizedLoggingService } from '@/services/security/CentralizedLoggingService';
import { SOCService } from '@/services/security/SOCService';
import { DevSecOpsIntegrationService } from '@/services/security/DevSecOpsIntegrationService';
import UEBAService from '@/services/security/UEBAService';
import ThreatIntelligenceService from '@/services/security/ThreatIntelligenceService';
import BehaviorAnalyticsService from '@/services/security/BehaviorAnalyticsService';

interface MonitoringState {
  // System Monitoring
  systemStatus: any | null;
  systemMetrics: any[];
  activeAlerts: any[];
  alertRules: any[];
  serviceHealth: Map<string, any>;
  
  // Performance Monitoring
  performanceDashboard: any | null;
  performanceMetrics: any[];
  slas: any[];
  performanceIssues: any[];
  performanceReports: any[];
  
  // Data Governance
  governanceStatus: any | null;
  governancePolicies: any[];
  dataClassifications: any[];
  privacyRequests: any[];
  complianceReports: any[];
  dataQualityMetrics: any[];
  
  // Incident Response
  incidents: any[];
  activeIncidents: any[];
  criticalIncidents: any[];
  incidentMetrics: any | null;
  threatHunts: any[];
  
  // Centralized Logging
  loggingMetrics: any | null;
  recentLogs: any[];
  logProviders: any[];
  
  // SOC (Security Operations Center)
  socDashboard: any | null;
  socAlerts: any[];
  threatIntelligence: any | null;
  analystMetrics: any | null;
  
  // DevSecOps Integration
  devSecOpsMetrics: any | null;
  securityPipelines: any[];
  vulnerabilityScans: any[];
  complianceScores: any[];
  
  // UEBA & Behavior Analytics
  uebaStats: any | null;
  behaviorAnalytics: any | null;
  threatIntelligenceStats: any | null;
  behaviorAlerts: any[];
  userProfiles: any[];
  anomalies: any[];
  mlModelStats: any[];
  
  // UI State
  isLoading: boolean;
  lastUpdated: number;
  autoRefresh: boolean;
  refreshInterval: number;
  selectedTimeRange: { start: number; end: number };
  
  // Services
  systemMonitoring: SystemMonitoringService | null;
  performanceMonitoring: PerformanceMonitoringService | null;
  dataGovernance: DataGovernanceService | null;
  incidentResponse: IncidentResponseService | null;
  centralizedLogging: CentralizedLoggingService | null;
  socService: SOCService | null;
  uebaService: UEBAService | null;
  threatIntelligenceService: ThreatIntelligenceService | null;
  behaviorAnalyticsService: BehaviorAnalyticsService | null;
  
  // Actions
  initializeMonitoring: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  
  // System Monitoring Actions
  getSystemStatus: () => any;
  getSystemMetrics: (timeRange?: { start: number; end: number }) => any[];
  getActiveAlerts: () => any[];
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  createAlertRule: (rule: any) => Promise<string>;
  updateAlertRule: (ruleId: string, updates: any) => Promise<void>;
  deleteAlertRule: (ruleId: string) => Promise<void>;
  
  // Performance Monitoring Actions
  getPerformanceDashboard: () => any;
  getPerformanceMetrics: (timeRange?: { start: number; end: number }) => any[];
  getSLAs: () => any[];
  getPerformanceIssues: () => any[];
  resolvePerformanceIssue: (issueId: string, resolution: string) => Promise<void>;
  generatePerformanceReport: (period: { start: number; end: number }) => Promise<any>;
  createSLA: (sla: any) => Promise<string>;
  updateSLA: (slaId: string, updates: any) => Promise<void>;
  deleteSLA: (slaId: string) => Promise<void>;
  
  // Data Governance Actions
  getGovernanceStatus: () => any;
  getGovernancePolicies: () => any[];
  getDataClassifications: () => any[];
  getPrivacyRequests: (userId?: string) => any[];
  getComplianceReports: () => any[];
  getDataQualityMetrics: () => any[];
  createGovernancePolicy: (policy: any) => Promise<string>;
  updateGovernancePolicy: (policyId: string, updates: any) => Promise<void>;
  deleteGovernancePolicy: (policyId: string) => Promise<void>;
  submitPrivacyRequest: (userId: string, type: string, details: string, dataTypes: string[]) => Promise<string>;
  processPrivacyRequest: (requestId: string) => Promise<void>;
  generateComplianceReport: (framework: string) => Promise<any>;
  assessDataQuality: (dataType: string, sampleData: any[]) => Promise<any>;
  
  // Incident Response Actions
  getIncidents: () => any[];
  getActiveIncidents: () => any[];
  getCriticalIncidents: () => any[];
  getIncidentMetrics: () => any;
  createIncident: (title: string, description: string, severity: string, category: string) => Promise<string>;
  updateIncidentStatus: (incidentId: string, status: string) => Promise<void>;
  assignIncident: (incidentId: string, assignee: string) => Promise<void>;
  addIncidentEvidence: (incidentId: string, evidence: any) => Promise<void>;
  getThreatHunts: () => any[];
  createThreatHunt: (hunt: any) => Promise<string>;
  
  // Centralized Logging Actions
  getLoggingMetrics: () => any;
  getRecentLogs: (limit?: number) => Promise<any[]>;
  searchLogs: (query: string, limit?: number) => Promise<any[]>;
  getLogProviders: () => any[];
  updateLogProvider: (providerId: string, config: any) => Promise<void>;
  
  // SOC Actions
  getSOCDashboard: () => any;
  getSOCAlerts: () => any[];
  createSOCAlert: (alert: any) => Promise<string>;
  updateAlertStatus: (alertId: string, status: string) => Promise<void>;
  getThreatIntelligence: () => any;
  getAnalystMetrics: () => any;
  
  // DevSecOps Actions
  getDevSecOpsMetrics: () => Promise<any>;
  getSecurityPipelines: () => Promise<any[]>;
  runSecurityPipeline: (pipelineId: string) => Promise<any>;
  getVulnerabilityScans: () => any[];
  getComplianceScores: () => any[];
  
  // UEBA & Behavior Analytics Actions
  getUEBAStats: () => any;
  getBehaviorAnalytics: () => any;
  getThreatIntelligenceStats: () => any;
  getBehaviorAlerts: (filters?: any) => Promise<any[]>;
  getUserProfiles: () => any[];
  getAnomalies: (userId?: string) => Promise<any[]>;
  getMLModelStats: () => any[];
  acknowledgeUEBAAlert: (alertId: string) => Promise<void>;
  resolveUEBAAlert: (alertId: string, resolution: string) => Promise<void>;
  analyzeUserBehavior: (userId: string, eventType: string, eventData: any) => Promise<any>;
  
  // Utility Actions
  setTimeRange: (timeRange: { start: number; end: number }) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  exportMonitoringData: () => Promise<string>;
  clearMonitoringData: () => Promise<void>;
}

// Simple storage for Zustand
const simpleJSONStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
}));

export const useMonitoringStore = create<MonitoringState>()(
  persist(
    (set, get) => ({
      // Initial State
      systemStatus: null,
      systemMetrics: [],
      activeAlerts: [],
      alertRules: [],
      serviceHealth: new Map(),
      
      performanceDashboard: null,
      performanceMetrics: [],
      slas: [],
      performanceIssues: [],
      performanceReports: [],
      
      governanceStatus: null,
      governancePolicies: [],
      dataClassifications: [],
      privacyRequests: [],
      complianceReports: [],
      dataQualityMetrics: [],
      
      incidents: [],
      activeIncidents: [],
      criticalIncidents: [],
      incidentMetrics: null,
      threatHunts: [],
      
      loggingMetrics: null,
      recentLogs: [],
      logProviders: [],
      
      socDashboard: null,
      socAlerts: [],
      threatIntelligence: null,
      analystMetrics: null,
      
      devSecOpsMetrics: null,
      securityPipelines: [],
      vulnerabilityScans: [],
      complianceScores: [],
      
      // UEBA & Behavior Analytics
      uebaStats: null,
      behaviorAnalytics: null,
      threatIntelligenceStats: null,
      behaviorAlerts: [],
      userProfiles: [],
      anomalies: [],
      mlModelStats: [],
      
      isLoading: false,
      lastUpdated: 0,
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds
      selectedTimeRange: {
        start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        end: Date.now()
      },
      
      systemMonitoring: null,
      performanceMonitoring: null,
      dataGovernance: null,
      incidentResponse: null,
      centralizedLogging: null,
      socService: null,
      uebaService: null,
      threatIntelligenceService: null,
      behaviorAnalyticsService: null,

      // Initialize comprehensive monitoring services including UEBA
      initializeMonitoring: async () => {
        try {
          set({ isLoading: true });

          // Initialize core services
          const systemMonitoring = SystemMonitoringService.getInstance();
          const performanceMonitoring = PerformanceMonitoringService.getInstance();
          const dataGovernance = DataGovernanceService.getInstance();
          
          // Initialize incident response and security services
          const incidentResponse = IncidentResponseService.getInstance();
          const centralizedLogging = CentralizedLoggingService.getInstance();
          const socService = SOCService.getInstance();

          // Initialize UEBA and Behavior Analytics services
          const uebaService = UEBAService.getInstance();
          const threatIntelligenceService = ThreatIntelligenceService.getInstance();
          const behaviorAnalyticsService = BehaviorAnalyticsService.getInstance();

          // Start monitoring services
          await systemMonitoring.startMonitoring();
          await performanceMonitoring.initialize();
          await dataGovernance.initialize();
          
          // Initialize incident response services
          await incidentResponse.initialize();
          await centralizedLogging.initialize();
          await socService.initialize();
          
          // Initialize UEBA and Behavior Analytics services
          await uebaService.initialize();
          await threatIntelligenceService.initialize();
          await behaviorAnalyticsService.initialize();
          
          // Initialize DevSecOps integration
          await DevSecOpsIntegrationService.initializeDevSecOps();

          set({
            systemMonitoring,
            performanceMonitoring,
            dataGovernance,
            incidentResponse,
            centralizedLogging,
            socService,
            uebaService,
            threatIntelligenceService,
            behaviorAnalyticsService
          });

          // Load initial data
          await get().refreshAllData();

          // Set up auto-refresh
          if (get().autoRefresh) {
            setInterval(async () => {
              if (get().autoRefresh) {
                await get().refreshAllData();
              }
            }, get().refreshInterval);
          }

          set({ isLoading: false });
          console.log('✅ Comprehensive monitoring services with UEBA initialized successfully');
        } catch (error) {
          console.error('💥 Failed to initialize monitoring services:', error);
          set({ isLoading: false });
        }
      },

      // Refresh all monitoring data including UEBA and Behavior Analytics
      refreshAllData: async () => {
        try {
          const { 
            systemMonitoring, 
            performanceMonitoring, 
            dataGovernance, 
            incidentResponse,
            centralizedLogging,
            socService,
            uebaService,
            threatIntelligenceService,
            behaviorAnalyticsService,
            selectedTimeRange 
          } = get();

          if (!systemMonitoring || !performanceMonitoring || !dataGovernance) {
            console.warn('⚠️ Core monitoring services not initialized');
            return;
          }

          // Refresh system monitoring data
          const systemStatus = systemMonitoring.getSystemStatus();
          const systemMetrics = systemMonitoring.getMetrics(selectedTimeRange);
          const activeAlerts = systemMonitoring.getActiveAlerts();
          const alertRules = systemMonitoring.getAlertRules();
          const serviceHealth = systemMonitoring.getServiceHealth();

          // Refresh performance monitoring data
          const performanceDashboard = performanceMonitoring.getPerformanceDashboard();
          const performanceMetrics = performanceMonitoring.getMetrics(selectedTimeRange);
          const slas = performanceMonitoring.getSLAs();
          const performanceIssues = performanceMonitoring.getIssues();
          const performanceReports = performanceMonitoring.getReports();

          // Refresh data governance data
          const governanceStatus = dataGovernance.getGovernanceStatus();
          const governancePolicies = dataGovernance.getPolicies();
          const dataClassifications = dataGovernance.getDataClassifications();
          const privacyRequests = dataGovernance.getPrivacyRequests();
          const complianceReports = dataGovernance.getComplianceReports();
          const dataQualityMetrics = dataGovernance.getDataQualityMetrics();

          // Refresh incident response data
          let incidents = [];
          let activeIncidents = [];
          let criticalIncidents = [];
          let incidentMetrics = null;
          let threatHunts = [];
          
          if (incidentResponse) {
            incidents = incidentResponse.getIncidents();
            activeIncidents = incidentResponse.getActiveIncidents();
            criticalIncidents = incidentResponse.getCriticalIncidents();
            incidentMetrics = incidentResponse.getMetrics();
            threatHunts = incidentResponse.getThreatHunts ? incidentResponse.getThreatHunts() : [];
          }

          // Refresh centralized logging data
          let loggingMetrics = null;
          let recentLogs = [];
          let logProviders = [];
          
          if (centralizedLogging) {
            loggingMetrics = centralizedLogging.getMetrics();
            recentLogs = await centralizedLogging.getRecentLogs(100);
            logProviders = centralizedLogging.getProviders();
          }

          // Refresh SOC data
          let socDashboard = null;
          let socAlerts = [];
          let threatIntelligence = null;
          let analystMetrics = null;
          
          if (socService) {
            socDashboard = socService.getSOCDashboard();
            socAlerts = socService.getAlerts();
            threatIntelligence = socService.getThreatIntelligence();
            analystMetrics = socService.getMetrics();
          }

          // Refresh DevSecOps data
          const devSecOpsMetrics = await DevSecOpsIntegrationService.getDevSecOpsMetrics();
          const securityPipelines = await DevSecOpsIntegrationService.getPipelines();

          // Refresh UEBA and Behavior Analytics data
          let uebaStats = null;
          let behaviorAnalytics = null;
          let threatIntelligenceStats = null;
          let behaviorAlerts = [];
          let userProfiles = [];
          let anomalies = [];
          let mlModelStats = [];

          if (uebaService) {
            uebaStats = await uebaService.getSystemStats();
            userProfiles = await uebaService.getHighRiskUsers(0.5); // Get users with risk > 50%
            anomalies = await uebaService.getUserAnomalies('current_user', 20);
          }

          if (behaviorAnalyticsService) {
            behaviorAnalytics = await behaviorAnalyticsService.getAnalyticsStats();
            behaviorAlerts = await behaviorAnalyticsService.getBehaviorAlerts({ limit: 50 });
            mlModelStats = behaviorAnalytics.mlModelStats || [];
          }

          if (threatIntelligenceService) {
            threatIntelligenceStats = await threatIntelligenceService.getThreatStats();
          }

          set({
            systemStatus,
            systemMetrics,
            activeAlerts,
            alertRules,
            serviceHealth,
            performanceDashboard,
            performanceMetrics,
            slas,
            performanceIssues,
            performanceReports,
            governanceStatus,
            governancePolicies,
            dataClassifications,
            privacyRequests,
            complianceReports,
            dataQualityMetrics,
            incidents,
            activeIncidents,
            criticalIncidents,
            incidentMetrics,
            threatHunts,
            loggingMetrics,
            recentLogs,
            logProviders,
            socDashboard,
            socAlerts,
            threatIntelligence,
            analystMetrics,
            devSecOpsMetrics,
            securityPipelines,
            // UEBA & Behavior Analytics data
            uebaStats,
            behaviorAnalytics,
            threatIntelligenceStats,
            behaviorAlerts,
            userProfiles,
            anomalies,
            mlModelStats,
            lastUpdated: Date.now()
          });

        } catch (error) {
          console.error('💥 Failed to refresh monitoring data:', error);
        }
      },

      // System Monitoring Actions
      getSystemStatus: () => {
        return get().systemStatus;
      },

      getSystemMetrics: (timeRange) => {
        const { systemMetrics, selectedTimeRange } = get();
        const range = timeRange || selectedTimeRange;
        
        return systemMetrics.filter(metric => 
          metric.timestamp >= range.start && metric.timestamp <= range.end
        );
      },

      getActiveAlerts: () => {
        return get().activeAlerts;
      },

      acknowledgeAlert: async (alertId: string) => {
        try {
          const { systemMonitoring } = get();
          if (systemMonitoring) {
            await systemMonitoring.acknowledgeAlert(alertId);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to acknowledge alert:', error);
        }
      },

      resolveAlert: async (alertId: string) => {
        try {
          const { systemMonitoring } = get();
          if (systemMonitoring) {
            await systemMonitoring.resolveAlert(alertId);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to resolve alert:', error);
        }
      },

      createAlertRule: async (rule: any) => {
        try {
          const { systemMonitoring } = get();
          if (systemMonitoring) {
            const ruleId = await systemMonitoring.addAlertRule(rule);
            await get().refreshAllData();
            return ruleId;
          }
          throw new Error('System monitoring not initialized');
        } catch (error) {
          console.error('💥 Failed to create alert rule:', error);
          throw error;
        }
      },

      updateAlertRule: async (ruleId: string, updates: any) => {
        try {
          const { systemMonitoring } = get();
          if (systemMonitoring) {
            await systemMonitoring.updateAlertRule(ruleId, updates);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to update alert rule:', error);
        }
      },

      deleteAlertRule: async (ruleId: string) => {
        try {
          const { systemMonitoring } = get();
          if (systemMonitoring) {
            await systemMonitoring.deleteAlertRule(ruleId);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to delete alert rule:', error);
        }
      },

      // Performance Monitoring Actions
      getPerformanceDashboard: () => {
        return get().performanceDashboard;
      },

      getPerformanceMetrics: (timeRange) => {
        const { performanceMetrics, selectedTimeRange } = get();
        const range = timeRange || selectedTimeRange;
        
        return performanceMetrics.filter(metric => 
          metric.timestamp >= range.start && metric.timestamp <= range.end
        );
      },

      getSLAs: () => {
        return get().slas;
      },

      getPerformanceIssues: () => {
        return get().performanceIssues;
      },

      resolvePerformanceIssue: async (issueId: string, resolution: string) => {
        try {
          const { performanceMonitoring } = get();
          if (performanceMonitoring) {
            await performanceMonitoring.resolveIssue(issueId, resolution);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to resolve performance issue:', error);
        }
      },

      generatePerformanceReport: async (period: { start: number; end: number }) => {
        try {
          const { performanceMonitoring } = get();
          if (performanceMonitoring) {
            const report = await performanceMonitoring.generatePerformanceReport(period);
            await get().refreshAllData();
            return report;
          }
          throw new Error('Performance monitoring not initialized');
        } catch (error) {
          console.error('💥 Failed to generate performance report:', error);
          throw error;
        }
      },

      createSLA: async (sla: any) => {
        try {
          const { performanceMonitoring } = get();
          if (performanceMonitoring) {
            const slaId = await performanceMonitoring.createSLA(sla);
            await get().refreshAllData();
            return slaId;
          }
          throw new Error('Performance monitoring not initialized');
        } catch (error) {
          console.error('💥 Failed to create SLA:', error);
          throw error;
        }
      },

      updateSLA: async (slaId: string, updates: any) => {
        try {
          const { performanceMonitoring } = get();
          if (performanceMonitoring) {
            await performanceMonitoring.updateSLA(slaId, updates);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to update SLA:', error);
        }
      },

      deleteSLA: async (slaId: string) => {
        try {
          const { performanceMonitoring } = get();
          if (performanceMonitoring) {
            await performanceMonitoring.deleteSLA(slaId);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to delete SLA:', error);
        }
      },

      // Data Governance Actions
      getGovernanceStatus: () => {
        return get().governanceStatus;
      },

      getGovernancePolicies: () => {
        return get().governancePolicies;
      },

      getDataClassifications: () => {
        return get().dataClassifications;
      },

      getPrivacyRequests: (userId) => {
        const { privacyRequests } = get();
        return userId 
          ? privacyRequests.filter(req => req.userId === userId)
          : privacyRequests;
      },

      getComplianceReports: () => {
        return get().complianceReports;
      },

      getDataQualityMetrics: () => {
        return get().dataQualityMetrics;
      },

      createGovernancePolicy: async (policy: any) => {
        try {
          const { dataGovernance } = get();
          if (dataGovernance) {
            const policyId = await dataGovernance.createPolicy(policy);
            await get().refreshAllData();
            return policyId;
          }
          throw new Error('Data governance not initialized');
        } catch (error) {
          console.error('💥 Failed to create governance policy:', error);
          throw error;
        }
      },

      updateGovernancePolicy: async (policyId: string, updates: any) => {
        try {
          const { dataGovernance } = get();
          if (dataGovernance) {
            await dataGovernance.updatePolicy(policyId, updates);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to update governance policy:', error);
        }
      },

      deleteGovernancePolicy: async (policyId: string) => {
        try {
          const { dataGovernance } = get();
          if (dataGovernance) {
            await dataGovernance.deletePolicy(policyId);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to delete governance policy:', error);
        }
      },

      submitPrivacyRequest: async (userId: string, type: string, details: string, dataTypes: string[]) => {
        try {
          const { dataGovernance } = get();
          if (dataGovernance) {
            const requestId = await dataGovernance.submitPrivacyRequest(userId, type as any, details, dataTypes);
            await get().refreshAllData();
            return requestId;
          }
          throw new Error('Data governance not initialized');
        } catch (error) {
          console.error('💥 Failed to submit privacy request:', error);
          throw error;
        }
      },

      processPrivacyRequest: async (requestId: string) => {
        try {
          const { dataGovernance } = get();
          if (dataGovernance) {
            await dataGovernance.processPrivacyRequest(requestId);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to process privacy request:', error);
        }
      },

      generateComplianceReport: async (framework: string) => {
        try {
          const { dataGovernance } = get();
          if (dataGovernance) {
            const report = await dataGovernance.generateComplianceReport(framework as any);
            await get().refreshAllData();
            return report;
          }
          throw new Error('Data governance not initialized');
        } catch (error) {
          console.error('💥 Failed to generate compliance report:', error);
          throw error;
        }
      },

      assessDataQuality: async (dataType: string, sampleData: any[]) => {
        try {
          const { dataGovernance } = get();
          if (dataGovernance) {
            const metrics = await dataGovernance.assessDataQuality(dataType, sampleData);
            await get().refreshAllData();
            return metrics;
          }
          throw new Error('Data governance not initialized');
        } catch (error) {
          console.error('💥 Failed to assess data quality:', error);
          throw error;
        }
      },

      // Incident Response Actions
      getIncidents: () => {
        return get().incidents;
      },

      getActiveIncidents: () => {
        return get().activeIncidents;
      },

      getCriticalIncidents: () => {
        return get().criticalIncidents;
      },

      getIncidentMetrics: () => {
        return get().incidentMetrics;
      },

      createIncident: async (title: string, description: string, severity: string, category: string) => {
        try {
          const { incidentResponse } = get();
          if (incidentResponse) {
            const incidentId = await incidentResponse.createIncident(title, description, severity as any, category as any);
            await get().refreshAllData();
            return incidentId;
          }
          throw new Error('Incident response not initialized');
        } catch (error) {
          console.error('💥 Failed to create incident:', error);
          throw error;
        }
      },

      updateIncidentStatus: async (incidentId: string, status: string) => {
        try {
          const { incidentResponse } = get();
          if (incidentResponse) {
            await incidentResponse.updateIncidentStatus(incidentId, status as any);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to update incident status:', error);
        }
      },

      assignIncident: async (incidentId: string, assignee: string) => {
        try {
          const { incidentResponse } = get();
          if (incidentResponse) {
            // This would be implemented in the incident response service
            console.log(`Assigning incident ${incidentId} to ${assignee}`);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to assign incident:', error);
        }
      },

      addIncidentEvidence: async (incidentId: string, evidence: any) => {
        try {
          const { incidentResponse } = get();
          if (incidentResponse) {
            await incidentResponse.addEvidence(incidentId, evidence);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to add incident evidence:', error);
        }
      },

      getThreatHunts: () => {
        return get().threatHunts;
      },

      createThreatHunt: async (hunt: any) => {
        try {
          const { socService } = get();
          if (socService) {
            const huntId = await socService.createThreatHunt(
              hunt.name,
              hunt.description,
              hunt.hypothesis,
              hunt.huntType,
              hunt.timeRange,
              hunt.dataSource,
              hunt.targetAssets
            );
            await get().refreshAllData();
            return huntId;
          }
          throw new Error('SOC service not initialized');
        } catch (error) {
          console.error('💥 Failed to create threat hunt:', error);
          throw error;
        }
      },

      // Centralized Logging Actions
      getLoggingMetrics: () => {
        return get().loggingMetrics;
      },

      getRecentLogs: async (limit = 100) => {
        try {
          const { centralizedLogging } = get();
          if (centralizedLogging) {
            return await centralizedLogging.getRecentLogs(limit);
          }
          return [];
        } catch (error) {
          console.error('💥 Failed to get recent logs:', error);
          return [];
        }
      },

      searchLogs: async (query: string, limit = 50) => {
        try {
          const { centralizedLogging } = get();
          if (centralizedLogging) {
            return await centralizedLogging.searchLogs(query, limit);
          }
          return [];
        } catch (error) {
          console.error('💥 Failed to search logs:', error);
          return [];
        }
      },

      getLogProviders: () => {
        return get().logProviders;
      },

      updateLogProvider: async (providerId: string, config: any) => {
        try {
          const { centralizedLogging } = get();
          if (centralizedLogging) {
            await centralizedLogging.updateProvider(providerId, config);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to update log provider:', error);
        }
      },

      // SOC Actions
      getSOCDashboard: () => {
        return get().socDashboard;
      },

      getSOCAlerts: () => {
        return get().socAlerts;
      },

      createSOCAlert: async (alert: any) => {
        try {
          const { socService } = get();
          if (socService) {
            const alertId = await socService.createAlert(
              alert.title,
              alert.description,
              alert.severity,
              alert.category,
              alert.source,
              alert.indicators || [],
              alert.affectedAssets || []
            );
            await get().refreshAllData();
            return alertId;
          }
          throw new Error('SOC service not initialized');
        } catch (error) {
          console.error('💥 Failed to create SOC alert:', error);
          throw error;
        }
      },

      updateAlertStatus: async (alertId: string, status: string) => {
        try {
          const { socService } = get();
          if (socService) {
            await socService.updateAlertStatus(alertId, status as any);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to update alert status:', error);
        }
      },

      getThreatIntelligence: () => {
        return get().threatIntelligence;
      },

      getAnalystMetrics: () => {
        return get().analystMetrics;
      },

      // DevSecOps Actions
      getDevSecOpsMetrics: async () => {
        try {
          return await DevSecOpsIntegrationService.getDevSecOpsMetrics();
        } catch (error) {
          console.error('💥 Failed to get DevSecOps metrics:', error);
          return null;
        }
      },

      getSecurityPipelines: async () => {
        try {
          return await DevSecOpsIntegrationService.getPipelines();
        } catch (error) {
          console.error('💥 Failed to get security pipelines:', error);
          return [];
        }
      },

      runSecurityPipeline: async (pipelineId: string) => {
        try {
          const result = await DevSecOpsIntegrationService.runSecurityPipeline(pipelineId);
          await get().refreshAllData();
          return result;
        } catch (error) {
          console.error('💥 Failed to run security pipeline:', error);
          throw error;
        }
      },

      getVulnerabilityScans: () => {
        return get().vulnerabilityScans;
      },

      getComplianceScores: () => {
        return get().complianceScores;
      },

      // UEBA & Behavior Analytics Actions
      getUEBAStats: () => {
        return get().uebaStats;
      },

      getBehaviorAnalytics: () => {
        return get().behaviorAnalytics;
      },

      getThreatIntelligenceStats: () => {
        return get().threatIntelligenceStats;
      },

      getBehaviorAlerts: async (filters = {}) => {
        try {
          const { behaviorAnalyticsService } = get();
          if (behaviorAnalyticsService) {
            return await behaviorAnalyticsService.getBehaviorAlerts(filters);
          }
          return [];
        } catch (error) {
          console.error('💥 Failed to get behavior alerts:', error);
          return [];
        }
      },

      getUserProfiles: () => {
        return get().userProfiles;
      },

      getAnomalies: async (userId) => {
        try {
          const { uebaService } = get();
          if (uebaService) {
            if (userId) {
              return await uebaService.getUserAnomalies(userId, 50);
            } else {
              // Get anomalies for all users
              return get().anomalies;
            }
          }
          return [];
        } catch (error) {
          console.error('💥 Failed to get anomalies:', error);
          return [];
        }
      },

      getMLModelStats: () => {
        return get().mlModelStats;
      },

      acknowledgeUEBAAlert: async (alertId: string) => {
        try {
          const { behaviorAnalyticsService } = get();
          if (behaviorAnalyticsService) {
            await behaviorAnalyticsService.acknowledgeAlert(alertId);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to acknowledge UEBA alert:', error);
        }
      },

      resolveUEBAAlert: async (alertId: string, resolution: string) => {
        try {
          const { behaviorAnalyticsService } = get();
          if (behaviorAnalyticsService) {
            await behaviorAnalyticsService.resolveAlert(alertId, resolution as any);
            await get().refreshAllData();
          }
        } catch (error) {
          console.error('💥 Failed to resolve UEBA alert:', error);
        }
      },

      analyzeUserBehavior: async (userId: string, eventType: string, eventData: any) => {
        try {
          const { behaviorAnalyticsService } = get();
          if (behaviorAnalyticsService) {
            const analysis = await behaviorAnalyticsService.analyzeUserBehavior(userId, eventType, eventData);
            await get().refreshAllData();
            return analysis;
          }
          throw new Error('Behavior analytics service not initialized');
        } catch (error) {
          console.error('💥 Failed to analyze user behavior:', error);
          throw error;
        }
      },

      // Utility Actions
      setTimeRange: (timeRange: { start: number; end: number }) => {
        set({ selectedTimeRange: timeRange });
      },

      setAutoRefresh: (enabled: boolean) => {
        set({ autoRefresh: enabled });
      },

      setRefreshInterval: (interval: number) => {
        set({ refreshInterval: interval });
      },

      exportMonitoringData: async () => {
        try {
          const state = get();
          const exportData = {
            systemStatus: state.systemStatus,
            systemMetrics: state.systemMetrics,
            activeAlerts: state.activeAlerts,
            performanceDashboard: state.performanceDashboard,
            performanceMetrics: state.performanceMetrics,
            slas: state.slas,
            performanceIssues: state.performanceIssues,
            governanceStatus: state.governanceStatus,
            governancePolicies: state.governancePolicies,
            dataClassifications: state.dataClassifications,
            privacyRequests: state.privacyRequests,
            complianceReports: state.complianceReports,
            dataQualityMetrics: state.dataQualityMetrics,
            incidents: state.incidents,
            activeIncidents: state.activeIncidents,
            criticalIncidents: state.criticalIncidents,
            incidentMetrics: state.incidentMetrics,
            threatHunts: state.threatHunts,
            loggingMetrics: state.loggingMetrics,
            socDashboard: state.socDashboard,
            socAlerts: state.socAlerts,
            threatIntelligence: state.threatIntelligence,
            devSecOpsMetrics: state.devSecOpsMetrics,
            securityPipelines: state.securityPipelines,
            // UEBA & Behavior Analytics data
            uebaStats: state.uebaStats,
            behaviorAnalytics: state.behaviorAnalytics,
            threatIntelligenceStats: state.threatIntelligenceStats,
            behaviorAlerts: state.behaviorAlerts,
            userProfiles: state.userProfiles,
            anomalies: state.anomalies,
            mlModelStats: state.mlModelStats,
            exportTimestamp: Date.now()
          };

          return JSON.stringify(exportData, null, 2);
        } catch (error) {
          console.error('💥 Failed to export monitoring data:', error);
          throw error;
        }
      },

      clearMonitoringData: async () => {
        try {
          set({
            systemStatus: null,
            systemMetrics: [],
            activeAlerts: [],
            alertRules: [],
            serviceHealth: new Map(),
            performanceDashboard: null,
            performanceMetrics: [],
            slas: [],
            performanceIssues: [],
            performanceReports: [],
            governanceStatus: null,
            governancePolicies: [],
            dataClassifications: [],
            privacyRequests: [],
            complianceReports: [],
            dataQualityMetrics: [],
            incidents: [],
            activeIncidents: [],
            criticalIncidents: [],
            incidentMetrics: null,
            threatHunts: [],
            loggingMetrics: null,
            recentLogs: [],
            logProviders: [],
            socDashboard: null,
            socAlerts: [],
            threatIntelligence: null,
            analystMetrics: null,
            devSecOpsMetrics: null,
            securityPipelines: [],
            vulnerabilityScans: [],
            complianceScores: [],
            // UEBA & Behavior Analytics data
            uebaStats: null,
            behaviorAnalytics: null,
            threatIntelligenceStats: null,
            behaviorAlerts: [],
            userProfiles: [],
            anomalies: [],
            mlModelStats: [],
            lastUpdated: 0
          });

          console.log('🧹 Comprehensive monitoring data with UEBA cleared');
        } catch (error) {
          console.error('💥 Failed to clear monitoring data:', error);
        }
      }
    }),
    {
      name: 'comprehensive-monitoring-storage-with-ueba',
      storage: simpleJSONStorage,
      // Only persist configuration, not the actual monitoring data
      partialize: (state) => ({
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
        selectedTimeRange: state.selectedTimeRange
      }),
    }
  )
);