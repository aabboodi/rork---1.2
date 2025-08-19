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
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Download,
  Shield,
  Activity
} from 'lucide-react-native';
import OTASecurityService from '@/services/security/OTASecurityService';

interface SecurityLog {
  type: string;
  timestamp: number;
  platform: string;
  data: any;
}

export default function OTALogsScreen() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'warning'>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const securityLogs = await OTASecurityService.getSecurityLogs();
      setLogs(securityLogs.reverse()); // أحدث أولاً
    } catch (error) {
      console.error('Failed to load security logs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const clearLogs = () => {
    Alert.alert(
      'مسح السجلات',
      'هل أنت متأكد من رغبتك في مسح جميع سجلات الأمان؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            try {
              await OTASecurityService.clearSecurityLogs();
              setLogs([]);
              Alert.alert('تم المسح', 'تم مسح جميع سجلات الأمان بنجاح');
            } catch (error) {
              Alert.alert('خطأ', 'فشل في مسح السجلات');
            }
          }
        }
      ]
    );
  };

  const getLogIcon = (logType: string) => {
    switch (logType) {
      case 'ota_update_successful':
        return <CheckCircle size={16} color="#10B981" />;
      case 'ota_verification_attempt':
        return <Shield size={16} color="#3B82F6" />;
      case 'update_check_failed':
        return <AlertTriangle size={16} color="#EF4444" />;
      case 'backup_restored':
        return <Activity size={16} color="#F59E0B" />;
      default:
        return <FileText size={16} color="#6B7280" />;
    }
  };

  const getLogTypeText = (logType: string) => {
    switch (logType) {
      case 'ota_update_successful':
        return 'تحديث ناجح';
      case 'ota_verification_attempt':
        return 'محاولة تحقق';
      case 'update_check_failed':
        return 'فشل فحص التحديث';
      case 'backup_restored':
        return 'استعادة نسخة احتياطية';
      default:
        return logType;
    }
  };

  const getLogSeverity = (log: SecurityLog) => {
    if (log.type.includes('failed') || log.type.includes('error')) return 'error';
    if (log.type.includes('warning') || log.type.includes('restored')) return 'warning';
    if (log.type.includes('successful') || log.data?.success) return 'success';
    return 'info';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    const severity = getLogSeverity(log);
    return severity === filter;
  });

  const getFilterButtonStyle = (filterType: string) => [
    styles.filterButton,
    filter === filterType && styles.activeFilterButton
  ];

  const getFilterButtonTextStyle = (filterType: string) => [
    styles.filterButtonText,
    filter === filterType && styles.activeFilterButtonText
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'سجلات أمان OTA',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#1F2937',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerRight: () => (
            <TouchableOpacity onPress={clearLogs} style={styles.headerButton}>
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          ),
        }} 
      />

      <View style={styles.content}>
        {/* مرشحات */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={getFilterButtonStyle('all')}
              onPress={() => setFilter('all')}
            >
              <Text style={getFilterButtonTextStyle('all')}>الكل ({logs.length})</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={getFilterButtonStyle('success')}
              onPress={() => setFilter('success')}
            >
              <CheckCircle size={16} color={filter === 'success' ? '#FFFFFF' : '#10B981'} />
              <Text style={getFilterButtonTextStyle('success')}>
                نجح ({logs.filter(l => getLogSeverity(l) === 'success').length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={getFilterButtonStyle('error')}
              onPress={() => setFilter('error')}
            >
              <AlertTriangle size={16} color={filter === 'error' ? '#FFFFFF' : '#EF4444'} />
              <Text style={getFilterButtonTextStyle('error')}>
                خطأ ({logs.filter(l => getLogSeverity(l) === 'error').length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={getFilterButtonStyle('warning')}
              onPress={() => setFilter('warning')}
            >
              <Activity size={16} color={filter === 'warning' ? '#FFFFFF' : '#F59E0B'} />
              <Text style={getFilterButtonTextStyle('warning')}>
                تحذير ({logs.filter(l => getLogSeverity(l) === 'warning').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* قائمة السجلات */}
        <ScrollView
          style={styles.logsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <View style={styles.logTitleContainer}>
                    {getLogIcon(log.type)}
                    <Text style={styles.logTitle}>{getLogTypeText(log.type)}</Text>
                  </View>
                  <Text style={styles.logTimestamp}>
                    {formatTimestamp(log.timestamp)}
                  </Text>
                </View>
                
                <View style={styles.logDetails}>
                  <Text style={styles.logPlatform}>المنصة: {log.platform}</Text>
                  
                  {log.data && (
                    <View style={styles.logData}>
                      {log.data.updateVersion && (
                        <Text style={styles.logDataItem}>
                          الإصدار: {log.data.updateVersion}
                        </Text>
                      )}
                      
                      {log.data.errors && log.data.errors.length > 0 && (
                        <View style={styles.errorsContainer}>
                          <Text style={styles.errorsTitle}>أخطاء:</Text>
                          {log.data.errors.map((error: string, i: number) => (
                            <Text key={i} style={styles.errorText}>• {error}</Text>
                          ))}
                        </View>
                      )}
                      
                      {log.data.warnings && log.data.warnings.length > 0 && (
                        <View style={styles.warningsContainer}>
                          <Text style={styles.warningsTitle}>تحذيرات:</Text>
                          {log.data.warnings.map((warning: string, i: number) => (
                            <Text key={i} style={styles.warningText}>• {warning}</Text>
                          ))}
                        </View>
                      )}
                      
                      {log.data.backupId && (
                        <Text style={styles.logDataItem}>
                          معرف النسخة الاحتياطية: {log.data.backupId}
                        </Text>
                      )}
                      
                      {typeof log.data.success === 'boolean' && (
                        <View style={styles.successIndicator}>
                          {log.data.success ? (
                            <CheckCircle size={16} color="#10B981" />
                          ) : (
                            <AlertTriangle size={16} color="#EF4444" />
                          )}
                          <Text style={[
                            styles.successText,
                            { color: log.data.success ? '#10B981' : '#EF4444' }
                          ]}>
                            {log.data.success ? 'نجح' : 'فشل'}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <FileText size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>لا توجد سجلات</Text>
              <Text style={styles.emptyStateText}>
                {filter === 'all' 
                  ? 'لم يتم تسجيل أي أحداث أمنية بعد'
                  : `لا توجد سجلات من نوع "${filter}"`
                }
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  logsList: {
    flex: 1,
    padding: 16,
  },
  logItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  logDetails: {
    gap: 8,
  },
  logPlatform: {
    fontSize: 12,
    color: '#6B7280',
  },
  logData: {
    gap: 6,
  },
  logDataItem: {
    fontSize: 12,
    color: '#374151',
  },
  errorsContainer: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    lineHeight: 16,
  },
  warningsContainer: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  warningsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 11,
    color: '#D97706',
    lineHeight: 16,
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});