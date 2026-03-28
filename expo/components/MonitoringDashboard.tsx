import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Minus, Brain, Users, Target, Shield, Eye } from 'lucide-react-native';
import SystemMonitoringService from '@/services/monitoring/SystemMonitoringService';
import PerformanceMonitoringService from '@/services/monitoring/PerformanceMonitoringService';
import DataGovernanceService from '@/services/governance/DataGovernanceService';
import UEBAService from '@/services/security/UEBAService';
import BehaviorAnalyticsService from '@/services/security/BehaviorAnalyticsService';
import ThreatIntelligenceService from '@/services/security/ThreatIntelligenceService';

const { width } = Dimensions.get('window');

interface MonitoringDashboardProps {
  onNavigateToDetails?: (section: string) => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ onNavigateToDetails }) => {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [performanceDashboard, setPerformanceDashboard] = useState<any>(null);
  const [governanceStatus, setGovernanceStatus] = useState<any>(null);
  const [uebaStats, setUEBAStats] = useState<any>(null);
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<any>(null);
  const [threatIntelligence, setThreatIntelligence] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const systemMonitoring = SystemMonitoringService.getInstance();
  const performanceMonitoring = PerformanceMonitoringService.getInstance();
  const dataGovernance = DataGovernanceService.getInstance();

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [systemData, performanceData, governanceData] = await Promise.all([
        Promise.resolve(systemMonitoring.getSystemStatus()),
        Promise.resolve(performanceMonitoring.getPerformanceDashboard()),
        Promise.resolve(dataGovernance.getGovernanceStatus())
      ]);

      setSystemStatus(systemData);
      setPerformanceDashboard(performanceData);
      setGovernanceStatus(governanceData);

      // Load UEBA and Behavior Analytics data
      try {
        const uebaService = UEBAService.getInstance();
        const behaviorService = BehaviorAnalyticsService.getInstance();
        const threatService = ThreatIntelligenceService.getInstance();

        await uebaService.initialize();
        await behaviorService.initialize();
        await threatService.initialize();

        const [uebaData, behaviorData, threatData] = await Promise.all([
          uebaService.getSystemStats(),
          behaviorService.getAnalyticsStats(),
          threatService.getThreatStats()
        ]);

        setUEBAStats(uebaData);
        setBehaviorAnalytics(behaviorData);
        setThreatIntelligence(threatData);
      } catch (error) {
        console.error('Failed to load UEBA/Behavior Analytics data:', error);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10B981';
      case 'degraded': return '#F59E0B';
      case 'unhealthy':
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'unhealthy':
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'degrading': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#10B981';
      case 'degrading': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getRiskLevelColor = (riskScore: number) => {
    if (riskScore >= 0.8) return '#EF4444';
    if (riskScore >= 0.6) return '#F59E0B';
    if (riskScore >= 0.4) return '#F59E0B';
    return '#10B981';
  };

  const formatUptime = (uptime: number) => {
    return `${(uptime * 100).toFixed(2)}%`;
  };

  const formatResponseTime = (time: number) => {
    return `${time.toFixed(0)}ms`;
  };

  const formatThroughput = (throughput: number) => {
    return `${throughput.toFixed(0)} req/s`;
  };

  const formatErrorRate = (rate: number) => {
    return `${rate.toFixed(2)}%`;
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
              <IconComponent size={20} color="#6366F1" />
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
              <StatusIcon size={10} color="#FFFFFF" />
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

  if (!systemStatus || !performanceDashboard || !governanceStatus) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={24} color="#6B7280" />
        <Text style={styles.loadingText}>Loading monitoring data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>System Monitoring</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      </View>

      {/* Overall System Status */}
      <TouchableOpacity 
        style={styles.statusCard}
        onPress={() => onNavigateToDetails?.('system')}
      >
        <LinearGradient
          colors={['#F8FAFC', '#F1F5F9']}
          style={styles.cardGradient}
        >
          <View style={styles.statusHeader}>
            <View style={styles.statusIconContainer}>
              {React.createElement(getStatusIcon(systemStatus.overall), {
                size: 24,
                color: getStatusColor(systemStatus.overall)
              })}
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>System Status</Text>
              <Text style={[styles.statusValue, { color: getStatusColor(systemStatus.overall) }]}>
                {systemStatus.overall.toUpperCase()}
              </Text>
            </View>
            <View style={styles.uptimeContainer}>
              <Text style={styles.uptimeLabel}>Uptime</Text>
              <Text style={styles.uptimeValue}>{formatUptime(systemStatus.uptime)}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Performance Metrics */}
      <View style={styles.metricsGrid}>
        <TouchableOpacity 
          style={styles.metricCard}
          onPress={() => onNavigateToDetails?.('performance')}
        >
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>Response Time</Text>
            {React.createElement(getTrendIcon(performanceDashboard.trends.responseTimeTrend), {
              size: 16,
              color: getTrendColor(performanceDashboard.trends.responseTimeTrend)
            })}
          </View>
          <Text style={styles.metricValue}>
            {formatResponseTime(performanceDashboard.overview.responseTime)}
          </Text>
          <Text style={styles.metricSubtext}>Average response time</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.metricCard}
          onPress={() => onNavigateToDetails?.('performance')}
        >
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>Throughput</Text>
            {React.createElement(getTrendIcon(performanceDashboard.trends.throughputTrend), {
              size: 16,
              color: getTrendColor(performanceDashboard.trends.throughputTrend)
            })}
          </View>
          <Text style={styles.metricValue}>
            {formatThroughput(performanceDashboard.overview.throughput)}
          </Text>
          <Text style={styles.metricSubtext}>Requests per second</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.metricCard}
          onPress={() => onNavigateToDetails?.('performance')}
        >
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>Error Rate</Text>
            {React.createElement(getTrendIcon(performanceDashboard.trends.errorRateTrend), {
              size: 16,
              color: getTrendColor(performanceDashboard.trends.errorRateTrend)
            })}
          </View>
          <Text style={[
            styles.metricValue,
            { color: performanceDashboard.overview.errorRate > 1 ? '#EF4444' : '#10B981' }
          ]}>
            {formatErrorRate(performanceDashboard.overview.errorRate)}
          </Text>
          <Text style={styles.metricSubtext}>Error percentage</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.metricCard}
          onPress={() => onNavigateToDetails?.('performance')}
        >
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>Availability</Text>
            <CheckCircle size={16} color="#10B981" />
          </View>
          <Text style={styles.metricValue}>
            {formatUptime(performanceDashboard.overview.availability)}
          </Text>
          <Text style={styles.metricSubtext}>System availability</Text>
        </TouchableOpacity>
      </View>

      {/* UEBA & Behavior Analytics Section */}
      {(uebaStats || behaviorAnalytics) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UEBA & Behavior Analytics</Text>
          <View style={styles.metricsGrid}>
            {uebaStats && (
              <>
                {renderMetricCard(
                  'User Profiles',
                  uebaStats.totalUsers.toString(),
                  'healthy',
                  Users,
                  'Monitored users',
                  () => onNavigateToDetails?.('ueba')
                )}
                
                {renderMetricCard(
                  'Anomalies',
                  uebaStats.totalAnomalies.toString(),
                  uebaStats.totalAnomalies > 10 ? 'warning' : 'healthy',
                  AlertTriangle,
                  'Detected anomalies'
                )}
                
                {renderMetricCard(
                  'High Risk Users',
                  uebaStats.highRiskUsers.toString(),
                  uebaStats.highRiskUsers > 0 ? 'critical' : 'healthy',
                  Shield,
                  'Users at risk'
                )}
                
                {renderMetricCard(
                  'Avg Risk Score',
                  `${Math.round(uebaStats.avgRiskScore * 100)}%`,
                  uebaStats.avgRiskScore > 0.7 ? 'critical' : 
                  uebaStats.avgRiskScore > 0.4 ? 'warning' : 'healthy',
                  TrendingUp,
                  'Average risk level'
                )}
              </>
            )}
          </View>
        </View>
      )}

      {/* Behavior Analytics Details */}
      {behaviorAnalytics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ML & Behavior Patterns</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Behavior Patterns',
              behaviorAnalytics.totalPatterns.toString(),
              'healthy',
              Brain,
              'Identified patterns'
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
              Target,
              'High priority'
            )}
            
            {renderMetricCard(
              'ML Models',
              behaviorAnalytics.mlModelStats?.length.toString() || '0',
              'healthy',
              Brain,
              'Active models'
            )}
          </View>
        </View>
      )}

      {/* Threat Intelligence Section */}
      {threatIntelligence && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Threat Intelligence</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Threat Indicators',
              threatIntelligence.totalIndicators.toString(),
              'healthy',
              Target,
              'IOCs in database'
            )}
            
            {renderMetricCard(
              'Threat Sources',
              threatIntelligence.threatSources?.toString() || '0',
              'healthy',
              Eye,
              'Intelligence feeds'
            )}
            
            {renderMetricCard(
              'Malicious IPs',
              threatIntelligence.maliciousIPs?.toString() || '0',
              threatIntelligence.maliciousIPs > 100 ? 'warning' : 'healthy',
              Shield,
              'Blocked addresses'
            )}
            
            {renderMetricCard(
              'Suspicious Domains',
              threatIntelligence.suspiciousDomains?.toString() || '0',
              threatIntelligence.suspiciousDomains > 50 ? 'warning' : 'healthy',
              AlertTriangle,
              'Flagged domains'
            )}
          </View>
        </View>
      )}

      {/* Services Health */}
      <TouchableOpacity 
        style={styles.sectionCard}
        onPress={() => onNavigateToDetails?.('services')}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Health</Text>
          <View style={styles.servicesSummary}>
            <View style={styles.servicesCount}>
              <View style={[styles.servicesDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.servicesText}>{systemStatus.services.healthy}</Text>
            </View>
            <View style={styles.servicesCount}>
              <View style={[styles.servicesDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.servicesText}>{systemStatus.services.degraded}</Text>
            </View>
            <View style={styles.servicesCount}>
              <View style={[styles.servicesDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.servicesText}>{systemStatus.services.unhealthy}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* SLA Status */}
      <TouchableOpacity 
        style={styles.sectionCard}
        onPress={() => onNavigateToDetails?.('sla')}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SLA Compliance</Text>
          <View style={styles.slaProgress}>
            <Text style={styles.slaPercentage}>
              {Math.round((performanceDashboard.slas.meeting / performanceDashboard.slas.total) * 100)}%
            </Text>
          </View>
        </View>
        <View style={styles.slaBreakdown}>
          <View style={styles.slaItem}>
            <View style={[styles.slaIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={styles.slaLabel}>Meeting ({performanceDashboard.slas.meeting})</Text>
          </View>
          <View style={styles.slaItem}>
            <View style={[styles.slaIndicator, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.slaLabel}>At Risk ({performanceDashboard.slas.atRisk})</Text>
          </View>
          <View style={styles.slaItem}>
            <View style={[styles.slaIndicator, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.slaLabel}>Breached ({performanceDashboard.slas.breached})</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Active Alerts */}
      <TouchableOpacity 
        style={styles.sectionCard}
        onPress={() => onNavigateToDetails?.('alerts')}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          <View style={styles.alertsBadge}>
            <Text style={styles.alertsCount}>{performanceDashboard.alerts.active}</Text>
          </View>
        </View>
        {performanceDashboard.alerts.active > 0 && (
          <View style={styles.alertsBreakdown}>
            {performanceDashboard.alerts.critical > 0 && (
              <View style={styles.alertItem}>
                <AlertTriangle size={16} color="#EF4444" />
                <Text style={styles.alertText}>
                  {performanceDashboard.alerts.critical} Critical
                </Text>
              </View>
            )}
            {performanceDashboard.alerts.warnings > 0 && (
              <View style={styles.alertItem}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={styles.alertText}>
                  {performanceDashboard.alerts.warnings} Warnings
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Data Governance */}
      <TouchableOpacity 
        style={styles.sectionCard}
        onPress={() => onNavigateToDetails?.('governance')}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Data Governance</Text>
          <View style={styles.complianceScore}>
            <Text style={styles.compliancePercentage}>
              {Math.round(governanceStatus.complianceScore * 100)}%
            </Text>
          </View>
        </View>
        <View style={styles.governanceStats}>
          <View style={styles.governanceStat}>
            <Text style={styles.governanceValue}>{governanceStatus.activePolicies}</Text>
            <Text style={styles.governanceLabel}>Active Policies</Text>
          </View>
          <View style={styles.governanceStat}>
            <Text style={styles.governanceValue}>{governanceStatus.dataTypes}</Text>
            <Text style={styles.governanceLabel}>Data Types</Text>
          </View>
          <View style={styles.governanceStat}>
            <Text style={styles.governanceValue}>{governanceStatus.pendingRequests}</Text>
            <Text style={styles.governanceLabel}>Pending Requests</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Top Issues */}
      {performanceDashboard.topIssues.length > 0 && (
        <TouchableOpacity 
          style={styles.sectionCard}
          onPress={() => onNavigateToDetails?.('issues')}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Issues</Text>
            <Text style={styles.issuesCount}>
              {performanceDashboard.topIssues.length} active
            </Text>
          </View>
          <View style={styles.issuesList}>
            {performanceDashboard.topIssues.slice(0, 3).map((issue: any, index: number) => (
              <View key={issue.id} style={styles.issueItem}>
                <View style={[
                  styles.issueSeverity,
                  { backgroundColor: getStatusColor(issue.severity) }
                ]} />
                <View style={styles.issueContent}>
                  <Text style={styles.issueDescription} numberOfLines={1}>
                    {issue.description}
                  </Text>
                  <Text style={styles.issueTime}>
                    {new Date(issue.detectedAt).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  uptimeContainer: {
    alignItems: 'flex-end',
  },
  uptimeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  uptimeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  servicesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  servicesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  servicesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  slaProgress: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  slaPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  slaBreakdown: {
    flexDirection: 'row',
    gap: 16,
  },
  slaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slaIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slaLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  alertsBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alertsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  alertsBreakdown: {
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#6B7280',
  },
  complianceScore: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compliancePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
  },
  governanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  governanceStat: {
    alignItems: 'center',
  },
  governanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  governanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  issuesCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  issuesList: {
    gap: 12,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  issueSeverity: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  issueContent: {
    flex: 1,
  },
  issueDescription: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 2,
  },
  issueTime: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default MonitoringDashboard;