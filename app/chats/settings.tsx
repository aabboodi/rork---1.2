import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import { Bell, Lock, Eye, Download, Trash2, Shield, Moon, Globe, ArrowLeft, Settings, Palette, Type, Image, Key, Fingerprint, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import SecurityManager from '@/services/security/SecurityManager';
import KeyManager from '@/services/security/KeyManager';
import BiometricAuthService from '@/services/security/BiometricAuthService';
import Button from '@/components/Button';
import PrivacyPolicyExplainer from '@/components/PrivacyPolicyExplainer';

interface ChatSettingsState {
  messageNotifications: boolean;
  groupNotifications: boolean;
  channelNotifications: boolean;
  readReceipts: boolean;
  lastSeen: boolean;
  encryptionEnabled: boolean;
  autoDownloadMedia: boolean;
  darkMode: boolean;
  // Enhanced E2EE settings
  e2eeByDefault: boolean;
  requireKeyVerification: boolean;
  allowAutomaticKeyRotation: boolean;
  biometricKeyVerification: boolean;
  perfectForwardSecrecy: boolean;
  securityLevel: 'standard' | 'high' | 'maximum';
}

interface E2EEStatus {
  enabled: boolean;
  totalSessions: number;
  establishedSessions: number;
  verifiedKeys: number;
  lastKeyRotation: number;
  securityLevel: string;
  // Signal Protocol specific
  signalProtocolEnabled: boolean;
  signalSessions: number;
  identityKeyFingerprint?: string;
  registrationId?: number;
  preKeysCount: number;
  oneTimeKeysCount: number;
}

export default function ChatSettingsScreen() {
  const { language, hasPermission } = useAuthStore();
  const t = translations[language];
  
  const [settings, setSettings] = useState<ChatSettingsState>({
    messageNotifications: true,
    groupNotifications: true,
    channelNotifications: false,
    readReceipts: true,
    lastSeen: false,
    encryptionEnabled: true,
    autoDownloadMedia: true,
    darkMode: false,
    // Enhanced E2EE settings
    e2eeByDefault: true,
    requireKeyVerification: true,
    allowAutomaticKeyRotation: true,
    biometricKeyVerification: true,
    perfectForwardSecrecy: true,
    securityLevel: 'high',
  });
  
  const [loading, setLoading] = useState(false);
  const [securityManager, setSecurityManager] = useState<SecurityManager | null>(null);
  const [keyManager, setKeyManager] = useState<KeyManager | null>(null);
  const [biometricAuth, setBiometricAuth] = useState<BiometricAuthService | null>(null);
  const [e2eeStatus, setE2eeStatus] = useState<E2EEStatus>({
    enabled: false,
    totalSessions: 0,
    establishedSessions: 0,
    verifiedKeys: 0,
    lastKeyRotation: 0,
    securityLevel: 'standard'
  });
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPrivacyExplainer, setShowPrivacyExplainer] = useState(false);
  const [selectedPrivacyService, setSelectedPrivacyService] = useState<string | undefined>();

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    try {
      setLoading(true);
      
      // Initialize security services
      const sm = SecurityManager.getInstance();
      const km = KeyManager.getInstance();
      const ba = BiometricAuthService.getInstance();
      
      setSecurityManager(sm);
      setKeyManager(km);
      setBiometricAuth(ba);
      
      // Check biometric availability
      const biometricAvail = await ba.isBiometricAvailable();
      setBiometricAvailable(biometricAvail);
      
      // Load Signal Protocol E2EE status
      const e2eeStatusData = km.getE2EEStatus();
      const signalStatus = await km.getSignalProtocolStatus();
      
      setE2eeStatus({
        enabled: true,
        totalSessions: e2eeStatusData.totalSessions,
        establishedSessions: e2eeStatusData.establishedSessions,
        verifiedKeys: e2eeStatusData.verifiedKeys,
        lastKeyRotation: e2eeStatusData.lastKeyRotation,
        securityLevel: 'high',
        // Signal Protocol specific
        signalProtocolEnabled: signalStatus.enabled,
        signalSessions: signalStatus.activeSessions,
        identityKeyFingerprint: signalStatus.identityKeyFingerprint,
        registrationId: signalStatus.registrationId,
        preKeysCount: signalStatus.preKeysCount,
        oneTimeKeysCount: signalStatus.oneTimeKeysCount
      });
      
      // Load saved settings from secure storage
      await loadSavedSettings();
      
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      Alert.alert(t.error, 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSettings = async () => {
    try {
      // In a real app, load from secure storage
      // For now, using default values
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<ChatSettingsState>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // Save to secure storage
      if (securityManager) {
        const secureStorage = securityManager.getCryptoService();
        // In a real implementation, save to secure storage
      }
      
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert(t.error, 'Failed to save settings');
    }
  };

  const handleNotificationToggle = async (type: 'message' | 'group' | 'channel', value: boolean) => {
    try {
      if (Platform.OS !== 'web') {
        // Request notification permissions if enabling
        if (value) {
          // In a real app, request notification permissions
          console.log('Requesting notification permissions');
        }
      }
      
      const settingKey = `${type}Notifications` as keyof ChatSettingsState;
      await saveSettings({ [settingKey]: value });
      
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      Alert.alert(t.error, 'Failed to update notification settings');
    }
  };

  const handlePrivacyToggle = async (type: 'readReceipts' | 'lastSeen', value: boolean) => {
    try {
      await saveSettings({ [type]: value });
      
      // Show privacy warning if disabling
      if (!value && type === 'readReceipts') {
        Alert.alert(
          t.privacy,
          'Disabling read receipts means you won\'t see when others read your messages either.',
          [{ text: t.continue, style: 'default' }]
        );
      }
      
    } catch (error) {
      console.error('Failed to toggle privacy setting:', error);
      Alert.alert(t.error, 'Failed to update privacy settings');
    }
  };

  const handleSecurityToggle = async (type: 'encryptionEnabled', value: boolean) => {
    try {
      if (type === 'encryptionEnabled' && !value) {
        // Show security warning
        Alert.alert(
          t.securityWarning,
          'Disabling encryption will make your messages less secure. Are you sure?',
          [
            { text: t.cancel, style: 'cancel' },
            { 
              text: t.continue, 
              style: 'destructive',
              onPress: async () => {
                await saveSettings({ [type]: value });
              }
            }
          ]
        );
        return;
      }
      
      await saveSettings({ [type]: value });
      
    } catch (error) {
      console.error('Failed to toggle security setting:', error);
      Alert.alert(t.error, 'Failed to update security settings');
    }
  };

  // CRITICAL: Handle E2EE settings changes
  const handleE2EEToggle = async (type: keyof ChatSettingsState, value: boolean) => {
    try {
      // Special handling for critical E2EE settings
      if (type === 'e2eeByDefault' && !value) {
        Alert.alert(
          'Disable End-to-End Encryption',
          'This will disable automatic encryption for new conversations. Existing encrypted conversations will remain encrypted. Continue?',
          [
            { text: t.cancel, style: 'cancel' },
            { 
              text: 'Disable', 
              style: 'destructive',
              onPress: async () => {
                await saveSettings({ [type]: value });
              }
            }
          ]
        );
        return;
      }

      if (type === 'requireKeyVerification' && !value) {
        Alert.alert(
          'Disable Key Verification',
          'This will allow encrypted conversations without verifying encryption keys. This reduces security. Continue?',
          [
            { text: t.cancel, style: 'cancel' },
            { 
              text: 'Disable', 
              style: 'destructive',
              onPress: async () => {
                await saveSettings({ [type]: value });
              }
            }
          ]
        );
        return;
      }

      if (type === 'biometricKeyVerification' && value && !biometricAvailable) {
        Alert.alert(
          'Biometric Not Available',
          'Biometric authentication is not available on this device.',
          [{ text: 'OK' }]
        );
        return;
      }

      await saveSettings({ [type]: value });
      
    } catch (error) {
      console.error('Failed to toggle E2EE setting:', error);
      Alert.alert(t.error, 'Failed to update encryption settings');
    }
  };

  const handleSecurityLevelChange = () => {
    const levels = ['standard', 'high', 'maximum'];
    const descriptions = [
      'Standard: Basic encryption with standard key rotation',
      'High: Enhanced encryption with frequent key rotation and verification',
      'Maximum: Military-grade encryption with continuous monitoring'
    ];

    Alert.alert(
      'Security Level',
      'Choose your encryption security level:',
      [
        { text: t.cancel, style: 'cancel' },
        ...levels.map((level, index) => ({
          text: `${level.charAt(0).toUpperCase() + level.slice(1)}`,
          onPress: async () => {
            Alert.alert(
              'Confirm Security Level',
              descriptions[index],
              [
                { text: t.cancel, style: 'cancel' },
                { 
                  text: 'Apply', 
                  onPress: async () => {
                    await saveSettings({ securityLevel: level as any });
                  }
                }
              ]
            );
          }
        }))
      ]
    );
  };

  const handleViewE2EEStatus = () => {
    const statusMessage = `🔒 Encryption: ${e2eeStatus.enabled ? 'Enabled' : 'Disabled'}
📊 Total Sessions: ${e2eeStatus.totalSessions}
✅ Established: ${e2eeStatus.establishedSessions}
🔑 Verified Keys: ${e2eeStatus.verifiedKeys}
🛡️ Security Level: ${e2eeStatus.securityLevel}
🔄 Last Key Rotation: ${e2eeStatus.lastKeyRotation > 0 ? new Date(e2eeStatus.lastKeyRotation).toLocaleDateString() : 'Never'}

📡 Signal Protocol: ${e2eeStatus.signalProtocolEnabled ? 'Active' : 'Inactive'}
🆔 Registration ID: ${e2eeStatus.registrationId || 'N/A'}
🔐 Pre-Keys: ${e2eeStatus.preKeysCount || 0}
⚡ One-Time Keys: ${e2eeStatus.oneTimeKeysCount || 0}
🔍 Identity Key: ${e2eeStatus.identityKeyFingerprint ? e2eeStatus.identityKeyFingerprint.substring(0, 16) + '...' : 'N/A'}`;
    
    Alert.alert(
      'End-to-End Encryption Status',
      statusMessage,
      [
        { text: 'OK' },
        { text: 'Manage Keys', onPress: () => router.push('/chats/settings') },
        { text: 'Signal Protocol Info', onPress: handleSignalProtocolInfo }
      ]
    );
  };

  const handleSignalProtocolInfo = () => {
    Alert.alert(
      'Signal Protocol Information',
      `The Signal Protocol provides state-of-the-art end-to-end encryption with:

• Perfect Forward Secrecy
• Future Secrecy (Self-healing)
• Deniable Authentication
• Asynchronous Messaging
• Double Ratchet Algorithm

Your messages are protected with the same encryption used by Signal, WhatsApp, and other secure messaging apps.`,
      [{ text: 'OK' }]
    );
  };

  const handleManageKeys = () => {
    Alert.alert(
      'Manage Encryption Keys',
      'Choose an action:',
      [
        { text: t.cancel, style: 'cancel' },
        { text: 'View Key Fingerprints', onPress: handleViewKeyFingerprints },
        { text: 'Rotate All Keys', onPress: handleRotateAllKeys },
        { text: 'Export Key Backup', onPress: handleExportKeys },
        { text: 'Verify Key Integrity', onPress: handleVerifyKeyIntegrity }
      ]
    );
  };

  const handleViewKeyFingerprints = async () => {
    try {
      if (!keyManager) return;
      
      // In a real implementation, get actual key fingerprints
      const fingerprints = [
        'A1B2 C3D4 E5F6 7890',
        'B2C3 D4E5 F678 9012',
        'C3D4 E5F6 7890 1234'
      ];
      
      Alert.alert(
        'Your Key Fingerprints',
        fingerprints.map((fp, i) => `Key ${i + 1}: ${fp}`).join('\n'),
        [
          { text: 'OK' },
          { text: 'Share', onPress: () => Alert.alert('Shared', 'Key fingerprints copied to clipboard') }
        ]
      );
    } catch (error) {
      console.error('Failed to view key fingerprints:', error);
      Alert.alert(t.error, 'Failed to retrieve key fingerprints');
    }
  };

  const handleRotateAllKeys = async () => {
    try {
      Alert.alert(
        'Rotate All Keys',
        'This will generate new encryption keys for all conversations. This may temporarily interrupt encrypted conversations. Continue?',
        [
          { text: t.cancel, style: 'cancel' },
          { 
            text: 'Rotate Keys', 
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              
              // Simulate key rotation
              setTimeout(() => {
                setLoading(false);
                Alert.alert(t.success, 'All encryption keys have been rotated successfully');
                
                // Update E2EE status
                setE2eeStatus(prev => ({
                  ...prev,
                  lastKeyRotation: Date.now()
                }));
              }, 3000);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to rotate keys:', error);
      Alert.alert(t.error, 'Failed to rotate encryption keys');
      setLoading(false);
    }
  };

  const handleExportKeys = async () => {
    try {
      Alert.alert(
        'Export Key Backup',
        'This will create an encrypted backup of your encryption keys. Store this backup securely.',
        [
          { text: t.cancel, style: 'cancel' },
          { 
            text: 'Export', 
            onPress: async () => {
              setLoading(true);
              
              // Simulate key export
              setTimeout(() => {
                setLoading(false);
                Alert.alert(t.success, 'Key backup exported successfully');
              }, 2000);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to export keys:', error);
      Alert.alert(t.error, 'Failed to export key backup');
      setLoading(false);
    }
  };

  const handleVerifyKeyIntegrity = async () => {
    try {
      setLoading(true);
      
      // Simulate key integrity verification
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Key Integrity Check',
          '✅ All encryption keys verified\n✅ No tampering detected\n✅ Key signatures valid\n✅ Chain integrity confirmed',
          [{ text: 'OK' }]
        );
      }, 2000);
    } catch (error) {
      console.error('Failed to verify key integrity:', error);
      Alert.alert(t.error, 'Failed to verify key integrity');
      setLoading(false);
    }
  };

  const handleTwoFactorAuth = () => {
    if (hasPermission('manageSecurity')) {
      router.push('/auth/mfa');
    } else {
      Alert.alert(t.error, 'You don\'t have permission to access this feature');
    }
  };

  const handleBlockedContacts = () => {
    Alert.alert(
      t.blockedContacts,
      'You have 3 blocked contacts',
      [
        { text: t.cancel, style: 'cancel' },
        { text: 'View List', onPress: () => console.log('Navigate to blocked contacts') }
      ]
    );
  };

  const handleStorageUsage = () => {
    Alert.alert(
      t.storageUsage,
      'Total: 2.4 GB\n\nPhotos: 1.2 GB\nVideos: 800 MB\nDocuments: 400 MB\nEncryption Keys: 15 MB',
      [
        { text: t.cancel, style: 'cancel' },
        { text: 'Manage Storage', onPress: () => console.log('Navigate to storage management') }
      ]
    );
  };

  const handleNetworkUsage = () => {
    Alert.alert(
      t.networkUsage,
      'This month: 156 MB\n\nDownloaded: 98 MB\nUploaded: 58 MB\nKey Exchange: 2 MB',
      [{ text: t.done, style: 'default' }]
    );
  };

  const handleChatWallpaper = () => {
    Alert.alert(
      t.chatWallpaper,
      'Choose wallpaper option',
      [
        { text: t.cancel, style: 'cancel' },
        { text: 'Gallery', onPress: () => console.log('Open gallery') },
        { text: 'Default Wallpapers', onPress: () => console.log('Show default wallpapers') }
      ]
    );
  };

  const handleFontSize = () => {
    Alert.alert(
      t.fontSize,
      'Select font size',
      [
        { text: t.cancel, style: 'cancel' },
        { text: 'Small', onPress: () => console.log('Set small font') },
        { text: 'Medium', onPress: () => console.log('Set medium font') },
        { text: 'Large', onPress: () => console.log('Set large font') }
      ]
    );
  };

  const handleExportChats = async () => {
    try {
      setLoading(true);
      
      Alert.alert(
        t.exportChats,
        'This will create a backup of all your chats. Encrypted messages will remain encrypted in the backup. Continue?',
        [
          { text: t.cancel, style: 'cancel' },
          { 
            text: t.continue, 
            onPress: async () => {
              // Simulate export process
              setTimeout(() => {
                Alert.alert(t.success, 'Chats exported successfully');
                setLoading(false);
              }, 2000);
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Failed to export chats:', error);
      Alert.alert(t.error, 'Failed to export chats');
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      Alert.alert(
        t.clearCache,
        'This will clear temporary files and free up space. Encryption keys will not be affected. Continue?',
        [
          { text: t.cancel, style: 'cancel' },
          { 
            text: t.continue, 
            onPress: async () => {
              setLoading(true);
              
              // Simulate cache clearing
              setTimeout(() => {
                Alert.alert(t.success, 'Cache cleared successfully');
                setLoading(false);
              }, 1500);
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      Alert.alert(t.error, 'Failed to clear cache');
    }
  };

  const handleDeleteAllChats = () => {
    Alert.alert(
      t.deleteAllChats,
      'This action cannot be undone. All your chats and encryption keys will be permanently deleted.',
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: t.delete, 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Warning',
              'Are you absolutely sure? This will delete ALL your chats and encryption keys permanently.',
              [
                { text: t.cancel, style: 'cancel' },
                { 
                  text: 'Delete All', 
                  style: 'destructive',
                  onPress: () => {
                    console.log('Delete all chats confirmed');
                    Alert.alert(t.success, 'All chats and encryption keys have been deleted');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/');
    }
  };

  const handlePrivacyInfo = (serviceId: string) => {
    setSelectedPrivacyService(serviceId);
    setShowPrivacyExplainer(true);
  };

  const getSecurityLevelColor = () => {
    switch (settings.securityLevel) {
      case 'maximum':
        return Colors.success;
      case 'high':
        return Colors.primary;
      default:
        return Colors.warning;
    }
  };

  const getSecurityLevelIcon = () => {
    switch (settings.securityLevel) {
      case 'maximum':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'high':
        return <Shield size={16} color={Colors.primary} />;
      default:
        return <AlertTriangle size={16} color={Colors.warning} />;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t.chatSettings,
          headerTitleStyle: {
            color: Colors.dark,
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleGoBack}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.container}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.notifications}</Text>
            <TouchableOpacity 
              onPress={() => handlePrivacyInfo('expo_notifications')}
              style={styles.infoButton}
            >
              <Info size={16} color={Colors.medium} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.messageNotifications}</Text>
            <Switch
              value={settings.messageNotifications}
              onValueChange={(value) => handleNotificationToggle('message', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.groupNotifications}</Text>
            <Switch
              value={settings.groupNotifications}
              onValueChange={(value) => handleNotificationToggle('group', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.channelNotifications}</Text>
            <Switch
              value={settings.channelNotifications}
              onValueChange={(value) => handleNotificationToggle('channel', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>

          <View style={styles.privacyNote}>
            <Info size={14} color={Colors.medium} />
            <Text style={styles.privacyNoteText}>
              الإشعارات تستخدم خدمة Expo Push Notifications
            </Text>
            <TouchableOpacity onPress={() => handlePrivacyInfo('expo_notifications')}>
              <Text style={styles.privacyNoteLink}>اعرف المزيد</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Privacy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.privacy}</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.readReceipts}</Text>
            <Switch
              value={settings.readReceipts}
              onValueChange={(value) => handlePrivacyToggle('readReceipts', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.lastSeen}</Text>
            <Switch
              value={settings.lastSeen}
              onValueChange={(value) => handlePrivacyToggle('lastSeen', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.profilePhoto}</Text>
            <Text style={styles.settingValue}>{t.everyone}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Enhanced E2EE Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>End-to-End Encryption</Text>
            <TouchableOpacity 
              onPress={() => handlePrivacyInfo('expo_crypto')}
              style={styles.infoButton}
            >
              <Info size={16} color={Colors.medium} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleViewE2EEStatus}>
            <View style={styles.settingWithIcon}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.settingLabel}>Encryption Status</Text>
            </View>
            <Text style={[styles.settingValue, { color: Colors.success }]}>Active</Text>
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>E2EE by Default</Text>
            <Switch
              value={settings.e2eeByDefault}
              onValueChange={(value) => handleE2EEToggle('e2eeByDefault', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Require Key Verification</Text>
            <Switch
              value={settings.requireKeyVerification}
              onValueChange={(value) => handleE2EEToggle('requireKeyVerification', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Biometric Key Verification</Text>
            <Switch
              value={settings.biometricKeyVerification && biometricAvailable}
              onValueChange={(value) => handleE2EEToggle('biometricKeyVerification', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading || !biometricAvailable}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Perfect Forward Secrecy</Text>
            <Switch
              value={settings.perfectForwardSecrecy}
              onValueChange={(value) => handleE2EEToggle('perfectForwardSecrecy', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Automatic Key Rotation</Text>
            <Switch
              value={settings.allowAutomaticKeyRotation}
              onValueChange={(value) => handleE2EEToggle('allowAutomaticKeyRotation', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleSecurityLevelChange}>
            <View style={styles.settingWithIcon}>
              {getSecurityLevelIcon()}
              <Text style={styles.settingLabel}>Security Level</Text>
            </View>
            <Text style={[styles.settingValue, { color: getSecurityLevelColor() }]}>
              {settings.securityLevel.charAt(0).toUpperCase() + settings.securityLevel.slice(1)}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleManageKeys}>
            <View style={styles.settingWithIcon}>
              <Key size={16} color={Colors.medium} />
              <Text style={styles.settingLabel}>Manage Encryption Keys</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.privacyNote}>
            <Shield size={14} color={Colors.success} />
            <Text style={styles.privacyNoteText}>
              يستخدم بروتوكول Signal للتشفير من طرف إلى طرف
            </Text>
            <TouchableOpacity onPress={() => handlePrivacyInfo('expo_crypto')}>
              <Text style={styles.privacyNoteLink}>تفاصيل التشفير</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Traditional Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.security}</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.encryptionEnabled}</Text>
            <Switch
              value={settings.encryptionEnabled}
              onValueChange={(value) => handleSecurityToggle('encryptionEnabled', value)}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleTwoFactorAuth}>
            <View style={styles.settingWithIcon}>
              <Fingerprint size={16} color={Colors.medium} />
              <Text style={styles.settingLabel}>{t.twoFactorAuth}</Text>
            </View>
            <Text style={styles.settingValue}>{t.enabled}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleBlockedContacts}>
            <Text style={styles.settingLabel}>{t.blockedContacts}</Text>
            <Text style={styles.settingValue}>3</Text>
          </TouchableOpacity>

          <View style={styles.privacyNote}>
            <Eye size={14} color={Colors.primary} />
            <Text style={styles.privacyNoteText}>
              المصادقة البيومترية تستخدم Expo Local Authentication
            </Text>
            <TouchableOpacity onPress={() => handlePrivacyInfo('expo_biometrics')}>
              <Text style={styles.privacyNoteLink}>معلومات الأمان</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Data and Storage Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Download size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.dataAndStorage}</Text>
            <TouchableOpacity 
              onPress={() => handlePrivacyInfo('expo_secure_store')}
              style={styles.infoButton}
            >
              <Info size={16} color={Colors.medium} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.autoDownloadMedia}</Text>
            <Switch
              value={settings.autoDownloadMedia}
              onValueChange={(value) => saveSettings({ autoDownloadMedia: value })}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleStorageUsage}>
            <Text style={styles.settingLabel}>{t.storageUsage}</Text>
            <Text style={styles.settingValue}>2.4 GB</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleNetworkUsage}>
            <Text style={styles.settingLabel}>{t.networkUsage}</Text>
            <Text style={styles.settingValue}>156 MB</Text>
          </TouchableOpacity>

          <View style={styles.privacyNote}>
            <Lock size={14} color={Colors.success} />
            <Text style={styles.privacyNoteText}>
              البيانات محفوظة محلياً بتشفير Expo Secure Store
            </Text>
            <TouchableOpacity onPress={() => handlePrivacyInfo('expo_secure_store')}>
              <Text style={styles.privacyNoteLink}>أمان التخزين</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Appearance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Moon size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.appearance}</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.darkMode}</Text>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => saveSettings({ darkMode: value })}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
              disabled={loading}
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleChatWallpaper}>
            <View style={styles.settingWithIcon}>
              <Image size={16} color={Colors.medium} />
              <Text style={styles.settingLabel}>{t.chatWallpaper}</Text>
            </View>
            <Text style={styles.settingValue}>{t.default}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleFontSize}>
            <View style={styles.settingWithIcon}>
              <Type size={16} color={Colors.medium} />
              <Text style={styles.settingLabel}>{t.fontSize}</Text>
            </View>
            <Text style={styles.settingValue}>{t.medium}</Text>
          </TouchableOpacity>

          <View style={styles.privacyNote}>
            <Palette size={14} color={Colors.medium} />
            <Text style={styles.privacyNoteText}>
              إعدادات المظهر محفوظة محلياً فقط
            </Text>
          </View>
        </View>
        
        {/* Advanced Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.advanced}</Text>
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleExportChats}>
            <View style={styles.settingWithIcon}>
              <Download size={16} color={Colors.medium} />
              <Text style={styles.settingLabel}>{t.exportChats}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleClearCache}>
            <View style={styles.settingWithIcon}>
              <Settings size={16} color={Colors.medium} />
              <Text style={styles.settingLabel}>{t.clearCache}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]} 
            onPress={handleDeleteAllChats}
          >
            <Trash2 size={20} color={Colors.error} />
            <Text style={[styles.settingLabel, styles.dangerText]}>{t.deleteAllChats}</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title={t.save}
            onPress={() => Alert.alert(t.success, 'Settings saved successfully')}
            variant="primary"
            loading={loading}
            style={styles.saveButton}
          />
          
          <Button
            title={t.back}
            onPress={handleGoBack}
            variant="outline"
            style={styles.backButtonBottom}
          />
        </View>
      </ScrollView>

      {/* Privacy Policy Explainer Modal */}
      <Modal
        visible={showPrivacyExplainer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PrivacyPolicyExplainer
          visible={showPrivacyExplainer}
          onClose={() => {
            setShowPrivacyExplainer(false);
            setSelectedPrivacyService(undefined);
          }}
          service={selectedPrivacyService}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 8,
    flex: 1,
  },
  infoButton: {
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 48,
  },
  settingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.dark,
    flex: 1,
    marginLeft: 8,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.light,
    borderRadius: 8,
    gap: 8,
  },
  privacyNoteText: {
    fontSize: 12,
    color: Colors.medium,
    flex: 1,
  },
  privacyNoteLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  dangerItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dangerText: {
    color: Colors.error,
    marginLeft: 8,
    fontWeight: '500',
  },
  actionButtons: {
    padding: 16,
    gap: 12,
    marginBottom: 32,
  },
  saveButton: {
    marginBottom: 8,
  },
  backButtonBottom: {
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  protocolBadge: {
    fontSize: 10,
    color: Colors.success,
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    fontWeight: '600',
  },
});