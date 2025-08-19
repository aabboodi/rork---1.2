import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import {
  Bell,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Clock,
  Smartphone,
  User,
  Settings,
  FileText
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useRouter } from 'expo-router';
import SecurityNotificationService, { SecurityNotification } from '@/services/security/SecurityNotificationService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

interface SecurityNotificationCenterProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

const SecurityNotificationCenter: React.FC<SecurityNotificationCenterProps> = ({
  visible,
  onClose,
  userId
}) => {
  const { colors } = useThemeStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('unread');

  const notificationService = SecurityNotificationService.getInstance();

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible, userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userNotifications = await notificationService.getUserNotifications(userId || 'current_user');
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const currentSettings = notificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const getSeverityColor = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MEDIUM': return '#D97706';
      case 'LOW': return '#059669';
      default: return '#6B7280';
    }
  };

  const getSeverityIcon = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL': return AlertTriangle;
      case 'HIGH': return Shield;
      case 'MEDIUM': return Bell;
      case 'LOW': return CheckCircle;
      default: return Bell;
    }
  };

  const getAlertTypeIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'LOGIN_NEW_DEVICE': return Smartphone;
      case 'SUSPICIOUS_ACTIVITY': return AlertTriangle;
      case 'SECURITY_BREACH': return Shield;
      case 'FAILED_LOGIN': return X;
      case 'ACCOUNT_LOCKED': return X;
      case 'PASSWORD_CHANGED': return CheckCircle;
      case 'MFA_DISABLED': return AlertTriangle;
      case 'PERMISSION_ESCALATION': return Shield;
      default: return Bell;
    }
  };

  const handleNotificationPress = (notification: SecurityAlert) => {
    setSelectedNotification(notification);
  };

  const handleTrustDevice = async (deviceId: string) => {
    try {
      await notificationService.trustDevice(deviceId);
      Alert.alert('Success', 'Device has been marked as trusted');
      setSelectedNotification(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to trust device');
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all security notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.clearNotifications();
              setNotifications([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const updateNotificationSettings = async (newSettings: Partial<SecurityNotificationSettings>) => {
    try {
      await notificationService.updateSettings(newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const renderNotificationItem = (notification: SecurityAlert) => {
    const SeverityIcon = getSeverityIcon(notification.severity);
    const TypeIcon = getAlertTypeIcon(notification.type);
    const severityColor = getSeverityColor(notification.severity);

    return (
      <TouchableOpacity
        key={notification.id}
        style={[styles.notificationItem, { borderLeftColor: severityColor }]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            <TypeIcon size={20} color={severityColor} />
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Clock size={12} color="#6B7280" />
              <Text style={styles.notificationTime}>
                {formatRelativeTime(notification.timestamp)}
              </Text>
              {notification.deviceInfo?.location && (
                <>
                  <MapPin size={12} color="#6B7280" style={{ marginLeft: 12 }} />
                  <Text style={styles.notificationLocation}>
                    {notification.deviceInfo.location}
                  </Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.severityBadge}>
            <SeverityIcon size={16} color={severityColor} />
          </View>
        </View>
        {notification.actionRequired && (
          <View style={styles.actionRequired}>
            <Text style={styles.actionRequiredText}>Action Required</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderNotificationDetail = () => {
    if (!selectedNotification) return null;

    const severityColor = getSeverityColor(selectedNotification.severity);

    return (
      <Modal
        visible={!!selectedNotification}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Security Alert Details</Text>
            <TouchableOpacity
              onPress={() => setSelectedNotification(null)}
              style={styles.closeButton}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.alertCard, { borderColor: severityColor }]}>
              <View style={styles.alertHeader}>
                <View style={[styles.severityIndicator, { backgroundColor: severityColor }]}>
                  <Text style={styles.severityText}>{selectedNotification.severity}</Text>
                </View>
                <Text style={styles.alertTimestamp}>
                  {selectedNotification.timestamp.toLocaleString()}
                </Text>
              </View>

              <Text style={styles.alertTitle}>{selectedNotification.title}</Text>
              <Text style={styles.alertMessage}>{selectedNotification.message}</Text>

              {selectedNotification.deviceInfo && (
                <View style={styles.deviceInfo}>
                  <Text style={styles.sectionTitle}>Device Information</Text>
                  <View style={styles.deviceDetails}>
                    <Text style={styles.deviceDetail}>
                      Device: {selectedNotification.deviceInfo.deviceName}
                    </Text>
                    <Text style={styles.deviceDetail}>
                      Platform: {selectedNotification.deviceInfo.platform}
                    </Text>
                    {selectedNotification.deviceInfo.location && (
                      <Text style={styles.deviceDetail}>
                        Location: {selectedNotification.deviceInfo.location}
                      </Text>
                    )}
                    {selectedNotification.deviceInfo.ipAddress && (
                      <Text style={styles.deviceDetail}>
                        IP Address: {selectedNotification.deviceInfo.ipAddress}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {selectedNotification.metadata && (
                <View style={styles.metadata}>
                  <Text style={styles.sectionTitle}>Additional Information</Text>
                  {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                    <Text key={key} style={styles.metadataItem}>
                      {key}: {String(value)}
                    </Text>
                  ))}
                </View>
              )}

              {selectedNotification.actionRequired && (
                <View style={styles.actionSection}>
                  <Text style={styles.actionTitle}>Recommended Actions</Text>
                  <Text style={styles.actionText}>
                    Please review this security event and take appropriate action if necessary.
                  </Text>
                  
                  {selectedNotification.type === 'LOGIN_NEW_DEVICE' && selectedNotification.deviceInfo && (
                    <TouchableOpacity
                      style={styles.trustButton}
                      onPress={() => handleTrustDevice(selectedNotification.deviceInfo!.deviceId)}
                    >
                      <CheckCircle size={16} color="#059669" />
                      <Text style={styles.trustButtonText}>Trust This Device</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderSettings = () => {
    if (!settings) return null;

    return (
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notification Settings</Text>
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Alert Types</Text>
              {Object.entries(settings.alertTypes).map(([type, config]) => (
                <View key={type} style={styles.settingItem}>
                  <Text style={styles.settingLabel}>
                    {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <Switch
                    value={config.enabled}
                    onValueChange={(enabled) => {
                      const newSettings = {
                        ...settings,
                        alertTypes: {
                          ...settings.alertTypes,
                          [type]: { ...config, enabled }
                        }
                      };
                      updateNotificationSettings(newSettings);
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Quiet Hours</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
                <Switch
                  value={settings.quietHours.enabled}
                  onValueChange={(enabled) => {
                    updateNotificationSettings({
                      quietHours: { ...settings.quietHours, enabled }
                    });
                  }}
                />
              </View>
              {settings.quietHours.enabled && (
                <View style={styles.timeSettings}>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Start Time</Text>
                    <TextInput
                      style={styles.timeField}
                      value={settings.quietHours.startTime}
                      placeholder="22:00"
                      onChangeText={(startTime) => {
                        updateNotificationSettings({
                          quietHours: { ...settings.quietHours, startTime }
                        });
                      }}
                    />
                  </View>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>End Time</Text>
                    <TextInput
                      style={styles.timeField}
                      value={settings.quietHours.endTime}
                      placeholder="08:00"
                      onChangeText={(endTime) => {
                        updateNotificationSettings({
                          quietHours: { ...settings.quietHours, endTime }
                        });
                      }}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Security Level</Text>
              <View style={styles.securityLevelContainer}>
                {(['RELAXED', 'MODERATE', 'STRICT'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.securityLevelOption,
                      settings.deviceTrustLevel === level && styles.securityLevelSelected
                    ]}
                    onPress={() => updateNotificationSettings({ deviceTrustLevel: level })}
                  >
                    <Text style={[
                      styles.securityLevelText,
                      settings.deviceTrustLevel === level && styles.securityLevelTextSelected
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Shield size={24} color="#DC2626" />
            <Text style={styles.title}>Security Center</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.headerButton}
            >
              <Settings size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerButton}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{notifications.length}</Text>
            <Text style={styles.statLabel}>Total Alerts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>
              {notifications.filter(n => n.severity === 'CRITICAL' || n.severity === 'HIGH').length}
            </Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>
              {notifications.filter(n => n.actionRequired).length}
            </Text>
            <Text style={styles.statLabel}>Action Required</Text>
          </View>
        </View>

        {notifications.length > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={clearAllNotifications}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.notificationsList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CheckCircle size={48} color="#059669" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptyMessage}>
                No security alerts at this time. Your account is secure.
              </Text>
            </View>
          ) : (
            notifications.map(renderNotificationItem)
          )}
        </ScrollView>

        {renderNotificationDetail()}
        {renderSettings()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  notificationLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  severityBadge: {
    padding: 4,
  },
  actionRequired: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionRequiredText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  severityIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  deviceInfo: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  deviceDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  deviceDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  metadata: {
    marginBottom: 20,
  },
  metadataItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  actionSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 12,
  },
  trustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trustButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  timeSettings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeField: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  securityLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  securityLevelOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  securityLevelSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  securityLevelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  securityLevelTextSelected: {
    color: '#FFFFFF',
  },
});

export default SecurityNotificationCenter;