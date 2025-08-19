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
  ShieldAlert, 
  ShieldX, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Smartphone,
  Monitor,
  Bug,
  Eye,
  RefreshCw,
  Settings,
  Info
} from 'lucide-react-native';
import RootJailbreakDetectionService from '@/services/security/RootJailbreakDetectionService';

interface RootJailbreakThreat {
  type: 'root' | 'jailbreak';
  detected: boolean;
  confidence: number;
  indicators: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details: string;
  mitigationAction?: string;
}

interface DeviceInfo {
  platform: string;
  model: string;
  brand: string;
  osVersion: string;
  buildFingerprint?: string;
  bootloader?: string;
  hardware?: string;
  board?: string;
  isDevice: boolean;
  isEmulator: boolean;
}

const RootJailbreakDashboard: React.FC = () => {
  const [detectionService] = useState(() => RootJailbreakDetectionService.getInstance());
  const [threats, setThreats] = useState<RootJailbreakThreat[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [securityStatus, setSecurityStatus] = useState({
    isSecure: true,
    compromised: false,
    threats: [] as RootJailbreakThreat[],
    lastCheck: 0,
    monitoringActive: false
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const results = await detectionService.performDetection();
      const deviceData = detectionService.getDeviceInfo();
      const status = detectionService.getSecurityStatus();
      
      setThreats(results);
      setDeviceInfo(deviceData);
      setSecurityStatus(status);
    } catch (error) {
      console.error('Failed to load detection data:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات الكشف عن الاختراق');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleRunDetection = async () => {
    setIsLoading(true);
    try {
      const results = await detectionService.performDetection();
      const status = detectionService.getSecurityStatus();
      
      setThreats(results);
      setSecurityStatus(status);
      
      Alert.alert(
        'اكتمل الفحص',
        `تم العثور على ${results.filter(t => t.detected).length} تهديد محتمل`
      );
    } catch (error) {
      console.error('Detection failed:', error);
      Alert.alert('خطأ', 'فشل في تشغيل فحص الاختراق');
    } finally {
      setIsLoading(false);
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
      case 'critical': return ShieldX;
      case 'high': return ShieldAlert;
      case 'medium': return AlertTriangle;
      case 'low': return Shield;
      default: return Shield;
    }
  };

  const getStatusIcon = () => {
    if (securityStatus.compromised) return ShieldX;
    if (securityStatus.threats.length > 0) return ShieldAlert;
    return Shield;
  };

  const getStatusColor = () => {
    if (securityStatus.compromised) return '#dc2626';
    if (securityStatus.threats.length > 0) return '#ea580c';
    return '#16a34a';
  };

  const renderSecurityOverview = () => {
    const StatusIcon = getStatusIcon();
    
    return (
      <LinearGradient
        colors={securityStatus.compromised ? ['#fef2f2', '#fee2e2'] : ['#f0fdf4', '#dcfce7']}
        style={styles.overviewCard}
      >
        <View style={styles.overviewHeader}>
          <StatusIcon size={32} color={getStatusColor()} />
          <View style={styles.overviewText}>
            <Text style={[styles.overviewTitle, { color: getStatusColor() }]}>
              {securityStatus.compromised ? 'جهاز مخترق' : 'جهاز آمن'}
            </Text>
            <Text style={styles.overviewSubtitle}>
              {securityStatus.compromised 
                ? 'تم اكتشاف اختراق في الجهاز' 
                : 'لم يتم اكتشاف أي اختراق'}
            </Text>
          </View>
        </View>
        
        <View style={styles.overviewStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{securityStatus.threats.length}</Text>
            <Text style={styles.statLabel}>تهديدات مكتشفة</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {securityStatus.lastCheck ? new Date(securityStatus.lastCheck).toLocaleTimeString('ar') : 'لم يتم'}
            </Text>
            <Text style={styles.statLabel}>آخر فحص</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statusIndicator, { 
              backgroundColor: securityStatus.monitoringActive ? '#16a34a' : '#dc2626' 
            }]} />
            <Text style={styles.statLabel}>المراقبة المستمرة</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderDeviceInfo = () => {
    if (!deviceInfo) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Smartphone size={24} color="#3b82f6" />
          <Text style={styles.cardTitle}>معلومات الجهاز</Text>
        </View>
        
        <View style={styles.deviceInfoGrid}>
          <View style={styles.deviceInfoItem}>
            <Text style={styles.deviceInfoLabel}>المنصة</Text>
            <Text style={styles.deviceInfoValue}>{deviceInfo.platform}</Text>
          </View>
          <View style={styles.deviceInfoItem}>
            <Text style={styles.deviceInfoLabel}>الموديل</Text>
            <Text style={styles.deviceInfoValue}>{deviceInfo.model}</Text>
          </View>
          <View style={styles.deviceInfoItem}>
            <Text style={styles.deviceInfoLabel}>الماركة</Text>
            <Text style={styles.deviceInfoValue}>{deviceInfo.brand}</Text>
          </View>
          <View style={styles.deviceInfoItem}>
            <Text style={styles.deviceInfoLabel}>إصدار النظام</Text>
            <Text style={styles.deviceInfoValue}>{deviceInfo.osVersion}</Text>
          </View>
          <View style={styles.deviceInfoItem}>
            <Text style={styles.deviceInfoLabel}>نوع الجهاز</Text>
            <Text style={[styles.deviceInfoValue, { 
              color: deviceInfo.isDevice ? '#16a34a' : '#dc2626' 
            }]}>
              {deviceInfo.isDevice ? 'جهاز حقيقي' : 'محاكي'}
            </Text>
          </View>
          {deviceInfo.buildFingerprint && (
            <View style={styles.deviceInfoItem}>
              <Text style={styles.deviceInfoLabel}>بصمة البناء</Text>
              <Text style={[styles.deviceInfoValue, styles.smallText]} numberOfLines={2}>
                {deviceInfo.buildFingerprint}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderThreatItem = (threat: RootJailbreakThreat, index: number) => {
    const SeverityIcon = getSeverityIcon(threat.severity);
    
    return (
      <View key={index} style={[styles.threatItem, { 
        borderLeftColor: getSeverityColor(threat.severity) 
      }]}>
        <View style={styles.threatHeader}>
          <View style={styles.threatTitleRow}>
            <SeverityIcon size={20} color={getSeverityColor(threat.severity)} />
            <Text style={styles.threatType}>
              {threat.type === 'root' ? 'Root' : 'Jailbreak'} - {threat.severity.toUpperCase()}
            </Text>
            <View style={[styles.confidenceBadge, { 
              backgroundColor: getSeverityColor(threat.severity) 
            }]}>
              <Text style={styles.confidenceText}>{threat.confidence}%</Text>
            </View>
          </View>
          <Text style={styles.threatTimestamp}>
            {new Date(threat.timestamp).toLocaleString('ar')}
          </Text>
        </View>
        
        <Text style={styles.threatDetails}>{threat.details}</Text>
        
        {threat.indicators.length > 0 && (
          <View style={styles.indicatorsContainer}>
            <Text style={styles.indicatorsTitle}>المؤشرات المكتشفة:</Text>
            <View style={styles.indicatorsList}>
              {threat.indicators.map((indicator, idx) => (
                <View key={idx} style={styles.indicatorChip}>
                  <Text style={styles.indicatorText}>{indicator}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {threat.mitigationAction && (
          <View style={styles.mitigationContainer}>
            <Text style={styles.mitigationTitle}>الإجراء المتخذ:</Text>
            <Text style={styles.mitigationText}>{threat.mitigationAction}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderThreats = () => {
    const detectedThreats = threats.filter(t => t.detected);
    
    if (detectedThreats.length === 0) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle size={24} color="#16a34a" />
            <Text style={styles.cardTitle}>لا توجد تهديدات</Text>
          </View>
          <Text style={styles.noThreatsText}>
            لم يتم اكتشاف أي تهديدات أمنية في الجهاز
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldAlert size={24} color="#dc2626" />
          <Text style={styles.cardTitle}>التهديدات المكتشفة ({detectedThreats.length})</Text>
        </View>
        
        {detectedThreats.map((threat, index) => renderThreatItem(threat, index))}
      </View>
    );
  };

  const renderActionButtons = () => {
    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleRunDetection}
          disabled={isLoading}
        >
          <RefreshCw size={20} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'جاري الفحص...' : 'تشغيل الفحص'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => Alert.alert('الإعدادات', 'سيتم إضافة إعدادات الكشف قريباً')}
        >
          <Settings size={20} color="#3b82f6" />
          <Text style={styles.secondaryButtonText}>الإعدادات</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>كشف اختراق الجهاز</Text>
        <Text style={styles.subtitle}>
          مراقبة Root/Jailbreak والتهديدات الأمنية
        </Text>
      </View>

      {renderSecurityOverview()}
      {renderDeviceInfo()}
      {renderThreats()}
      {renderActionButtons()}

      <View style={styles.infoCard}>
        <Info size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          يقوم هذا النظام بفحص الجهاز للكشف عن Root (أندرويد) أو Jailbreak (iOS) 
          والتهديدات الأمنية الأخرى مثل المحاكيات وأدوات التصحيح.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  overviewCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewText: {
    marginLeft: 12,
    flex: 1,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  overviewSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  card: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  deviceInfoGrid: {
    gap: 12,
  },
  deviceInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  deviceInfoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  deviceInfoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  smallText: {
    fontSize: 12,
  },
  threatItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  threatHeader: {
    marginBottom: 8,
  },
  threatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  threatType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  threatTimestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  threatDetails: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 20,
  },
  indicatorsContainer: {
    marginBottom: 12,
  },
  indicatorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  indicatorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  indicatorChip: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indicatorText: {
    fontSize: 12,
    color: '#475569',
  },
  mitigationContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  mitigationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  mitigationText: {
    fontSize: 13,
    color: '#a16207',
  },
  noThreatsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
    flex: 1,
  },
});

export default RootJailbreakDashboard;