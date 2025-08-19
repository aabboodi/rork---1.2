import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, 
  Users, 
  Settings, 
  Activity, 
  AlertTriangle, 
  Eye,
  Crown,
  MessageSquare,
  Info
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { translations } from '@/constants/i18n';
import Colors from '@/constants/colors';
import SecurityManager from '@/services/security/SecurityManager';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { language } = useAuthStore();
  const t = translations[language];
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [threatMonitoring, setThreatMonitoring] = useState<any>(null);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  // OTP is always enabled - no bypass allowed
  const [otpEnabled, setOtpEnabledLocal] = useState(true);

  useEffect(() => {
    loadAdminData();
    // OTP is always enabled
  }, []);

  const loadAdminData = async () => {
    try {
      const securityManager = SecurityManager.getInstance();
      
      const status = securityManager.getSecurityStatus();
      const threats = securityManager.getThreatMonitoringResults();
      const compliance = await securityManager.getComplianceStatus();
      
      setSecurityStatus(status);
      setThreatMonitoring(threats);
      setComplianceStatus(compliance);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const handleOTPToggle = (enabled: boolean) => {
    Alert.alert(
      'OTP Control',
      `Are you sure you want to ${enabled ? 'enable' : 'disable'} OTP verification for all users?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => {
            setOTPEnabled(enabled);
            setOtpEnabledLocal(enabled);
            Alert.alert(
              'Success',
              `OTP verification has been ${enabled ? 'enabled' : 'disabled'} for all users.`
            );
          }
        }
      ]
    );
  };

  const handleBasicSecurityCheck = async () => {
    try {
      const securityManager = SecurityManager.getInstance();
      const result = await securityManager.runSecurityAudit('basic_check');
      
      Alert.alert(
        'Basic Security Check Complete',
        `Security check completed with score: ${result.score}/100
This is a basic implementation for development.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to run security check');
    }
  };

  const AdminCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    onPress 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    color: string; 
    onPress?: () => void; 
  }) => (
    <TouchableOpacity style={styles.adminCard} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Crown size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>{t.adminPanel}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Role Badge */}
        <View style={styles.roleBadge}>
          <Crown size={20} color={Colors.primary} />
          <Text style={styles.roleText}>
            {userRole === 'main_admin' ? t.mainAdmin : t.adminUser}
          </Text>
        </View>

        {/* Implementation Warning */}
        <View style={styles.warningSection}>
          <Info size={20} color={Colors.warning} />
          <Text style={styles.warningText}>
            Basic Admin Panel - Advanced features are planned but not implemented
          </Text>
        </View>

        {/* OTP Control Section - Only for Main Admin */}
        {userRole === 'main_admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Controls</Text>
            <View style={styles.controlCard}>
              <View style={styles.controlItem}>
                <View style={styles.controlLeft}>
                  <MessageSquare size={24} color={Colors.primary} />
                  <View style={styles.controlInfo}>
                    <Text style={styles.controlTitle}>OTP Verification</Text>
                    <Text style={styles.controlDescription}>
                      Control OTP verification for all users
                    </Text>
                  </View>
                </View>
                <Switch
                  value={otpEnabled}
                  onValueChange={handleOTPToggle}
                  trackColor={{ false: Colors.light, true: Colors.primary }}
                  thumbColor={otpEnabled ? Colors.background : Colors.medium}
                />
              </View>
              <View style={styles.controlStatus}>
                <Text style={[
                  styles.statusText,
                  { color: otpEnabled ? Colors.success || '#10B981' : Colors.warning || '#F59E0B' }
                ]}>
                  OTP is currently {otpEnabled ? 'ENABLED' : 'DISABLED'} for all users
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* System Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.cardGrid}>
            <AdminCard
              title="System Status"
              value={threatMonitoring?.systemStatus || 'Loading...'}
              icon={Shield}
              color={threatMonitoring?.systemStatus === 'secure' ? Colors.success || '#10B981' : Colors.warning || '#F59E0B'}
            />
            <AdminCard
              title="Active Users"
              value="Mock Data"
              icon={Users}
              color={Colors.primary}
            />
            <AdminCard
              title="Security Events"
              value={securityStatus?.monitoring?.recentSecurityEvents || 0}
              icon={AlertTriangle}
              color={Colors.warning || '#F59E0B'}
            />
            <AdminCard
              title="Implementation"
              value="Basic"
              icon={Activity}
              color={Colors.success || '#10B981'}
            />
          </View>
        </View>

        {/* Basic Security Management */}
        {hasPermission('canViewSecurityLogs') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security Management</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleBasicSecurityCheck}
              >
                <Shield size={20} color={Colors.primary} />
                <Text style={styles.actionText}>Basic Security Check</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Security Logs', 'Basic security event logging is active')}
              >
                <Eye size={20} color={Colors.primary} />
                <Text style={styles.actionText}>View Basic Logs</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* System Settings */}
        {hasPermission('canManageSystemSettings') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Settings</Text>
            <View style={styles.settingsList}>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingLabel}>Maintenance Mode</Text>
                <Text style={styles.settingValue}>Disabled</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingLabel}>Registration</Text>
                <Text style={styles.settingValue}>Enabled</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingLabel}>Security Level</Text>
                <Text style={styles.settingValue}>Basic</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Basic Compliance Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Compliance Status</Text>
          <View style={styles.complianceGrid}>
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Basic Encryption</Text>
              <Text style={[
                styles.complianceStatus,
                { color: complianceStatus?.dataEncryptionCompliant ? Colors.success || '#10B981' : Colors.error || '#EF4444' }
              ]}>
                {complianceStatus?.dataEncryptionCompliant ? 'Active' : 'Inactive'}
              </Text>
            </View>
            
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Audit Trail</Text>
              <Text style={[
                styles.complianceStatus,
                { color: complianceStatus?.auditTrailComplete ? Colors.success || '#10B981' : Colors.error || '#EF4444' }
              ]}>
                {complianceStatus?.auditTrailComplete ? 'Active' : 'Inactive'}
              </Text>
            </View>
            
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Access Controls</Text>
              <Text style={[
                styles.complianceStatus,
                { color: complianceStatus?.accessControlsValid ? Colors.success || '#10B981' : Colors.error || '#EF4444' }
              ]}>
                {complianceStatus?.accessControlsValid ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: Colors.medium,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 16,
  },
  controlCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  controlInfo: {
    marginLeft: 12,
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  controlDescription: {
    fontSize: 14,
    color: Colors.medium,
  },
  controlStatus: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adminCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    color: Colors.medium,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark,
    marginTop: 8,
    textAlign: 'center',
  },
  settingsList: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.dark,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  complianceGrid: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
  },
  complianceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  complianceLabel: {
    fontSize: 16,
    color: Colors.dark,
  },
  complianceStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
});