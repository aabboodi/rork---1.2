import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Shield, Smartphone, AlertTriangle, CheckCircle, XCircle, Activity, Clock, Users, TrendingUp } from 'lucide-react-native';
import DeviceBindingService from '@/services/security/DeviceBindingService';
import SessionManager from '@/services/security/SessionManager';

interface DeviceBindingDashboardProps {
  onClose?: () => void;
}

interface BindingStatus {
  totalBindings: number;
  activeBindings: number;
  highRiskBindings: number;
  averageRiskScore: number;
  bindingStrengthDistribution: Record<string, number>;
  recentAnomalies: number;
}

interface CurrentBinding {
  sessionId: string;
  userId: string;
  deviceFingerprint: string;
  bindingHash: string;
  createdAt: number;
  lastValidated: number;
  validationCount: number;
  isActive: boolean;
  serverValidated: boolean;
  riskScore: number;
  anomalies: string[];
  bindingStrength: 'weak' | 'medium' | 'strong' | 'maximum';
}

interface DeviceFingerprint {
  deviceId: string;
  model: string;
  osVersion: string;
  appVersion: string;
  securityHash: string;
  timestamp: number;
}

const DeviceBindingDashboard: React.FC<DeviceBindingDashboardProps> = ({ onClose }) => {
  const [bindingStatus, setBindingStatus] = useState<BindingStatus | null>(null);
  const [currentBinding, setCurrentBinding] = useState<CurrentBinding | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const deviceBindingService = DeviceBindingService.getInstance();
  const sessionManager = SessionManager.getInstance();

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get binding status
      const status = deviceBindingService.getBindingSecurityStatus();
      setBindingStatus(status);

      // Get current device fingerprint
      const fingerprint = deviceBindingService.getCurrentDeviceFingerprint();
      setDeviceFingerprint(fingerprint);

      // Get current session binding
      const sessionInfo = sessionManager.getSessionInfo();
      if (sessionInfo) {
        const binding = await sessionManager.validateCurrentDeviceBinding();
        if (binding.valid) {
          // Get full binding details
          const activeBindings = deviceBindingService.getActiveBindings();
          const currentSessionBinding = activeBindings.find(b => b.userId === sessionInfo.userId);
          setCurrentBinding(currentSessionBinding || null);
        }
      }

      // Get recent security events
      const events = deviceBindingService.getSecurityEvents()
        .slice(-20)
        .sort((a, b) => b.timestamp - a.timestamp);
      setSecurityEvents(events);

    } catch (error) {
      console.error('Failed to load device binding dashboard data:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات ربط الجهاز');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleValidateBinding = async () => {
    try {
      const result = await sessionManager.validateCurrentDeviceBinding();
      
      if (result.valid) {
        Alert.alert(
          'تم التحقق بنجاح',
          `قوة الربط: ${getBindingStrengthText(result.bindingStrength)}\nنقاط المخاطر: ${result.riskScore}`,
          [{ text: 'موافق' }]
        );
      } else {
        Alert.alert(
          'فشل التحقق',
          `المشاكل المكتشفة: ${result.anomalies.join(', ')}\nنقاط المخاطر: ${result.riskScore}`,
          [{ text: 'موافق' }]
        );
      }
      
      await loadDashboardData();
    } catch (error) {
      Alert.alert('خطأ', 'فشل في التحقق من ربط الجهاز');
    }
  };

  const handleClearBindings = async () => {
    Alert.alert(
      'تأكيد المسح',
      'هل أنت متأكد من مسح جميع روابط الجهاز؟ سيتطلب هذا إعادة تسجيل الدخول.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            try {
              await deviceBindingService.clearAllBindings();
              Alert.alert('تم المسح', 'تم مسح جميع روابط الجهاز بنجاح');
              await loadDashboardData();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في مسح روابط الجهاز');
            }
          }
        }
      ]
    );
  };

  const getBindingStrengthColor = (strength: string): string => {
    switch (strength) {
      case 'maximum': return '#10B981';
      case 'strong': return '#3B82F6';
      case 'medium': return '#F59E0B';
      case 'weak': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getBindingStrengthText = (strength: string): string => {
    switch (strength) {
      case 'maximum': return 'أقصى';
      case 'strong': return 'قوي';
      case 'medium': return 'متوسط';
      case 'weak': return 'ضعيف';
      default: return 'غير محدد';
    }
  };

  const getRiskScoreColor = (score: number): string => {
    if (score < 20) return '#10B981';
    if (score < 40) return '#3B82F6';
    if (score < 70) return '#F59E0B';
    return '#EF4444';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#F97316';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Shield size={24} color="#3B82F6" />
          <Text style={styles.title}>لوحة ربط الجهاز</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Shield size={24} color="#3B82F6" />
        <Text style={styles.title}>لوحة ربط الجهاز</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XCircle size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Current Device Info */}
      {deviceFingerprint && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Smartphone size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>معلومات الجهاز الحالي</Text>
          </View>
          <View style={styles.deviceInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الطراز:</Text>
              <Text style={styles.infoValue}>{deviceFingerprint.model}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>نظام التشغيل:</Text>
              <Text style={styles.infoValue}>{deviceFingerprint.osVersion}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>إصدار التطبيق:</Text>
              <Text style={styles.infoValue}>{deviceFingerprint.appVersion}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>البصمة الأمنية:</Text>
              <Text style={styles.fingerprintText}>
                {deviceFingerprint.securityHash.substring(0, 16)}...
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>تاريخ الإنشاء:</Text>
              <Text style={styles.infoValue}>{formatTimestamp(deviceFingerprint.timestamp)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Current Binding Status */}
      {currentBinding && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.cardTitle}>حالة الربط الحالي</Text>
          </View>
          <View style={styles.bindingStatus}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>قوة الربط:</Text>
              <View style={[styles.strengthBadge, { backgroundColor: getBindingStrengthColor(currentBinding.bindingStrength) }]}>
                <Text style={styles.strengthText}>{getBindingStrengthText(currentBinding.bindingStrength)}</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>نقاط المخاطر:</Text>
              <Text style={[styles.riskScore, { color: getRiskScoreColor(currentBinding.riskScore) }]}>
                {currentBinding.riskScore}/100
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>عدد التحققات:</Text>
              <Text style={styles.statusValue}>{currentBinding.validationCount}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>آخر تحقق:</Text>
              <Text style={styles.statusValue}>{formatDuration(currentBinding.lastValidated)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>التحقق من الخادم:</Text>
              <View style={styles.statusIndicator}>
                {currentBinding.serverValidated ? (
                  <CheckCircle size={16} color="#10B981" />
                ) : (
                  <XCircle size={16} color="#EF4444" />
                )}
                <Text style={[styles.statusText, { color: currentBinding.serverValidated ? '#10B981' : '#EF4444' }]}>
                  {currentBinding.serverValidated ? 'مُتحقق' : 'غير مُتحقق'}
                </Text>
              </View>
            </View>
            {currentBinding.anomalies.length > 0 && (
              <View style={styles.anomaliesContainer}>
                <Text style={styles.anomaliesTitle}>المشاكل المكتشفة:</Text>
                {currentBinding.anomalies.map((anomaly, index) => (
                  <Text key={index} style={styles.anomalyText}>• {anomaly}</Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Binding Statistics */}
      {bindingStatus && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>إحصائيات الربط</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Users size={16} color="#3B82F6" />
              <Text style={styles.statValue}>{bindingStatus.totalBindings}</Text>
              <Text style={styles.statLabel}>إجمالي الروابط</Text>
            </View>
            <View style={styles.statItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.statValue}>{bindingStatus.activeBindings}</Text>
              <Text style={styles.statLabel}>الروابط النشطة</Text>
            </View>
            <View style={styles.statItem}>
              <AlertTriangle size={16} color="#EF4444" />
              <Text style={styles.statValue}>{bindingStatus.highRiskBindings}</Text>
              <Text style={styles.statLabel}>روابط عالية المخاطر</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingUp size={16} color="#F59E0B" />
              <Text style={styles.statValue}>{Math.round(bindingStatus.averageRiskScore)}</Text>
              <Text style={styles.statLabel}>متوسط المخاطر</Text>
            </View>
          </View>

          {/* Binding Strength Distribution */}
          <View style={styles.distributionContainer}>
            <Text style={styles.distributionTitle}>توزيع قوة الربط:</Text>
            <View style={styles.distributionGrid}>
              {Object.entries(bindingStatus.bindingStrengthDistribution).map(([strength, count]) => (
                <View key={strength} style={styles.distributionItem}>
                  <View style={[styles.distributionDot, { backgroundColor: getBindingStrengthColor(strength) }]} />
                  <Text style={styles.distributionLabel}>{getBindingStrengthText(strength)}</Text>
                  <Text style={styles.distributionValue}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          {bindingStatus.recentAnomalies > 0 && (
            <View style={styles.anomaliesAlert}>
              <AlertTriangle size={16} color="#F59E0B" />
              <Text style={styles.anomaliesAlertText}>
                {bindingStatus.recentAnomalies} مشكلة مكتشفة في الساعة الماضية
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Recent Security Events */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Clock size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>الأحداث الأمنية الأخيرة</Text>
        </View>
        {securityEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {securityEvents.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <View style={[styles.severityDot, { backgroundColor: getSeverityColor(event.severity) }]} />
                  <Text style={styles.eventType}>{event.type}</Text>
                  <Text style={styles.eventTime}>{formatDuration(event.timestamp)}</Text>
                </View>
                <Text style={styles.eventDetails}>
                  المستخدم: {event.userId} | الجلسة: {event.sessionId.substring(0, 8)}...
                </Text>
                {event.details && (
                  <Text style={styles.eventDescription}>
                    {JSON.stringify(event.details, null, 2)}
                  </Text>
                )}
                {event.riskScore > 0 && (
                  <Text style={[styles.eventRisk, { color: getRiskScoreColor(event.riskScore) }]}>
                    نقاط المخاطر: {event.riskScore}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noEventsText}>لا توجد أحداث أمنية حديثة</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleValidateBinding}>
          <CheckCircle size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>التحقق من الربط</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleRefresh}>
          <Activity size={16} color="#3B82F6" />
          <Text style={styles.secondaryButtonText}>تحديث البيانات</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearBindings}>
          <XCircle size={16} color="#FFFFFF" />
          <Text style={styles.dangerButtonText}>مسح جميع الروابط</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
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
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  deviceInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '400',
  },
  fingerprintText: {
    fontSize: 12,
    color: '#3B82F6',
    fontFamily: 'monospace',
  },
  bindingStatus: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  strengthText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  riskScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  anomaliesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  anomaliesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  anomalyText: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  distributionContainer: {
    marginTop: 16,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  distributionGrid: {
    gap: 8,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  distributionLabel: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  distributionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  anomaliesAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  anomaliesAlertText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  eventsList: {
    gap: 12,
  },
  eventItem: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    color: '#64748B',
  },
  eventDetails: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  eventRisk: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  noEventsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    padding: 20,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DeviceBindingDashboard;