import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Brain,
  Target,
  UserCheck,
  TrendingDown,
  Zap,
  Database,
  Search
} from 'lucide-react-native';
import UEBAService from '@/services/security/UEBAService';
import BehaviorAnalyticsService from '@/services/security/BehaviorAnalyticsService';
import ThreatIntelligenceService from '@/services/security/ThreatIntelligenceService';

const { width } = Dimensions.get('window');

interface UEBAStats {
  totalUsers: number;
  totalAnomalies: number;
  highRiskUsers: number;
  avgRiskScore: number;
}

interface BehaviorAlert {
  id: string;
  userId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  riskScore: number;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

const UEBADashboard: React.FC = () => {
  const [stats, setStats] = useState<UEBAStats>({
    totalUsers: 0,
    totalAnomalies: 0,
    highRiskUsers: 0,
    avgRiskScore: 0
  });
  const [alerts, setAlerts] = useState<BehaviorAlert[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<any>(null);
  const [threatStats, setThreatStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'alerts' | 'analytics' | 'threats'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const uebaService = UEBAService.getInstance();
      const analyticsService = BehaviorAnalyticsService.getInstance();
      const threatService = ThreatIntelligenceService.getInstance();
      
      await uebaService.initialize();
      await analyticsService.initialize();
      await threatService.initialize();
      
      const [uebaStats, behaviorAlerts, analytics, threats] = await Promise.all([
        uebaService.getSystemStats(),
        analyticsService.getBehaviorAlerts({ limit: 50 }),
        analyticsService.getAnalyticsStats(),
        threatService.getThreatStats()
      ]);
      
      setStats(uebaStats);
      setAlerts(behaviorAlerts);
      setAnalyticsStats(analytics);
      setThreatStats(threats);
      
    } catch (error) {
      console.error('Failed to load UEBA dashboard data:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات لوحة المراقبة');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const analyticsService = BehaviorAnalyticsService.getInstance();
      await analyticsService.acknowledgeAlert(alertId);
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
      
      Alert.alert('تم', 'تم الإقرار بالتنبيه');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في الإقرار بالتنبيه');
    }
  };

  const handleResolveAlert = async (alertId: string, resolution: 'resolved' | 'false_positive') => {
    try {
      const analyticsService = BehaviorAnalyticsService.getInstance();
      await analyticsService.resolveAlert(alertId, resolution);
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { 
          ...alert, 
          resolved: true, 
          falsePositive: resolution === 'false_positive' 
        } : alert
      ));
      
      Alert.alert('تم', 'تم حل التنبيه');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حل التنبيه');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return XCircle;
      case 'high': return AlertTriangle;
      case 'medium': return Eye;
      case 'low': return CheckCircle;
      default: return Activity;
    }
  };

  const getRiskLevelColor = (riskScore: number) => {
    if (riskScore >= 0.8) return '#dc2626';
    if (riskScore >= 0.6) return '#ea580c';
    if (riskScore >= 0.4) return '#d97706';
    return '#65a30d';
  };

  const getRiskLevelText = (riskScore: number) => {
    if (riskScore >= 0.8) return 'حرج';
    if (riskScore >= 0.6) return 'عالي';
    if (riskScore >= 0.4) return 'متوسط';
    return 'منخفض';
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-SA');
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* إحصائيات عامة */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#3b82f6', '#1d4ed8']}
            style={styles.statGradient}
          >
            <Users size={24} color="#ffffff" />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>المستخدمون المراقبون</Text>
            <Text style={styles.statDescription}>عدد المستخدمين تحت المراقبة الذكية</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            style={styles.statGradient}
          >
            <AlertTriangle size={24} color="#ffffff" />
            <Text style={styles.statValue}>{stats.totalAnomalies}</Text>
            <Text style={styles.statLabel}>الأنشطة المشبوهة</Text>
            <Text style={styles.statDescription}>أنشطة غير عادية تم اكتشافها</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.statGradient}
          >
            <UserCheck size={24} color="#ffffff" />
            <Text style={styles.statValue}>{stats.highRiskUsers}</Text>
            <Text style={styles.statLabel}>مستخدمون عالي المخاطر</Text>
            <Text style={styles.statDescription}>يحتاجون مراجعة فورية</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={[getRiskLevelColor(stats.avgRiskScore), getRiskLevelColor(stats.avgRiskScore)]}
            style={styles.statGradient}
          >
            <TrendingUp size={24} color="#ffffff" />
            <Text style={styles.statValue}>{(stats.avgRiskScore * 100).toFixed(1)}%</Text>
            <Text style={styles.statLabel}>متوسط درجة المخاطر</Text>
            <Text style={styles.statDescription}>مؤشر عام لمستوى الأمان</Text>
          </LinearGradient>
        </View>
      </View>

      {/* التنبيهات الحديثة */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>التنبيهات الحديثة</Text>
        {alerts.slice(0, 5).map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertInfo}>
                {React.createElement(getSeverityIcon(alert.severity), {
                  size: 20,
                  color: getSeverityColor(alert.severity)
                })}
                <Text style={styles.alertTitle}>{alert.title}</Text>
              </View>
              <Text style={styles.alertTime}>
                {formatTimestamp(alert.timestamp)}
              </Text>
            </View>
            <Text style={styles.alertDescription}>{alert.description}</Text>
            <View style={styles.alertFooter}>
              <Text style={[styles.alertSeverity, { color: getSeverityColor(alert.severity) }]}>
                {alert.severity.toUpperCase()}
              </Text>
              <Text style={styles.alertRisk}>
                مخاطر: {(alert.riskScore * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* نماذج التعلم الآلي */}
      {analyticsStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>نماذج التعلم الآلي</Text>
          {analyticsStats.mlModelStats.map((model: any) => (
            <View key={model.modelName} style={styles.modelCard}>
              <View style={styles.modelHeader}>
                <Brain size={20} color="#6366f1" />
                <Text style={styles.modelName}>{model.modelName}</Text>
                <Text style={styles.modelVersion}>v{model.version}</Text>
              </View>
              <View style={styles.modelMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>دقة</Text>
                  <Text style={styles.metricValue}>{(model.accuracy * 100).toFixed(1)}%</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>استدعاء</Text>
                  <Text style={styles.metricValue}>{(model.recall * 100).toFixed(1)}%</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>F1</Text>
                  <Text style={styles.metricValue}>{(model.f1Score * 100).toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* إحصائيات التهديدات */}
      {threatStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>استخبارات التهديدات</Text>
          <View style={styles.threatStatsGrid}>
            <View style={styles.threatStatCard}>
              <Target size={20} color="#dc2626" />
              <Text style={styles.threatStatValue}>{threatStats.totalIndicators}</Text>
              <Text style={styles.threatStatLabel}>مؤشرات التهديد</Text>
            </View>
            <View style={styles.threatStatCard}>
              <Shield size={20} color="#059669" />
              <Text style={styles.threatStatValue}>{threatStats.threatSources || 0}</Text>
              <Text style={styles.threatStatLabel}>مصادر التهديد</Text>
            </View>
            <View style={styles.threatStatCard}>
              <AlertTriangle size={20} color="#ea580c" />
              <Text style={styles.threatStatValue}>{threatStats.maliciousIPs || 0}</Text>
              <Text style={styles.threatStatLabel}>عناوين IP ضارة</Text>
            </View>
            <View style={styles.threatStatCard}>
              <Database size={20} color="#6366f1" />
              <Text style={styles.threatStatValue}>{threatStats.suspiciousDomains || 0}</Text>
              <Text style={styles.threatStatLabel}>نطاقات مشبوهة</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderAlertsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.alertsHeader}>
        <Text style={styles.sectionTitle}>جميع التنبيهات</Text>
        <Text style={styles.alertsCount}>
          {alerts.filter(a => !a.resolved).length} غير محلول
        </Text>
      </View>

      {alerts.map((alert) => (
        <View key={alert.id} style={[
          styles.alertCard,
          alert.resolved && styles.resolvedAlert
        ]}>
          <View style={styles.alertHeader}>
            <View style={styles.alertInfo}>
              {React.createElement(getSeverityIcon(alert.severity), {
                size: 20,
                color: getSeverityColor(alert.severity)
              })}
              <Text style={styles.alertTitle}>{alert.title}</Text>
            </View>
            <Text style={styles.alertTime}>
              {formatTimestamp(alert.timestamp)}
            </Text>
          </View>
          
          <Text style={styles.alertDescription}>{alert.description}</Text>
          
          <View style={styles.alertFooter}>
            <Text style={[styles.alertSeverity, { color: getSeverityColor(alert.severity) }]}>
              {alert.severity.toUpperCase()}
            </Text>
            <Text style={styles.alertRisk}>
              مخاطر: {(alert.riskScore * 100).toFixed(0)}%
            </Text>
          </View>

          <View style={styles.alertStatus}>
            {alert.acknowledged && (
              <View style={styles.statusBadge}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.statusText}>مُقر به</Text>
              </View>
            )}
            {alert.resolved && (
              <View style={styles.statusBadge}>
                <CheckCircle size={16} color="#6b7280" />
                <Text style={styles.statusText}>محلول</Text>
              </View>
            )}
          </View>

          {!alert.resolved && (
            <View style={styles.alertActions}>
              {!alert.acknowledged && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.acknowledgeButton]}
                  onPress={() => handleAcknowledgeAlert(alert.id)}
                >
                  <Text style={styles.actionButtonText}>إقرار</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={() => handleResolveAlert(alert.id, 'resolved')}
              >
                <Text style={styles.actionButtonText}>حل</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.falsePositiveButton]}
                onPress={() => handleResolveAlert(alert.id, 'false_positive')}
              >
                <Text style={styles.actionButtonText}>إيجابي خاطئ</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView style={styles.tabContent}>
      {analyticsStats && (
        <>
          {/* إحصائيات التحليلات */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إحصائيات التحليلات</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <BarChart3 size={24} color="#3b82f6" />
                <Text style={styles.analyticsValue}>{analyticsStats.totalPatterns}</Text>
                <Text style={styles.analyticsLabel}>إجمالي الأنماط</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <AlertTriangle size={24} color="#ef4444" />
                <Text style={styles.analyticsValue}>{analyticsStats.totalAlerts}</Text>
                <Text style={styles.analyticsLabel}>إجمالي التنبيهات</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <Clock size={24} color="#f59e0b" />
                <Text style={styles.analyticsValue}>{analyticsStats.unresolvedAlerts}</Text>
                <Text style={styles.analyticsLabel}>غير محلول</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <Target size={24} color="#dc2626" />
                <Text style={styles.analyticsValue}>{analyticsStats.criticalAlerts}</Text>
                <Text style={styles.analyticsLabel}>حرج</Text>
              </View>
            </View>
          </View>

          {/* أنواع الشذوذ الأكثر شيوعاً */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أنواع الشذوذ الأكثر شيوعاً</Text>
            {analyticsStats.topAnomalyTypes.map((anomaly: any, index: number) => (
              <View key={anomaly.type} style={styles.anomalyItem}>
                <View style={styles.anomalyRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.anomalyInfo}>
                  <Text style={styles.anomalyType}>{anomaly.type}</Text>
                  <Text style={styles.anomalyCount}>{anomaly.count} حالة</Text>
                </View>
                <View style={styles.anomalyBar}>
                  <View 
                    style={[
                      styles.anomalyBarFill,
                      { 
                        width: `${(anomaly.count / analyticsStats.topAnomalyTypes[0].count) * 100}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>

          {/* أداء النماذج */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أداء نماذج التعلم الآلي</Text>
            {analyticsStats.mlModelStats.map((model: any) => (
              <View key={model.modelName} style={styles.performanceCard}>
                <View style={styles.performanceHeader}>
                  <Brain size={20} color="#6366f1" />
                  <Text style={styles.performanceName}>{model.modelName}</Text>
                  <View style={styles.performanceStatus}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: model.accuracy > 0.8 ? '#10b981' : '#f59e0b' }
                    ]} />
                    <Text style={styles.statusLabel}>
                      {model.accuracy > 0.8 ? 'ممتاز' : 'جيد'}
                    </Text>
                  </View>
                </View>
                <View style={styles.performanceMetrics}>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>الدقة</Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${model.accuracy * 100}%`,
                            backgroundColor: model.accuracy > 0.8 ? '#10b981' : '#f59e0b'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.performanceValue}>{(model.accuracy * 100).toFixed(1)}%</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>الاستدعاء</Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${model.recall * 100}%`,
                            backgroundColor: model.recall > 0.8 ? '#10b981' : '#f59e0b'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.performanceValue}>{(model.recall * 100).toFixed(1)}%</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>F1 Score</Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${model.f1Score * 100}%`,
                            backgroundColor: model.f1Score > 0.8 ? '#10b981' : '#f59e0b'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.performanceValue}>{(model.f1Score * 100).toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelInfoText}>
                    آخر تدريب: {new Date(model.lastTraining).toLocaleDateString('ar-SA')}
                  </Text>
                  <Text style={styles.modelInfoText}>
                    حجم البيانات: {model.trainingDataSize.toLocaleString()} عينة
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderThreatsTab = () => (
    <ScrollView style={styles.tabContent}>
      {threatStats && (
        <>
          {/* إحصائيات التهديدات */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إحصائيات التهديدات</Text>
            <View style={styles.threatStatsGrid}>
              <View style={styles.threatStatCard}>
                <Target size={24} color="#dc2626" />
                <Text style={styles.threatStatValue}>{threatStats.totalIndicators}</Text>
                <Text style={styles.threatStatLabel}>مؤشرات التهديد</Text>
              </View>
              <View style={styles.threatStatCard}>
                <Shield size={24} color="#059669" />
                <Text style={styles.threatStatValue}>{threatStats.threatSources || 0}</Text>
                <Text style={styles.threatStatLabel}>مصادر التهديد</Text>
              </View>
              <View style={styles.threatStatCard}>
                <AlertTriangle size={24} color="#ea580c" />
                <Text style={styles.threatStatValue}>{threatStats.maliciousIPs || 0}</Text>
                <Text style={styles.threatStatLabel}>عناوين IP ضارة</Text>
              </View>
              <View style={styles.threatStatCard}>
                <Database size={24} color="#6366f1" />
                <Text style={styles.threatStatValue}>{threatStats.suspiciousDomains || 0}</Text>
                <Text style={styles.threatStatLabel}>نطاقات مشبوهة</Text>
              </View>
            </View>
          </View>

          {/* التهديدات الحديثة */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التهديدات الحديثة</Text>
            <View style={styles.recentThreatsContainer}>
              <Text style={styles.noDataText}>
                لا توجد تهديدات حديثة للعرض
              </Text>
              <Text style={styles.noDataSubtext}>
                سيتم عرض التهديدات المكتشفة هنا عند توفرها
              </Text>
            </View>
          </View>

          {/* مصادر التهديدات */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>مصادر استخبارات التهديدات</Text>
            <View style={styles.threatSourcesContainer}>
              <View style={styles.threatSource}>
                <View style={styles.sourceIcon}>
                  <Database size={20} color="#6366f1" />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>قاعدة البيانات المحلية</Text>
                  <Text style={styles.sourceStatus}>نشط</Text>
                </View>
                <View style={styles.sourceMetrics}>
                  <Text style={styles.sourceCount}>{threatStats.totalIndicators}</Text>
                  <Text style={styles.sourceLabel}>مؤشر</Text>
                </View>
              </View>
              
              <View style={styles.threatSource}>
                <View style={styles.sourceIcon}>
                  <Search size={20} color="#059669" />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>تحليل السلوك</Text>
                  <Text style={styles.sourceStatus}>نشط</Text>
                </View>
                <View style={styles.sourceMetrics}>
                  <Text style={styles.sourceCount}>{stats.totalAnomalies}</Text>
                  <Text style={styles.sourceLabel}>شذوذ</Text>
                </View>
              </View>
              
              <View style={styles.threatSource}>
                <View style={styles.sourceIcon}>
                  <Brain size={20} color="#8b5cf6" />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>التعلم الآلي</Text>
                  <Text style={styles.sourceStatus}>نشط</Text>
                </View>
                <View style={styles.sourceMetrics}>
                  <Text style={styles.sourceCount}>{analyticsStats?.totalPatterns || 0}</Text>
                  <Text style={styles.sourceLabel}>نمط</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={48} color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل بيانات UEBA...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8b5cf6', '#7c3aed']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Brain size={32} color="#ffffff" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>المراقبة الذكية</Text>
            <Text style={styles.headerSubtitle}>تحليل سلوك المستخدم بالذكاء الاصطناعي</Text>
          </View>
        </View>
        <Text style={styles.headerDescription}>
          نظام ذكي يتعلم من سلوكك ويحميك من التهديدات تلقائياً
        </Text>
      </LinearGradient>

      {/* التبويبات */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            نظرة عامة
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'alerts' && styles.activeTab]}
          onPress={() => setSelectedTab('alerts')}
        >
          <Text style={[styles.tabText, selectedTab === 'alerts' && styles.activeTabText]}>
            التنبيهات
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'analytics' && styles.activeTab]}
          onPress={() => setSelectedTab('analytics')}
        >
          <Text style={[styles.tabText, selectedTab === 'analytics' && styles.activeTabText]}>
            التحليلات
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'threats' && styles.activeTab]}
          onPress={() => setSelectedTab('threats')}
        >
          <Text style={[styles.tabText, selectedTab === 'threats' && styles.activeTabText]}>
            التهديدات
          </Text>
        </TouchableOpacity>
      </View>

      {/* محتوى التبويبات */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'alerts' && renderAlertsTab()}
        {selectedTab === 'analytics' && renderAnalyticsTab()}
        {selectedTab === 'threats' && renderThreatsTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    padding: 20,
    paddingTop: 40
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    opacity: 0.8
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  headerText: {
    marginLeft: 12
  },
  headerDescription: {
    fontSize: 12,
    color: '#e2e8f0',
    opacity: 0.7,
    textAlign: 'center'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b'
  },
  activeTabText: {
    color: '#3b82f6'
  },
  content: {
    flex: 1
  },
  tabContent: {
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 12,
    overflow: 'hidden'
  },
  statGradient: {
    padding: 16,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 4
  },
  statDescription: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.7,
    textAlign: 'center'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  resolvedAlert: {
    opacity: 0.6
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1
  },
  alertTime: {
    fontSize: 12,
    color: '#64748b'
  },
  alertDescription: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 18
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  alertRisk: {
    fontSize: 12,
    color: '#64748b'
  },
  alertStatus: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 4
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  acknowledgeButton: {
    backgroundColor: '#3b82f6'
  },
  resolveButton: {
    backgroundColor: '#10b981'
  },
  falsePositiveButton: {
    backgroundColor: '#6b7280'
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff'
  },
  modelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1
  },
  modelVersion: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  modelMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metric: {
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  alertsCount: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500'
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  analyticsCard: {
    width: (width - 44) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center'
  },
  anomalyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  anomalyRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  anomalyInfo: {
    flex: 1,
    marginRight: 12
  },
  anomalyType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2
  },
  anomalyCount: {
    fontSize: 12,
    color: '#64748b'
  },
  anomalyBar: {
    width: 60,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden'
  },
  anomalyBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6'
  },
  performanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  performanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1
  },
  performanceStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b'
  },
  performanceMetrics: {
    gap: 12
  },
  performanceMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  performanceLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 60
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    width: 50,
    textAlign: 'right'
  },
  modelInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  modelInfoText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4
  },
  threatStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  threatStatCard: {
    width: (width - 44) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  threatStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4
  },
  threatStatLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center'
  },
  recentThreatsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  noDataText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center'
  },
  threatSourcesContainer: {
    gap: 12
  },
  threatSource: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  sourceInfo: {
    flex: 1
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2
  },
  sourceStatus: {
    fontSize: 12,
    color: '#059669'
  },
  sourceMetrics: {
    alignItems: 'center'
  },
  sourceCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  sourceLabel: {
    fontSize: 12,
    color: '#64748b'
  }
});

export default UEBADashboard;