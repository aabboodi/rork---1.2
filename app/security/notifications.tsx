import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  Bell, 
  Shield, 
  Settings, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Clock,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react-native';
import SecurityNotificationService, { 
  SecurityNotificationSettings, 
  NotificationChannel 
} from '@/services/security/SecurityNotificationService';

const SecurityNotificationsScreen: React.FC = () => {
  const [settings, setSettings] = useState<SecurityNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingNotification, setTestingNotification] = useState(false);

  const notificationService = SecurityNotificationService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = notificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SecurityNotificationSettings>) => {
    if (!settings) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      await notificationService.updateSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const updateAlertType = (alertType: string, updates: any) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      alertTypes: {
        ...settings.alertTypes,
        [alertType]: {
          ...settings.alertTypes[alertType],
          ...updates
        }
      }
    };
    updateSettings(newSettings);
  };

  const updateChannel = (channelId: string, updates: Partial<NotificationChannel>) => {
    if (!settings) return;

    const newChannels = settings.channels.map(channel =>
      channel.id === channelId ? { ...channel, ...updates } : channel
    );
    updateSettings({ channels: newChannels });
  };

  const sendTestNotification = async () => {
    setTestingNotification(true);
    try {
      await notificationService.sendSecurityAlert({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        title: 'Test Security Alert',
        message: 'This is a test notification to verify your security alert settings are working correctly.',
        actionRequired: false,
        metadata: { test: true }
      });
      Alert.alert('Success', 'Test notification sent successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setTestingNotification(false);
    }
  };

  const getChannelIcon = (type: NotificationChannel['type']) => {
    switch (type) {
      case 'PUSH': return Smartphone;
      case 'EMAIL': return Mail;
      case 'SMS': return MessageSquare;
      case 'IN_APP': return Bell;
      default: return Bell;
    }
  };

  const getAlertTypeDescription = (type: string) => {
    const descriptions = {
      LOGIN_NEW_DEVICE: 'Alerts when someone logs in from a new or unrecognized device',
      SUSPICIOUS_ACTIVITY: 'Notifications about unusual account activity or potential security threats',
      SECURITY_BREACH: 'Critical alerts about confirmed security incidents',
      FAILED_LOGIN: 'Notifications about failed login attempts',
      ACCOUNT_LOCKED: 'Alerts when your account is locked due to security reasons',
      PASSWORD_CHANGED: 'Notifications when your password is changed',
      MFA_DISABLED: 'Alerts when multi-factor authentication is disabled',
      PERMISSION_ESCALATION: 'Notifications about privilege escalation attempts'
    };
    return descriptions[type] || 'Security notification';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MEDIUM': return '#D97706';
      case 'LOW': return '#059669';
      default: return '#6B7280';
    }
  };

  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Security Notifications' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Security Notifications',
          headerRight: () => (
            <TouchableOpacity
              onPress={sendTestNotification}
              disabled={testingNotification}
              style={styles.testButton}
            >
              <Text style={[
                styles.testButtonText,
                testingNotification && styles.testButtonDisabled
              ]}>
                {testingNotification ? 'Sending...' : 'Test'}
              </Text>
            </TouchableOpacity>
          )
        }} 
      />

      <ScrollView style={styles.content}>
        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Shield size={24} color="#3B82F6" />
            <Text style={styles.overviewTitle}>Security Alert System</Text>
          </View>
          <Text style={styles.overviewDescription}>
            Stay informed about important security events on your account. 
            Configure how and when you receive notifications about potential threats.
          </Text>
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Object.values(settings.alertTypes).filter(a => a.enabled).length}
              </Text>
              <Text style={styles.statLabel}>Active Alerts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {settings.channels.filter(c => c.enabled).length}
              </Text>
              <Text style={styles.statLabel}>Channels</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {settings.deviceTrustLevel}
              </Text>
              <Text style={styles.statLabel}>Security Level</Text>
            </View>
          </View>
        </View>

        {/* Notification Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Channels</Text>
          <Text style={styles.sectionDescription}>
            Choose how you want to receive security alerts
          </Text>
          
          {settings.channels.map((channel) => {
            const ChannelIcon = getChannelIcon(channel.type);
            return (
              <View key={channel.id} style={styles.channelItem}>
                <View style={styles.channelHeader}>
                  <View style={styles.channelInfo}>
                    <ChannelIcon size={20} color="#6B7280" />
                    <View style={styles.channelDetails}>
                      <Text style={styles.channelName}>{channel.name}</Text>
                      <Text style={styles.channelType}>{channel.type}</Text>
                    </View>
                  </View>
                  <Switch
                    value={channel.enabled}
                    onValueChange={(enabled) => updateChannel(channel.id, { enabled })}
                  />
                </View>
                
                {channel.enabled && (
                  <View style={styles.channelSettings}>
                    <View style={styles.channelSetting}>
                      <View style={styles.settingInfo}>
                        <Volume2 size={16} color="#6B7280" />
                        <Text style={styles.settingLabel}>Sound</Text>
                      </View>
                      <Switch
                        value={channel.settings.sound}
                        onValueChange={(sound) => 
                          updateChannel(channel.id, {
                            settings: { ...channel.settings, sound }
                          })
                        }
                      />
                    </View>
                    
                    {Platform.OS !== 'web' && (
                      <View style={styles.channelSetting}>
                        <View style={styles.settingInfo}>
                          <Smartphone size={16} color="#6B7280" />
                          <Text style={styles.settingLabel}>Vibration</Text>
                        </View>
                        <Switch
                          value={channel.settings.vibration}
                          onValueChange={(vibration) => 
                            updateChannel(channel.id, {
                              settings: { ...channel.settings, vibration }
                            })
                          }
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Alert Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Types</Text>
          <Text style={styles.sectionDescription}>
            Configure which security events trigger notifications
          </Text>
          
          {Object.entries(settings.alertTypes).map(([type, config]) => {
            const alertName = type.replace(/_/g, ' ').toLowerCase()
              .replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <View key={type} style={styles.alertTypeItem}>
                <View style={styles.alertTypeHeader}>
                  <View style={styles.alertTypeInfo}>
                    <Text style={styles.alertTypeName}>{alertName}</Text>
                    <Text style={styles.alertTypeDescription}>
                      {getAlertTypeDescription(type)}
                    </Text>
                  </View>
                  <Switch
                    value={config.enabled}
                    onValueChange={(enabled) => updateAlertType(type, { enabled })}
                  />
                </View>
                
                {config.enabled && (
                  <View style={styles.alertTypeSettings}>
                    <View style={styles.cooldownSetting}>
                      <Text style={styles.cooldownLabel}>
                        Cooldown: {config.cooldownMinutes} minutes
                      </Text>
                      <Text style={styles.cooldownDescription}>
                        Minimum time between similar alerts
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionDescription}>
            Pause non-critical notifications during specific hours
          </Text>
          
          <View style={styles.quietHoursContainer}>
            <View style={styles.quietHoursHeader}>
              <View style={styles.quietHoursInfo}>
                <Clock size={20} color="#6B7280" />
                <Text style={styles.quietHoursLabel}>Enable Quiet Hours</Text>
              </View>
              <Switch
                value={settings.quietHours.enabled}
                onValueChange={(enabled) => 
                  updateSettings({
                    quietHours: { ...settings.quietHours, enabled }
                  })
                }
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
                    onChangeText={(startTime) => 
                      updateSettings({
                        quietHours: { ...settings.quietHours, startTime }
                      })
                    }
                  />
                </View>
                <View style={styles.timeInput}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TextInput
                    style={styles.timeField}
                    value={settings.quietHours.endTime}
                    placeholder="08:00"
                    onChangeText={(endTime) => 
                      updateSettings({
                        quietHours: { ...settings.quietHours, endTime }
                      })
                    }
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Security Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Trust Level</Text>
          <Text style={styles.sectionDescription}>
            Control how strictly new devices are monitored
          </Text>
          
          <View style={styles.securityLevelContainer}>
            {(['RELAXED', 'MODERATE', 'STRICT'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.securityLevelOption,
                  settings.deviceTrustLevel === level && styles.securityLevelSelected
                ]}
                onPress={() => updateSettings({ deviceTrustLevel: level })}
              >
                <Text style={[
                  styles.securityLevelText,
                  settings.deviceTrustLevel === level && styles.securityLevelTextSelected
                ]}>
                  {level}
                </Text>
                <Text style={[
                  styles.securityLevelDescription,
                  settings.deviceTrustLevel === level && styles.securityLevelDescriptionSelected
                ]}>
                  {level === 'RELAXED' && 'Fewer alerts, more convenience'}
                  {level === 'MODERATE' && 'Balanced security and usability'}
                  {level === 'STRICT' && 'Maximum security, more alerts'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Info size={20} color="#3B82F6" />
            <Text style={styles.infoTitle}>Important Information</Text>
          </View>
          <Text style={styles.infoText}>
            • Critical security alerts will always be delivered regardless of quiet hours{'\n'}
            • Email notifications may take a few minutes to arrive{'\n'}
            • Test notifications help verify your settings are working{'\n'}
            • You can always view all alerts in the Security Center
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    marginRight: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  overviewDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  channelItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
    marginBottom: 16,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelDetails: {
    marginLeft: 12,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  channelType: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  channelSettings: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  channelSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  alertTypeItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
    marginBottom: 16,
  },
  alertTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertTypeInfo: {
    flex: 1,
    marginRight: 16,
  },
  alertTypeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  alertTypeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  alertTypeSettings: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cooldownSetting: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  cooldownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  cooldownDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  quietHoursContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  quietHoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quietHoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quietHoursLabel: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  timeSettings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  timeField: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  securityLevelContainer: {
    gap: 12,
  },
  securityLevelOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
  },
  securityLevelSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  securityLevelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  securityLevelTextSelected: {
    color: '#3B82F6',
  },
  securityLevelDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  securityLevelDescriptionSelected: {
    color: '#1E40AF',
  },
  infoCard: {
    backgroundColor: '#EBF4FF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});

export default SecurityNotificationsScreen;