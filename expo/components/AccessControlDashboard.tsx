import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Settings,
  Eye,
  FileText,
  TrendingUp,
  Filter,
  Search,
  BarChart3
} from 'lucide-react-native';

import AccessControlService from '@/services/security/AccessControlService';
import { ABACDecision, ABACPolicy, AccessControlAudit } from '@/types';

interface AccessControlStats {
  totalPolicies: number;
  activePolicies: number;
  totalDecisions: number;
  allowedDecisions: number;
  deniedDecisions: number;
  conditionalDecisions: number;
  averageRiskScore: number;
  highRiskDecisions: number;
  anomaliesDetected: number;
  policyConflicts: number;
}

interface PolicyPerformance {
  policyId: string;
  policyName: string;
  applicationsCount: number;
  allowRate: number;
  denyRate: number;
  conditionalRate: number;
  averageEvaluationTime: number;
  averageRiskScore: number;
}

const AccessControlDashboard: React.FC = () => {
  const [accessControlService] = useState(() => AccessControlService.getInstance());
  const [stats, setStats] = useState<AccessControlStats>({
    totalPolicies: 0,
    activePolicies: 0,
    totalDecisions: 0,
    allowedDecisions: 0,
    deniedDecisions: 0,
    conditionalDecisions: 0,
    averageRiskScore: 0,
    highRiskDecisions: 0,
    anomaliesDetected: 0,
    policyConflicts: 0
  });
  const [recentDecisions, setRecentDecisions] = useState<AccessControlAudit[]>([]);
  const [policyPerformance, setPolicyPerformance] = useState<PolicyPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high_risk' | 'denied' | 'anomalies'>('all');

  useEffect(() => {
    loadAccessControlData();
  }, [selectedTimeRange, selectedFilter]);

  const loadAccessControlData = async () => {
    try {
      setIsLoading(true);
      
      // Calculate time range
      const now = Date.now();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      const startTime = now - timeRanges[selectedTimeRange];
      
      // Get audit log with filters
      const auditFilters: any = {
        startTime,
        endTime: now,
        limit: 1000
      };
      
      if (selectedFilter === 'high_risk') {
        auditFilters.riskScoreMin = 70;
      } else if (selectedFilter === 'denied') {
        auditFilters.decision = 'deny';
      } else if (selectedFilter === 'anomalies') {
        auditFilters.anomalyDetected = true;
      }
      
      const auditLog = accessControlService.getAuditLogAdvanced(auditFilters);
      const allPolicies = accessControlService.getAllPolicies();
      
      // Calculate statistics
      const newStats = calculateStats(auditLog, allPolicies);
      const performance = calculatePolicyPerformance(auditLog, allPolicies);
      
      setStats(newStats);
      setRecentDecisions(auditLog.slice(-20)); // Last 20 decisions
      setPolicyPerformance(performance);
      
    } catch (error) {
      console.error('Failed to load access control data:', error);
      Alert.alert('Error', 'Failed to load access control data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (auditLog: AccessControlAudit[], policies: ABACPolicy[]): AccessControlStats => {
    const totalPolicies = policies.length;
    const activePolicies = policies.filter(p => p.enabled).length;
    const totalDecisions = auditLog.length;
    
    const allowedDecisions = auditLog.filter(log => log.decision === 'allow').length;
    const deniedDecisions = auditLog.filter(log => log.decision === 'deny').length;
    const conditionalDecisions = auditLog.filter(log => log.decision === 'conditional').length;
    
    const riskScores = auditLog.map(log => log.riskScore || 0).filter(score => score > 0);
    const averageRiskScore = riskScores.length > 0 ? 
      riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length : 0;
    
    const highRiskDecisions = auditLog.filter(log => (log.riskScore || 0) > 70).length;
    const anomaliesDetected = auditLog.filter(log => log.anomalyDetected).length;
    
    // Estimate policy conflicts (simplified)
    const policyConflicts = auditLog.filter(log => 
      log.policies && log.policies.length > 1
    ).length;
    
    return {
      totalPolicies,
      activePolicies,
      totalDecisions,
      allowedDecisions,
      deniedDecisions,
      conditionalDecisions,
      averageRiskScore,
      highRiskDecisions,
      anomaliesDetected,
      policyConflicts
    };
  };

  const calculatePolicyPerformance = (auditLog: AccessControlAudit[], policies: ABACPolicy[]): PolicyPerformance[] => {
    const policyStats = new Map<string, {
      applications: number;
      allows: number;
      denies: number;
      conditionals: number;
      totalEvaluationTime: number;
      totalRiskScore: number;
      riskScoreCount: number;
    }>();

    // Initialize stats for all policies
    policies.forEach(policy => {
      policyStats.set(policy.id, {
        applications: 0,
        allows: 0,
        denies: 0,
        conditionals: 0,
        totalEvaluationTime: 0,
        totalRiskScore: 0,
        riskScoreCount: 0
      });
    });

    // Calculate stats from audit log
    auditLog.forEach(log => {
      log.policies.forEach(policyId => {
        const stats = policyStats.get(policyId);
        if (stats) {
          stats.applications++;
          
          if (log.decision === 'allow') stats.allows++;
          else if (log.decision === 'deny') stats.denies++;
          else if (log.decision === 'conditional') stats.conditionals++;
          
          if (log.riskScore !== undefined) {
            stats.totalRiskScore += log.riskScore;
            stats.riskScoreCount++;
          }
        }
      });
    });

    // Convert to performance array
    return Array.from(policyStats.entries()).map(([policyId, stats]) => {
      const policy = policies.find(p => p.id === policyId);
      const total = stats.applications;
      
      return {
        policyId,
        policyName: policy?.name || 'Unknown Policy',
        applicationsCount: total,
        allowRate: total > 0 ? (stats.allows / total) * 100 : 0,
        denyRate: total > 0 ? (stats.denies / total) * 100 : 0,
        conditionalRate: total > 0 ? (stats.conditionals / total) * 100 : 0,
        averageEvaluationTime: 0, // Would need to track this separately
        averageRiskScore: stats.riskScoreCount > 0 ? stats.totalRiskScore / stats.riskScoreCount : 0
      };
    }).filter(perf => perf.applicationsCount > 0)
      .sort((a, b) => b.applicationsCount - a.applicationsCount);
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'allow':
        return <CheckCircle size={16} color="#10B981" />;
      case 'deny':
        return <XCircle size={16} color="#EF4444" />;
      case 'conditional':
        return <AlertTriangle size={16} color="#F59E0B" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return '#EF4444'; // Red
    if (riskScore >= 60) return '#F59E0B'; // Orange
    if (riskScore >= 40) return '#EAB308'; // Yellow
    return '#10B981'; // Green
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, subtitle, icon, color, trend }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <TrendingUp size={12} color={color} />
            <Text style={[styles.trendText, { color }]}>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadAccessControlData} />
      }
    >
      <LinearGradient
        colors={['#f59e0b', '#d97706']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Users size={32} color="#FFFFFF" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>التحكم في الصلاحيات</Text>
            <Text style={styles.headerSubtitle}>إدارة دقيقة للوصول والصلاحيات</Text>
          </View>
        </View>
        <Text style={styles.headerDescription}>
          تحكم ذكي ومرن في من يمكنه الوصول لماذا ومتى
        </Text>
      </LinearGradient>

      {/* Time Range and Filter Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.timeRangeContainer}>
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                selectedTimeRange === range && styles.timeRangeButtonActive
              ]}
              onPress={() => setSelectedTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                selectedTimeRange === range && styles.timeRangeTextActive
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterContainer}>
          {(['all', 'high_risk', 'denied', 'anomalies'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive
              ]}>
                {filter.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Statistics Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="إجمالي السياسات"
          value={stats.totalPolicies}
          subtitle={`${stats.activePolicies} نشطة`}
          icon={<FileText size={20} color="#667eea" />}
          color="#667eea"
        />
        <StatCard
          title="القرارات"
          value={stats.totalDecisions}
          subtitle={`خلال ${selectedTimeRange}`}
          icon={<Activity size={20} color="#10B981" />}
          color="#10B981"
        />
        <StatCard
          title="معدل السماح"
          value={`${stats.totalDecisions > 0 ? Math.round((stats.allowedDecisions / stats.totalDecisions) * 100) : 0}%`}
          subtitle={`${stats.allowedDecisions} مسموح`}
          icon={<CheckCircle size={20} color="#10B981" />}
          color="#10B981"
        />
        <StatCard
          title="معدل الرفض"
          value={`${stats.totalDecisions > 0 ? Math.round((stats.deniedDecisions / stats.totalDecisions) * 100) : 0}%`}
          subtitle={`${stats.deniedDecisions} مرفوض`}
          icon={<XCircle size={20} color="#EF4444" />}
          color="#EF4444"
        />
        <StatCard
          title="متوسط درجة المخاطر"
          value={Math.round(stats.averageRiskScore)}
          subtitle={`${stats.highRiskDecisions} عالي المخاطر`}
          icon={<AlertTriangle size={20} color="#F59E0B" />}
          color="#F59E0B"
        />
        <StatCard
          title="الشذوذات"
          value={stats.anomaliesDetected}
          subtitle="تم اكتشافها"
          icon={<Eye size={20} color="#EF4444" />}
          color="#EF4444"
        />
      </View>

      {/* Policy Performance */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Policy Performance</Text>
        </View>
        <View style={styles.policyPerformanceContainer}>
          {policyPerformance.slice(0, 5).map((policy) => (
            <View key={policy.policyId} style={styles.policyPerformanceItem}>
              <View style={styles.policyInfo}>
                <Text style={styles.policyName}>{policy.policyName}</Text>
                <Text style={styles.policyApplications}>
                  {policy.applicationsCount} applications
                </Text>
              </View>
              <View style={styles.policyMetrics}>
                <View style={styles.policyMetric}>
                  <Text style={styles.metricLabel}>Allow</Text>
                  <Text style={[styles.metricValue, { color: '#10B981' }]}>
                    {Math.round(policy.allowRate)}%
                  </Text>
                </View>
                <View style={styles.policyMetric}>
                  <Text style={styles.metricLabel}>Deny</Text>
                  <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                    {Math.round(policy.denyRate)}%
                  </Text>
                </View>
                <View style={styles.policyMetric}>
                  <Text style={styles.metricLabel}>Risk</Text>
                  <Text style={[styles.metricValue, { color: getRiskColor(policy.averageRiskScore) }]}>
                    {Math.round(policy.averageRiskScore)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Decisions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Activity size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Recent Decisions</Text>
        </View>
        <View style={styles.decisionsContainer}>
          {recentDecisions.map((decision) => (
            <View key={decision.id} style={styles.decisionItem}>
              <View style={styles.decisionHeader}>
                <View style={styles.decisionInfo}>
                  {getDecisionIcon(decision.decision)}
                  <Text style={styles.decisionAction}>{decision.action}</Text>
                  <Text style={styles.decisionResource}>{decision.resource}</Text>
                </View>
                <Text style={styles.decisionTime}>
                  {formatTimestamp(decision.timestamp)}
                </Text>
              </View>
              <View style={styles.decisionDetails}>
                <Text style={styles.decisionUser}>User: {decision.userId}</Text>
                {decision.riskScore !== undefined && (
                  <View style={styles.riskScoreContainer}>
                    <Text style={styles.riskScoreLabel}>Risk:</Text>
                    <View style={[
                      styles.riskScoreBadge,
                      { backgroundColor: getRiskColor(decision.riskScore) + '20' }
                    ]}>
                      <Text style={[
                        styles.riskScoreValue,
                        { color: getRiskColor(decision.riskScore) }
                      ]}>
                        {Math.round(decision.riskScore)}
                      </Text>
                    </View>
                  </View>
                )}
                {decision.anomalyDetected && (
                  <View style={styles.anomalyBadge}>
                    <AlertTriangle size={12} color="#EF4444" />
                    <Text style={styles.anomalyText}>Anomaly</Text>
                  </View>
                )}
              </View>
              {decision.policies.length > 0 && (
                <Text style={styles.appliedPolicies}>
                  Policies: {decision.policies.join(', ')}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Settings size={20} color="#374151" />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Shield size={20} color="#667eea" />
            <Text style={styles.quickActionText}>Manage Policies</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Users size={20} color="#667eea" />
            <Text style={styles.quickActionText}>Role Management</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <FileText size={20} color="#667eea" />
            <Text style={styles.quickActionText}>Audit Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <AlertTriangle size={20} color="#667eea" />
            <Text style={styles.quickActionText}>Security Alerts</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 4,
  },
  headerDescription: {
    fontSize: 12,
    color: '#FEF3C7',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9
  },
  controlsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  timeRangeButtonActive: {
    backgroundColor: '#667eea',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  policyPerformanceContainer: {
    gap: 12,
  },
  policyPerformanceItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  policyInfo: {
    marginBottom: 8,
  },
  policyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  policyApplications: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  policyMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  policyMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  decisionsContainer: {
    gap: 12,
  },
  decisionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  decisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  decisionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  decisionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  decisionResource: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  decisionTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  decisionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  decisionUser: {
    fontSize: 12,
    color: '#6B7280',
  },
  riskScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskScoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  riskScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  riskScoreValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  anomalyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  anomalyText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  appliedPolicies: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '48%',
  },
  quickActionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default AccessControlDashboard;