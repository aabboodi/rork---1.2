import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, AlertTriangle, Eye, Lock, Code, Smartphone, Activity, Settings } from 'lucide-react-native';
import MobileSecurityService from '@/services/security/MobileSecurityService';

interface MobileSecurityDashboardProps {
  onClose?: () => void;
}

const MobileSecurityDashboard: React.FC<MobileSecurityDashboardProps> = ({ onClose }) => {
  const [mobileSecurityService] = useState(() => MobileSecurityService.getInstance());
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [threats, setThreats] = useState<any[]>([]);
  const [cspViolations, setCSPViolations] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Configuration states
  const [tapjackingConfig, setTapjackingConfig] = useState({
    enableOverlayDetection: true,
    enableUIRedressingProtection: true,
    enableClickjackingPrevention: true,
    enableTouchEventValidation: true,
    blockSuspiciousApps: true,
    requireUserConfirmation: true,
  });
  
  const [storageConfig, setStorageConfig] = useState({
    enableAdvancedEncryption: true,
    enableIntegrityChecks: true,
    enableAntiTamperingProtection: true,
    enableRuntimeValidation: true,
  });
  
  const [codeInjectionConfig, setCodeInjectionConfig] = useState({
    enablePluginValidation: true,
    enableScriptInjectionPrevention: true,
    enableDynamicCodeDetection: true,
    blockUntrustedSources: true,
    enableCSPEnforcement: true,
  });

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      const status = mobileSecurityService.getMobileSecurityStatus();
      const allThreats = mobileSecurityService.getMobileThreats();
      const violations = mobileSecurityService.getCSPViolations();
      
      setSecurityStatus(status);
      setThreats(allThreats.slice(-20)); // Show last 20 threats
      setCSPViolations(violations.slice(-10)); // Show last 10 violations
    } catch (error) {
      console.error('Failed to load security data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSecurityData();
    setRefreshing(false);
  };

  const handleForceSecurityCheck = async () => {
    try {
      Alert.alert(
        'Security Check',
        'Running comprehensive mobile security check...',
        [{ text: 'OK' }]
      );
      
      await mobileSecurityService.forceMobileSecurityCheck();
      await loadSecurityData();
      
      Alert.alert(
        'Security Check Complete',
        'Mobile security check completed successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Security Check Failed',
        'Failed to perform security check. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearThreats = () => {
    Alert.alert(
      'Clear Threat History',
      'Are you sure you want to clear all threat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            mobileSecurityService.clearThreatHistory();
            loadSecurityData();
          },
        },
      ]
    );
  };

  const updateTapjackingConfig = (key: string, value: boolean) => {
    const newConfig = { ...tapjackingConfig, [key]: value };
    setTapjackingConfig(newConfig);
    mobileSecurityService.updateTapjackingConfig(newConfig);
  };

  const updateStorageConfig = (key: string, value: boolean) => {
    const newConfig = { ...storageConfig, [key]: value };
    setStorageConfig(newConfig);
    mobileSecurityService.updateStorageConfig(newConfig);
  };

  const updateCodeInjectionConfig = (key: string, value: boolean) => {
    const newConfig = { ...codeInjectionConfig, [key]: value };
    setCodeInjectionConfig(newConfig);
    mobileSecurityService.updateCodeInjectionConfig(newConfig);
  };

  const getThreatSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'tapjacking':
      case 'overlay_attack':
      case 'ui_redressing':
      case 'clickjacking':
        return <Eye size={16} color="#ffffff" />;
      case 'insecure_storage':
        return <Lock size={16} color="#ffffff" />;
      case 'code_injection':
      case 'malicious_plugin':
        return <Code size={16} color="#ffffff" />;
      default:
        return <AlertTriangle size={16} color="#ffffff" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderSecurityStatus = () => {
    if (!securityStatus) return null;

    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Shield size={24} color="#10b981" />
          <Text style={styles.statusTitle}>Mobile Security Status</Text>
        </View>
        
        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, { backgroundColor: securityStatus.tapjackingProtection ? '#10b981' : '#dc2626' }]}>
            <Eye size={20} color="#ffffff" />
            <Text style={styles.statusCardTitle}>Tapjacking Protection</Text>
            <Text style={styles.statusCardValue}>
              {securityStatus.tapjackingProtection ? 'Active' : 'Inactive'}
            </Text>
          </View>
          
          <View style={[styles.statusCard, { backgroundColor: securityStatus.storageSecurityActive ? '#10b981' : '#dc2626' }]}>
            <Lock size={20} color="#ffffff" />
            <Text style={styles.statusCardTitle}>Storage Security</Text>
            <Text style={styles.statusCardValue}>
              {securityStatus.storageSecurityActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          
          <View style={[styles.statusCard, { backgroundColor: securityStatus.codeInjectionPrevention ? '#10b981' : '#dc2626' }]}>
            <Code size={20} color="#ffffff" />
            <Text style={styles.statusCardTitle}>Code Injection Prevention</Text>
            <Text style={styles.statusCardValue}>
              {securityStatus.codeInjectionPrevention ? 'Active' : 'Inactive'}
            </Text>
          </View>
          
          <View style={[styles.statusCard, { backgroundColor: securityStatus.monitoringActive ? '#10b981' : '#dc2626' }]}>
            <Activity size={20} color="#ffffff" />
            <Text style={styles.statusCardTitle}>Monitoring</Text>
            <Text style={styles.statusCardValue}>
              {securityStatus.monitoringActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{securityStatus.threatsDetected}</Text>
            <Text style={styles.statLabel}>Total Threats</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>
              {securityStatus.criticalThreats}
            </Text>
            <Text style={styles.statLabel}>Critical Threats</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Platform.OS}</Text>
            <Text style={styles.statLabel}>Platform</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderThreats = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AlertTriangle size={20} color="#dc2626" />
          <Text style={styles.sectionTitle}>Recent Threats ({threats.length})</Text>
        </View>
        
        {threats.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={48} color="#10b981" />
            <Text style={styles.emptyStateText}>No threats detected</Text>
            <Text style={styles.emptyStateSubtext}>Your mobile app is secure</Text>
          </View>
        ) : (
          <View style={styles.threatsList}>
            {threats.map((threat, index) => (
              <View key={index} style={styles.threatItem}>
                <View style={[styles.threatIcon, { backgroundColor: getThreatSeverityColor(threat.severity) }]}>
                  {getThreatIcon(threat.type)}
                </View>
                <View style={styles.threatContent}>
                  <View style={styles.threatHeader}>
                    <Text style={styles.threatType}>{threat.type.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={[styles.threatSeverity, { color: getThreatSeverityColor(threat.severity) }]}>
                      {threat.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.threatDetails}>{threat.details}</Text>
                  <View style={styles.threatMeta}>
                    <Text style={styles.threatTimestamp}>{formatTimestamp(threat.timestamp)}</Text>
                    <Text style={styles.threatPlatform}>{threat.platform}</Text>
                    <Text style={styles.threatConfidence}>Confidence: {threat.confidence}%</Text>
                  </View>
                  {threat.mitigationAction && (
                    <Text style={styles.threatMitigation}>
                      Action: {threat.mitigationAction.replace(/_/g, ' ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCSPViolations = () => {
    if (Platform.OS !== 'web' || cspViolations.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Code size={20} color="#ea580c" />
          <Text style={styles.sectionTitle}>CSP Violations ({cspViolations.length})</Text>
        </View>
        
        <View style={styles.violationsList}>
          {cspViolations.map((violation, index) => (
            <View key={index} style={styles.violationItem}>
              <Text style={styles.violationType}>{violation.type}</Text>
              <Text style={styles.violationDetails}>{violation.details}</Text>
              <Text style={styles.violationTimestamp}>{formatTimestamp(violation.timestamp)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Settings size={20} color="#6366f1" />
          <Text style={styles.sectionTitle}>Security Configuration</Text>
        </View>
        
        {/* Tapjacking Protection Settings */}
        <View style={styles.configSection}>
          <Text style={styles.configTitle}>Tapjacking Protection</Text>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Overlay Detection</Text>
            <Switch
              value={tapjackingConfig.enableOverlayDetection}
              onValueChange={(value) => updateTapjackingConfig('enableOverlayDetection', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>UI Redressing Protection</Text>
            <Switch
              value={tapjackingConfig.enableUIRedressingProtection}
              onValueChange={(value) => updateTapjackingConfig('enableUIRedressingProtection', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Clickjacking Prevention</Text>
            <Switch
              value={tapjackingConfig.enableClickjackingPrevention}
              onValueChange={(value) => updateTapjackingConfig('enableClickjackingPrevention', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Touch Event Validation</Text>
            <Switch
              value={tapjackingConfig.enableTouchEventValidation}
              onValueChange={(value) => updateTapjackingConfig('enableTouchEventValidation', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Block Suspicious Apps</Text>
            <Switch
              value={tapjackingConfig.blockSuspiciousApps}
              onValueChange={(value) => updateTapjackingConfig('blockSuspiciousApps', value)}
            />
          </View>
        </View>
        
        {/* Storage Security Settings */}
        <View style={styles.configSection}>
          <Text style={styles.configTitle}>Storage Security</Text>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Advanced Encryption</Text>
            <Switch
              value={storageConfig.enableAdvancedEncryption}
              onValueChange={(value) => updateStorageConfig('enableAdvancedEncryption', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Integrity Checks</Text>
            <Switch
              value={storageConfig.enableIntegrityChecks}
              onValueChange={(value) => updateStorageConfig('enableIntegrityChecks', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Anti-Tampering Protection</Text>
            <Switch
              value={storageConfig.enableAntiTamperingProtection}
              onValueChange={(value) => updateStorageConfig('enableAntiTamperingProtection', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Runtime Validation</Text>
            <Switch
              value={storageConfig.enableRuntimeValidation}
              onValueChange={(value) => updateStorageConfig('enableRuntimeValidation', value)}
            />
          </View>
        </View>
        
        {/* Code Injection Prevention Settings */}
        <View style={styles.configSection}>
          <Text style={styles.configTitle}>Code Injection Prevention</Text>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Plugin Validation</Text>
            <Switch
              value={codeInjectionConfig.enablePluginValidation}
              onValueChange={(value) => updateCodeInjectionConfig('enablePluginValidation', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Script Injection Prevention</Text>
            <Switch
              value={codeInjectionConfig.enableScriptInjectionPrevention}
              onValueChange={(value) => updateCodeInjectionConfig('enableScriptInjectionPrevention', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Dynamic Code Detection</Text>
            <Switch
              value={codeInjectionConfig.enableDynamicCodeDetection}
              onValueChange={(value) => updateCodeInjectionConfig('enableDynamicCodeDetection', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Block Untrusted Sources</Text>
            <Switch
              value={codeInjectionConfig.blockUntrustedSources}
              onValueChange={(value) => updateCodeInjectionConfig('blockUntrustedSources', value)}
            />
          </View>
          
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>CSP Enforcement</Text>
            <Switch
              value={codeInjectionConfig.enableCSPEnforcement}
              onValueChange={(value) => updateCodeInjectionConfig('enableCSPEnforcement', value)}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderActions = () => {
    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleForceSecurityCheck}>
          <Smartphone size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Run Security Check</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]} 
          onPress={() => setShowSettings(!showSettings)}
        >
          <Settings size={20} color="#6366f1" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            {showSettings ? 'Hide Settings' : 'Show Settings'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]} 
          onPress={handleClearThreats}
        >
          <AlertTriangle size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Clear Threats</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Shield size={24} color="#6366f1" />
          <Text style={styles.headerTitle}>Mobile Security Dashboard</Text>
        </View>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderSecurityStatus()}
        {renderActions()}
        {renderSettings()}
        {renderThreats()}
        {renderCSPViolations()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  statusCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  statusCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  threatsList: {
    gap: 12,
  },
  threatItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e2e8f0',
  },
  threatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threatContent: {
    flex: 1,
    gap: 4,
  },
  threatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threatType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  threatSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  threatDetails: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  threatMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  threatTimestamp: {
    fontSize: 11,
    color: '#64748b',
  },
  threatPlatform: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  threatConfidence: {
    fontSize: 11,
    color: '#64748b',
  },
  threatMitigation: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginTop: 4,
  },
  violationsList: {
    gap: 8,
  },
  violationItem: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  violationType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  violationDetails: {
    fontSize: 12,
    color: '#7f1d1d',
    marginTop: 2,
  },
  violationTimestamp: {
    fontSize: 11,
    color: '#991b1b',
    marginTop: 4,
  },
  configSection: {
    marginBottom: 24,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  configLabel: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#6366f1',
  },
});

export default MobileSecurityDashboard;