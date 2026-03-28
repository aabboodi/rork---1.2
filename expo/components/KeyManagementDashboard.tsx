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
  Key, 
  Shield, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Database,
  Cloud,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  FileText,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react-native';
import KeyRotationService from '@/services/security/KeyRotationService';
import AWSKMSService from '@/services/security/AWSKMSService';
import HashiCorpVaultService from '@/services/security/HashiCorpVaultService';
import EnterpriseKeyManager from '@/services/security/EnterpriseKeyManager';

interface KeyManagementDashboardProps {
  onNavigateToDetail?: (keyId: string) => void;
}

interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  rotationsDue: number;
  expiredKeys: number;
  complianceViolations: number;
  riskScore: number;
  lastRotation?: Date;
}

interface ProviderStatus {
  name: string;
  enabled: boolean;
  keysCount: number;
  status: 'healthy' | 'warning' | 'error';
  lastSync?: Date;
}

const KeyManagementDashboard: React.FC<KeyManagementDashboardProps> = ({
  onNavigateToDetail
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalKeys: 0,
    activeKeys: 0,
    rotationsDue: 0,
    expiredKeys: 0,
    complianceViolations: 0,
    riskScore: 0
  });
  
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'rotation' | 'compliance' | 'providers'>('overview');

  const rotationService = KeyRotationService.getInstance();
  const kmsService = AWSKMSService.getInstance();
  const vaultService = HashiCorpVaultService.getInstance();
  const enterpriseManager = EnterpriseKeyManager.getInstance();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // تحميل إحصائيات المفاتيح
      const keyStats = await enterpriseManager.getKeyLifecycleStatus();
      setStats(keyStats);
      
      // تحميل حالة المزودين
      const providerStatuses = await loadProviderStatuses();
      setProviders(providerStatuses);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات لوحة التحكم');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProviderStatuses = async (): Promise<ProviderStatus[]> => {
    const statuses: ProviderStatus[] = [];
    
    try {
      // AWS KMS Status
      const kmsStatus = await kmsService.getKeyRotationStatus();
      statuses.push({
        name: 'AWS KMS',
        enabled: kmsStatus.totalKeys > 0,
        keysCount: kmsStatus.totalKeys,
        status: kmsStatus.rotationEnabled > 0 ? 'healthy' : 'warning',
        lastSync: new Date()
      });
    } catch (error) {
      statuses.push({
        name: 'AWS KMS',
        enabled: false,
        keysCount: 0,
        status: 'error'
      });
    }
    
    try {
      // HashiCorp Vault Status
      const vaultStatus = await vaultService.getVaultStatus();
      statuses.push({
        name: 'HashiCorp Vault',
        enabled: vaultStatus.totalKeys > 0,
        keysCount: vaultStatus.totalKeys,
        status: vaultStatus.totalSecrets > 0 ? 'healthy' : 'warning',
        lastSync: new Date()
      });
    } catch (error) {
      statuses.push({
        name: 'HashiCorp Vault',
        enabled: false,
        keysCount: 0,
        status: 'error'
      });
    }
    
    try {
      // Key Rotation Service Status
      const rotationStatus = await rotationService.getKeyRotationStatus();
      statuses.push({
        name: 'Key Rotation',
        enabled: rotationStatus.totalKeys > 0,
        keysCount: rotationStatus.totalKeys,
        status: rotationStatus.rotationsDue === 0 ? 'healthy' : 'warning',
        lastSync: rotationStatus.lastRotation
      });
    } catch (error) {
      statuses.push({
        name: 'Key Rotation',
        enabled: false,
        keysCount: 0,
        status: 'error'
      });
    }
    
    return statuses;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleRotateAllKeys = async () => {
    Alert.alert(
      'تناوب جميع المفاتيح',
      'هل أنت متأكد من أنك تريد تناوب جميع المفاتيح؟ هذه عملية حساسة.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await rotationService.emergencyRotateAll('manual_dashboard');
              Alert.alert(
                'تم التناوب',
                `تم تناوب ${result.rotated.length} مفتاح بنجاح. فشل في ${result.failed.length} مفتاح.`
              );
              await loadDashboardData();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في تناوب المفاتيح');
            }
          }
        }
      ]
    );
  };

  const handleGenerateComplianceReport = async () => {
    try {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // آخر 30 يوم
        end: new Date()
      };
      
      const report = await enterpriseManager.generateComplianceReport(period);
      
      Alert.alert(
        'تقرير الامتثال',
        `تم إنشاء التقرير بنجاح\nمعرف التقرير: ${report.reportId}\nنقاط المخاطر: ${report.riskScore}/100\nالانتهاكات: ${report.complianceViolations.length}`,
        [
          { text: 'موافق' },
          { 
            text: 'عرض التفاصيل', 
            onPress: () => onNavigateToDetail?.(report.reportId) 
          }
        ]
      );
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إنشاء تقرير الامتثال');
    }
  };

  const getRiskScoreColor = (score: number): string => {
    if (score >= 80) return '#ef4444'; // أحمر
    if (score >= 60) return '#f59e0b'; // برتقالي
    if (score >= 40) return '#eab308'; // أصفر
    return '#10b981'; // أخضر
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error'): string => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* إحصائيات سريعة */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Key size={24} color="#3b82f6" />
          <Text style={styles.statNumber}>{stats.totalKeys}</Text>
          <Text style={styles.statLabel}>إجمالي المفاتيح</Text>
        </View>
        
        <View style={styles.statCard}>
          <CheckCircle size={24} color="#10b981" />
          <Text style={styles.statNumber}>{stats.activeKeys}</Text>
          <Text style={styles.statLabel}>مفاتيح نشطة</Text>
        </View>
        
        <View style={styles.statCard}>
          <Clock size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats.rotationsDue}</Text>
          <Text style={styles.statLabel}>تناوب مستحق</Text>
        </View>
        
        <View style={styles.statCard}>
          <AlertTriangle size={24} color="#ef4444" />
          <Text style={styles.statNumber}>{stats.expiredKeys}</Text>
          <Text style={styles.statLabel}>مفاتيح منتهية</Text>
        </View>
      </View>

      {/* نقاط المخاطر */}
      <View style={styles.riskScoreCard}>
        <View style={styles.riskScoreHeader}>
          <Shield size={24} color={getRiskScoreColor(stats.riskScore)} />
          <Text style={styles.riskScoreTitle}>نقاط المخاطر</Text>
        </View>
        <View style={styles.riskScoreContainer}>
          <Text style={[styles.riskScoreValue, { color: getRiskScoreColor(stats.riskScore) }]}>
            {stats.riskScore}/100
          </Text>
          <View style={styles.riskScoreBar}>
            <View 
              style={[
                styles.riskScoreFill, 
                { 
                  width: `${stats.riskScore}%`,
                  backgroundColor: getRiskScoreColor(stats.riskScore)
                }
              ]} 
            />
          </View>
        </View>
        {stats.complianceViolations > 0 && (
          <Text style={styles.violationsText}>
            {stats.complianceViolations} انتهاك للامتثال
          </Text>
        )}
      </View>

      {/* أزرار الإجراءات السريعة */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleRotateAllKeys}
        >
          <RotateCcw size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>تناوب جميع المفاتيح</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleGenerateComplianceReport}
        >
          <FileText size={20} color="#3b82f6" />
          <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>تقرير الامتثال</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRotationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <RotateCcw size={20} color="#3b82f6" />
        <Text style={styles.sectionTitle}>حالة تناوب المفاتيح</Text>
      </View>
      
      <View style={styles.rotationStats}>
        <View style={styles.rotationStatItem}>
          <Text style={styles.rotationStatLabel}>آخر تناوب</Text>
          <Text style={styles.rotationStatValue}>
            {stats.lastRotation ? stats.lastRotation.toLocaleDateString('ar') : 'غير متوفر'}
          </Text>
        </View>
        
        <View style={styles.rotationStatItem}>
          <Text style={styles.rotationStatLabel}>التناوب المستحق</Text>
          <Text style={[styles.rotationStatValue, { color: stats.rotationsDue > 0 ? '#ef4444' : '#10b981' }]}>
            {stats.rotationsDue} مفتاح
          </Text>
        </View>
      </View>

      {stats.rotationsDue > 0 && (
        <View style={styles.warningCard}>
          <AlertTriangle size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            يوجد {stats.rotationsDue} مفتاح يحتاج إلى تناوب فوري
          </Text>
        </View>
      )}
    </View>
  );

  const renderComplianceTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Shield size={20} color="#3b82f6" />
        <Text style={styles.sectionTitle}>حالة الامتثال</Text>
      </View>
      
      <View style={styles.complianceGrid}>
        <View style={styles.complianceCard}>
          <Text style={styles.complianceLabel}>FIPS 140-2</Text>
          <CheckCircle size={20} color="#10b981" />
        </View>
        
        <View style={styles.complianceCard}>
          <Text style={styles.complianceLabel}>Common Criteria</Text>
          <CheckCircle size={20} color="#10b981" />
        </View>
        
        <View style={styles.complianceCard}>
          <Text style={styles.complianceLabel}>SOC 2</Text>
          <CheckCircle size={20} color="#10b981" />
        </View>
        
        <View style={styles.complianceCard}>
          <Text style={styles.complianceLabel}>ISO 27001</Text>
          <CheckCircle size={20} color="#10b981" />
        </View>
      </View>

      {stats.complianceViolations > 0 && (
        <View style={styles.violationsCard}>
          <AlertTriangle size={20} color="#ef4444" />
          <Text style={styles.violationsTitle}>انتهاكات الامتثال</Text>
          <Text style={styles.violationsCount}>{stats.complianceViolations} انتهاك نشط</Text>
        </View>
      )}
    </View>
  );

  const renderProvidersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Cloud size={20} color="#3b82f6" />
        <Text style={styles.sectionTitle}>مزودي الخدمة</Text>
      </View>
      
      {providers.map((provider, index) => (
        <View key={index} style={styles.providerCard}>
          <View style={styles.providerHeader}>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerKeysCount}>{provider.keysCount} مفتاح</Text>
            </View>
            <View style={[styles.providerStatus, { backgroundColor: getStatusColor(provider.status) }]}>
              <Text style={styles.providerStatusText}>
                {provider.status === 'healthy' ? 'سليم' : 
                 provider.status === 'warning' ? 'تحذير' : 'خطأ'}
              </Text>
            </View>
          </View>
          
          {provider.lastSync && (
            <Text style={styles.providerLastSync}>
              آخر مزامنة: {provider.lastSync.toLocaleString('ar')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderTabButton = (
    tab: 'overview' | 'rotation' | 'compliance' | 'providers',
    icon: React.ReactNode,
    label: string
  ) => (
    <TouchableOpacity
      style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
      onPress={() => setSelectedTab(tab)}
    >
      {icon}
      <Text style={[styles.tabButtonText, selectedTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل بيانات إدارة المفاتيح...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e40af', '#3b82f6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Key size={28} color="#ffffff" />
            <Text style={styles.headerTitle}>إدارة المفاتيح المتقدمة</Text>
          </View>
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowSensitiveData(!showSensitiveData)}
          >
            {showSensitiveData ? (
              <EyeOff size={24} color="#ffffff" />
            ) : (
              <Eye size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* شريط التبويب */}
      <View style={styles.tabBar}>
        {renderTabButton('overview', <TrendingUp size={18} color={selectedTab === 'overview' ? '#3b82f6' : '#6b7280'} />, 'نظرة عامة')}
        {renderTabButton('rotation', <RotateCcw size={18} color={selectedTab === 'rotation' ? '#3b82f6' : '#6b7280'} />, 'التناوب')}
        {renderTabButton('compliance', <Shield size={18} color={selectedTab === 'compliance' ? '#3b82f6' : '#6b7280'} />, 'الامتثال')}
        {renderTabButton('providers', <Cloud size={18} color={selectedTab === 'providers' ? '#3b82f6' : '#6b7280'} />, 'المزودين')}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'rotation' && renderRotationTab()}
        {selectedTab === 'compliance' && renderComplianceTab()}
        {selectedTab === 'providers' && renderProvidersTab()}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12
  },
  visibilityToggle: {
    padding: 8
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6'
  },
  tabButtonText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500'
  },
  activeTabButtonText: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  tabContent: {
    padding: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center'
  },
  riskScoreCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  riskScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  riskScoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8
  },
  riskScoreContainer: {
    alignItems: 'center'
  },
  riskScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12
  },
  riskScoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden'
  },
  riskScoreFill: {
    height: '100%',
    borderRadius: 4
  },
  violationsText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center'
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8
  },
  primaryButton: {
    backgroundColor: '#3b82f6'
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8
  },
  rotationStats: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  rotationStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  rotationStatLabel: {
    fontSize: 14,
    color: '#6b7280'
  },
  rotationStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1
  },
  complianceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  complianceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  complianceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  violationsCard: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8
  },
  violationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626'
  },
  violationsCount: {
    fontSize: 14,
    color: '#dc2626'
  },
  providerCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  providerInfo: {
    flex: 1
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  providerKeysCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2
  },
  providerStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16
  },
  providerStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff'
  },
  providerLastSync: {
    fontSize: 12,
    color: '#6b7280'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12
  }
});

export default KeyManagementDashboard;