import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Mic, MapPin, Users, FileText, Fingerprint, Shield, Info } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import SecurityManager from '@/services/security/SecurityManager';
import Button from '@/components/Button';

interface Permission {
  name: string;
  icon: React.ReactNode;
  description: string;
  requestFunction: () => Promise<any>;
  granted: boolean;
  required: boolean;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const { language, enableBiometric, biometricEnabled } = useAuthStore();
  const t = translations[language];
  
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      name: 'Camera',
      icon: <Camera size={24} color={Colors.primary} />,
      description: 'للسماح بالتقاط الصور ومقاطع الفيديو',
      requestFunction: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        return status === 'granted';
      },
      granted: false,
      required: true,
    },
    {
      name: 'Microphone',
      icon: <Mic size={24} color={Colors.primary} />,
      description: 'للسماح بتسجيل الصوت والمكالمات الصوتية',
      requestFunction: async () => {
        // This is a mock since we can't directly request microphone permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        return status === 'granted';
      },
      granted: false,
      required: true,
    },
    {
      name: 'Location',
      icon: <MapPin size={24} color={Colors.primary} />,
      description: 'للسماح باقتراح الأصدقاء القريبين والخدمات المحلية',
      requestFunction: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
      },
      granted: false,
      required: false,
    },
    {
      name: 'Contacts',
      icon: <Users size={24} color={Colors.primary} />,
      description: 'للسماح بالعثور على أصدقائك الذين يستخدمون التطبيق',
      requestFunction: async () => {
        // Mock contacts permission
        return new Promise(resolve => {
          setTimeout(() => resolve(true), 500);
        });
      },
      granted: false,
      required: false,
    },
    {
      name: 'Storage',
      icon: <FileText size={24} color={Colors.primary} />,
      description: 'للسماح بحفظ الصور ومقاطع الفيديو والملفات',
      requestFunction: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status === 'granted';
      },
      granted: false,
      required: true,
    },
    {
      name: 'Biometric Authentication',
      icon: <Fingerprint size={24} color={Colors.success || '#10B981'} />,
      description: 'للسماح بالمصادقة البيومترية (بصمة الإصبع أو الوجه)',
      requestFunction: async () => {
        return await enableBiometric();
      },
      granted: biometricEnabled,
      required: false,
    },
  ]);

  const [securityStatus, setSecurityStatus] = useState<any>(null);
  
  useEffect(() => {
    // Initialize basic security status
    const initSecurity = async () => {
      try {
        const securityManager = SecurityManager.getInstance();
        const status = securityManager.getSecurityStatus();
        setSecurityStatus(status);
      } catch (error) {
        console.error('Security initialization failed:', error);
      }
    };

    initSecurity();
  }, []);
  
  const requestPermission = async (index: number) => {
    try {
      const granted = await permissions[index].requestFunction();
      
      const updatedPermissions = [...permissions];
      updatedPermissions[index] = {
        ...updatedPermissions[index],
        granted,
      };
      
      setPermissions(updatedPermissions);

      if (granted && permissions[index].name === 'Biometric Authentication') {
        Alert.alert(
          'Biometric Authentication Enabled',
          'You can now use your fingerprint or face to quickly access the app.'
        );
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission. Please try again.');
    }
  };
  
  const handleContinue = () => {
    // Check if all required permissions are granted
    const requiredPermissions = permissions.filter(p => p.required);
    const grantedRequired = requiredPermissions.filter(p => p.granted);
    
    if (grantedRequired.length < requiredPermissions.length) {
      Alert.alert(
        'Required Permissions',
        'Some required permissions are not granted. The app may not function properly.',
        [
          { text: 'Continue Anyway', onPress: () => router.replace('/(tabs)') },
          { text: 'Grant Permissions', style: 'cancel' }
        ]
      );
    } else {
      router.replace('/(tabs)');
    }
  };

  const getPermissionStats = () => {
    const total = permissions.length;
    const granted = permissions.filter(p => p.granted).length;
    const required = permissions.filter(p => p.required).length;
    const grantedRequired = permissions.filter(p => p.required && p.granted).length;
    
    return { total, granted, required, grantedRequired };
  };

  const stats = getPermissionStats();
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Security Status Header */}
      <View style={styles.securityHeader}>
        <Shield size={20} color={Colors.success || '#10B981'} />
        <Text style={styles.securityHeaderText}>Basic Security Setup</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>الأذونات المطلوبة</Text>
        <Text style={styles.subtitle}>
          يحتاج التطبيق إلى الأذونات التالية للعمل بشكل صحيح
        </Text>
        
        {/* Permission Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.granted}/{stats.total}</Text>
            <Text style={styles.statLabel}>Granted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: stats.grantedRequired === stats.required ? Colors.success || '#10B981' : Colors.warning || '#F59E0B' }]}>
              {stats.grantedRequired}/{stats.required}
            </Text>
            <Text style={styles.statLabel}>Required</Text>
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {permissions.map((permission, index) => (
          <View key={index} style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <View style={[
                styles.iconContainer,
                permission.granted && styles.iconContainerGranted
              ]}>
                {permission.icon}
              </View>
              <View style={styles.permissionText}>
                <View style={styles.permissionHeader}>
                  <Text style={styles.permissionName}>{permission.name}</Text>
                  {permission.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>Required</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.permissionDescription}>
                  {permission.description}
                </Text>
              </View>
            </View>
            
            <Button
              title={permission.granted ? 'تم' : 'السماح'}
              variant={permission.granted ? 'secondary' : 'primary'}
              size="small"
              onPress={() => requestPermission(index)}
              disabled={permission.granted}
            />
          </View>
        ))}

        {/* Implementation Notice */}
        <View style={styles.implementationNotice}>
          <Info size={16} color={Colors.primary} />
          <Text style={styles.implementationText}>
            Basic security implementation - Advanced features are planned for future releases
          </Text>
        </View>

        {/* Security Information */}
        {securityStatus && (
          <View style={styles.securityInfo}>
            <Text style={styles.securityInfoTitle}>Security Status</Text>
            <View style={styles.securityFeatures}>
              <View style={styles.securityFeature}>
                <Shield size={16} color={Colors.success || '#10B981'} />
                <Text style={styles.securityFeatureText}>
                  Implementation: {securityStatus.implementationLevel || 'Basic'}
                </Text>
              </View>
              <View style={styles.securityFeature}>
                <Fingerprint size={16} color={Colors.primary} />
                <Text style={styles.securityFeatureText}>
                  Biometrics: {securityStatus.biometrics?.isAvailable ? 'Available' : 'Not Available'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <Button
          title="متابعة"
          onPress={handleContinue}
          style={styles.continueButton}
        />
        <Text style={styles.skipText}>
          يمكنك تغيير هذه الإعدادات لاحقًا من صفحة الإعدادات
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: Colors.light,
  },
  securityHeaderText: {
    fontSize: 12,
    color: Colors.success || '#10B981',
    marginLeft: 8,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.medium,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.light,
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerGranted: {
    backgroundColor: Colors.light,
  },
  permissionText: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginRight: 8,
  },
  requiredBadge: {
    backgroundColor: Colors.warning || '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  permissionDescription: {
    fontSize: 14,
    color: Colors.medium,
  },
  implementationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  implementationText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
  securityInfo: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.light,
    borderRadius: 12,
  },
  securityInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  securityFeatures: {
    gap: 8,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityFeatureText: {
    fontSize: 12,
    color: Colors.medium,
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  continueButton: {
    width: '100%',
    marginBottom: 12,
  },
  skipText: {
    fontSize: 14,
    color: Colors.medium,
    textAlign: 'center',
  },
});