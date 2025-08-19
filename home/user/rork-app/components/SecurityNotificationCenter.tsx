import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  Dimensions,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  BellOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone,
  Key,
  User,
  Settings,
  X,
  Eye,
  EyeOff,
  Trash2,
  Filter,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  Info,
  Zap,
  Lock,
  Unlock
} from 'lucide-react-native';
import NewDeviceNotificationService from '@/services/security/NewDeviceNotificationService';
import SecurityNotificationService from '@/services/security/SecurityNotificationService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

interface SecurityNotificationCenterProps {
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
  actions?: Array<{
    id: string;
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }>;
}

const { width } = Dimensions.get('window');

const SecurityNotificationCenter: React.FC<SecurityNotificationCenterProps> = ({ onClose }) => {
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

  const initializeNotificationCenter = async () => {
    try {
      await deviceNotificationService.initialize();
      await loadNotifications();
      await loadStatistics();
    } catch (error) {
      console.error('Failed to initialize notification center:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
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
          read: false, // Security notifications are always unread initially
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
  };

  const loadStatistics = async () => {
    try {
      const stats = await deviceNotificationService.getNotificationStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const getHighPriorityAlerts = async (): Promise<any[]> => {
    try {
      // This would get high-priority alerts from storage
      // For now, return empty array
      return [];\n    } catch (error) {\n      console.error('Failed to get high-priority alerts:', error);\n      return [];\n    }\n  };\n\n  const filterNotifications = () => {\n    let filtered = notifications;\n\n    switch (selectedFilter) {\n      case 'unread':\n        filtered = notifications.filter(n => !n.read);\n        break;\n      case 'high_priority':\n        filtered = notifications.filter(n => n.severity === 'high' || n.severity === 'critical');\n        break;\n      case 'device':\n        filtered = notifications.filter(n => n.type.includes('device') || n.type.includes('login'));\n        break;\n      case 'security':\n        filtered = notifications.filter(n => n.type.includes('security') || n.type.includes('breach'));\n        break;\n      default:\n        filtered = notifications;\n    }\n\n    setFilteredNotifications(filtered);\n  };\n\n  const onRefresh = async () => {\n    setRefreshing(true);\n    await loadNotifications();\n    await loadStatistics();\n    setRefreshing(false);\n  };\n\n  const handleNotificationPress = (notification: NotificationItem) => {\n    setSelectedNotification(notification);\n    setShowNotificationModal(true);\n    \n    // Mark as read\n    if (!notification.read) {\n      markAsRead(notification.id);\n    }\n  };\n\n  const markAsRead = async (notificationId: string) => {\n    try {\n      // Update local state\n      setNotifications(prev => \n        prev.map(n => \n          n.id === notificationId ? { ...n, read: true } : n\n        )\n      );\n      \n      // Update in storage/service\n      await deviceNotificationService.acknowledgeNotification(notificationId, 'current_user');\n    } catch (error) {\n      console.error('Failed to mark notification as read:', error);\n    }\n  };\n\n  const markAllAsRead = async () => {\n    try {\n      const unreadNotifications = notifications.filter(n => !n.read);\n      \n      for (const notification of unreadNotifications) {\n        await deviceNotificationService.acknowledgeNotification(notification.id, 'current_user');\n      }\n      \n      setNotifications(prev => \n        prev.map(n => ({ ...n, read: true }))\n      );\n      \n      Alert.alert('Success', `Marked ${unreadNotifications.length} notifications as read`);\n    } catch (error) {\n      console.error('Failed to mark all as read:', error);\n      Alert.alert('Error', 'Failed to mark notifications as read');\n    }\n  };\n\n  const clearAllNotifications = () => {\n    Alert.alert(\n      'Clear All Notifications',\n      'Are you sure you want to clear all notifications? This action cannot be undone.',\n      [\n        { text: 'Cancel', style: 'cancel' },\n        {\n          text: 'Clear All',\n          style: 'destructive',\n          onPress: async () => {\n            try {\n              // Clear from services\n              await securityNotificationService.clearNotifications();\n              \n              // Clear local state\n              setNotifications([]);\n              \n              Alert.alert('Success', 'All notifications cleared');\n            } catch (error) {\n              Alert.alert('Error', 'Failed to clear notifications');\n            }\n          }\n        }\n      ]\n    );\n  };\n\n  const handleNotificationAction = async (notificationId: string, action: string) => {\n    try {\n      switch (action) {\n        case 'trust_device':\n          await deviceNotificationService.acknowledgeNotification(notificationId, 'current_user', 'trust_device');\n          Alert.alert('Success', 'Device has been trusted');\n          break;\n        case 'block_device':\n          await deviceNotificationService.acknowledgeNotification(notificationId, 'current_user', 'block_device');\n          Alert.alert('Success', 'Device has been blocked');\n          break;\n        case 'review_security':\n          // Navigate to security settings\n          Alert.alert('Security Review', 'Opening security settings...');\n          break;\n        case 'ignore':\n          await deviceNotificationService.acknowledgeNotification(notificationId, 'current_user', 'ignore');\n          break;\n      }\n      \n      // Update notification state\n      setNotifications(prev => \n        prev.map(n => \n          n.id === notificationId ? { ...n, acknowledged: true } : n\n        )\n      );\n      \n      setShowNotificationModal(false);\n      await loadNotifications();\n    } catch (error) {\n      console.error('Failed to handle notification action:', error);\n      Alert.alert('Error', 'Failed to perform action');\n    }\n  };\n\n  const getNotificationTitle = (type: string): string => {\n    switch (type) {\n      case 'new_device': return 'New Device Login';\n      case 'device_change': return 'Device Change Detected';\n      case 'suspicious_device': return 'Suspicious Device Activity';\n      case 'location_change': return 'New Location Login';\n      default: return 'Security Notification';\n    }\n  };\n\n  const getNotificationMessage = (notification: any): string => {\n    const device = notification.deviceInfo;\n    const location = device?.location ? \n      `${device.location.city}, ${device.location.country}` : \n      'Unknown Location';\n    \n    switch (notification.notificationType) {\n      case 'new_device':\n        return `Login from ${device?.model || 'Unknown Device'} in ${location}`;\n      case 'device_change':\n        return `Device characteristics changed for ${device?.platform || 'Unknown'} device`;\n      case 'suspicious_device':\n        return `Suspicious activity from ${device?.platform || 'Unknown'} device (Risk: ${device?.riskScore || 0})`;\n      case 'location_change':\n        return `Login from new location: ${location}`;\n      default:\n        return 'Security event detected';\n    }\n  };\n\n  const getNotificationActions = (type: string) => {\n    switch (type) {\n      case 'new_device':\n      case 'device_change':\n        return [\n          { id: 'trust_device', label: 'Trust Device', action: 'trust_device', style: 'primary' as const },\n          { id: 'block_device', label: 'Block Device', action: 'block_device', style: 'danger' as const },\n          { id: 'review_security', label: 'Review Security', action: 'review_security', style: 'secondary' as const }\n        ];\n      default:\n        return [\n          { id: 'acknowledge', label: 'OK', action: 'ignore', style: 'primary' as const }\n        ];\n    }\n  };\n\n  const getSeverityColor = (severity: string) => {\n    switch (severity) {\n      case 'low': return '#10B981';\n      case 'medium': return '#F59E0B';\n      case 'high': return '#EF4444';\n      case 'critical': return '#DC2626';\n      default: return '#6B7280';\n    }\n  };\n\n  const getSeverityIcon = (severity: string) => {\n    switch (severity) {\n      case 'low': return Info;\n      case 'medium': return Clock;\n      case 'high': return AlertTriangle;\n      case 'critical': return AlertCircle;\n      default: return Bell;\n    }\n  };\n\n  const getTypeIcon = (type: string) => {\n    if (type.includes('device') || type.includes('login')) return Smartphone;\n    if (type.includes('key') || type.includes('rotation')) return Key;\n    if (type.includes('security') || type.includes('breach')) return Shield;\n    return Bell;\n  };\n\n  const renderNotificationItem = (notification: NotificationItem, index: number) => {\n    const SeverityIcon = getSeverityIcon(notification.severity);\n    const TypeIcon = getTypeIcon(notification.type);\n    \n    return (\n      <TouchableOpacity\n        key={notification.id}\n        style={[\n          styles.notificationItem,\n          !notification.read && styles.unreadNotification\n        ]}\n        onPress={() => handleNotificationPress(notification)}\n      >\n        <View style={styles.notificationHeader}>\n          <View style={styles.notificationIcons}>\n            <View style={[\n              styles.severityIndicator,\n              { backgroundColor: getSeverityColor(notification.severity) }\n            ]} />\n            <TypeIcon size={16} color=\"#6B7280\" />\n            <SeverityIcon size={14} color={getSeverityColor(notification.severity)} />\n          </View>\n          <View style={styles.notificationMeta}>\n            <Text style={styles.notificationTimestamp}>\n              {formatRelativeTime(notification.timestamp)}\n            </Text>\n            {!notification.read && <View style={styles.unreadDot} />}\n          </View>\n        </View>\n        \n        <View style={styles.notificationContent}>\n          <Text style={styles.notificationTitle}>{notification.title}</Text>\n          <Text style={styles.notificationMessage} numberOfLines={2}>\n            {notification.message}\n          </Text>\n          \n          {notification.actionRequired && (\n            <View style={styles.actionRequiredBadge}>\n              <Zap size={12} color=\"#FFFFFF\" />\n              <Text style={styles.actionRequiredText}>Action Required</Text>\n            </View>\n          )}\n        </View>\n      </TouchableOpacity>\n    );\n  };\n\n  const renderNotificationModal = () => {\n    if (!selectedNotification) return null;\n    \n    const SeverityIcon = getSeverityIcon(selectedNotification.severity);\n    \n    return (\n      <Modal\n        visible={showNotificationModal}\n        animationType=\"slide\"\n        presentationStyle=\"pageSheet\"\n        onRequestClose={() => setShowNotificationModal(false)}\n      >\n        <View style={styles.modalContainer}>\n          <LinearGradient\n            colors={[getSeverityColor(selectedNotification.severity), getSeverityColor(selectedNotification.severity) + '80']}\n            style={styles.modalHeader}\n          >\n            <View style={styles.modalHeaderContent}>\n              <View style={styles.modalHeaderLeft}>\n                <SeverityIcon size={24} color=\"#FFFFFF\" />\n                <Text style={styles.modalTitle}>{selectedNotification.title}</Text>\n              </View>\n              <TouchableOpacity\n                style={styles.modalCloseButton}\n                onPress={() => setShowNotificationModal(false)}\n              >\n                <X size={20} color=\"#FFFFFF\" />\n              </TouchableOpacity>\n            </View>\n          </LinearGradient>\n          \n          <ScrollView style={styles.modalContent}>\n            <View style={styles.modalSection}>\n              <Text style={styles.modalSectionTitle}>Details</Text>\n              <Text style={styles.modalMessage}>{selectedNotification.message}</Text>\n              \n              <View style={styles.modalMetadata}>\n                <View style={styles.modalMetadataItem}>\n                  <Text style={styles.modalMetadataLabel}>Severity:</Text>\n                  <Text style={[\n                    styles.modalMetadataValue,\n                    { color: getSeverityColor(selectedNotification.severity) }\n                  ]}>\n                    {selectedNotification.severity.toUpperCase()}\n                  </Text>\n                </View>\n                \n                <View style={styles.modalMetadataItem}>\n                  <Text style={styles.modalMetadataLabel}>Time:</Text>\n                  <Text style={styles.modalMetadataValue}>\n                    {selectedNotification.timestamp.toLocaleString()}\n                  </Text>\n                </View>\n                \n                <View style={styles.modalMetadataItem}>\n                  <Text style={styles.modalMetadataLabel}>Type:</Text>\n                  <Text style={styles.modalMetadataValue}>{selectedNotification.type}</Text>\n                </View>\n              </View>\n            </View>\n            \n            {selectedNotification.deviceInfo && (\n              <View style={styles.modalSection}>\n                <Text style={styles.modalSectionTitle}>Device Information</Text>\n                <View style={styles.deviceInfo}>\n                  <View style={styles.deviceInfoItem}>\n                    <Text style={styles.deviceInfoLabel}>Device:</Text>\n                    <Text style={styles.deviceInfoValue}>\n                      {selectedNotification.deviceInfo.model || 'Unknown'}\n                    </Text>\n                  </View>\n                  \n                  <View style={styles.deviceInfoItem}>\n                    <Text style={styles.deviceInfoLabel}>Platform:</Text>\n                    <Text style={styles.deviceInfoValue}>\n                      {selectedNotification.deviceInfo.platform || 'Unknown'}\n                    </Text>\n                  </View>\n                  \n                  {selectedNotification.deviceInfo.location && (\n                    <View style={styles.deviceInfoItem}>\n                      <Text style={styles.deviceInfoLabel}>Location:</Text>\n                      <Text style={styles.deviceInfoValue}>\n                        {selectedNotification.deviceInfo.location.city}, {selectedNotification.deviceInfo.location.country}\n                      </Text>\n                    </View>\n                  )}\n                  \n                  {selectedNotification.deviceInfo.riskScore !== undefined && (\n                    <View style={styles.deviceInfoItem}>\n                      <Text style={styles.deviceInfoLabel}>Risk Score:</Text>\n                      <Text style={[\n                        styles.deviceInfoValue,\n                        { color: selectedNotification.deviceInfo.riskScore > 70 ? '#EF4444' : '#10B981' }\n                      ]}>\n                        {selectedNotification.deviceInfo.riskScore}/100\n                      </Text>\n                    </View>\n                  )}\n                </View>\n              </View>\n            )}\n            \n            {selectedNotification.actions && selectedNotification.actions.length > 0 && (\n              <View style={styles.modalSection}>\n                <Text style={styles.modalSectionTitle}>Actions</Text>\n                <View style={styles.modalActions}>\n                  {selectedNotification.actions.map(action => (\n                    <TouchableOpacity\n                      key={action.id}\n                      style={[\n                        styles.modalActionButton,\n                        action.style === 'primary' && styles.primaryActionButton,\n                        action.style === 'danger' && styles.dangerActionButton,\n                        action.style === 'secondary' && styles.secondaryActionButton\n                      ]}\n                      onPress={() => handleNotificationAction(selectedNotification.id, action.action)}\n                    >\n                      <Text style={[\n                        styles.modalActionButtonText,\n                        action.style === 'secondary' && styles.secondaryActionButtonText\n                      ]}>\n                        {action.label}\n                      </Text>\n                    </TouchableOpacity>\n                  ))}\n                </View>\n              </View>\n            )}\n          </ScrollView>\n        </View>\n      </Modal>\n    );\n  };\n\n  if (loading) {\n    return (\n      <View style={styles.loadingContainer}>\n        <RefreshCw size={32} color=\"#3B82F6\" />\n        <Text style={styles.loadingText}>Loading Notifications...</Text>\n      </View>\n    );\n  }\n\n  return (\n    <View style={styles.container}>\n      <LinearGradient\n        colors={['#1E40AF', '#3B82F6']}\n        style={styles.header}\n      >\n        <View style={styles.headerContent}>\n          <View style={styles.headerLeft}>\n            <Bell size={24} color=\"#FFFFFF\" />\n            <Text style={styles.headerTitle}>Security Notifications</Text>\n          </View>\n          {onClose && (\n            <TouchableOpacity style={styles.closeButton} onPress={onClose}>\n              <X size={20} color=\"#FFFFFF\" />\n            </TouchableOpacity>\n          )}\n        </View>\n      </LinearGradient>\n\n      {/* Statistics */}\n      {statistics && (\n        <View style={styles.statisticsContainer}>\n          <View style={styles.statItem}>\n            <Text style={styles.statValue}>{statistics.totalNotifications}</Text>\n            <Text style={styles.statLabel}>Total</Text>\n          </View>\n          <View style={styles.statItem}>\n            <Text style={[styles.statValue, { color: '#EF4444' }]}>\n              {statistics.pendingNotifications}\n            </Text>\n            <Text style={styles.statLabel}>Unread</Text>\n          </View>\n          <View style={styles.statItem}>\n            <Text style={[styles.statValue, { color: '#F59E0B' }]}>\n              {statistics.highPriorityAlerts || 0}\n            </Text>\n            <Text style={styles.statLabel}>High Priority</Text>\n          </View>\n          <View style={styles.statItem}>\n            <Text style={[styles.statValue, { color: '#10B981' }]}>\n              {statistics.trustedDevices}\n            </Text>\n            <Text style={styles.statLabel}>Trusted Devices</Text>\n          </View>\n        </View>\n      )}\n\n      {/* Controls */}\n      <View style={styles.controlsContainer}>\n        <TouchableOpacity\n          style={[styles.controlButton, showFilters && styles.activeControlButton]}\n          onPress={() => setShowFilters(!showFilters)}\n        >\n          <Filter size={16} color={showFilters ? \"#FFFFFF\" : \"#6B7280\"} />\n          <Text style={[\n            styles.controlButtonText,\n            showFilters && styles.activeControlButtonText\n          ]}>Filter</Text>\n        </TouchableOpacity>\n        \n        <TouchableOpacity style={styles.controlButton} onPress={markAllAsRead}>\n          <CheckCircle size={16} color=\"#6B7280\" />\n          <Text style={styles.controlButtonText}>Mark All Read</Text>\n        </TouchableOpacity>\n        \n        <TouchableOpacity style={styles.controlButton} onPress={clearAllNotifications}>\n          <Trash2 size={16} color=\"#6B7280\" />\n          <Text style={styles.controlButtonText}>Clear All</Text>\n        </TouchableOpacity>\n      </View>\n\n      {/* Filters */}\n      {showFilters && (\n        <View style={styles.filtersContainer}>\n          <ScrollView horizontal showsHorizontalScrollIndicator={false}>\n            {[\n              { key: 'all', label: 'All' },\n              { key: 'unread', label: 'Unread' },\n              { key: 'high_priority', label: 'High Priority' },\n              { key: 'device', label: 'Device' },\n              { key: 'security', label: 'Security' }\n            ].map(filter => (\n              <TouchableOpacity\n                key={filter.key}\n                style={[\n                  styles.filterChip,\n                  selectedFilter === filter.key && styles.activeFilterChip\n                ]}\n                onPress={() => setSelectedFilter(filter.key as any)}\n              >\n                <Text style={[\n                  styles.filterChipText,\n                  selectedFilter === filter.key && styles.activeFilterChipText\n                ]}>\n                  {filter.label}\n                </Text>\n              </TouchableOpacity>\n            ))}\n          </ScrollView>\n        </View>\n      )}\n\n      {/* Notifications List */}\n      <ScrollView\n        style={styles.notificationsContainer}\n        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}\n      >\n        {filteredNotifications.length > 0 ? (\n          filteredNotifications.map((notification, index) => \n            renderNotificationItem(notification, index)\n          )\n        ) : (\n          <View style={styles.emptyState}>\n            <BellOff size={48} color=\"#D1D5DB\" />\n            <Text style={styles.emptyStateTitle}>No Notifications</Text>\n            <Text style={styles.emptyStateText}>\n              {selectedFilter === 'all' \n                ? 'You\\'re all caught up! No security notifications at this time.'\n                : `No ${selectedFilter} notifications found.`\n              }\n            </Text>\n          </View>\n        )}\n      </ScrollView>\n\n      {renderNotificationModal()}\n    </View>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    backgroundColor: '#F8FAFC'\n  },\n  loadingContainer: {\n    flex: 1,\n    justifyContent: 'center',\n    alignItems: 'center',\n    backgroundColor: '#F8FAFC'\n  },\n  loadingText: {\n    marginTop: 16,\n    fontSize: 16,\n    color: '#6B7280',\n    fontWeight: '500'\n  },\n  header: {\n    paddingTop: Platform.OS === 'ios' ? 50 : 30,\n    paddingBottom: 20,\n    paddingHorizontal: 20\n  },\n  headerContent: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'center'\n  },\n  headerLeft: {\n    flexDirection: 'row',\n    alignItems: 'center'\n  },\n  headerTitle: {\n    marginLeft: 12,\n    fontSize: 20,\n    fontWeight: 'bold',\n    color: '#FFFFFF'\n  },\n  closeButton: {\n    width: 32,\n    height: 32,\n    borderRadius: 16,\n    backgroundColor: 'rgba(255, 255, 255, 0.2)',\n    justifyContent: 'center',\n    alignItems: 'center'\n  },\n  statisticsContainer: {\n    flexDirection: 'row',\n    backgroundColor: '#FFFFFF',\n    paddingVertical: 16,\n    borderBottomWidth: 1,\n    borderBottomColor: '#E5E7EB'\n  },\n  statItem: {\n    flex: 1,\n    alignItems: 'center'\n  },\n  statValue: {\n    fontSize: 20,\n    fontWeight: 'bold',\n    color: '#1F2937'\n  },\n  statLabel: {\n    fontSize: 12,\n    color: '#6B7280',\n    marginTop: 4\n  },\n  controlsContainer: {\n    flexDirection: 'row',\n    backgroundColor: '#FFFFFF',\n    paddingHorizontal: 16,\n    paddingVertical: 12,\n    borderBottomWidth: 1,\n    borderBottomColor: '#E5E7EB'\n  },\n  controlButton: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    paddingHorizontal: 12,\n    paddingVertical: 8,\n    borderRadius: 6,\n    backgroundColor: '#F3F4F6',\n    marginRight: 8\n  },\n  activeControlButton: {\n    backgroundColor: '#3B82F6'\n  },\n  controlButtonText: {\n    marginLeft: 6,\n    fontSize: 12,\n    fontWeight: '500',\n    color: '#6B7280'\n  },\n  activeControlButtonText: {\n    color: '#FFFFFF'\n  },\n  filtersContainer: {\n    backgroundColor: '#FFFFFF',\n    paddingHorizontal: 16,\n    paddingVertical: 12,\n    borderBottomWidth: 1,\n    borderBottomColor: '#E5E7EB'\n  },\n  filterChip: {\n    paddingHorizontal: 12,\n    paddingVertical: 6,\n    borderRadius: 16,\n    backgroundColor: '#F3F4F6',\n    marginRight: 8\n  },\n  activeFilterChip: {\n    backgroundColor: '#3B82F6'\n  },\n  filterChipText: {\n    fontSize: 12,\n    fontWeight: '500',\n    color: '#6B7280'\n  },\n  activeFilterChipText: {\n    color: '#FFFFFF'\n  },\n  notificationsContainer: {\n    flex: 1,\n    padding: 16\n  },\n  notificationItem: {\n    backgroundColor: '#FFFFFF',\n    borderRadius: 8,\n    padding: 12,\n    marginBottom: 8,\n    shadowColor: '#000',\n    shadowOffset: { width: 0, height: 1 },\n    shadowOpacity: 0.05,\n    shadowRadius: 2,\n    elevation: 1\n  },\n  unreadNotification: {\n    borderLeftWidth: 4,\n    borderLeftColor: '#3B82F6'\n  },\n  notificationHeader: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'center',\n    marginBottom: 8\n  },\n  notificationIcons: {\n    flexDirection: 'row',\n    alignItems: 'center'\n  },\n  severityIndicator: {\n    width: 4,\n    height: 16,\n    borderRadius: 2,\n    marginRight: 8\n  },\n  notificationMeta: {\n    flexDirection: 'row',\n    alignItems: 'center'\n  },\n  notificationTimestamp: {\n    fontSize: 12,\n    color: '#6B7280'\n  },\n  unreadDot: {\n    width: 8,\n    height: 8,\n    borderRadius: 4,\n    backgroundColor: '#3B82F6',\n    marginLeft: 8\n  },\n  notificationContent: {\n    marginLeft: 20\n  },\n  notificationTitle: {\n    fontSize: 14,\n    fontWeight: '600',\n    color: '#1F2937',\n    marginBottom: 4\n  },\n  notificationMessage: {\n    fontSize: 12,\n    color: '#6B7280',\n    lineHeight: 16\n  },\n  actionRequiredBadge: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    backgroundColor: '#F59E0B',\n    paddingHorizontal: 8,\n    paddingVertical: 4,\n    borderRadius: 12,\n    marginTop: 8,\n    alignSelf: 'flex-start'\n  },\n  actionRequiredText: {\n    marginLeft: 4,\n    fontSize: 10,\n    fontWeight: '600',\n    color: '#FFFFFF'\n  },\n  emptyState: {\n    alignItems: 'center',\n    justifyContent: 'center',\n    paddingVertical: 64\n  },\n  emptyStateTitle: {\n    fontSize: 18,\n    fontWeight: '600',\n    color: '#374151',\n    marginTop: 16\n  },\n  emptyStateText: {\n    fontSize: 14,\n    color: '#6B7280',\n    textAlign: 'center',\n    marginTop: 8,\n    paddingHorizontal: 32\n  },\n  modalContainer: {\n    flex: 1,\n    backgroundColor: '#F8FAFC'\n  },\n  modalHeader: {\n    paddingTop: Platform.OS === 'ios' ? 50 : 30,\n    paddingBottom: 20,\n    paddingHorizontal: 20\n  },\n  modalHeaderContent: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'center'\n  },\n  modalHeaderLeft: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    flex: 1\n  },\n  modalTitle: {\n    marginLeft: 12,\n    fontSize: 18,\n    fontWeight: 'bold',\n    color: '#FFFFFF',\n    flex: 1\n  },\n  modalCloseButton: {\n    width: 32,\n    height: 32,\n    borderRadius: 16,\n    backgroundColor: 'rgba(255, 255, 255, 0.2)',\n    justifyContent: 'center',\n    alignItems: 'center'\n  },\n  modalContent: {\n    flex: 1,\n    padding: 16\n  },\n  modalSection: {\n    backgroundColor: '#FFFFFF',\n    borderRadius: 8,\n    padding: 16,\n    marginBottom: 16\n  },\n  modalSectionTitle: {\n    fontSize: 16,\n    fontWeight: '600',\n    color: '#1F2937',\n    marginBottom: 12\n  },\n  modalMessage: {\n    fontSize: 14,\n    color: '#374151',\n    lineHeight: 20,\n    marginBottom: 16\n  },\n  modalMetadata: {\n    borderTopWidth: 1,\n    borderTopColor: '#F3F4F6',\n    paddingTop: 12\n  },\n  modalMetadataItem: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    paddingVertical: 4\n  },\n  modalMetadataLabel: {\n    fontSize: 12,\n    color: '#6B7280',\n    fontWeight: '500'\n  },\n  modalMetadataValue: {\n    fontSize: 12,\n    color: '#1F2937',\n    fontWeight: '400'\n  },\n  deviceInfo: {\n    backgroundColor: '#F9FAFB',\n    borderRadius: 6,\n    padding: 12\n  },\n  deviceInfoItem: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    paddingVertical: 4\n  },\n  deviceInfoLabel: {\n    fontSize: 12,\n    color: '#6B7280',\n    fontWeight: '500'\n  },\n  deviceInfoValue: {\n    fontSize: 12,\n    color: '#1F2937',\n    fontWeight: '400'\n  },\n  modalActions: {\n    flexDirection: 'row',\n    flexWrap: 'wrap',\n    gap: 8\n  },\n  modalActionButton: {\n    flex: 1,\n    minWidth: 100,\n    paddingVertical: 12,\n    paddingHorizontal: 16,\n    borderRadius: 6,\n    alignItems: 'center'\n  },\n  primaryActionButton: {\n    backgroundColor: '#3B82F6'\n  },\n  dangerActionButton: {\n    backgroundColor: '#EF4444'\n  },\n  secondaryActionButton: {\n    backgroundColor: '#F3F4F6',\n    borderWidth: 1,\n    borderColor: '#D1D5DB'\n  },\n  modalActionButtonText: {\n    fontSize: 14,\n    fontWeight: '600',\n    color: '#FFFFFF'\n  },\n  secondaryActionButtonText: {\n    color: '#374151'\n  }\n});\n\nexport default SecurityNotificationCenter;"