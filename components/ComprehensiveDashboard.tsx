import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Shield, 
  Activity, 
  Database, 
  Brain, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Eye,
  Settings,
  BarChart3,
  Zap,
  Key,
  Globe,
  Cpu,
  HardDrive,
  Wifi,
  FileText,
  Search,
  Target,
  Layers,
  UserCheck,
  TrendingDown,
  Minus,
  Smartphone
} from 'lucide-react-native';
import SecurityManager from '@/services/security/SecurityManager';
import SystemMonitoringService from '@/services/monitoring/SystemMonitoringService';
import PerformanceMonitoringService from '@/services/monitoring/PerformanceMonitoringService';
import DataGovernanceService from '@/services/governance/DataGovernanceService';
import { IncidentResponseService } from '@/services/security/IncidentResponseService';
import { CentralizedLoggingService } from '@/services/security/CentralizedLoggingService';
import { SOCService } from '@/services/security/SOCService';
import { DevSecOpsIntegrationService } from '@/services/security/DevSecOpsIntegrationService';
import SocialEngineeringProtectionService from '@/services/security/SocialEngineeringProtectionService';
import OTASecurityService from '@/services/security/OTASecurityService';
import DynamicPermissionsService from '@/services/security/DynamicPermissionsService';
import AccessControlService from '@/services/security/AccessControlService';
import UEBAService from '@/services/security/UEBAService';
import ContentModerationService from '@/services/security/ContentModerationService';
import ForensicsService from '@/services/security/ForensicsService';
import ThreatIntelligenceService from '@/services/security/ThreatIntelligenceService';
import BehaviorAnalyticsService from '@/services/security/BehaviorAnalyticsService';
import RootJailbreakDetectionService from '@/services/security/RootJailbreakDetectionService';
import DeviceBindingService from '@/services/security/DeviceBindingService';
import AIVisionService from '@/services/security/AIVisionService';
import LocalMLTrainingService from '@/services/security/LocalMLTrainingService';
import { useRetrainingStore } from '@/store/retrainingStore';
import { useRecommendationStore } from '@/store/recommendationStore';
import formatRelativeTime from '@/utils/formatRelativeTime';

const { width } = Dimensions.get('window');

interface DashboardProps {
  onNavigate?: (screen: string) => void;
}

export default function ComprehensiveDashboard({ onNavigate }: DashboardProps) {
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [governanceStatus, setGovernanceStatus] = useState<any>(null);
  const [incidentResponseData, setIncidentResponseData] = useState<any>(null);
  const [loggingMetrics, setLoggingMetrics] = useState<any>(null);
  const [socDashboard, setSOCDashboard] = useState<any>(null);
  const [devSecOpsMetrics, setDevSecOpsMetrics] = useState<any>(null);
  const [uebaData, setUEBAData] = useState<any>(null);
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<any>(null);
  const [threatIntelligence, setThreatIntelligence] = useState<any>(null);
  const [accessControlData, setAccessControlData] = useState<any>(null);
  const [otaData, setOtaData] = useState<any>({});
  const [permissionsData, setPermissionsData] = useState<any>({});
  const [socialEngineeringData, setSocialEngineeringData] = useState<any>(null);
  const [rootJailbreakData, setRootJailbreakData] = useState<any>(null);
  const [deviceBindingData, setDeviceBindingData] = useState<any>(null);
  const [contentModerationStats, setContentModerationStats] = useState<any>(null);
  const [forensicsData, setForensicsData] = useState<any>(null);
  const [aiVisionData, setAIVisionData] = useState<any>(null);
  const [mlTrainingData, setMLTrainingData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Service instances
  const [uebaService] = useState(() => UEBAService.getInstance());
  const [threatIntelligenceService] = useState(() => ThreatIntelligenceService.getInstance());
  const [behaviorAnalyticsService] = useState(() => BehaviorAnalyticsService.getInstance());
  const [accessControlService] = useState(() => AccessControlService.getInstance());
  const [socialEngineeringService] = useState(() => SocialEngineeringProtectionService.getInstance());
  const [aiVisionService] = useState(() => AIVisionService.getInstance());
  const [mlTrainingService] = useState(() => LocalMLTrainingService.getInstance());
  const [rootJailbreakService] = useState(() => RootJailbreakDetectionService.getInstance());
  const [deviceBindingService] = useState(() => DeviceBindingService.getInstance());
  
  const retrainingStore = useRetrainingStore();
  const recommendationStore = useRecommendationStore();

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Load security status
      const securityManager = SecurityManager.getInstance();
      const security = securityManager.getSecurityStatus();
      setSecurityStatus(security);
      
      // Load system monitoring data
      const systemMonitor = SystemMonitoringService.getInstance();
      const systemHealth = systemMonitor.getSystemStatus();
      const metrics = systemMonitor.getLatestMetrics();
      setSystemMetrics({ health: systemHealth, metrics });
      
      // Load performance data
      const performanceMonitor = PerformanceMonitoringService.getInstance();
      const dashboard = performanceMonitor.getPerformanceDashboard();
      setPerformanceData(dashboard);
      
      // Load governance status
      const governance = DataGovernanceService.getInstance();
      const govStatus = governance.getGovernanceStatus();
      setGovernanceStatus(govStatus);
      
      // Load incident response data
      const incidentResponse = IncidentResponseService.getInstance();
      const incidents = incidentResponse.getIncidents();
      const activeIncidents = incidentResponse.getActiveIncidents();
      const criticalIncidents = incidentResponse.getCriticalIncidents();
      const irMetrics = incidentResponse.getMetrics();
      
      setIncidentResponseData({
        totalIncidents: incidents.length,
        activeIncidents: activeIncidents.length,
        criticalIncidents: criticalIncidents.length,
        metrics: irMetrics,
        recentIncidents: incidents.slice(0, 5)
      });
      
      // Load centralized logging metrics
      const centralizedLogging = CentralizedLoggingService.getInstance();
      const logMetrics = centralizedLogging.getMetrics();
      setLoggingMetrics(logMetrics);
      
      // Load SOC dashboard data
      const socService = SOCService.getInstance();
      const socData = socService.getSOCDashboard();
      setSOCDashboard(socData);
      
      // Load DevSecOps metrics
      const devSecOpsData = await DevSecOpsIntegrationService.getDevSecOpsMetrics();
      setDevSecOpsMetrics(devSecOpsData);
      
      // Load social engineering protection data
      const socialEngActivities = await socialEngineeringService.getSuspiciousActivities();
      const blockedDomains = socialEngineeringService.getBlockedDomains();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayThreats = socialEngActivities.filter(activity => activity.timestamp >= today.getTime());
      const highRiskThreats = socialEngActivities.filter(activity => 
        activity.riskLevel === 'critical' || activity.riskLevel === 'high'
      );
      
      setSocialEngineeringData({
        totalThreats: socialEngActivities.length,
        todayThreats: todayThreats.length,
        highRiskThreats: highRiskThreats.length,
        blockedDomains: blockedDomains.length,
        recentActivities: socialEngActivities.slice(0, 5),
        protectionRate: Math.max(85, 100 - (highRiskThreats.length * 2))
      });
      
      // Load UEBA analytics data
      const uebaService = UEBAService.getInstance();
      const uebaStats = await uebaService.getSystemStats();
      
      // Load threat intelligence data
      const threatService = ThreatIntelligenceService.getInstance();
      const threatStats = await threatService.getThreatStats();
      const recentThreats = await threatService.getRecentThreats(24);
      
      // Load behavior analytics data
      const behaviorService = BehaviorAnalyticsService.getInstance();
      const behaviorStats = await behaviorService.getAnalyticsStats();
      const behaviorAlerts = await behaviorService.getBehaviorAlerts({ limit: 10 });
      
      // Store UEBA data for dashboard display
      setUEBAData({
        userProfiles: uebaStats.totalUsers,
        anomaliesDetected: uebaStats.totalAnomalies,
        highRiskUsers: uebaStats.highRiskUsers,
        avgRiskScore: uebaStats.avgRiskScore,
        recentAnomalies: await uebaService.getUserAnomalies('current_user', 5)
      });
      
      // Load Root/Jailbreak detection data
      const rootJailbreakStatus = rootJailbreakService.getSecurityStatus();
      const detectedThreats = rootJailbreakService.getDetectedThreats();
      const deviceInfo = rootJailbreakService.getDeviceInfo();
      
      setRootJailbreakData({
        isSecure: rootJailbreakStatus.isSecure,
        compromised: rootJailbreakStatus.compromised,
        totalThreats: rootJailbreakStatus.threats.length,
        criticalThreats: detectedThreats.filter(t => t.severity === 'critical').length,
        highThreats: detectedThreats.filter(t => t.severity === 'high').length,
        lastCheck: rootJailbreakStatus.lastCheck,
        monitoringActive: rootJailbreakStatus.monitoringActive,
        deviceInfo,
        recentThreats: detectedThreats.slice(0, 5),
        averageConfidence: detectedThreats.length > 0 
          ? detectedThreats.reduce((sum, t) => sum + t.confidence, 0) / detectedThreats.length 
          : 0
      });
      
      // Store threat intelligence data
      setThreatIntelligence({
        totalIndicators: threatStats.totalIndicators,
        recentThreats: recentThreats,
        threatSources: threatStats.threatSources || 0,
        maliciousIPs: threatStats.maliciousIPs || 0,
        suspiciousDomains: threatStats.suspiciousDomains || 0
      });
      
      // Store behavior analytics data
      setBehaviorAnalytics({
        totalPatterns: behaviorStats.totalPatterns,
        totalAlerts: behaviorStats.totalAlerts,
        unresolvedAlerts: behaviorStats.unresolvedAlerts,
        criticalAlerts: behaviorStats.criticalAlerts,
        mlModelStats: behaviorStats.mlModelStats,
        topAnomalyTypes: behaviorStats.topAnomalyTypes,
        recentAlerts: behaviorAlerts.slice(0, 5)
      });
      
      // Load Access Control data
      const accessControlAudit = accessControlService.getAuditLogAdvanced({ limit: 100 });
      const accessControlPolicies = accessControlService.getAllPolicies();
      
      // Load OTA and Permissions data
      const otaInfo = await OTASecurityService.getCurrentUpdateInfo();
      const otaHistory = OTASecurityService.getUpdateHistory();
      const permissionsStats = DynamicPermissionsService.getUsageStatistics();
      const activeAlerts = DynamicPermissionsService.getActiveAlerts();
      
      setAccessControlData({
        totalPolicies: accessControlPolicies.length,
        activePolicies: accessControlPolicies.filter(p => p.enabled).length,
        totalDecisions: accessControlAudit.length,
        allowedDecisions: accessControlAudit.filter(log => log.decision === 'allow').length,
        deniedDecisions: accessControlAudit.filter(log => log.decision === 'deny').length,
        averageRiskScore: accessControlAudit.length > 0 ? 
          accessControlAudit.reduce((sum, log) => sum + (log.riskScore || 0), 0) / accessControlAudit.length : 0,
        recentDecisions: accessControlAudit.slice(-5)
      });
      
      setOtaData({
        currentVersion: otaInfo?.version || 'غير معروف',
        lastUpdate: otaInfo?.lastUpdate || 0,
        updateHistory: otaHistory,
        securityLevel: getOTASecurityLevel(otaInfo)
      });
      
      setPermissionsData({
        totalUsage: permissionsStats.totalUsage || 0,
        suspiciousUsage: permissionsStats.suspiciousUsage || 0,
        activeAlerts: activeAlerts.length,
        usageByPermission: permissionsStats.usageByPermission || {},
        monitoringActive: true
      });
      
      // Load AI Vision data
      const visionAnalytics = await aiVisionService.generateAnalyticsReport();
      const localModel = aiVisionService.getLocalModelInfo();
      const trainingQueueSize = aiVisionService.getTrainingQueueSize();
      
      setAIVisionData({
        totalAnalyses: visionAnalytics.totalAnalyses,
        safeImages: visionAnalytics.safeImages,
        flaggedImages: visionAnalytics.flaggedImages,
        blockedImages: visionAnalytics.blockedImages,
        averageConfidence: visionAnalytics.averageConfidence,
        topDetectedObjects: visionAnalytics.topDetectedObjects.slice(0, 5),
        providerUsage: visionAnalytics.providerUsage,
        localModel,
        trainingQueueSize
      });
      
      // Load ML Training data
      const trainingAnalytics = await mlTrainingService.getTrainingAnalytics();
      const activeModel = mlTrainingService.getActiveModel();
      const allModels = await mlTrainingService.getAllModels();
      const allDatasets = await mlTrainingService.getAllDatasets();
      
      setMLTrainingData({
        totalDatasets: trainingAnalytics.totalDatasets,
        totalSamples: trainingAnalytics.totalSamples,
        totalModels: trainingAnalytics.totalModels,
        averageAccuracy: trainingAnalytics.averageAccuracy,
        categoryDistribution: trainingAnalytics.categoryDistribution,
        trainingHistory: trainingAnalytics.trainingHistory,
        activeModel,
        recentModels: allModels.slice(0, 3),
        recentDatasets: allDatasets.slice(0, 3),
        isTraining: mlTrainingService.isCurrentlyTraining(),
        trainingProgress: mlTrainingService.getTrainingProgress()
      });
      
      // Load Device Binding data
      const bindingStatus = deviceBindingService.getBindingSecurityStatus();
      const activeBindings = deviceBindingService.getActiveBindings();
      const deviceFingerprint = deviceBindingService.getCurrentDeviceFingerprint();
      const bindingEvents = deviceBindingService.getSecurityEvents();
      
      setDeviceBindingData({
        totalBindings: bindingStatus.totalBindings,
        activeBindings: bindingStatus.activeBindings,
        highRiskBindings: bindingStatus.highRiskBindings,
        averageRiskScore: bindingStatus.averageRiskScore,
        recentAnomalies: bindingStatus.recentAnomalies,
        bindingStrengthDistribution: bindingStatus.bindingStrengthDistribution,
        currentDevice: deviceFingerprint,
        recentEvents: bindingEvents.slice(-5),
        monitoringActive: true
      });
      
      // Load content moderation stats
      const moderationStats = await ContentModerationService.getViolationStats();
      setContentModerationStats(moderationStats);
      
      // Load forensics summary
      const forensicsSummary = await ForensicsService.generateForensicSummary(24);
      setForensicsData(forensicsSummary);
      
      // Initialize stores if needed
      if (!retrainingStore.isInitialized) {
        await retrainingStore.initializeRetrainingPipeline();
      }
      
      if (!recommendationStore.isInitialized) {
        await recommendationStore.initializeRecommendations('current_user');
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'secure':
      case 'compliant':
      case 'active':
      case 'passed':
        return '#10B981';
      case 'warning':
      case 'degraded':
      case 'at_risk':
      case 'investigating':
        return '#F59E0B';
      case 'critical':
      case 'unhealthy':
      case 'breached':
      case 'inactive':
      case 'failed':
      case 'open':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'secure':
      case 'compliant':
      case 'active':
      case 'passed':
        return CheckCircle;
      case 'warning':
      case 'degraded':
      case 'at_risk':
      case 'investigating':
        return AlertTriangle;
      case 'critical':
      case 'unhealthy':
      case 'breached':
      case 'inactive':
      case 'failed':
      case 'open':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getRiskLevelColor = (riskScore: number) => {
    if (riskScore >= 0.8) return '#EF4444'; // Critical
    if (riskScore >= 0.6) return '#F59E0B'; // High
    if (riskScore >= 0.4) return '#F59E0B'; // Medium
    return '#10B981'; // Low
  };

  const getRiskLevelText = (riskScore: number) => {
    if (riskScore >= 0.8) return 'Critical';
    if (riskScore >= 0.6) return 'High';
    if (riskScore >= 0.4) return 'Medium';
    return 'Low';
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    status: string,
    icon: any,
    subtitle?: string,
    onPress?: () => void
  ) => {
    const IconComponent = icon;
    const StatusIcon = getStatusIcon(status);
    const statusColor = getStatusColor(status);

    return (
      <TouchableOpacity
        style={styles.metricCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <IconComponent size={24} color="#6366F1" />
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
              <StatusIcon size={12} color="#FFFFFF" />
            </View>
          </View>
          
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardValue}>{value}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          
          <View style={styles.cardFooter}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, icon: any) => {
    const IconComponent = icon;
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <IconComponent size={20} color="#6366F1" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    );
  };

  const renderSystemOverview = () => {
    if (!systemMetrics) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('System Overview', Activity)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'System Health',
            systemMetrics.health?.overall || 'Unknown',
            systemMetrics.health?.overall || 'unknown',
            Activity,
            `${systemMetrics.health?.services?.healthy || 0} services healthy`,
            () => onNavigate?.('system-monitoring')
          )}
          
          {renderMetricCard(
            'CPU Usage',
            `${Math.round(systemMetrics.metrics?.cpuUsage || 0)}%`,
            systemMetrics.metrics?.cpuUsage > 80 ? 'critical' : 
            systemMetrics.metrics?.cpuUsage > 60 ? 'warning' : 'healthy',
            Cpu,
            'Real-time monitoring'
          )}
          
          {renderMetricCard(
            'Memory Usage',
            `${Math.round(systemMetrics.metrics?.memoryUsage || 0)}%`,
            systemMetrics.metrics?.memoryUsage > 85 ? 'critical' : 
            systemMetrics.metrics?.memoryUsage > 70 ? 'warning' : 'healthy',
            HardDrive,
            'Available memory'
          )}
          
          {renderMetricCard(
            'Network Latency',
            `${Math.round(systemMetrics.metrics?.networkLatency || 0)}ms`,
            systemMetrics.metrics?.networkLatency > 500 ? 'critical' : 
            systemMetrics.metrics?.networkLatency > 200 ? 'warning' : 'healthy',
            Wifi,
            'Response time'
          )}
        </View>
      </View>
    );
  };

  const renderSecurityOverview = () => {
    if (!securityStatus) return null;

    const threatLevel = securityStatus.monitoring?.criticalEvents > 0 ? 'critical' :
                      securityStatus.monitoring?.recentSecurityEvents > 10 ? 'warning' : 'healthy';

    return (
      <View style={styles.section}>
        {renderSectionHeader('Security & Compliance', Shield)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Security Status',
            securityStatus.device?.isSecure ? 'Secure' : 'At Risk',
            securityStatus.device?.isSecure ? 'secure' : 'critical',
            Shield,
            `${securityStatus.monitoring?.recentSecurityEvents || 0} recent events`,
            () => onNavigate?.('security-dashboard')
          )}
          
          {renderMetricCard(
            'WAF Protection',
            'Active',
            'active',
            Globe,
            'Web Application Firewall',
            () => onNavigate?.('waf-dashboard')
          )}
          
          {renderMetricCard(
            'Threat Level',
            threatLevel.charAt(0).toUpperCase() + threatLevel.slice(1),
            threatLevel,
            AlertTriangle,
            `${securityStatus.monitoring?.criticalEvents || 0} critical threats`
          )}
          
          {renderMetricCard(
            'Encryption',
            securityStatus.cryptography?.masterKeyInitialized ? 'Active' : 'Inactive',
            securityStatus.cryptography?.masterKeyInitialized ? 'active' : 'inactive',
            Lock,
            'End-to-end encryption'
          )}
          
          {renderMetricCard(
            'Compliance Score',
            `${Math.round((governanceStatus?.complianceScore || 0) * 100)}%`,
            governanceStatus?.complianceScore > 0.9 ? 'compliant' : 
            governanceStatus?.complianceScore > 0.7 ? 'warning' : 'critical',
            CheckCircle,
            'GDPR, CCPA, PCI DSS'
          )}
        </View>
      </View>
    );
  };

  const renderUEBAOverview = () => {
    if (!uebaData) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('User & Entity Behavior Analytics', Brain)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'User Profiles',
            uebaData.userProfiles.toString(),
            'healthy',
            Users,
            'Monitored user profiles',
            () => onNavigate?.('ueba')
          )}
          
          {renderMetricCard(
            'Anomalies Detected',
            uebaData.anomaliesDetected.toString(),
            uebaData.anomaliesDetected > 10 ? 'warning' : 'healthy',
            AlertTriangle,
            'Behavioral anomalies'
          )}
          
          {renderMetricCard(
            'High Risk Users',
            uebaData.highRiskUsers.toString(),
            uebaData.highRiskUsers > 0 ? 'critical' : 'healthy',
            UserCheck,
            'Users requiring attention'
          )}
          
          {renderMetricCard(
            'Avg Risk Score',
            `${Math.round(uebaData.avgRiskScore * 100)}%`,
            getRiskLevelText(uebaData.avgRiskScore).toLowerCase(),
            TrendingUp,
            getRiskLevelText(uebaData.avgRiskScore) + ' risk level'
          )}
        </View>

        {/* Recent Anomalies */}
        {uebaData.recentAnomalies && uebaData.recentAnomalies.length > 0 && (
          <View style={styles.anomaliesContainer}>
            <Text style={styles.subsectionTitle}>Recent Anomalies</Text>
            {uebaData.recentAnomalies.slice(0, 3).map((anomaly: any) => (
              <View key={anomaly.id} style={styles.anomalyItem}>
                <View style={[
                  styles.anomalySeverity,
                  { backgroundColor: getStatusColor(anomaly.severity) }
                ]} />
                <View style={styles.anomalyContent}>
                  <Text style={styles.anomalyDescription}>{anomaly.description}</Text>
                  <Text style={styles.anomalyTime}>
                    {formatRelativeTime(anomaly.timestamp)}
                  </Text>
                </View>
                <View style={styles.anomalyRisk}>
                  <Text style={[
                    styles.riskScore,
                    { color: getRiskLevelColor(anomaly.riskScore) }
                  ]}>
                    {Math.round(anomaly.riskScore * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAIVisionOverview = () => {
    if (!aiVisionData) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('AI Vision Security', Eye)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Analyses',
            aiVisionData.totalAnalyses.toString(),
            'healthy',
            Eye,
            'Images analyzed',
            () => onNavigate?.('ai-vision')
          )}
          
          {renderMetricCard(
            'Safe Images',
            aiVisionData.safeImages.toString(),
            'healthy',
            CheckCircle,
            'Approved content'
          )}
          
          {renderMetricCard(
            'Flagged Images',
            aiVisionData.flaggedImages.toString(),
            aiVisionData.flaggedImages > 10 ? 'warning' : 'healthy',
            AlertTriangle,
            'Requires review'
          )}
          
          {renderMetricCard(
            'Blocked Images',
            aiVisionData.blockedImages.toString(),
            aiVisionData.blockedImages > 0 ? 'critical' : 'healthy',
            XCircle,
            'Unsafe content blocked'
          )}
        </View>

        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Avg Confidence',
            `${Math.round(aiVisionData.averageConfidence * 100)}%`,
            aiVisionData.averageConfidence > 0.8 ? 'healthy' : 'warning',
            Target,
            'AI prediction confidence'
          )}
          
          {renderMetricCard(
            'Training Queue',
            aiVisionData.trainingQueueSize.toString(),
            'healthy',
            Brain,
            'Samples for training'
          )}
          
          {renderMetricCard(
            'Local Model',
            aiVisionData.localModel ? 'Active' : 'None',
            aiVisionData.localModel ? 'healthy' : 'warning',
            Cpu,
            aiVisionData.localModel ? 
              `v${aiVisionData.localModel.version}` : 'No local model'
          )}
          
          {renderMetricCard(
            'Provider Usage',
            aiVisionData.providerUsage.length.toString(),
            'healthy',
            Globe,
            'Active providers'
          )}
        </View>

        {/* Top Detected Objects */}
        {aiVisionData.topDetectedObjects && aiVisionData.topDetectedObjects.length > 0 && (
          <View style={styles.objectsContainer}>
            <Text style={styles.subsectionTitle}>Top Detected Objects</Text>
            {aiVisionData.topDetectedObjects.map((obj: any, index: number) => (
              <View key={index} style={styles.objectItem}>
                <View style={styles.objectInfo}>
                  <Text style={styles.objectName}>{obj.name}</Text>
                  <Text style={styles.objectCount}>{obj.count} detections</Text>
                </View>
                <View style={styles.objectBar}>
                  <View 
                    style={[
                      styles.objectBarFill,
                      { width: `${(obj.count / aiVisionData.topDetectedObjects[0].count) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderMLTrainingOverview = () => {
    if (!mlTrainingData) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Local ML Training', Brain)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Datasets',
            mlTrainingData.totalDatasets.toString(),
            'healthy',
            Database,
            'Training datasets'
          )}
          
          {renderMetricCard(
            'Training Samples',
            mlTrainingData.totalSamples.toString(),
            'healthy',
            FileText,
            'Total training data'
          )}
          
          {renderMetricCard(
            'Trained Models',
            mlTrainingData.totalModels.toString(),
            'healthy',
            Cpu,
            'Available models'
          )}
          
          {renderMetricCard(
            'Avg Accuracy',
            `${Math.round(mlTrainingData.averageAccuracy * 100)}%`,
            mlTrainingData.averageAccuracy > 0.8 ? 'healthy' : 'warning',
            Target,
            'Model performance'
          )}
        </View>

        {/* Training Status */}
        {mlTrainingData.isTraining && (
          <View style={styles.trainingStatus}>
            <View style={styles.trainingHeader}>
              <Brain size={20} color="#007AFF" />
              <Text style={styles.trainingTitle}>Training in Progress</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${mlTrainingData.trainingProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(mlTrainingData.trainingProgress)}% complete
            </Text>
          </View>
        )}

        {/* Active Model Info */}
        {mlTrainingData.activeModel && (
          <View style={styles.activeModelContainer}>
            <Text style={styles.subsectionTitle}>Active Model</Text>
            <View style={styles.modelInfo}>
              <View style={styles.modelHeader}>
                <Cpu size={16} color="#007AFF" />
                <Text style={styles.modelName}>{mlTrainingData.activeModel.name}</Text>
              </View>
              <View style={styles.modelDetails}>
                <Text style={styles.modelDetail}>
                  Accuracy: {Math.round(mlTrainingData.activeModel.metrics.accuracy * 100)}%
                </Text>
                <Text style={styles.modelDetail}>
                  Version: {mlTrainingData.activeModel.version}
                </Text>
                <Text style={styles.modelDetail}>
                  Size: {(mlTrainingData.activeModel.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderBehaviorAnalyticsOverview = () => {
    if (!behaviorAnalytics) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Behavior Analytics & ML', BarChart3)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Behavior Patterns',
            behaviorAnalytics.totalPatterns.toString(),
            'healthy',
            BarChart3,
            'Identified patterns',
            () => onNavigate?.('behavior-analytics')
          )}
          
          {renderMetricCard(
            'ML Alerts',
            behaviorAnalytics.totalAlerts.toString(),
            behaviorAnalytics.criticalAlerts > 0 ? 'critical' : 
            behaviorAnalytics.unresolvedAlerts > 5 ? 'warning' : 'healthy',
            AlertTriangle,
            `${behaviorAnalytics.unresolvedAlerts} unresolved`
          )}
          
          {renderMetricCard(
            'Critical Alerts',
            behaviorAnalytics.criticalAlerts.toString(),
            behaviorAnalytics.criticalAlerts > 0 ? 'critical' : 'healthy',
            XCircle,
            'High priority alerts'
          )}
          
          {renderMetricCard(
            'ML Models',
            behaviorAnalytics.mlModelStats?.length.toString() || '0',
            'active',
            Brain,
            'Active ML models'
          )}
        </View>

        {/* Top Anomaly Types */}
        {behaviorAnalytics.topAnomalyTypes && behaviorAnalytics.topAnomalyTypes.length > 0 && (
          <View style={styles.anomaliesContainer}>
            <Text style={styles.subsectionTitle}>Top Anomaly Types</Text>
            {behaviorAnalytics.topAnomalyTypes.slice(0, 3).map((anomaly: any, index: number) => (
              <View key={anomaly.type} style={styles.anomalyTypeItem}>
                <View style={styles.anomalyRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.anomalyTypeInfo}>
                  <Text style={styles.anomalyTypeName}>{anomaly.type}</Text>
                  <Text style={styles.anomalyTypeCount}>{anomaly.count} occurrences</Text>
                </View>
                <View style={styles.anomalyTypeBar}>
                  <View 
                    style={[
                      styles.anomalyTypeBarFill,
                      { 
                        width: `${(anomaly.count / behaviorAnalytics.topAnomalyTypes[0].count) * 100}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderThreatIntelligenceOverview = () => {
    if (!threatIntelligence) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Threat Intelligence', Target)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Threat Indicators',
            threatIntelligence.totalIndicators.toString(),
            'healthy',
            Target,
            'IOCs in database',
            () => onNavigate?.('threat-intelligence')
          )}
          
          {renderMetricCard(
            'Recent Threats',
            threatIntelligence.recentThreats?.length.toString() || '0',
            threatIntelligence.recentThreats?.length > 5 ? 'warning' : 'healthy',
            AlertTriangle,
            'Last 24 hours'
          )}
          
          {renderMetricCard(
            'Malicious IPs',
            threatIntelligence.maliciousIPs.toString(),
            threatIntelligence.maliciousIPs > 100 ? 'warning' : 'healthy',
            Globe,
            'Blocked IP addresses'
          )}
          
          {renderMetricCard(
            'Threat Sources',
            threatIntelligence.threatSources.toString(),
            'active',
            Database,
            'Intelligence feeds'
          )}
        </View>

        {/* Recent Threats */}
        {threatIntelligence.recentThreats && threatIntelligence.recentThreats.length > 0 && (
          <View style={styles.anomaliesContainer}>
            <Text style={styles.subsectionTitle}>Recent Threats</Text>
            {threatIntelligence.recentThreats.slice(0, 3).map((threat: any) => (
              <View key={threat.id} style={styles.threatItem}>
                <View style={[
                  styles.threatSeverity,
                  { backgroundColor: getStatusColor(threat.severity) }
                ]} />
                <View style={styles.threatContent}>
                  <Text style={styles.threatType}>{threat.type}</Text>
                  <Text style={styles.threatDescription}>{threat.description}</Text>
                  <Text style={styles.threatTime}>
                    {formatRelativeTime(threat.timestamp)}
                  </Text>
                </View>
                <View style={styles.threatConfidence}>
                  <Text style={styles.confidenceScore}>
                    {Math.round(threat.confidence * 100)}%
                  </Text>
                  <Text style={styles.confidenceLabel}>Confidence</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderIncidentResponseOverview = () => {
    if (!incidentResponseData) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Incident Response', AlertTriangle)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Incidents',
            incidentResponseData.totalIncidents.toString(),
            incidentResponseData.totalIncidents > 0 ? 'warning' : 'healthy',
            FileText,
            'All time incidents',
            () => onNavigate?.('incident-response')
          )}
          
          {renderMetricCard(
            'Active Incidents',
            incidentResponseData.activeIncidents.toString(),
            incidentResponseData.activeIncidents > 0 ? 'critical' : 'healthy',
            Activity,
            'Currently investigating'
          )}
          
          {renderMetricCard(
            'Critical Incidents',
            incidentResponseData.criticalIncidents.toString(),
            incidentResponseData.criticalIncidents > 0 ? 'critical' : 'healthy',
            XCircle,
            'High priority incidents'
          )}
          
          {renderMetricCard(
            'Avg Response Time',
            `${Math.round(incidentResponseData.metrics?.averageFirstResponseTime / 60000 || 0)}m`,
            incidentResponseData.metrics?.averageFirstResponseTime > 900000 ? 'critical' : 
            incidentResponseData.metrics?.averageFirstResponseTime > 300000 ? 'warning' : 'healthy',
            Clock,
            'First response time'
          )}
          
          {renderMetricCard(
            'SLA Compliance',
            `${Math.round((incidentResponseData.metrics?.slaCompliance || 0) * 100)}%`,
            incidentResponseData.metrics?.slaCompliance > 0.9 ? 'healthy' : 
            incidentResponseData.metrics?.slaCompliance > 0.7 ? 'warning' : 'critical',
            Target,
            'Meeting SLA targets'
          )}
        </View>
      </View>
    );
  };

  const renderSOCOverview = () => {
    if (!socDashboard) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Security Operations Center', Search)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Alerts',
            socDashboard.overview?.totalAlerts?.toString() || '0',
            socDashboard.overview?.totalAlerts > 0 ? 'warning' : 'healthy',
            AlertTriangle,
            'Security alerts generated',
            () => onNavigate?.('soc-dashboard')
          )}
          
          {renderMetricCard(
            'Open Alerts',
            socDashboard.overview?.openAlerts?.toString() || '0',
            socDashboard.overview?.openAlerts > 0 ? 'critical' : 'healthy',
            Eye,
            'Awaiting investigation'
          )}
          
          {renderMetricCard(
            'Critical Alerts',
            socDashboard.overview?.criticalAlerts?.toString() || '0',
            socDashboard.overview?.criticalAlerts > 0 ? 'critical' : 'healthy',
            XCircle,
            'High severity alerts'
          )}
          
          {renderMetricCard(
            'Response Time',
            `${Math.round(socDashboard.overview?.averageResponseTime / 60000 || 0)}m`,
            socDashboard.overview?.averageResponseTime > 900000 ? 'critical' : 
            socDashboard.overview?.averageResponseTime > 300000 ? 'warning' : 'healthy',
            Clock,
            'Average response time'
          )}
          
          {renderMetricCard(
            'Active Hunts',
            socDashboard.activeHunts?.length?.toString() || '0',
            socDashboard.activeHunts?.length > 0 ? 'active' : 'inactive',
            Target,
            'Threat hunting activities'
          )}
        </View>
      </View>
    );
  };

  const renderRootJailbreakOverview = () => {
    if (!rootJailbreakData) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Root/Jailbreak Detection', Shield)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Device Status',
            rootJailbreakData.compromised ? 'Compromised' : 'Secure',
            rootJailbreakData.compromised ? 'critical' : 'secure',
            Shield,
            rootJailbreakData.compromised ? 'Device is rooted/jailbroken' : 'Device integrity intact',
            () => onNavigate?.('root-detection')
          )}
          
          {renderMetricCard(
            'Total Threats',
            rootJailbreakData.totalThreats?.toString() || '0',
            rootJailbreakData.totalThreats > 0 ? 'critical' : 'healthy',
            AlertTriangle,
            'Detected security threats'
          )}
          
          {renderMetricCard(
            'Critical Threats',
            rootJailbreakData.criticalThreats?.toString() || '0',
            rootJailbreakData.criticalThreats > 0 ? 'critical' : 'healthy',
            XCircle,
            'High severity threats'
          )}
          
          {renderMetricCard(
            'Monitoring',
            rootJailbreakData.monitoringActive ? 'Active' : 'Inactive',
            rootJailbreakData.monitoringActive ? 'active' : 'inactive',
            Eye,
            'Continuous monitoring status'
          )}
          
          {renderMetricCard(
            'Last Check',
            rootJailbreakData.lastCheck ? formatRelativeTime(rootJailbreakData.lastCheck) : 'Never',
            rootJailbreakData.lastCheck && (Date.now() - rootJailbreakData.lastCheck) < 300000 ? 'healthy' : 'warning',
            Clock,
            'Last security scan'
          )}
          
          {renderMetricCard(
            'Avg Confidence',
            `${Math.round(rootJailbreakData.averageConfidence || 0)}%`,
            rootJailbreakData.averageConfidence > 75 ? 'critical' : 
            rootJailbreakData.averageConfidence > 50 ? 'warning' : 'healthy',
            Target,
            'Detection confidence level'
          )}
        </View>
      </View>
    );
  };

  const renderDeviceBindingOverview = () => {
    if (!deviceBindingData) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Device Binding', Smartphone)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Active Bindings',
            deviceBindingData.activeBindings?.toString() || '0',
            deviceBindingData.activeBindings > 0 ? 'healthy' : 'warning',
            CheckCircle,
            'Currently active device bindings',
            () => onNavigate?.('device-binding')
          )}
          
          {renderMetricCard(
            'High Risk Bindings',
            deviceBindingData.highRiskBindings?.toString() || '0',
            deviceBindingData.highRiskBindings > 0 ? 'critical' : 'healthy',
            AlertTriangle,
            'Bindings with high risk scores'
          )}
          
          {renderMetricCard(
            'Avg Risk Score',
            `${Math.round(deviceBindingData.averageRiskScore || 0)}/100`,
            deviceBindingData.averageRiskScore > 70 ? 'critical' : 
            deviceBindingData.averageRiskScore > 40 ? 'warning' : 'healthy',
            TrendingUp,
            'Average risk score across bindings'
          )}
          
          {renderMetricCard(
            'Recent Anomalies',
            deviceBindingData.recentAnomalies?.toString() || '0',
            deviceBindingData.recentAnomalies > 0 ? 'warning' : 'healthy',
            Eye,
            'Anomalies detected in last hour'
          )}
          
          {renderMetricCard(
            'Monitoring',
            deviceBindingData.monitoringActive ? 'Active' : 'Inactive',
            deviceBindingData.monitoringActive ? 'active' : 'inactive',
            Activity,
            'Continuous binding validation'
          )}
          
          {renderMetricCard(
            'Device Model',
            deviceBindingData.currentDevice?.model || 'Unknown',
            'info',
            Smartphone,
            'Current device information'
          )}
        </View>
      </View>
    );
  };

  const renderLoggingOverview = () => {
    if (!loggingMetrics) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Centralized Logging', Database)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Logs',
            loggingMetrics.totalLogs?.toLocaleString() || '0',
            'healthy',
            Database,
            'All log entries',
            () => onNavigate?.('logging-dashboard')
          )}
          
          {renderMetricCard(
            'Error Rate',
            `${((loggingMetrics.errorRate || 0) * 100).toFixed(2)}%`,
            loggingMetrics.errorRate > 0.05 ? 'critical' : 
            loggingMetrics.errorRate > 0.01 ? 'warning' : 'healthy',
            AlertTriangle,
            'System error rate'
          )}
          
          {renderMetricCard(
            'Queue Size',
            loggingMetrics.queueSize?.toString() || '0',
            loggingMetrics.queueSize > 1000 ? 'critical' : 
            loggingMetrics.queueSize > 500 ? 'warning' : 'healthy',
            Layers,
            'Pending log entries'
          )}
          
          {renderMetricCard(
            'Processing Time',
            `${Math.round(loggingMetrics.averageProcessingTime || 0)}ms`,
            loggingMetrics.averageProcessingTime > 1000 ? 'critical' : 
            loggingMetrics.averageProcessingTime > 500 ? 'warning' : 'healthy',
            Zap,
            'Average processing time'
          )}
        </View>
      </View>
    );
  };

  const renderDevSecOpsOverview = () => {
    if (!devSecOpsMetrics) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('DevSecOps Integration', Settings)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Deployment Security',
            `${devSecOpsMetrics.deploymentSecurity}%`,
            devSecOpsMetrics.deploymentSecurity > 90 ? 'healthy' : 
            devSecOpsMetrics.deploymentSecurity > 70 ? 'warning' : 'critical',
            Shield,
            'Secure deployments',
            () => onNavigate?.('devsecops-dashboard')
          )}
          
          {renderMetricCard(
            'Vulnerabilities',
            devSecOpsMetrics.vulnerabilityCount?.toString() || '0',
            devSecOpsMetrics.vulnerabilityCount === 0 ? 'healthy' : 
            devSecOpsMetrics.vulnerabilityCount < 10 ? 'warning' : 'critical',
            AlertTriangle,
            'Security vulnerabilities'
          )}
          
          {renderMetricCard(
            'Compliance Score',
            `${devSecOpsMetrics.complianceScore}%`,
            devSecOpsMetrics.complianceScore > 90 ? 'healthy' : 
            devSecOpsMetrics.complianceScore > 70 ? 'warning' : 'critical',
            CheckCircle,
            'Policy compliance'
          )}
          
          {renderMetricCard(
            'Security Gates',
            `${devSecOpsMetrics.securityGatesPassed}`,
            devSecOpsMetrics.securityGatesPassed > 0 ? 'healthy' : 'warning',
            Lock,
            'Passed security gates'
          )}
          
          {renderMetricCard(
            'Response Time',
            `${devSecOpsMetrics.incidentResponseTime}m`,
            devSecOpsMetrics.incidentResponseTime < 30 ? 'healthy' : 
            devSecOpsMetrics.incidentResponseTime < 60 ? 'warning' : 'critical',
            Clock,
            'Incident response time'
          )}
        </View>
      </View>
    );
  };

  const renderAccessControlOverview = () => {
    // Mock access control data for now
    const accessControlData = {
      totalPolicies: 15,
      activePolicies: 12,
      totalRoles: 5,
      activeRoleAssignments: 8,
      expiringMessages: 23,
      recentDecisions: 156,
      auditEntries: 1247,
      complianceScore: 92
    };

    return (
      <View style={styles.section}>
        {renderSectionHeader('Fine-grained Access Control', Lock)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'ABAC Policies',
            `${accessControlData.activePolicies}/${accessControlData.totalPolicies}`,
            accessControlData.activePolicies > 10 ? 'healthy' : 'warning',
            Shield,
            'Active attribute-based policies',
            () => onNavigate?.('access-control')
          )}
          
          {renderMetricCard(
            'RBAC Roles',
            accessControlData.activeRoleAssignments.toString(),
            accessControlData.activeRoleAssignments > 5 ? 'healthy' : 'warning',
            Users,
            'Active role assignments',
            () => onNavigate?.('access-control')
          )}
          
          {renderMetricCard(
            'Expiring Messages',
            accessControlData.expiringMessages.toString(),
            'healthy',
            Clock,
            'Temporary messages active',
            () => onNavigate?.('access-control')
          )}
          
          {renderMetricCard(
            'Audit Entries',
            accessControlData.auditEntries.toString(),
            'healthy',
            Eye,
            'Access control audit log',
            () => onNavigate?.('access-control')
          )}
          
          {renderMetricCard(
            'Compliance Score',
            `${accessControlData.complianceScore}%`,
            accessControlData.complianceScore > 90 ? 'healthy' : 
            accessControlData.complianceScore > 70 ? 'warning' : 'critical',
            CheckCircle,
            'Overall compliance rating'
          )}
        </View>
      </View>
    );
  };

  const renderAIMLOverview = () => {
    const retrainingMetrics = retrainingStore.getRetrainingMetrics();
    const systemStatus = retrainingStore.getSystemStatus();
    const recommendationMetrics = recommendationStore.getMLLoggingMetrics();

    return (
      <View style={styles.section}>
        {renderSectionHeader('AI & Machine Learning', Brain)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'ML Pipeline',
            systemStatus.isInitialized ? 'Active' : 'Inactive',
            systemStatus.isInitialized ? 'active' : 'inactive',
            Brain,
            `${systemStatus.dataBufferSize} data points buffered`,
            () => onNavigate?.('ml-dashboard')
          )}
          
          {renderMetricCard(
            'Model Performance',
            `${Math.round((recommendationMetrics?.averageAccuracy || 0) * 100)}%`,
            (recommendationMetrics?.averageAccuracy || 0) > 0.8 ? 'healthy' : 
            (recommendationMetrics?.averageAccuracy || 0) > 0.6 ? 'warning' : 'critical',
            TrendingUp,
            'Average accuracy across models'
          )}
          
          {renderMetricCard(
            'Training Jobs',
            `${retrainingMetrics.successfulJobs}/${retrainingMetrics.successfulJobs + retrainingMetrics.failedJobs}`,
            retrainingMetrics.failedJobs === 0 ? 'healthy' : 'warning',
            BarChart3,
            `${systemStatus.activeJobsCount} active jobs`
          )}
          
          {renderMetricCard(
            'Data Quality',
            `${Math.round((retrainingMetrics.averageQualityScore || 0) * 100)}%`,
            retrainingMetrics.averageQualityScore > 0.8 ? 'healthy' : 
            retrainingMetrics.averageQualityScore > 0.6 ? 'warning' : 'critical',
            Database,
            'Training data quality'
          )}
        </View>
      </View>
    );
  };

  const renderPerformanceOverview = () => {
    if (!performanceData) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Performance & SLA', Zap)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Overall Health',
            performanceData.overview?.overallHealth || 'Unknown',
            performanceData.overview?.overallHealth || 'unknown',
            Zap,
            'System performance status',
            () => onNavigate?.('performance-dashboard')
          )}
          
          {renderMetricCard(
            'Active Users',
            performanceData.overview?.activeUsers?.toLocaleString() || '0',
            'healthy',
            Users,
            'Current active sessions'
          )}
          
          {renderMetricCard(
            'Response Time',
            `${Math.round(performanceData.overview?.responseTime || 0)}ms`,
            (performanceData.overview?.responseTime || 0) > 1000 ? 'critical' : 
            (performanceData.overview?.responseTime || 0) > 500 ? 'warning' : 'healthy',
            Clock,
            'Average API response'
          )}
          
          {renderMetricCard(
            'Error Rate',
            `${((performanceData.overview?.errorRate || 0) * 100).toFixed(2)}%`,
            (performanceData.overview?.errorRate || 0) > 0.05 ? 'critical' : 
            (performanceData.overview?.errorRate || 0) > 0.01 ? 'warning' : 'healthy',
            AlertTriangle,
            'System error rate'
          )}
        </View>
      </View>
    );
  };

  const renderDataGovernance = () => {
    if (!governanceStatus) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader('Data Governance', Database)}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Active Policies',
            governanceStatus.activePolicies?.toString() || '0',
            governanceStatus.activePolicies > 0 ? 'active' : 'inactive',
            Settings,
            'Governance policies enforced',
            () => onNavigate?.('governance-dashboard')
          )}
          
          {renderMetricCard(
            'Data Types',
            governanceStatus.dataTypes?.toString() || '0',
            'healthy',
            Database,
            'Classified data types'
          )}
          
          {renderMetricCard(
            'Privacy Requests',
            governanceStatus.pendingRequests?.toString() || '0',
            governanceStatus.pendingRequests > 5 ? 'warning' : 'healthy',
            Eye,
            'Pending GDPR requests'
          )}
          
          {renderMetricCard(
            'Last Assessment',
            governanceStatus.lastAssessment ? 
              formatRelativeTime(governanceStatus.lastAssessment) : 'Never',
            governanceStatus.lastAssessment && 
            (Date.now() - governanceStatus.lastAssessment) < 7 * 24 * 60 * 60 * 1000 ? 
              'healthy' : 'warning',
            Clock,
            'Compliance assessment'
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={loadDashboardData}
          colors={['#6366F1']}
          tintColor="#6366F1"
        />
      }
    >
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Comprehensive Security Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Complete monitoring, incident response, and analytics
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadDashboardData}
        >
          <Activity size={20} color="#FFFFFF" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        {renderSystemOverview()}
        {renderSecurityOverview()}
        {renderRootJailbreakOverview()}
        {renderDeviceBindingOverview()}
        {renderUEBAOverview()}
        {renderBehaviorAnalyticsOverview()}
        {renderThreatIntelligenceOverview()}
        {renderIncidentResponseOverview()}
        {renderSOCOverview()}
        {renderLoggingOverview()}
        {renderDevSecOpsOverview()}
        {renderAccessControlOverview()}
        {renderAIMLOverview()}
        {renderPerformanceOverview()}
        {renderDataGovernance()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  refreshText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 16,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  anomaliesContainer: {
    marginTop: 16,
  },
  anomalyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  anomalySeverity: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  anomalyContent: {
    flex: 1,
  },
  anomalyDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  anomalyTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  anomalyRisk: {
    alignItems: 'center',
  },
  riskScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  anomalyTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  anomalyRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  anomalyTypeInfo: {
    flex: 1,
    marginRight: 12,
  },
  anomalyTypeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  anomalyTypeCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  anomalyTypeBar: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  anomalyTypeBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  threatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  threatSeverity: {
    width: 4,
    height: 50,
    borderRadius: 2,
    marginRight: 12,
  },
  threatContent: {
    flex: 1,
  },
  threatType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  threatDescription: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  threatTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  threatConfidence: {
    alignItems: 'center',
  },
  confidenceScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  confidenceLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
});