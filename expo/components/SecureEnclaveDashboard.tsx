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
import { 
  Shield, 
  Fingerprint, 
  Smartphone, 
  Lock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Key,
  Cpu,
  Activity,
  Clock,
  TrendingUp
} from 'lucide-react-native';
import BiometricAuthService from '@/services/security/BiometricAuthService';
import SecureEnclaveValidationService from '@/services/security/SecureEnclaveValidationService';
import SessionBindingService from '@/services/security/SessionBindingService';

interface SecurityMetrics {
  biometricInfo: any;
  capabilities: any;
  sessionStats: any;
  validationStats: any;
  hardwareStatus: any;
}

const SecureEnclaveDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadSecurityMetrics();
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true);
      
      const biometricAuth = BiometricAuthService.getInstance();
      const secureEnclaveValidation = SecureEnclaveValidationService.getInstance();
      const sessionBinding = SessionBindingService.getInstance();

      const [
        biometricInfo,
        capabilities,
        sessionStats,
        validationStats,
        hardwareStatus
      ] = await Promise.all([
        biometricAuth.getBiometricInfo(),
        secureEnclaveValidation.getCapabilities(),
        sessionBinding.getSessionStatistics(),
        secureEnclaveValidation.getValidationStatistics(),
        biometricAuth.getHardwareSecurityCapabilities()
      ]);

      setMetrics({
        biometricInfo,
        capabilities,
        sessionStats,
        validationStats,
        hardwareStatus
      });
    } catch (error) {
      console.error('Failed to load security metrics:', error);
      Alert.alert('Error', 'Failed to load security metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSecurityMetrics();
    setRefreshing(false);
  };

  const testBiometricAuthentication = async () => {
    try {
      const biometricAuth = BiometricAuthService.getInstance();
      const secureEnclaveValidation = SecureEnclaveValidationService.getInstance();
      
      Alert.alert(
        'Biometric Test',
        'This will test biometric authentication with Secure Enclave validation.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Test',
            onPress: async () => {
              try {
                const testSessionId = `test_${Date.now()}`;
                const result = await secureEnclaveValidation.authenticateWithSecureEnclaveValidation(
                  testSessionId,
                  false
                );
                
                setTestResults(result);
                
                Alert.alert(
                  'Test Results',
                  `Success: ${result.success}\n` +
                  `Secure Enclave Used: ${result.secureEnclaveUsed}\n` +
                  `Trust Score: ${result.trustScore.toFixed(3)}\n` +
                  `Validation Level: ${result.validationLevel}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Test Failed', error instanceof Error ? error.message : 'Unknown error');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate biometric test');
    }
  };

  const testSessionBinding = async () => {
    try {
      const sessionBinding = SessionBindingService.getInstance();
      
      Alert.alert(
        'Session Binding Test',
        'This will test session binding with device fingerprinting.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Test',
            onPress: async () => {
              try {
                const testSessionId = `session_test_${Date.now()}`;
                const testUserId = 'test_user';
                
                // Create session binding
                const binding = await sessionBinding.createSessionBinding(
                  testSessionId,
                  testUserId,
                  true
                );
                
                // Validate session binding
                const validation = await sessionBinding.validateSessionBinding(testSessionId);
                
                Alert.alert(
                  'Session Binding Test Results',
                  `Binding Created: ✅\n` +
                  `Security Level: ${binding.securityLevel}\n` +
                  `Trust Score: ${binding.trustScore.toFixed(3)}\n` +
                  `Hardware Protected: ${binding.hardwareProtected}\n` +
                  `Validation: ${validation.valid ? '✅' : '❌'}\n` +
                  `Device Match: ${validation.deviceMatch ? '✅' : '❌'}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Test Failed', error instanceof Error ? error.message : 'Unknown error');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate session binding test');
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'maximum': return '#10B981';
      case 'high': return '#3B82F6';
      case 'medium': return '#F59E0B';
      case 'low': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 0.9) return '#10B981';
    if (score >= 0.7) return '#3B82F6';
    if (score >= 0.5) return '#F59E0B';
    return '#EF4444';
  };

  const renderSecurityCard = (title: string, icon: any, children: React.ReactNode) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const renderMetricRow = (label: string, value: string | number, color?: string) => (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Activity size={32} color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Security Metrics...</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.errorContainer}>
        <XCircle size={32} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load security metrics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSecurityMetrics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Shield size={32} color="#3B82F6" />
        <Text style={styles.headerTitle}>Secure Enclave Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {Platform.OS === 'ios' ? 'iOS Secure Enclave' : 'Android Hardware Security Module'}
        </Text>
      </View>

      {/* Hardware Security Status */}
      {renderSecurityCard(
        'Hardware Security Status',
        <Cpu size={24} color="#3B82F6" />,
        <View>
          {renderMetricRow(
            'Secure Enclave Available',
            metrics.hardwareStatus.secureEnclaveAvailable ? '✅ Yes' : '❌ No',
            metrics.hardwareStatus.secureEnclaveAvailable ? '#10B981' : '#EF4444'
          )}
          {renderMetricRow(
            'Hardware Validated',
            metrics.capabilities?.hardwareValidated ? '✅ Yes' : '❌ No',
            metrics.capabilities?.hardwareValidated ? '#10B981' : '#EF4444'
          )}
          {renderMetricRow(
            'Security Level',
            metrics.capabilities?.securityLevel || 'Unknown',
            getSecurityLevelColor(metrics.capabilities?.securityLevel)
          )}
          {renderMetricRow(
            'Trust Score',
            (metrics.capabilities?.trustScore || 0).toFixed(3),
            getTrustScoreColor(metrics.capabilities?.trustScore || 0)
          )}
          {renderMetricRow(
            'Platform',
            Platform.OS === 'ios' ? 'iOS Secure Enclave' : 'Android HSM'
          )}
        </View>
      )}

      {/* Biometric Authentication */}
      {renderSecurityCard(
        'Biometric Authentication',
        <Fingerprint size={24} color="#10B981" />,
        <View>
          {renderMetricRow(
            'Available',
            metrics.biometricInfo.isAvailable ? '✅ Yes' : '❌ No',
            metrics.biometricInfo.isAvailable ? '#10B981' : '#EF4444'
          )}
          {renderMetricRow(
            'Supported Types',
            metrics.biometricInfo.supportedTypes.join(', ') || 'None'
          )}
          {renderMetricRow(
            'Hardware Protected',
            metrics.biometricInfo.hardwareValidated ? '✅ Yes' : '❌ No',
            metrics.biometricInfo.hardwareValidated ? '#10B981' : '#EF4444'
          )}
          {renderMetricRow(
            'Security Chip',
            metrics.biometricInfo.securityChip || 'None'
          )}
          {renderMetricRow(
            'Attestation Supported',
            metrics.biometricInfo.attestationSupported ? '✅ Yes' : '❌ No',
            metrics.biometricInfo.attestationSupported ? '#10B981' : '#EF4444'
          )}
        </View>
      )}

      {/* Session Management */}
      {renderSecurityCard(
        'Session Management',
        <Key size={24} color="#F59E0B" />,
        <View>
          {renderMetricRow('Active Sessions', metrics.sessionStats.activeSessions)}
          {renderMetricRow('Total Sessions', metrics.sessionStats.totalSessions)}
          {renderMetricRow(
            'Average Trust Score',
            metrics.sessionStats.averageTrustScore.toFixed(3),
            getTrustScoreColor(metrics.sessionStats.averageTrustScore)
          )}
          {renderMetricRow(
            'Hardware Protected',
            `${metrics.sessionStats.hardwareProtectedSessions}/${metrics.sessionStats.activeSessions}`
          )}
          {renderMetricRow('Anti-Replay Tokens', metrics.sessionStats.antiReplayTokens)}
          {renderMetricRow(
            'Device Fingerprint Age',
            `${Math.round(metrics.sessionStats.deviceFingerprintAge / (1000 * 60 * 60))}h`
          )}
        </View>
      )}

      {/* Validation Statistics */}
      {renderSecurityCard(
        'Validation Statistics',
        <TrendingUp size={24} color="#8B5CF6" />,
        <View>
          {renderMetricRow('Total Validations', metrics.validationStats.totalValidations)}
          {renderMetricRow('Successful Validations', metrics.validationStats.successfulValidations)}
          {renderMetricRow('Hardware Validations', metrics.validationStats.hardwareValidations)}
          {renderMetricRow(
            'Success Rate',
            metrics.validationStats.totalValidations > 0 
              ? `${((metrics.validationStats.successfulValidations / metrics.validationStats.totalValidations) * 100).toFixed(1)}%`
              : '0%'
          )}
          {renderMetricRow(
            'Hardware Rate',
            metrics.validationStats.totalValidations > 0 
              ? `${((metrics.validationStats.hardwareValidations / metrics.validationStats.totalValidations) * 100).toFixed(1)}%`
              : '0%'
          )}
          {renderMetricRow('Cached Attestations', metrics.validationStats.cachedAttestations)}
        </View>
      )}

      {/* Test Results */}
      {testResults && renderSecurityCard(
        'Last Test Results',
        <CheckCircle size={24} color={testResults.success ? '#10B981' : '#EF4444'} />,
        <View>
          {renderMetricRow(
            'Test Success',
            testResults.success ? '✅ Passed' : '❌ Failed',
            testResults.success ? '#10B981' : '#EF4444'
          )}
          {renderMetricRow(
            'Secure Enclave Used',
            testResults.secureEnclaveUsed ? '✅ Yes' : '❌ No',
            testResults.secureEnclaveUsed ? '#10B981' : '#EF4444'
          )}
          {renderMetricRow(
            'Trust Score',
            testResults.trustScore.toFixed(3),
            getTrustScoreColor(testResults.trustScore)
          )}
          {renderMetricRow('Validation Level', testResults.validationLevel)}
          {testResults.error && renderMetricRow('Error', testResults.error, '#EF4444')}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.testButton} onPress={testBiometricAuthentication}>
          <Fingerprint size={20} color="#FFFFFF" />
          <Text style={styles.testButtonText}>Test Biometric Auth</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testSessionBinding}>
          <Lock size={20} color="#FFFFFF" />
          <Text style={styles.testButtonText}>Test Session Binding</Text>
        </TouchableOpacity>
      </View>

      {/* Security Recommendations */}
      <View style={styles.recommendationsCard}>
        <View style={styles.cardHeader}>
          <AlertTriangle size={24} color="#F59E0B" />
          <Text style={styles.cardTitle}>Security Recommendations</Text>
        </View>
        <View style={styles.recommendations}>
          {!metrics.hardwareStatus.secureEnclaveAvailable && (
            <Text style={styles.recommendation}>
              • Enable hardware security features in device settings
            </Text>
          )}
          {!metrics.biometricInfo.isAvailable && (
            <Text style={styles.recommendation}>
              • Set up biometric authentication (Face ID/Touch ID/Fingerprint)
            </Text>
          )}
          {metrics.capabilities?.securityLevel !== 'maximum' && (
            <Text style={styles.recommendation}>
              • Consider upgrading to a device with enhanced security features
            </Text>
          )}
          {metrics.sessionStats.averageTrustScore < 0.8 && (
            <Text style={styles.recommendation}>
              • Review and strengthen authentication methods
            </Text>
          )}
          <Text style={styles.recommendation}>
            • Regularly update your device OS for latest security patches
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 16,
    gap: 12,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationsCard: {
    backgroundColor: '#FFFBEB',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  recommendations: {
    marginTop: 8,
  },
  recommendation: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default SecureEnclaveDashboard;