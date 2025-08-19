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
import {
  Shield,
  Camera,
  Mic,
  MapPin,
  Bell,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react-native';
import DynamicPermissionsService from '@/services/security/DynamicPermissionsService';

interface PermissionAlert {
  id: string;
  permission: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  resolved: boolean;
}

const DynamicPermissionsDashboard: React.FC = () => {
  const [activeAlerts, setActiveAlerts] = useState<PermissionAlert[]>([]);
  const [usageStats, setUsageStats] = useState<Record<string, any>>({});
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingPermission, setTestingPermission] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // تحديث البيانات كل 30 ثانية
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const alerts = DynamicPermissionsService.getActiveAlerts();
      const stats = DynamicPermissionsService.getUsageStatistics();
      
      setActiveAlerts(alerts);
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load permissions dashboard data:', error);
    }
  };

  const testPermission = async (permission: string) => {
    setTestingPermission(permission);
    try {
      let result;
      
      switch (permission) {
        case 'camera':
          result = await DynamicPermissionsService.requestCameraPermission('dashboard_test');
          break;
        case 'microphone':
          result = await DynamicPermissionsService.requestMicrophonePermission('dashboard_test');
          break;
        case 'location':
          result = await DynamicPermissionsService.requestLocationPermission('dashboard_test');
          break;
        case 'storage':
          result = await DynamicPermissionsService.requestStoragePermission('dashboard_test');
          break;
        case 'notifications':
          result = await DynamicPermissionsService.requestNotificationPermission('dashboard_test');
          break;
        default:
          return;
      }
      
      // إنهاء الاستخدام بعد ثانيتين
      setTimeout(() => {
        DynamicPermissionsService.endPermissionUsage(permission);
      }, 2000);
      
      Alert.alert(
        'نتيجة الاختبار',
        `صلاحية ${getPermissionName(permission)}: ${result.granted ? 'مُمنوحة' : 'مرفوضة'}`,
        [{ text: 'موافق', onPress: () => loadDashboardData() }]
      );
    } catch (error) {
      Alert.alert('خطأ', 'فشل في اختبار الصلاحية');
    } finally {
      setTestingPermission(null);
    }
  };

  const resolveAlert = async (alertId: string) => {
    const success = await DynamicPermissionsService.resolveAlert(alertId);
    if (success) {
      loadDashboardData();
    }
  };

  const toggleMonitoring = () => {
    if (monitoringEnabled) {
      DynamicPermissionsService.stopPermissionMonitoring();
    } else {
      DynamicPermissionsService.startPermissionMonitoring();
    }
    setMonitoringEnabled(!monitoringEnabled);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'camera': return Camera;
      case 'microphone': return Mic;
      case 'location': return MapPin;
      case 'notifications': return Bell;
      case 'storage': return FolderOpen;
      default: return Shield;
    }
  };

  const getPermissionName = (permission: string) => {
    switch (permission) {
      case 'camera': return 'الكاميرا';
      case 'microphone': return 'المايكروفون';
      case 'location': return 'الموقع';
      case 'notifications': return 'الإشعارات';
      case 'storage': return 'التخزين';
      case 'multiple': return 'متعددة';
      default: return permission;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return severity;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* حالة المراقبة */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Activity size={24} color={monitoringEnabled ? '#10B981' : '#EF4444'} />
          <Text style={styles.cardTitle}>مراقبة الصلاحيات الديناميكية</Text>
        </View>
        
        <View style={styles.monitoringStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: monitoringEnabled ? '#10B981' : '#EF4444' }
          ]}>
            <Text style={styles.statusBadgeText}>
              {monitoringEnabled ? 'نشطة' : 'متوقفة'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: monitoringEnabled ? '#EF4444' : '#10B981' }
            ]}
            onPress={toggleMonitoring}
          >
            {monitoringEnabled ? <EyeOff size={16} color="#FFFFFF" /> : <Eye size={16} color="#FFFFFF" />}
            <Text style={styles.toggleButtonText}>
              {monitoringEnabled ? 'إيقاف المراقبة' : 'تشغيل المراقبة'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* التنبيهات النشطة */}
      {activeAlerts.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.cardTitle}>تنبيهات أمنية ({activeAlerts.length})</Text>
          </View>
          
          <View style={styles.alertsList}>
            {activeAlerts.map((alert) => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={styles.alertInfo}>
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertPermission}>
                      {getPermissionName(alert.permission)}
                    </Text>
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(alert.severity) }
                    ]}>
                      <Text style={styles.severityText}>
                        {getSeverityText(alert.severity)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.alertReason}>{alert.reason}</Text>
                  <Text style={styles.alertTime}>{formatDate(alert.timestamp)}</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={() => resolveAlert(alert.id)}
                >
                  <CheckCircle size={16} color="#10B981" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* إحصائيات الاستخدام */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Clock size={24} color="#3B82F6" />
          <Text style={styles.cardTitle}>إحصائيات الاستخدام</Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{usageStats.totalUsage || 0}</Text>
            <Text style={styles.statLabel}>إجمالي الاستخدام</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{usageStats.dayUsage || 0}</Text>
            <Text style={styles.statLabel}>اليوم</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{usageStats.suspiciousUsage || 0}</Text>
            <Text style={styles.statLabel}>مشبوه</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{usageStats.activeAlerts || 0}</Text>
            <Text style={styles.statLabel}>تنبيهات نشطة</Text>
          </View>
        </View>
      </View>

      {/* الاستخدام حسب الصلاحية */}
      {usageStats.usageByPermission && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={24} color="#6B7280" />
            <Text style={styles.cardTitle}>الاستخدام حسب الصلاحية</Text>
          </View>
          
          <View style={styles.permissionsList}>
            {Object.entries(usageStats.usageByPermission).map(([permission, count]) => {
              const IconComponent = getPermissionIcon(permission);
              return (
                <View key={permission} style={styles.permissionItem}>
                  <View style={styles.permissionInfo}>
                    <IconComponent size={20} color="#6B7280" />
                    <Text style={styles.permissionName}>
                      {getPermissionName(permission)}
                    </Text>
                  </View>
                  <Text style={styles.permissionCount}>{count as number}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* متوسط مدة الجلسة */}
      {usageStats.averageSessionDuration && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>متوسط مدة الجلسة (ثانية)</Text>
          </View>
          
          <View style={styles.durationList}>
            {Object.entries(usageStats.averageSessionDuration).map(([permission, duration]) => {
              const IconComponent = getPermissionIcon(permission);
              return (
                <View key={permission} style={styles.durationItem}>
                  <View style={styles.permissionInfo}>
                    <IconComponent size={20} color="#6B7280" />
                    <Text style={styles.permissionName}>
                      {getPermissionName(permission)}
                    </Text>
                  </View>
                  <Text style={styles.durationValue}>{duration as number}ث</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* اختبار الصلاحيات */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Shield size={24} color="#10B981" />
          <Text style={styles.cardTitle}>اختبار الصلاحيات</Text>
        </View>
        
        <View style={styles.testButtons}>
          {['camera', 'microphone', 'location', 'storage', 'notifications'].map((permission) => {
            const IconComponent = getPermissionIcon(permission);
            const isLoading = testingPermission === permission;
            
            return (
              <TouchableOpacity
                key={permission}
                style={[styles.testButton, isLoading && styles.disabledButton]}
                onPress={() => testPermission(permission)}
                disabled={isLoading}
              >
                <IconComponent size={16} color="#3B82F6" />
                <Text style={styles.testButtonText}>
                  {isLoading ? 'جاري الاختبار...' : getPermissionName(permission)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* معلومات إضافية للويب */}
      {Platform.OS === 'web' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>ملاحظة للويب</Text>
          </View>
          
          <Text style={styles.webNote}>
            في بيئة الويب، بعض الصلاحيات قد تعمل بشكل مختلف أو محدود مقارنة بالتطبيقات المحمولة. 
            المراقبة الديناميكية متاحة بشكل كامل في التطبيقات المحمولة.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  monitoringStatus: {
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  alertsList: {
    gap: 12,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  alertInfo: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertPermission: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  alertReason: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  resolveButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  permissionsList: {
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionName: {
    fontSize: 14,
    color: '#374151',
  },
  permissionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  durationList: {
    gap: 12,
  },
  durationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  testButtons: {
    gap: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  testButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  webNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default DynamicPermissionsDashboard;