import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Search, 
  FileText, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Clock,
  Shield,
  Download,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  Target,
  Zap
} from 'lucide-react-native';
import ForensicsService, { ForensicEvent, ForensicReport } from '@/services/security/ForensicsService';

interface ForensicSummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; eventCount: number; riskScore: number }>;
  threatTrends: Array<{ pattern: string; detections: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
  recommendations: string[];
}

const ForensicsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<ForensicSummary>({
    totalEvents: 0,
    eventsByType: {},
    eventsBySeverity: {},
    topUsers: [],
    threatTrends: [],
    recommendations: []
  });
  const [events, setEvents] = useState<ForensicEvent[]>([]);
  const [reports, setReports] = useState<ForensicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'events' | 'reports' | 'analysis'>('events');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [userAnalysisModalVisible, setUserAnalysisModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userAnalysis, setUserAnalysis] = useState<any>(null);
  const [filters, setFilters] = useState({
    eventType: '',
    severity: '',
    status: '',
    timeframe: '24'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load forensic summary
      const forensicSummary = await ForensicsService.generateForensicSummary(24);
      setSummary(forensicSummary);
      
      // Load events
      const forensicEvents = await ForensicsService.getForensicEvents();
      setEvents(forensicEvents.slice(0, 100));
      
      // Load reports
      const forensicReports = await ForensicsService.getForensicReports();
      setReports(forensicReports);
      
    } catch (error) {
      console.error('Failed to load forensics data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات الجنائية');
    } finally {
      setLoading(false);
    }
  };

  const analyzeUser = async (userId: string) => {
    if (!userId.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال معرف المستخدم');
      return;
    }

    try {
      const analysis = await ForensicsService.analyzeUserBehavior(userId, 24);
      setUserAnalysis(analysis);
    } catch (error) {
      console.error('User analysis failed:', error);
      Alert.alert('خطأ', 'فشل في تحليل المستخدم');
    }
  };

  const exportData = async () => {
    try {
      const exportedData = await ForensicsService.exportForensicData('json');
      // In a real app, you would save this to a file or share it
      Alert.alert('تم التصدير', 'تم تصدير البيانات بنجاح');
      console.log('Exported data length:', exportedData.length);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('خطأ', 'فشل في تصدير البيانات');
    }
  };

  const clearOldData = () => {
    Alert.alert(
      'تأكيد الحذف',
      'هل تريد حذف البيانات الأقدم من 30 يوم؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await ForensicsService.clearForensicData(30);
              await loadData();
              Alert.alert('تم', 'تم حذف البيانات القديمة');
            } catch (error) {
              Alert.alert('خطأ', 'فشل في حذف البيانات');
            }
          }
        }
      ]
    );
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#FF5722',
      critical: '#F44336'
    };
    return colors[severity as keyof typeof colors] || '#666';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#FF9800',
      investigating: '#2196F3',
      resolved: '#4CAF50',
      dismissed: '#666'
    };
    return colors[status as keyof typeof colors] || '#666';
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return '#F44336';
    if (score >= 40) return '#FF9800';
    return '#4CAF50';
  };

  const renderEventItem = ({ item }: { item: ForensicEvent }) => (
    <View style={styles.eventItem}>
      <View style={styles.eventHeader}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventType}>{item.eventType}</Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
            <Text style={styles.severityText}>{item.severity}</Text>
          </View>
        </View>
        <Text style={styles.eventTime}>
          {new Date(item.timestamp).toLocaleString('ar')}
        </Text>
      </View>
      
      <Text style={styles.eventDescription}>{item.description}</Text>
      
      <View style={styles.eventFooter}>
        <Text style={styles.eventUser}>المستخدم: {item.userId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderReportItem = ({ item }: { item: ForensicReport }) => (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'completed' ? '#4CAF50' : 
                          item.status === 'draft' ? '#FF9800' : '#666'
        }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.reportDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.reportMeta}>
        <Text style={styles.reportDate}>
          تم الإنشاء: {new Date(item.createdAt).toLocaleDateString('ar')}
        </Text>
        <Text style={styles.reportEvents}>
          {item.events.length} حدث
        </Text>
      </View>

      {item.findings.length > 0 && (
        <View style={styles.findingsContainer}>
          <Text style={styles.findingsLabel}>النتائج الرئيسية:</Text>
          {item.findings.slice(0, 2).map((finding, index) => (
            <Text key={index} style={styles.findingText}>• {finding}</Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderUserAnalysis = ({ item }: { item: any }) => (
    <View style={styles.userAnalysisItem}>
      <View style={styles.userAnalysisHeader}>
        <Text style={styles.userId}>{item.userId}</Text>
        <View style={styles.riskScoreContainer}>
          <Text style={styles.riskScoreLabel}>درجة المخاطر</Text>
          <View style={[styles.riskScoreBadge, { backgroundColor: getRiskScoreColor(item.riskScore) }]}>
            <Text style={styles.riskScoreText}>{item.riskScore}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.userStats}>
        <View style={styles.userStat}>
          <Text style={styles.userStatValue}>{item.eventCount}</Text>
          <Text style={styles.userStatLabel}>أحداث</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Search size={24} color="#2196F3" />
            <Text style={styles.headerTitle}>التحليل الجنائي</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setUserAnalysisModalVisible(true)}
            >
              <Users size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={exportData}
            >
              <Download size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={clearOldData}
            >
              <FileText size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Activity size={24} color="#2196F3" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{summary.totalEvents}</Text>
              <Text style={styles.statLabel}>إجمالي الأحداث</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Target size={24} color="#FF5722" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{summary.topUsers.length}</Text>
              <Text style={styles.statLabel}>مستخدمين مشبوهين</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Zap size={24} color="#FF9800" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>
                {Object.values(summary.eventsBySeverity).reduce((a, b) => a + b, 0)}
              </Text>
              <Text style={styles.statLabel}>أحداث حرجة</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'events' && styles.activeTab]}
            onPress={() => setSelectedTab('events')}
          >
            <Text style={[styles.tabText, selectedTab === 'events' && styles.activeTabText]}>
              الأحداث
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'reports' && styles.activeTab]}
            onPress={() => setSelectedTab('reports')}
          >
            <Text style={[styles.tabText, selectedTab === 'reports' && styles.activeTabText]}>
              التقارير
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'analysis' && styles.activeTab]}
            onPress={() => setSelectedTab('analysis')}
          >
            <Text style={[styles.tabText, selectedTab === 'analysis' && styles.activeTabText]}>
              التحليل
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {selectedTab === 'events' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>الأحداث الجنائية</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
                <Filter size={20} color="#2196F3" />
              </TouchableOpacity>
            </View>
            
            {events.length > 0 ? (
              <FlatList
                data={events}
                renderItem={renderEventItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Shield size={48} color="#4CAF50" />
                <Text style={styles.emptyText}>لا توجد أحداث جنائية</Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'reports' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التقارير الجنائية</Text>
            
            {reports.length > 0 ? (
              <FlatList
                data={reports}
                renderItem={renderReportItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <FileText size={48} color="#4CAF50" />
                <Text style={styles.emptyText}>لا توجد تقارير جنائية</Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'analysis' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تحليل المستخدمين عالي المخاطر</Text>
            
            {summary.topUsers.length > 0 ? (
              <FlatList
                data={summary.topUsers}
                renderItem={renderUserAnalysis}
                keyExtractor={(item) => item.userId}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Users size={48} color="#4CAF50" />
                <Text style={styles.emptyText}>لا توجد مستخدمين عالي المخاطر</Text>
              </View>
            )}

            {/* Recommendations */}
            {summary.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>التوصيات</Text>
                {summary.recommendations.map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <AlertTriangle size={16} color="#FF9800" />
                    <Text style={styles.recommendationText}>{recommendation}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* User Analysis Modal */}
      <Modal
        visible={userAnalysisModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>تحليل المستخدم</Text>
            <TouchableOpacity onPress={() => setUserAnalysisModalVisible(false)}>
              <XCircle size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>معرف المستخدم:</Text>
            <TextInput
              style={styles.userInput}
              value={selectedUserId}
              onChangeText={setSelectedUserId}
              placeholder="أدخل معرف المستخدم"
            />

            <TouchableOpacity 
              style={styles.analyzeButton} 
              onPress={() => analyzeUser(selectedUserId)}
            >
              <Text style={styles.analyzeButtonText}>تحليل المستخدم</Text>
            </TouchableOpacity>

            {userAnalysis && (
              <View style={styles.analysisResult}>
                <Text style={styles.analysisTitle}>نتيجة التحليل:</Text>
                
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>درجة المخاطر:</Text>
                  <View style={[styles.riskScoreBadge, { backgroundColor: getRiskScoreColor(userAnalysis.riskScore) }]}>
                    <Text style={styles.riskScoreText}>{userAnalysis.riskScore}</Text>
                  </View>
                </View>

                {userAnalysis.suspiciousActivities.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>الأنشطة المشبوهة:</Text>
                    {userAnalysis.suspiciousActivities.map((activity: string, index: number) => (
                      <Text key={index} style={styles.activityText}>• {activity}</Text>
                    ))}
                  </View>
                )}

                {userAnalysis.recommendations.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>التوصيات:</Text>
                    {userAnalysis.recommendations.map((recommendation: string, index: number) => (
                      <Text key={index} style={styles.recommendationText}>• {recommendation}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  scrollView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'System'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'System'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF'
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center'
  },
  statInfo: {
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'System'
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8
  },
  activeTab: {
    backgroundColor: '#2196F3'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    fontFamily: 'System'
  },
  activeTabText: {
    color: '#FFFFFF'
  },
  section: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'System'
  },
  eventItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'System'
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  severityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System'
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System'
  },
  eventDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'System'
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  eventUser: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  tagText: {
    fontSize: 10,
    color: '#1976D2',
    fontFamily: 'System'
  },
  reportItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    fontFamily: 'System'
  },
  reportDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'System'
  },
  reportMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  reportDate: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System'
  },
  reportEvents: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System'
  },
  findingsContainer: {
    marginTop: 8
  },
  findingsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    fontFamily: 'System'
  },
  findingText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
    fontFamily: 'System'
  },
  userAnalysisItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  userAnalysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  userId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'System'
  },
  riskScoreContainer: {
    alignItems: 'center'
  },
  riskScoreLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'System'
  },
  riskScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  riskScoreText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System'
  },
  userStats: {
    flexDirection: 'row',
    gap: 16
  },
  userStat: {
    alignItems: 'center'
  },
  userStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'System'
  },
  userStatLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System'
  },
  recommendationsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'System'
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'System'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontFamily: 'System'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'System'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'System'
  },
  userInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    fontFamily: 'System'
  },
  analyzeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System'
  },
  analysisResult: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    fontFamily: 'System'
  },
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  analysisLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System'
  },
  analysisSection: {
    marginTop: 16
  },
  analysisSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'System'
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'System'
  }
});

export default ForensicsDashboard;