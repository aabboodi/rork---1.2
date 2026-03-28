import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Info, HelpCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import SecurityManager from '@/services/security/SecurityManager';
import SecurityExplainer from './SecurityExplainer';
import SecurityStatusIndicator from './SecurityStatusIndicator';
import SecurityOnboarding from './SecurityOnboarding';
import SecurityTipsCarousel from './SecurityTipsCarousel';
import SecurityNotificationBanner, { useSecurityNotifications } from './SecurityNotificationBanner';
import SecurityHealthWidget from './SecurityHealthWidget';

interface SecurityDashboardProps {
  onClose?: () => void;
}

export default function SecurityDashboard({ onClose }: SecurityDashboardProps) {
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [threatMonitoring, setThreatMonitoring] = useState<any>(null);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExplainer, setShowExplainer] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | undefined>();
  const {
    notification,
    dismissNotification,
    showSecuritySuccess,
    showSecurityInfo,
    showSecurityWarning
  } = useSecurityNotifications();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      const securityManager = SecurityManager.getInstance();

      const [status, threats, compliance] = await Promise.all([
        securityManager.getSecurityStatus(),
        securityManager.getThreatMonitoringResults(),
        securityManager.getComplianceStatus()
      ]);

      setSecurityStatus(status);
      setThreatMonitoring(threats);
      setComplianceStatus(compliance);
    } catch (error) {
      console.error('Failed to load security data:', error);
      Alert.alert('Error', 'Failed to load security dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const runBasicSecurityCheck = async () => {
    try {
      showSecurityInfo('جاري تشغيل الفحص الأمني الشامل...');
      
      const securityManager = SecurityManager.getInstance();
      const result = await securityManager.runSecurityAudit('basic_check');
      
      setTimeout(() => {
        if (result.score >= 80) {
          showSecuritySuccess(`تم الفحص بنجاح! درجة الأمان: ${result.score}/100 - مستوى ممتاز`);
        } else if (result.score >= 60) {
          showSecurityWarning(`تم الفحص. درجة الأمان: ${result.score}/100 - يمكن التحسين`, {
            text: 'عرض التوصيات',
            onPress: () => setShowExplainer(true)
          });
        } else {
          showSecurityWarning(`تحتاج لتحسين الأمان! درجة الأمان: ${result.score}/100`, {
            text: 'دليل التحسين',
            onPress: () => setShowOnboarding(true)
          });
        }
        loadSecurityData();
      }, 2000);
    } catch (error) {
      showSecurityWarning('فشل في تشغيل الفحص الأمني');
    }
  };
  
  const handleTipAction = (tipId: string) => {
    switch (tipId) {
      case 'strong_passwords':
        showSecurityInfo('انتقل إلى إعدادات الحساب لتحديث كلمة المرور');
        break;
      case 'two_factor_auth':
        showSecurityInfo('انتقل إلى إعدادات الأمان لتفعيل المصادقة الثنائية');
        break;
      case 'biometric_auth':
        showSecurityInfo('انتقل إلى إعدادات الجهاز لتفعيل البصمة');
        break;
      default:
        showSecurityInfo('ميزة قيد التطوير - ستكون متاحة قريباً');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure':
        return Colors.success || '#10B981';
      case 'warning':
        return Colors.warning || '#F59E0B';
      case 'critical':
        return Colors.error || '#EF4444';
      default:
        return Colors.medium || '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure':
        return <CheckCircle size={20} color={getStatusColor('secure')} />;
      case 'warning':
        return <AlertTriangle size={20} color={getStatusColor('warning')} />;
      case 'critical':
        return <XCircle size={20} color={getStatusColor('critical')} />;
      default:
        return <Activity size={20} color={getStatusColor('default')} />;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Shield size={24} color={Colors.primary} />
          <Text style={styles.title}>Security Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading security data...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Shield size={24} color={Colors.primary} />
        <Text style={styles.title}>لوحة الأمان</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowOnboarding(true)} 
            style={styles.helpButton}
          >
            <HelpCircle size={20} color={Colors.primary} />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XCircle size={24} color={Colors.medium} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Security Health Widget */}
      <SecurityHealthWidget 
        onPress={() => setShowExplainer(true)}
        showDetails={true}
      />
      
      {/* Welcome Message */}
      <View style={styles.welcomeSection}>
        <Info size={20} color={Colors.primary} />
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>
            مرحباً! نحن نحمي بياناتك بأحدث تقنيات الأمان
          </Text>
          <TouchableOpacity 
            onPress={() => setShowExplainer(true)}
            style={styles.learnMoreButton}
          >
            <Text style={styles.learnMoreText}>تعرف على المزيد</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* System Status Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>حالة النظام</Text>
          <TouchableOpacity 
            onPress={() => {
              setSelectedFeature('system_status');
              setShowExplainer(true);
            }}
            style={styles.infoButton}
          >
            <Info size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.statusCard}>
          <SecurityStatusIndicator
            status={threatMonitoring?.systemStatus === 'secure' ? 'secure' : 'warning'}
            feature="حالة النظام"
            description="النظام يعمل بشكل طبيعي ويراقب التهديدات باستمرار"
            size="large"
          />
          <Text style={styles.statusSubtext}>
            مستوى الحماية: {securityStatus?.implementationLevel === 'BASIC' ? 'أساسي' : 'متقدم'}
          </Text>
          <Text style={styles.statusSubtext}>
            آخر فحص أمني: {new Date(securityStatus?.lastSecurityCheck).toLocaleString('ar-SA')}
          </Text>
        </View>
      </View>

      {/* Security Metrics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>مقاييس الأمان</Text>
          <TouchableOpacity 
            onPress={() => {
              setSelectedFeature('metrics');
              setShowExplainer(true);
            }}
            style={styles.infoButton}
          >
            <Info size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Activity size={20} color={Colors.primary} />
              <Text style={styles.metricValue}>{threatMonitoring?.threatsDetected || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>الأحداث المسجلة</Text>
            <Text style={styles.metricDescription}>عدد الأنشطة التي تم رصدها</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <AlertTriangle size={20} color={getStatusColor('critical')} />
              <Text style={[styles.metricValue, { color: getStatusColor('critical') }]}>
                {threatMonitoring?.criticalThreats || 0}
              </Text>
            </View>
            <Text style={styles.metricLabel}>أحداث حرجة</Text>
            <Text style={styles.metricDescription}>تهديدات تحتاج انتباه فوري</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.metricValue}>{Math.round((complianceStatus?.complianceScore || 0) * 100)}%</Text>
            </View>
            <Text style={styles.metricLabel}>مستوى الامتثال</Text>
            <Text style={styles.metricDescription}>التزام بمعايير الأمان</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Shield size={20} color={Colors.primary} />
              <Text style={styles.metricValue}>{securityStatus?.monitoring?.recentSecurityEvents || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>أحداث حديثة</Text>
            <Text style={styles.metricDescription}>نشاط الـ 24 ساعة الماضية</Text>
          </View>
        </View>
      </View>

      {/* Security Features */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الميزات الأمنية</Text>
          <TouchableOpacity 
            onPress={() => {
              setSelectedFeature('features');
              setShowExplainer(true);
            }}
            style={styles.infoButton}
          >
            <Info size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.featuresList}>
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => {
              setSelectedFeature('e2ee');
              setShowExplainer(true);
            }}
          >
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>التشفير من طرف إلى طرف</Text>
              <Text style={styles.featureDescription}>حماية كاملة لرسائلك</Text>
            </View>
            <SecurityStatusIndicator
              status={securityStatus?.cryptography?.initialized ? 'secure' : 'critical'}
              feature="التشفير"
              description="رسائلك محمية بأقوى أنواع التشفير"
              showTooltip={false}
              size="small"
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => {
              setSelectedFeature('secure_storage');
              setShowExplainer(true);
            }}
          >
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>التخزين الآمن</Text>
              <Text style={styles.featureDescription}>بياناتك محفوظة بأمان</Text>
            </View>
            <SecurityStatusIndicator
              status="secure"
              feature="التخزين الآمن"
              description="جميع بياناتك مشفرة ومحمية"
              showTooltip={false}
              size="small"
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => {
              setSelectedFeature('biometric');
              setShowExplainer(true);
            }}
          >
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>المصادقة البيومترية</Text>
              <Text style={styles.featureDescription}>دخول آمن ببصمتك</Text>
            </View>
            <SecurityStatusIndicator
              status={securityStatus?.biometrics?.isAvailable ? 'secure' : 'warning'}
              feature="المصادقة البيومترية"
              description="استخدم بصمتك للدخول الآمن"
              showTooltip={false}
              size="small"
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.featureItem}
            onPress={() => {
              setSelectedFeature('ueba');
              setShowExplainer(true);
            }}
          >
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>المراقبة الذكية</Text>
              <Text style={styles.featureDescription}>حماية من الأنشطة المشبوهة</Text>
            </View>
            <SecurityStatusIndicator
              status={securityStatus?.session ? 'secure' : 'warning'}
              feature="المراقبة الذكية"
              description="نظام ذكي يحميك من التهديدات"
              showTooltip={false}
              size="small"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Security Tips Carousel */}
      <SecurityTipsCarousel onTipAction={handleTipAction} />

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={runBasicSecurityCheck}
          >
            <Activity size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>فحص أمني شامل</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowOnboarding(true)}
          >
            <HelpCircle size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>دليل الأمان</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={loadSecurityData}>
        <Activity size={20} color="white" />
        <Text style={styles.refreshButtonText}>تحديث البيانات</Text>
      </TouchableOpacity>
      
      {/* Security Explainer Modal */}
      <SecurityExplainer
        visible={showExplainer}
        onClose={() => {
          setShowExplainer(false);
          setSelectedFeature(undefined);
        }}
        feature={selectedFeature}
      />
      
      {/* Security Onboarding Modal */}
      <SecurityOnboarding
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
          showSecuritySuccess('مرحباً بك! أنت الآن جاهز لاستخدام جميع الميزات الأمنية');
        }}
      />
      
      {/* Security Notification Banner */}
      <SecurityNotificationBanner
        notification={notification}
        onDismiss={dismissNotification}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpButton: {
    padding: 4,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  welcomeContent: {
    marginLeft: 12,
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 8,
    fontWeight: '500',
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoButton: {
    padding: 4,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  statusCard: {
    padding: 16,
    backgroundColor: Colors.light,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusSubtext: {
    fontSize: 14,
    color: Colors.medium,
    marginBottom: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    padding: 16,
    backgroundColor: Colors.light,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 12,
    color: Colors.medium,
    lineHeight: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.light,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureContent: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 16,
    color: Colors.dark,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.medium,
  },
  tipsContainer: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    fontSize: 14,
    color: Colors.dark,
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: Colors.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});