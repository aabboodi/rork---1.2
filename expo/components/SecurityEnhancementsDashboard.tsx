import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, 
  Lock, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Smartphone,
  Key,
  Bell,
  Activity,
  Settings,
  RefreshCw,
  Zap
} from 'lucide-react-native';

// Import security services
import SessionManager from '@/services/security/SessionManager';
import HttpOnlyCookieService from '@/services/security/HttpOnlyCookieService';
import ProgressiveLockoutService from '@/services/security/ProgressiveLockoutService';
import NewDeviceNotificationService from '@/services/security/NewDeviceNotificationService';
import ScreenProtectionService from '@/services/security/ScreenProtectionService';
import KeyRotationService from '@/services/security/KeyRotationService';
import SessionRevocationService from '@/services/security/SessionRevocationService';

interface SecurityStatus {
  httpOnlyCookies: any;
  progressiveLockout: any;
  deviceNotifications: any;
  screenProtection: any;
  keyRotation: any;
  sessionRevocation: any;
  sessionSecurity: any;
}

const SecurityEnhancementsDashboard: React.FC = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Initialize services
  const sessionManager = SessionManager.getInstance();
  const cookieService = HttpOnlyCookieService.getInstance();
  const lockoutService = ProgressiveLockoutService.getInstance();
  const deviceNotificationService = NewDeviceNotificationService.getInstance();
  const screenProtectionService = ScreenProtectionService.getInstance();
  const keyRotationService = KeyRotationService.getInstance();
  const sessionRevocationService = SessionRevocationService.getInstance();

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      setLoading(true);

      // Initialize services
      await lockoutService.initialize();
      await deviceNotificationService.initialize();
      await keyRotationService.initialize();

      // Get status from all services
      const [
        httpOnlyCookies,
        progressiveLockout,
        deviceNotifications,
        screenProtection,
        keyRotation,
        sessionRevocation,
        sessionSecurity
      ] = await Promise.all([
        cookieService.getCookieSecurityStatus(),
        lockoutService.getLockoutStatistics(),
        deviceNotificationService.getNotificationStatistics(),
        screenProtectionService.getProtectionStatistics(),
        keyRotationService.getRotationStatistics(),
        sessionManager.getRevocationStatistics(),
        sessionManager.getSessionSecurityStatus()
      ]);

      setSecurityStatus({
        httpOnlyCookies,
        progressiveLockout,
        deviceNotifications,
        screenProtection,
        keyRotation,
        sessionRevocation,
        sessionSecurity
      });
    } catch (error) {
      console.error('Failed to load security status:', error);
      Alert.alert('Error', 'Failed to load security status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSecurityStatus();
  };

  const handleToggleScreenProtection = async () => {
    try {
      const isEnabled = screenProtectionService.isProtectionEnabled();
      
      if (isEnabled) {
        await screenProtectionService.disableScreenProtection();
        Alert.alert('Success', 'Screen protection disabled');
      } else {
        await screenProtectionService.enableScreenProtection();
        Alert.alert('Success', 'Screen protection enabled');
      }
      
      loadSecurityStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle screen protection');
    }
  };

  const handleClearAllLockouts = async () => {
    Alert.alert(
      'Clear All Lockouts',
      'Are you sure you want to clear all progressive lockouts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would require admin privileges in production
              Alert.alert('Info', 'This would clear all lockouts (admin only)');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear lockouts');
            }
          }
        }
      ]
    );
  };

  const handleForceKeyRotation = async () => {
    try {
      await keyRotationService.forceRotateAllKeys('manual_admin_action');
      Alert.alert('Success', 'Key rotation initiated');
      loadSecurityStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate key rotation');
    }
  };

  const renderOverviewTab = () => {
    if (!securityStatus) return null;

    const criticalIssues = [
      securityStatus.progressiveLockout.activeLockouts > 0 && 'Active lockouts detected',
      securityStatus.deviceNotifications.pendingNotifications > 5 && 'Multiple pending device notifications',
      securityStatus.screenProtection.recentViolations > 0 && 'Recent screen protection violations',
      !securityStatus.screenProtection.protectionEnabled && 'Screen protection disabled',
      securityStatus.sessionSecurity.criticalEvents > 0 && 'Critical session events detected'
    ].filter(Boolean);

    return (
      <ScrollView style={styles.tabContent}>
        {/* Security Score */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Security Score</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>
              {criticalIssues.length === 0 ? '95' : criticalIssues.length < 3 ? '75' : '45'}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
          <Text style={styles.scoreDescription}>
            {criticalIssues.length === 0 
              ? 'Excellent security posture' 
              : `${criticalIssues.length} security issue${criticalIssues.length > 1 ? 's' : ''} detected`
            }
          </Text>
        </View>

        {/* Critical Issues */}
        {criticalIssues.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AlertTriangle size={24} color="#EF4444" />
              <Text style={styles.cardTitle}>Critical Issues</Text>
            </View>
            {criticalIssues.map((issue, index) => (
              <View key={index} style={styles.issueItem}>
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.issueText}>{issue}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Security Features Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Security Features</Text>
          </View>
          
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Lock size={20} color={securityStatus.httpOnlyCookies.encryptionEnabled ? "#10B981" : "#EF4444"} />
              <Text style={styles.featureLabel}>HttpOnly Cookies</Text>
              <Text style={styles.featureStatus}>
                {securityStatus.httpOnlyCookies.totalCookies} active
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Clock size={20} color={securityStatus.progressiveLockout.activeLockouts === 0 ? "#10B981" : "#F59E0B"} />
              <Text style={styles.featureLabel}>Progressive Lockout</Text>
              <Text style={styles.featureStatus}>
                {securityStatus.progressiveLockout.activeLockouts} active
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Bell size={20} color={securityStatus.deviceNotifications.pendingNotifications === 0 ? "#10B981" : "#F59E0B"} />
              <Text style={styles.featureLabel}>Device Notifications</Text>
              <Text style={styles.featureStatus}>
                {securityStatus.deviceNotifications.pendingNotifications} pending
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Eye size={20} color={securityStatus.screenProtection.protectionEnabled ? "#10B981" : "#EF4444"} />
              <Text style={styles.featureLabel}>Screen Protection</Text>
              <Text style={styles.featureStatus}>
                {securityStatus.screenProtection.protectionEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Key size={20} color="#10B981" />
              <Text style={styles.featureLabel}>Key Rotation</Text>
              <Text style={styles.featureStatus}>
                {securityStatus.keyRotation.totalRotations} rotations
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Zap size={20} color="#10B981" />
              <Text style={styles.featureLabel}>Session Revocation</Text>
              <Text style={styles.featureStatus}>
                {securityStatus.sessionRevocation.revocationStats.activeRevocations} active
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Settings size={24} color="#6B7280" />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleScreenProtection}>
            <Eye size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {securityStatus.screenProtection.protectionEnabled ? 'Disable' : 'Enable'} Screen Protection
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleForceKeyRotation}>
            <RefreshCw size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Force Key Rotation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleClearAllLockouts}>
            <Clock size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Clear All Lockouts</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderDetailsTab = () => {
    if (!securityStatus) return null;

    return (
      <ScrollView style={styles.tabContent}>
        {/* HttpOnly Cookies */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Lock size={24} color="#10B981" />
            <Text style={styles.cardTitle}>HttpOnly Cookies Security</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Cookies:</Text>
            <Text style={styles.detailValue}>{securityStatus.httpOnlyCookies.totalCookies}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Security Events:</Text>
            <Text style={styles.detailValue}>{securityStatus.httpOnlyCookies.securityEvents}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Critical Events:</Text>
            <Text style={styles.detailValue}>{securityStatus.httpOnlyCookies.criticalEvents}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Encryption:</Text>
            <Text style={[styles.detailValue, { color: securityStatus.httpOnlyCookies.encryptionEnabled ? '#10B981' : '#EF4444' }]}>
              {securityStatus.httpOnlyCookies.encryptionEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Device Binding:</Text>
            <Text style={[styles.detailValue, { color: securityStatus.httpOnlyCookies.deviceBindingEnabled ? '#10B981' : '#EF4444' }]}>
              {securityStatus.httpOnlyCookies.deviceBindingEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>

        {/* Progressive Lockout */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>Progressive Lockout System</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Lockouts:</Text>
            <Text style={styles.detailValue}>{securityStatus.progressiveLockout.totalLockouts}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Active Lockouts:</Text>
            <Text style={styles.detailValue}>{securityStatus.progressiveLockout.activeLockouts}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recent Lockouts:</Text>
            <Text style={styles.detailValue}>{securityStatus.progressiveLockout.recentLockouts}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Avg Duration:</Text>
            <Text style={styles.detailValue}>
              {Math.round(securityStatus.progressiveLockout.averageLockoutDuration / 1000)}s
            </Text>
          </View>
        </View>

        {/* Device Notifications */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Smartphone size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Device Notifications</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Notifications:</Text>
            <Text style={styles.detailValue}>{securityStatus.deviceNotifications.totalNotifications}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pending:</Text>
            <Text style={styles.detailValue}>{securityStatus.deviceNotifications.pendingNotifications}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Acknowledged:</Text>
            <Text style={styles.detailValue}>{securityStatus.deviceNotifications.acknowledgedNotifications}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Known Devices:</Text>
            <Text style={styles.detailValue}>{securityStatus.deviceNotifications.knownDevices}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trusted Devices:</Text>
            <Text style={styles.detailValue}>{securityStatus.deviceNotifications.trustedDevices}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Avg Risk Score:</Text>
            <Text style={styles.detailValue}>
              {Math.round(securityStatus.deviceNotifications.averageRiskScore)}%
            </Text>
          </View>
        </View>

        {/* Screen Protection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Eye size={24} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Screen Protection</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Protection Status:</Text>
            <Text style={[styles.detailValue, { color: securityStatus.screenProtection.protectionEnabled ? '#10B981' : '#EF4444' }]}>
              {securityStatus.screenProtection.protectionEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Screenshot Attempts:</Text>
            <Text style={styles.detailValue}>{securityStatus.screenProtection.screenshotAttempts}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recording Attempts:</Text>
            <Text style={styles.detailValue}>{securityStatus.screenProtection.recordingAttempts}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recent Violations:</Text>
            <Text style={styles.detailValue}>{securityStatus.screenProtection.recentViolations}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Background Events:</Text>
            <Text style={styles.detailValue}>{securityStatus.screenProtection.appBackgroundEvents}</Text>
          </View>
        </View>

        {/* Key Rotation */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Key size={24} color="#EC4899" />
            <Text style={styles.cardTitle}>Key Rotation System</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Rotations:</Text>
            <Text style={styles.detailValue}>{securityStatus.keyRotation.totalRotations}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Successful:</Text>
            <Text style={styles.detailValue}>{securityStatus.keyRotation.successfulRotations}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Failed:</Text>
            <Text style={styles.detailValue}>{securityStatus.keyRotation.failedRotations}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Active Keys:</Text>
            <Text style={styles.detailValue}>{securityStatus.keyRotation.activeKeys}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Next Rotation:</Text>
            <Text style={styles.detailValue}>
              {securityStatus.keyRotation.nextRotation ? 
                new Date(securityStatus.keyRotation.nextRotation).toLocaleTimeString() : 
                'Not scheduled'
              }
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Activity size={48} color="#3B82F6" />
          <Text style={styles.loadingText}>Loading Security Status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Security Enhancements</Text>
        <Text style={styles.subtitle}>
          Comprehensive security monitoring and control
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'overview' ? (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {renderOverviewTab()}
          </ScrollView>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {renderDetailsTab()}
          </ScrollView>
        )}
      </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10B981',
  },
  scoreLabel: {
    fontSize: 24,
    color: '#6B7280',
    marginLeft: 4,
  },
  scoreDescription: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  featureStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default SecurityEnhancementsDashboard;