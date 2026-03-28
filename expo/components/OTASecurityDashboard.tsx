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
import { Shield, Download, CheckCircle, AlertTriangle, Clock, Lock, Activity, TrendingUp, FileCheck, Key, FileText, ExternalLink, Info } from 'lucide-react-native';
import { router } from 'expo-router';
import DigitalSignatureViewer from './DigitalSignatureViewer';
import OTASecurityService from '@/services/security/OTASecurityService';

interface OTAUpdate {
  version: string;
  url: string;
  signature: string;
  hash: string;
  timestamp: number;
  mandatory: boolean;
}

interface UpdateInfo {
  version: string;
  lastUpdate: number;
}

const OTASecurityDashboard: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateHistory, setUpdateHistory] = useState<OTAUpdate[]>([]);
  const [availableUpdate, setAvailableUpdate] = useState<OTAUpdate | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentInfo = await OTASecurityService.getCurrentUpdateInfo();
      const history = OTASecurityService.getUpdateHistory();
      const stats = await OTASecurityService.getSecurityStats();
      
      setUpdateInfo(currentInfo);
      setUpdateHistory(history);
      setSecurityStats(stats);
    } catch (error) {
      console.error('Failed to load OTA dashboard data:', error);
    }
  };

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const update = await OTASecurityService.checkForUpdates();
      setAvailableUpdate(update);
      
      if (update) {
        Alert.alert(
          'تحديث متاح',
          `الإصدار ${update.version} متاح للتحميل. هل تريد تحديث التطبيق؟`,
          [
            { text: 'لاحقاً', style: 'cancel' },
            { text: 'تحديث', onPress: () => applyUpdate(update) }
          ]
        );
      } else {
        Alert.alert('لا توجد تحديثات', 'التطبيق محدث إلى أحدث إصدار');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في فحص التحديثات');
    } finally {
      setIsChecking(false);
    }
  };

  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [showSignatureViewer, setShowSignatureViewer] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<any>(null);

  const applyUpdate = async (update: OTAUpdate) => {
    setIsUpdating(true);
    setUpdateProgress(0);
    setUpdateStatus('بدء عملية التحديث...');
    
    try {
      const result = await OTASecurityService.downloadAndApplyUpdate(update, (progress) => {
        setUpdateProgress(progress);
        if (progress < 15) setUpdateStatus('التحقق من صحة التحديث...');
        else if (progress < 60) setUpdateStatus('تحميل التحديث...');
        else if (progress < 80) setUpdateStatus('فحص تكامل الملف...');
        else if (progress < 100) setUpdateStatus('تطبيق التحديث...');
        else setUpdateStatus('اكتمل التحديث');
      });
      
      if (result.success) {
        let alertMessage = 'تم تطبيق التحديث بأمان تام.';
        if (result.warnings && result.warnings.length > 0) {
          alertMessage += `\n\nتحذيرات:\n${result.warnings.join('\n')}`;
        }
        
        Alert.alert(
          'تم التحديث بنجاح',
          alertMessage,
          [{ text: 'موافق', onPress: () => loadDashboardData() }]
        );
        setAvailableUpdate(null);
      } else {
        Alert.alert(
          'فشل التحديث', 
          result.error || 'لم يتم تطبيق التحديث بسبب فشل في التحقق الأمني',
          [
            { text: 'موافق' },
            result.rollbackInfo && {
              text: 'عرض تفاصيل الاستعادة',
              onPress: () => showRollbackInfo(result.rollbackInfo)
            }
          ].filter(Boolean)
        );
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع أثناء تطبيق التحديث');
    } finally {
      setIsUpdating(false);
      setUpdateProgress(0);
      setUpdateStatus('');
    }
  };

  const showRollbackInfo = (rollbackInfo: any) => {
    Alert.alert(
      'معلومات الاستعادة',
      `تم استعادة النسخة الاحتياطية: ${rollbackInfo?.backupId || 'غير محدد'}`,
      [{ text: 'موافق' }]
    );
  };

  const showSignatureDetails = (update: OTAUpdate) => {
    const signatureData = {
      signature: update.signature,
      algorithm: update.signatureAlgorithm,
      hashAlgorithm: update.hashAlgorithm,
      publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4f5wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEjWT2btf02uBMxZNNvOmxuee6+BaFoXPVdgqtip69fLVhJbNsXxEqucpyvnL0eHYiRyqfffoyxBG21op79k/Af7NiTFzoTu04yoVp0x6xDEQk4+G2ufhb9pyHtgNzBCaYpuE4QxcKWDv8/7a6H1Bd7va6x9a4k2jj9wTdwJiwrfNdWxjgooLvfM1VT0AoM7VpZoJ9eJfTvdG6RjjVLRy7o9FMaQAuoVT4fXIiQckkt0z8m7_DaZvui5qsQG4_5CyOP2dYmHuPqMSdNt09W69EziqJMDqK5ykJMuFqLzHzNUVwIDAQAB',
      certificateChain: update.certificateChain,
      isValid: true,
      verificationDetails: {
        timestamp: Date.now(),
        verifiedBy: 'OTA Security Service',
        warnings: ['هذه بيانات تجريبية لأغراض العرض']
      }
    };
    
    setSelectedSignature(signatureData);
    setShowSignatureViewer(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSecurityLevel = () => {
    if (!updateInfo) return 'غير معروف';
    
    const daysSinceUpdate = (Date.now() - updateInfo.lastUpdate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate < 7) return 'ممتاز';
    if (daysSinceUpdate < 30) return 'جيد';
    if (daysSinceUpdate < 90) return 'متوسط';
    return 'يحتاج تحديث';
  };

  const getSecurityColor = () => {
    const level = getSecurityLevel();
    switch (level) {
      case 'ممتاز': return '#10B981';
      case 'جيد': return '#3B82F6';
      case 'متوسط': return '#F59E0B';
      case 'يحتاج تحديث': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* حالة الأمان الحالية */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Shield size={24} color="#3B82F6" />
          <Text style={styles.cardTitle}>حالة أمان التحديثات</Text>
        </View>
        
        <View style={styles.securityStatus}>
          <View style={[styles.securityBadge, { backgroundColor: getSecurityColor() }]}>
            <Text style={styles.securityBadgeText}>{getSecurityLevel()}</Text>
          </View>
          
          {updateInfo && (
            <View style={styles.versionInfo}>
              <Text style={styles.versionText}>الإصدار الحالي: {updateInfo.version}</Text>\n              <Text style={styles.updateDate}>
                آخر تحديث: {formatDate(updateInfo.lastUpdate)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* التحديث المتاح */}
      {availableUpdate && (
        <View style={[styles.card, styles.updateCard]}>
          <View style={styles.cardHeader}>
            <Download size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>تحديث متاح</Text>
          </View>
          
          <View style={styles.updateInfo}>
            <Text style={styles.updateVersion}>الإصدار {availableUpdate.version}</Text>
            <Text style={styles.updateDate}>
              {formatDate(availableUpdate.timestamp)}
            </Text>
            {availableUpdate.mandatory && (
              <View style={styles.mandatoryBadge}>
                <AlertTriangle size={16} color="#EF4444" />
                <Text style={styles.mandatoryText}>تحديث إجباري</Text>
              </View>
            )}
          </View>
          
          {isUpdating && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${updateProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {updateStatus} ({Math.round(updateProgress)}%)
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.updateButton, isUpdating && styles.disabledButton]}
            onPress={() => applyUpdate(availableUpdate)}
            disabled={isUpdating}
          >
            <Download size={20} color="#FFFFFF" />
            <Text style={styles.updateButtonText}>
              {isUpdating ? 'جاري التحديث...' : 'تحديث الآن'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* أزرار التحكم */}
      <View style={styles.controlsCard}>
        <TouchableOpacity
          style={[styles.controlButton, isChecking && styles.disabledButton]}
          onPress={checkForUpdates}
          disabled={isChecking}
        >
          <CheckCircle size={20} color="#3B82F6" />
          <Text style={styles.controlButtonText}>
            {isChecking ? 'جاري الفحص...' : 'فحص التحديثات'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => router.push('/security/ota-logs')}
        >
          <FileText size={20} color="#8B5CF6" />
          <Text style={[styles.controlButtonText, { color: '#8B5CF6' }]}>
            عرض سجلات الأمان
          </Text>
          <ExternalLink size={16} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* إحصائيات الأمان */}
      {securityStats && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={24} color="#8B5CF6" />
            <Text style={styles.cardTitle}>إحصائيات الأمان</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={styles.statNumber}>{securityStats.totalUpdates}</Text>
              <Text style={styles.statLabel}>إجمالي التحديثات</Text>
            </View>
            
            <View style={styles.statItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.statNumber}>{securityStats.successfulUpdates}</Text>
              <Text style={styles.statLabel}>تحديثات ناجحة</Text>
            </View>
            
            <View style={styles.statItem}>
              <AlertTriangle size={20} color="#EF4444" />
              <Text style={styles.statNumber}>{securityStats.failedUpdates}</Text>
              <Text style={styles.statLabel}>تحديثات فاشلة</Text>
            </View>
            
            <View style={styles.statItem}>
              <Shield size={20} color={getSecurityColor()} />
              <Text style={[styles.statNumber, { color: getSecurityColor() }]}>
                {securityStats.securityLevel}
              </Text>
              <Text style={styles.statLabel}>مستوى الأمان</Text>
            </View>
          </View>
        </View>
      )}

      {/* ميزات الأمان المتقدمة */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Lock size={24} color="#10B981" />
          <Text style={styles.cardTitle}>ميزات الأمان المتقدمة</Text>
        </View>
        
        <View style={styles.securityFeatures}>
          <View style={styles.featureItem}>
            <Key size={16} color="#10B981" />
            <Text style={styles.featureText}>توقيع رقمي متقدم (RSA-PSS/ECDSA)</Text>
          </View>
          
          <View style={styles.featureItem}>
            <FileCheck size={16} color="#10B981" />
            <Text style={styles.featureText}>فحص تكامل مضاعف (SHA-256/SHA-512)</Text>
          </View>
          
          <View style={styles.featureItem}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.featureText}>التحقق من سلسلة الشهادات</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Shield size={16} color="#10B981" />
            <Text style={styles.featureText}>حماية ضد التراجع (Rollback Protection)</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Clock size={16} color="#10B981" />
            <Text style={styles.featureText}>التحقق من الطابع الزمني</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Activity size={16} color="#10B981" />
            <Text style={styles.featureText}>نسخ احتياطية تلقائية واستعادة</Text>
          </View>
        </View>
      </View>

      {/* تاريخ التحديثات */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Clock size={24} color="#6B7280" />
          <Text style={styles.cardTitle}>تاريخ التحديثات</Text>
        </View>
        
        {updateHistory.length > 0 ? (
          <View style={styles.historyList}>
            {updateHistory.slice(-5).reverse().map((update, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyVersion}>الإصدار {update.version}</Text>
                  <Text style={styles.historyDate}>
                    {formatDate(update.timestamp)}
                  </Text>
                </View>
                <View style={styles.historyActions}>
                  <TouchableOpacity
                    onPress={() => showSignatureDetails(update)}
                    style={styles.signatureButton}
                  >
                    <Info size={14} color="#3B82F6" />
                  </TouchableOpacity>
                  <CheckCircle size={16} color="#10B981" />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noHistoryText}>لا يوجد تاريخ تحديثات</Text>
        )}
      </View>

      {/* معلومات إضافية للويب */}
      {Platform.OS === 'web' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>ملاحظة للويب</Text>
          </View>
          
          <Text style={styles.webNote}>
            في بيئة الويب، يتم التحديث تلقائياً عند تحديث الصفحة. 
            ميزات الأمان المتقدمة متاحة بشكل كامل في التطبيقات المحمولة.
          </Text>
        </View>
      )}
      
      {/* عارض تفاصيل التوقيع */}
      {selectedSignature && (
        <DigitalSignatureViewer
          visible={showSignatureViewer}
          onClose={() => {
            setShowSignatureViewer(false);
            setSelectedSignature(null);
          }}
          signatureData={selectedSignature}
        />
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
  updateCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
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
  securityStatus: {
    alignItems: 'center',
  },
  securityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  securityBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  versionInfo: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  updateDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  updateInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  updateVersion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  mandatoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  mandatoryText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  controlButton: {
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  controlButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  securityFeatures: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyInfo: {
    flex: 1,
  },
  historyVersion: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  noHistoryText: {
    textAlign: 'center',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  webNote: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
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
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signatureButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
});

export default OTASecurityDashboard;