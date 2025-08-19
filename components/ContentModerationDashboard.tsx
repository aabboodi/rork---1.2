import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Ban, 
  Flag, 
  TrendingUp,
  Search,
  Filter,
  Download,
  Settings,
  Users,
  MessageSquare,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import ContentModerationService, { ContentAnalysisResult, MessageContext } from '@/services/security/ContentModerationService';
import ForensicsService, { ForensicEvent } from '@/services/security/ForensicsService';

interface ViolationStats {
  totalViolations: number;
  violationsByType: Record<string, number>;
  recentViolations: number;
}

const ContentModerationDashboard: React.FC = () => {
  const [stats, setStats] = useState<ViolationStats>({
    totalViolations: 0,
    violationsByType: {},
    recentViolations: 0
  });
  const [violations, setViolations] = useState<any[]>([]);
  const [forensicEvents, setForensicEvents] = useState<ForensicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testContent, setTestContent] = useState('');
  const [testResult, setTestResult] = useState<ContentAnalysisResult | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    dateRange: '24h'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load violation stats
      const violationStats = await ContentModerationService.getViolationStats();
      setStats(violationStats);
      
      // Load violation history
      const violationHistory = await ContentModerationService.getViolationHistory();
      setViolations(violationHistory.slice(0, 50)); // Show last 50
      
      // Load forensic events
      const events = await ForensicsService.getForensicEvents({
        eventType: 'message_violation'
      });
      setForensicEvents(events.slice(0, 50));
      
    } catch (error) {
      console.error('Failed to load moderation data:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات المراقبة');
    } finally {
      setLoading(false);
    }
  };

  const handleTestContentSubmit = async () => {
    if (!testContent.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال محتوى للاختبار');
      return;
    }

    try {
      const context: MessageContext = {
        senderId: 'test_user',
        recipientId: 'test_recipient',
        timestamp: Date.now(),
        messageType: 'text',
        senderReputation: 0.5
      };

      const result = await ContentModerationService.analyzeContent(testContent, context);
      setTestResult(result);
    } catch (error) {
      console.error('Content test failed:', error);
      Alert.alert('خطأ', 'فشل في اختبار المحتوى');
    }
  };

  const clearViolationHistory = () => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف جميع سجلات الانتهاكات؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await ContentModerationService.clearViolationHistory();
              await loadData();
              Alert.alert('تم', 'تم حذف سجلات الانتهاكات');
            } catch (error) {
              Alert.alert('خطأ', 'فشل في حذف السجلات');
            }
          }
        }
      ]
    );
  };

  const getViolationTypeColor = (type: string) => {
    const colors = {
      violence: '#FF4444',
      fraud: '#FF8800',
      harassment: '#FF6B6B',
      spam: '#FFA500',
      hate_speech: '#DC143C',
      adult_content: '#8B0000'
    };
    return colors[type as keyof typeof colors] || '#666';
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'block': return <Ban size={16} color="#FF4444" />;
      case 'warn': return <AlertTriangle size={16} color="#FF8800" />;
      case 'flag': return <Flag size={16} color="#FFA500" />;
      default: return <CheckCircle size={16} color="#4CAF50" />;
    }
  };

  const renderViolationItem = ({ item }: { item: any }) => (
    <View style={styles.violationItem}>
      <View style={styles.violationHeader}>
        <View style={styles.violationInfo}>
          <Text style={styles.violationType}>
            {item.violationType === 'violence' && 'عنف'}
            {item.violationType === 'fraud' && 'احتيال'}
            {item.violationType === 'harassment' && 'تحرش'}
            {item.violationType === 'spam' && 'سبام'}
            {item.violationType === 'hate_speech' && 'خطاب كراهية'}
            {item.violationType === 'adult_content' && 'محتوى للبالغين'}
          </Text>
          <View style={styles.violationMeta}>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleString('ar')}
            </Text>
            <View style={[styles.confidenceBadge, { backgroundColor: item.confidence > 0.7 ? '#FF4444' : item.confidence > 0.4 ? '#FF8800' : '#4CAF50' }]}>
              <Text style={styles.confidenceText}>
                {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          </View>
        </View>
        {getActionIcon(item.suggestedAction)}
      </View>
      
      <Text style={styles.violationContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      {item.detectedPatterns.length > 0 && (
        <View style={styles.patternsContainer}>
          <Text style={styles.patternsLabel}>الأنماط المكتشفة:</Text>
          <View style={styles.patternsList}>
            {item.detectedPatterns.slice(0, 3).map((pattern: string, index: number) => (
              <View key={index} style={styles.patternTag}>
                <Text style={styles.patternText}>{pattern}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderForensicEvent = ({ item }: { item: ForensicEvent }) => (
    <View style={styles.forensicItem}>
      <View style={styles.forensicHeader}>
        <View style={styles.forensicInfo}>
          <Text style={styles.forensicType}>{item.eventType}</Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
            <Text style={styles.severityText}>{item.severity}</Text>
          </View>
        </View>
        <Text style={styles.forensicTime}>
          {new Date(item.timestamp).toLocaleString('ar')}
        </Text>
      </View>
      
      <Text style={styles.forensicDescription}>{item.description}</Text>
      
      <View style={styles.forensicFooter}>
        <Text style={styles.forensicUser}>المستخدم: {item.userId}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'resolved' ? '#4CAF50' : 
                          item.status === 'investigating' ? '#FF9800' : '#666'
        }]}>
          <Text style={styles.statusText}>{item.status}</Text>
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
            <Shield size={24} color="#2196F3" />
            <Text style={styles.headerTitle}>مراقبة المحتوى</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setTestModalVisible(true)}
            >
              <Search size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <Filter size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={clearViolationHistory}
            >
              <Settings size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <AlertTriangle size={24} color="#FF4444" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.totalViolations}</Text>
              <Text style={styles.statLabel}>إجمالي الانتهاكات</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Clock size={24} color="#FF8800" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.recentViolations}</Text>
              <Text style={styles.statLabel}>انتهاكات حديثة</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <BarChart3 size={24} color="#4CAF50" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>
                {Object.keys(stats.violationsByType).length}
              </Text>
              <Text style={styles.statLabel}>أنواع الانتهاكات</Text>
            </View>
          </View>
        </View>

        {/* Violation Types Chart */}
        {Object.keys(stats.violationsByType).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>توزيع الانتهاكات حسب النوع</Text>
            <View style={styles.chartContent}>
              {Object.entries(stats.violationsByType).map(([type, count]) => (
                <View key={type} style={styles.chartItem}>
                  <View style={styles.chartBar}>
                    <View 
                      style={[
                        styles.chartFill, 
                        { 
                          backgroundColor: getViolationTypeColor(type),
                          width: `${(count / Math.max(...Object.values(stats.violationsByType))) * 100}%`
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.chartLabel}>
                    <Text style={styles.chartType}>
                      {type === 'violence' && 'عنف'}
                      {type === 'fraud' && 'احتيال'}
                      {type === 'harassment' && 'تحرش'}
                      {type === 'spam' && 'سبام'}
                      {type === 'hate_speech' && 'خطاب كراهية'}
                      {type === 'adult_content' && 'محتوى للبالغين'}
                    </Text>
                    <Text style={styles.chartCount}>{count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Violations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الانتهاكات الأخيرة</Text>
            <TouchableOpacity onPress={loadData}>
              <Text style={styles.refreshButton}>تحديث</Text>
            </TouchableOpacity>
          </View>
          
          {violations.length > 0 ? (
            <FlatList
              data={violations}
              renderItem={renderViolationItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#4CAF50" />
              <Text style={styles.emptyText}>لا توجد انتهاكات حديثة</Text>
            </View>
          )}
        </View>

        {/* Forensic Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الأحداث الجنائية</Text>
          
          {forensicEvents.length > 0 ? (
            <FlatList
              data={forensicEvents}
              renderItem={renderForensicEvent}
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
      </ScrollView>

      {/* Test Content Modal */}
      <Modal
        visible={testModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>اختبار المحتوى</Text>
            <TouchableOpacity onPress={() => setTestModalVisible(false)}>
              <XCircle size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>أدخل المحتوى للاختبار:</Text>
            <TextInput
              style={styles.testInput}
              value={testContent}
              onChangeText={setTestContent}
              placeholder="اكتب النص هنا..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.testButton} onPress={handleTestContentSubmit}>
              <Text style={styles.testButtonText}>اختبار المحتوى</Text>
            </TouchableOpacity>

            {testResult && (
              <View style={styles.testResult}>
                <Text style={styles.resultTitle}>نتيجة التحليل:</Text>
                
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>انتهاك:</Text>
                  <Text style={[styles.resultValue, { color: testResult.isViolation ? '#FF4444' : '#4CAF50' }]}>
                    {testResult.isViolation ? 'نعم' : 'لا'}
                  </Text>
                </View>

                {testResult.isViolation && (
                  <>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>النوع:</Text>
                      <Text style={styles.resultValue}>{testResult.violationType}</Text>
                    </View>

                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>الثقة:</Text>
                      <Text style={styles.resultValue}>
                        {Math.round(testResult.confidence * 100)}%
                      </Text>
                    </View>

                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>الإجراء المقترح:</Text>
                      <Text style={styles.resultValue}>{testResult.suggestedAction}</Text>
                    </View>

                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>التفسير:</Text>
                      <Text style={styles.resultValue}>{testResult.explanation}</Text>
                    </View>
                  </>
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
  chartContainer: {
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
  chartContent: {
    marginTop: 16
  },
  chartItem: {
    marginBottom: 12
  },
  chartBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  chartFill: {
    height: '100%',
    borderRadius: 4
  },
  chartLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  chartType: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'System'
  },
  chartCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'System'
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
  refreshButton: {
    fontSize: 14,
    color: '#2196F3',
    fontFamily: 'System'
  },
  violationItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444'
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  violationInfo: {
    flex: 1
  },
  violationType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    fontFamily: 'System'
  },
  violationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System'
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  confidenceText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System'
  },
  violationContent: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'System'
  },
  patternsContainer: {
    marginTop: 8
  },
  patternsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'System'
  },
  patternsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4
  },
  patternTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  patternText: {
    fontSize: 10,
    color: '#1976D2',
    fontFamily: 'System'
  },
  forensicItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8800'
  },
  forensicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  forensicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  forensicType: {
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
  forensicTime: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System'
  },
  forensicDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'System'
  },
  forensicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  forensicUser: {
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
  testInput: {
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
  testButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System'
  },
  testResult: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    fontFamily: 'System'
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System'
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    fontFamily: 'System'
  }
});

export default ContentModerationDashboard;