import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { 
  Shield, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  TrendingUp,
  Users,
  Clock,
  Eye,
  Ban,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import SocialEngineeringProtectionService, { SuspiciousActivity } from '@/services/security/SocialEngineeringProtectionService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

interface SocialEngineeringDashboardProps {
  onClose?: () => void;
}

const SocialEngineeringDashboard: React.FC<SocialEngineeringDashboardProps> = ({ onClose }) => {
  const [activities, setActivities] = useState<SuspiciousActivity[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalThreats: 0,
    blockedToday: 0,
    riskLevel: 'low' as 'low' | 'medium' | 'high',
    protectionRate: 95
  });

  const protectionService = SocialEngineeringProtectionService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [activitiesData, domainsData] = await Promise.all([
        protectionService.getSuspiciousActivities(),
        Promise.resolve(protectionService.getBlockedDomains())
      ]);

      setActivities(activitiesData);
      setBlockedDomains(domainsData);
      calculateStats(activitiesData);
    } catch (error) {
      console.error('Failed to load social engineering data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (activitiesData: SuspiciousActivity[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayActivities = activitiesData.filter(
      activity => activity.timestamp >= today.getTime()
    );

    const highRiskCount = activitiesData.filter(
      activity => activity.riskLevel === 'critical' || activity.riskLevel === 'high'
    ).length;

    setStats({
      totalThreats: activitiesData.length,
      blockedToday: todayActivities.length,
      riskLevel: highRiskCount > 5 ? 'high' : highRiskCount > 2 ? 'medium' : 'low',
      protectionRate: Math.max(85, 100 - (highRiskCount * 2))
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return <AlertTriangle size={16} color={getRiskColor(riskLevel)} />;
      case 'medium':
        return <Shield size={16} color={getRiskColor(riskLevel)} />;
      case 'low':
        return <CheckCircle size={16} color={getRiskColor(riskLevel)} />;
      default:
        return <Shield size={16} color={getRiskColor(riskLevel)} />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'link':
        return <ExternalLink size={20} color="#3b82f6" />;
      case 'file':
        return <FileText size={20} color="#8b5cf6" />;
      case 'message':
        return <Users size={20} color="#10b981" />;
      default:
        return <AlertTriangle size={20} color="#f59e0b" />;
    }
  };

  const handleBlockDomain = async (domain: string) => {
    try {
      await protectionService.blockDomain(domain);
      setBlockedDomains([...blockedDomains, domain]);
      Alert.alert('تم الحظر', `تم حظر النطاق ${domain} بنجاح`);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حظر النطاق');
    }
  };

  const handleUnblockDomain = async (domain: string) => {
    try {
      await protectionService.unblockDomain(domain);
      setBlockedDomains(blockedDomains.filter(d => d !== domain));
      Alert.alert('تم إلغاء الحظر', `تم إلغاء حظر النطاق ${domain}`);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إلغاء حظر النطاق');
    }
  };

  const showSecurityTips = () => {
    const tips = protectionService.getSecurityTips();
    Alert.alert(
      'نصائح الأمان',
      tips.join('\n\n'),
      [{ text: 'حسناً' }]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield size={24} color="#3b82f6" />
          <Text style={styles.title}>حماية الهندسة الاجتماعية</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XCircle size={24} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <AlertTriangle size={20} color="#dc2626" />
            <Text style={styles.statTitle}>التهديدات المكتشفة</Text>
          </View>
          <Text style={styles.statValue}>{stats.totalThreats}</Text>
          <Text style={styles.statSubtext}>إجمالي</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ban size={20} color="#ea580c" />
            <Text style={styles.statTitle}>محظور اليوم</Text>
          </View>
          <Text style={styles.statValue}>{stats.blockedToday}</Text>
          <Text style={styles.statSubtext}>آخر 24 ساعة</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <TrendingUp size={20} color="#16a34a" />
            <Text style={styles.statTitle}>معدل الحماية</Text>
          </View>
          <Text style={styles.statValue}>{stats.protectionRate}%</Text>
          <Text style={styles.statSubtext}>فعالية</Text>
        </View>
      </View>

      {/* Risk Level Indicator */}
      <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(stats.riskLevel) + '20' }]}>
        {getRiskIcon(stats.riskLevel)}
        <Text style={[styles.riskText, { color: getRiskColor(stats.riskLevel) }]}>
          مستوى الخطر: {stats.riskLevel === 'high' ? 'عالي' : stats.riskLevel === 'medium' ? 'متوسط' : 'منخفض'}
        </Text>
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الأنشطة المشبوهة الأخيرة</Text>
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={48} color="#16a34a" />
            <Text style={styles.emptyStateText}>لا توجد أنشطة مشبوهة</Text>
            <Text style={styles.emptyStateSubtext}>نظامك محمي بشكل جيد</Text>
          </View>
        ) : (
          activities.slice(0, 10).map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View style={styles.activityLeft}>
                  {getActivityIcon(activity.type)}
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityType}>
                      {activity.type === 'link' ? 'رابط مشبوه' : 
                       activity.type === 'file' ? 'ملف مشبوه' : 
                       activity.type === 'message' ? 'رسالة مشبوهة' : 'نشاط مشبوه'}
                    </Text>
                    <Text style={styles.activitySender}>من: {activity.sender.name}</Text>
                  </View>
                </View>
                <View style={styles.activityRight}>
                  {getRiskIcon(activity.riskLevel)}
                  <Text style={styles.activityTime}>
                    {formatRelativeTime(activity.timestamp)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.activityContent} numberOfLines={2}>
                {activity.content}
              </Text>
              
              {activity.detectedPatterns.length > 0 && (
                <View style={styles.patternsContainer}>
                  <Text style={styles.patternsTitle}>الأنماط المكتشفة:</Text>
                  {activity.detectedPatterns.slice(0, 2).map((pattern, index) => (
                    <Text key={index} style={styles.patternText}>• {pattern}</Text>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Blocked Domains */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>النطاقات المحظورة</Text>
        {blockedDomains.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد نطاقات محظورة</Text>
        ) : (
          blockedDomains.map((domain, index) => (
            <View key={index} style={styles.domainCard}>
              <View style={styles.domainInfo}>
                <Ban size={16} color="#dc2626" />
                <Text style={styles.domainText}>{domain}</Text>
              </View>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblockDomain(domain)}
              >
                <Text style={styles.unblockButtonText}>إلغاء الحظر</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Security Tips */}
      <TouchableOpacity style={styles.tipsButton} onPress={showSecurityTips}>
        <Eye size={20} color="#3b82f6" />
        <Text style={styles.tipsButtonText}>عرض نصائح الأمان</Text>
      </TouchableOpacity>

      {/* Educational Content */}
      <View style={styles.educationalSection}>
        <Text style={styles.educationalTitle}>ما هي الهندسة الاجتماعية؟</Text>
        <Text style={styles.educationalText}>
          الهندسة الاجتماعية هي تقنيات يستخدمها المهاجمون لخداع الأشخاص والحصول على معلومات حساسة أو الوصول إلى أنظمتهم. تشمل هذه التقنيات:
        </Text>
        <Text style={styles.educationalPoint}>• رسائل التصيد الاحتيالي</Text>
        <Text style={styles.educationalPoint}>• الروابط المشبوهة</Text>
        <Text style={styles.educationalPoint}>• الملفات الضارة</Text>
        <Text style={styles.educationalPoint}>• انتحال الهوية</Text>
        <Text style={styles.educationalPoint}>• الضغط النفسي والاستعجال</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: '#9ca3af',
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  activityCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  activitySender: {
    fontSize: 12,
    color: '#6b7280',
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  activityContent: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 18,
  },
  patternsContainer: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  patternsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  patternText: {
    fontSize: 11,
    color: '#991b1b',
    marginBottom: 2,
  },
  domainCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  domainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  domainText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  unblockButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unblockButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dbeafe',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  tipsButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
  },
  educationalSection: {
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  educationalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  educationalText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    marginBottom: 12,
  },
  educationalPoint: {
    fontSize: 13,
    color: '#1e40af',
    marginBottom: 4,
    paddingLeft: 8,
  },
});

export default SocialEngineeringDashboard;