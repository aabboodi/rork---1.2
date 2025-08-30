import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  BellOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Key,
  User,
  X,
  Filter,
  RefreshCw,
  AlertCircle,
  Info,
  Zap
} from 'lucide-react-native';
import NewDeviceNotificationService from '@/services/security/NewDeviceNotificationService';
import SecurityNotificationService from '@/services/security/SecurityNotificationService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { useThemeSafe } from '@/providers/ThemeProvider';

interface SecurityNotificationCenterProps {
  visible?: boolean;
  onClose?: () => void;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  acknowledged: boolean;
  actionRequired: boolean;
  deviceInfo?: any;
  metadata?: any;
  actions?: {
    id: string;
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }[];
}

const SecurityNotificationCenter: React.FC<SecurityNotificationCenterProps> = ({ visible = false, onClose }) => {
  const themeContext = useThemeSafe();
  
  // Ensure theme is available before rendering
  if (!themeContext || !themeContext.theme || !themeContext.theme.colors) {
    return null; // Don't render until theme is ready
  }
  
  const { theme } = themeContext;
  const { colors } = theme;
  
  const [deviceNotificationService] = useState(() => NewDeviceNotificationService.getInstance());
  const [securityNotificationService] = useState(() => SecurityNotificationService.getInstance());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationItem[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'high_priority' | 'device' | 'security'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    initializeNotificationCenter();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, selectedFilter]);

  const initializeNotificationCenter = useCallback(async () => {
    try {
      await deviceNotificationService.initialize();
      await loadNotifications();
      await loadStatistics();
    } catch (error) {
      console.error('Failed to initialize notification center:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const allNotifications: NotificationItem[] = [];

      // Get device notifications
      const deviceNotifications = await deviceNotificationService.getUserNotifications('current_user', true);
      deviceNotifications.forEach(notification => {
        allNotifications.push({
          id: notification.id,
          type: notification.notificationType,
          title: getNotificationTitle(notification.notificationType),
          message: getNotificationMessage(notification),
          severity: notification.severity,
          timestamp: new Date(notification.timestamp),
          read: notification.acknowledged,
          acknowledged: notification.acknowledged,
          actionRequired: notification.requiresAction,
          deviceInfo: notification.deviceInfo,
          metadata: notification.metadata,
          actions: getNotificationActions(notification.notificationType)
        });
      });

      // Get security notifications
      const securityNotifications = await securityNotificationService.getStoredNotifications();
      securityNotifications.forEach(notification => {
        allNotifications.push({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          severity: notification.severity.toLowerCase() as any,
          timestamp: notification.timestamp,
          read: false,
          acknowledged: false,
          actionRequired: notification.actionRequired,
          deviceInfo: notification.deviceInfo,
          metadata: notification.metadata
        });
      });

      // Get high-priority alerts
      const highPriorityAlerts = await getHighPriorityAlerts();
      highPriorityAlerts.forEach(alert => {
        allNotifications.push({
          id: alert.id,
          type: alert.type,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          timestamp: new Date(alert.timestamp),
          read: alert.read || false,
          acknowledged: alert.dismissed || false,
          actionRequired: alert.actionRequired,
          deviceInfo: alert.deviceInfo,
          metadata: alert.metadata,
          actions: alert.actions
        });
      });

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = await deviceNotificationService.getNotificationStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, []);

  const getHighPriorityAlerts = async (): Promise<any[]> => {
    try {
      return [];
    } catch (error) {
      console.error('Failed to get high-priority alerts:', error);
      return [];
    }
  };

  const filterNotifications = useCallback(() => {
    let filtered = notifications;

    switch (selectedFilter) {
      case 'unread':
        filtered = notifications.filter(n => !n.read);
        break;
      case 'high_priority':
        filtered = notifications.filter(n => n.severity === 'high' || n.severity === 'critical');
        break;
      case 'device':
        filtered = notifications.filter(n => n.type.includes('device') || n.type.includes('login'));
        break;
      case 'security':
        filtered = notifications.filter(n => n.type.includes('security') || n.type.includes('breach'));
        break;
      default:
        filtered = notifications;
    }

    setFilteredNotifications(filtered);
  }, [notifications, selectedFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await loadStatistics();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      await deviceNotificationService.acknowledgeNotification(notificationId, 'current_user');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      for (const notification of unreadNotifications) {
        await deviceNotificationService.acknowledgeNotification(notification.id, 'current_user');
      }
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationTitle = (type: string): string => {
    switch (type) {
      case 'new_device_login':
        return 'New Device Login';
      case 'suspicious_activity':
        return 'Suspicious Activity Detected';
      case 'security_breach':
        return 'Security Breach Alert';
      case 'password_change':
        return 'Password Changed';
      case 'account_locked':
        return 'Account Locked';
      case 'failed_login_attempts':
        return 'Failed Login Attempts';
      case 'device_removed':
        return 'Device Removed';
      case 'permission_change':
        return 'Permission Changed';
      default:
        return 'Security Notification';
    }
  };

  const getNotificationMessage = (notification: any): string => {
    const deviceInfo = notification.deviceInfo;
    const location = deviceInfo?.location || 'Unknown location';
    const deviceName = deviceInfo?.deviceName || 'Unknown device';
    
    switch (notification.notificationType) {
      case 'new_device_login':
        return `New login from ${deviceName} in ${location}`;
      case 'suspicious_activity':
        return `Unusual activity detected on your account from ${location}`;
      case 'security_breach':
        return 'Potential security breach detected. Please review your account.';
      case 'password_change':
        return 'Your password was changed successfully.';
      case 'account_locked':
        return 'Your account has been locked due to suspicious activity.';
      case 'failed_login_attempts':
        return `Multiple failed login attempts from ${location}`;
      case 'device_removed':
        return `Device ${deviceName} was removed from your account`;
      case 'permission_change':
        return 'Your account permissions have been updated.';
      default:
        return notification.message || 'Security notification';
    }
  };

  const getNotificationActions = (type: string) => {
    switch (type) {
      case 'new_device_login':
        return [
          { id: 'approve', label: 'Approve', action: 'approve_device', style: 'primary' as const },
          { id: 'block', label: 'Block Device', action: 'block_device', style: 'danger' as const }
        ];
      case 'suspicious_activity':
        return [
          { id: 'review', label: 'Review Activity', action: 'review_activity', style: 'primary' as const },
          { id: 'secure', label: 'Secure Account', action: 'secure_account', style: 'secondary' as const }
        ];
      case 'security_breach':
        return [
          { id: 'change_password', label: 'Change Password', action: 'change_password', style: 'danger' as const },
          { id: 'review_devices', label: 'Review Devices', action: 'review_devices', style: 'secondary' as const }
        ];
      default:
        return [];
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle size={20} color={colors.danger} />;
      case 'high':
        return <AlertCircle size={20} color={colors.warning} />;
      case 'medium':
        return <Info size={20} color={colors.info} />;
      case 'low':
        return <CheckCircle size={20} color={colors.success} />;
      default:
        return <Bell size={20} color={colors.textSecondary} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.danger;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('device') || type.includes('login')) {
      return <Smartphone size={18} color={colors.textSecondary} />;
    } else if (type.includes('security') || type.includes('breach')) {
      return <Shield size={18} color={colors.textSecondary} />;
    } else if (type.includes('password') || type.includes('key')) {
      return <Key size={18} color={colors.textSecondary} />;
    } else if (type.includes('user') || type.includes('account')) {
      return <User size={18} color={colors.textSecondary} />;
    } else {
      return <Bell size={18} color={colors.textSecondary} />;
    }
  };

  const handleNotificationAction = async (notificationId: string, actionId: string, action: string) => {
    try {
      console.log(`Executing action ${action} for notification ${notificationId}`);
      
      switch (action) {
        case 'approve_device':
          await deviceNotificationService.approveDevice(notificationId);
          break;
        case 'block_device':
          await deviceNotificationService.blockDevice(notificationId);
          break;
        case 'review_activity':
          console.log('Navigate to activity review');
          break;
        case 'secure_account':
          console.log('Navigate to security settings');
          break;
        case 'change_password':
          console.log('Navigate to password change');
          break;
        case 'review_devices':
          console.log('Navigate to device management');
          break;
        default:
          console.log('Unknown action:', action);
      }
      
      await markAsRead(notificationId);
      setShowNotificationModal(false);
    } catch (error) {
      console.error('Failed to execute notification action:', error);
      Alert.alert('Error', 'Failed to execute action. Please try again.');
    }
  };

  const renderNotificationItem = (notification: NotificationItem) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        { backgroundColor: colors.surface },
        !notification.read && { borderLeftColor: colors.primary, borderLeftWidth: 4 }
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIconContainer}>
          {getSeverityIcon(notification.severity)}
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {formatRelativeTime(notification.timestamp)}
            </Text>
          </View>
          <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
            {notification.message}
          </Text>
          <View style={styles.notificationMeta}>
            <View style={styles.notificationTypeContainer}>
              {getTypeIcon(notification.type)}
              <Text style={[styles.notificationTypeText, { color: colors.textSecondary }]}>
                {notification.type.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
            {notification.actionRequired && (
              <View style={[styles.actionRequiredBadge, { backgroundColor: colors.warning }]}>
                <Zap size={12} color="#FFFFFF" />
                <Text style={styles.actionRequiredText}>ACTION REQUIRED</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      {!notification.read && <View style={[styles.unreadIndicator, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );

  const renderFilterButton = (filter: typeof selectedFilter, label: string, count?: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.activeFilterButton
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.filterBadge, { backgroundColor: colors.danger }]}>
          <Text style={styles.filterBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <View style={[styles.statisticsContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.statisticsTitle, { color: colors.text }]}>Security Overview</Text>
        <View style={styles.statisticsGrid}>
          <View style={styles.statisticsItem}>
            <Bell size={20} color={colors.textSecondary} />
            <Text style={[styles.statisticsValue, { color: colors.text }]}>{statistics.total || 0}</Text>
            <Text style={[styles.statisticsLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={styles.statisticsItem}>
            <AlertTriangle size={20} color={colors.danger} />
            <Text style={[styles.statisticsValue, { color: colors.text }]}>{statistics.unread || 0}</Text>
            <Text style={[styles.statisticsLabel, { color: colors.textSecondary }]}>Unread</Text>
          </View>
          <View style={styles.statisticsItem}>
            <Shield size={20} color={colors.warning} />
            <Text style={[styles.statisticsValue, { color: colors.text }]}>{statistics.highPriority || 0}</Text>
            <Text style={[styles.statisticsLabel, { color: colors.textSecondary }]}>High Priority</Text>
          </View>
          <View style={styles.statisticsItem}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={[styles.statisticsValue, { color: colors.text }]}>{statistics.resolved || 0}</Text>
            <Text style={[styles.statisticsLabel, { color: colors.textSecondary }]}>Resolved</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderNotificationModal = () => {
    if (!selectedNotification) return null;

    return (
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Notification Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNotificationModal(false)}
            >
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalNotificationHeader}>
              <View style={styles.modalSeverityContainer}>
                {getSeverityIcon(selectedNotification.severity)}
                <Text style={[
                  styles.modalSeverityText,
                  { color: getSeverityColor(selectedNotification.severity) }
                ]}>
                  {selectedNotification.severity.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.modalNotificationTime, { color: colors.textSecondary }]}>
                {formatRelativeTime(selectedNotification.timestamp)}
              </Text>
            </View>
            
            <Text style={[styles.modalNotificationTitle, { color: colors.text }]}>
              {selectedNotification.title}
            </Text>
            
            <Text style={[styles.modalNotificationMessage, { color: colors.textSecondary }]}>
              {selectedNotification.message}
            </Text>
            
            {selectedNotification.deviceInfo && (
              <View style={[styles.modalDeviceInfo, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Device Information</Text>
                <View style={styles.modalDeviceDetails}>
                  <Text style={[styles.modalDeviceText, { color: colors.textSecondary }]}>
                    Device: {selectedNotification.deviceInfo.deviceName || 'Unknown'}
                  </Text>
                  <Text style={[styles.modalDeviceText, { color: colors.textSecondary }]}>
                    Location: {selectedNotification.deviceInfo.location || 'Unknown'}
                  </Text>
                  <Text style={[styles.modalDeviceText, { color: colors.textSecondary }]}>
                    IP: {selectedNotification.deviceInfo.ipAddress || 'Unknown'}
                  </Text>
                </View>
              </View>
            )}
            
            {selectedNotification.actions && selectedNotification.actions.length > 0 && (
              <View style={styles.modalActions}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Available Actions</Text>
                {selectedNotification.actions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.modalActionButton,
                      { backgroundColor: colors.backgroundSecondary },
                      action.style === 'primary' && { backgroundColor: colors.primary },
                      action.style === 'danger' && { backgroundColor: colors.danger }
                    ]}
                    onPress={() => handleNotificationAction(
                      selectedNotification.id,
                      action.id,
                      action.action
                    )}
                  >
                    <Text style={[
                      styles.modalActionButtonText,
                      { color: colors.textSecondary },
                      action.style === 'primary' && { color: '#FFFFFF' },
                      action.style === 'danger' && { color: '#FFFFFF' }
                    ]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <RefreshCw size={24} color={colors.textSecondary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notifications...</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const highPriorityCount = notifications.filter(n => n.severity === 'high' || n.severity === 'critical').length;
  const deviceCount = notifications.filter(n => n.type.includes('device') || n.type.includes('login')).length;
  const securityCount = notifications.filter(n => n.type.includes('security') || n.type.includes('breach')).length;

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Shield size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Security Center</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle size={20} color={unreadCount > 0 ? "#FFFFFF" : "#64748B"} />
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {renderFilterButton('all', 'All', notifications.length)}
              {renderFilterButton('unread', 'Unread', unreadCount)}
              {renderFilterButton('high_priority', 'High Priority', highPriorityCount)}
              {renderFilterButton('device', 'Device', deviceCount)}
              {renderFilterButton('security', 'Security', securityCount)}
            </ScrollView>
          </View>
        )}
      </LinearGradient>
      
      {renderStatistics()}
      
      <ScrollView
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BellOff size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              {selectedFilter === 'all' 
                ? 'You have no security notifications at this time.'
                : `No ${selectedFilter.replace('_', ' ')} notifications found.`
              }
            </Text>
          </View>
        ) : (
          filteredNotifications.map(renderNotificationItem)
        )}
      </ScrollView>
      
        {renderNotificationModal()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  filtersContainer: {
    marginTop: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#FFFFFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activeFilterButtonText: {
    color: '#1E293B',
  },
  filterBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statisticsContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statisticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statisticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statisticsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statisticsValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statisticsLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
  },
  notificationIconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTypeText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionRequiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalNotificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalSeverityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalSeverityText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalNotificationTime: {
    fontSize: 14,
  },
  modalNotificationTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalNotificationMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalDeviceInfo: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalDeviceDetails: {
    gap: 8,
  },
  modalDeviceText: {
    fontSize: 14,
  },
  modalActions: {
    marginBottom: 20,
  },
  modalActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SecurityNotificationCenter;