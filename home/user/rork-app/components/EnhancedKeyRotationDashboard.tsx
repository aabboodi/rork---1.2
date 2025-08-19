import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  MoveRight, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Key, 
  Server, 
  Database,
  Activity,
  TrendingUp,
  Calendar,
  Settings,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  AlertCircle
} from 'lucide-react-native';
import KeyRotationService from '@/services/security/KeyRotationService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

interface EnhancedKeyRotationDashboardProps {
  onClose?: () => void;
}

const { width } = Dimensions.get('window');

const EnhancedKeyRotationDashboard: React.FC<EnhancedKeyRotationDashboardProps> = ({ onClose }) => {
  const [keyRotationService] = useState(() => KeyRotationService.getInstance());
  const [refreshing, setRefreshing] = useState(false);
  const [keyStats, setKeyStats] = useState<any>(null);
  const [rotationHealth, setRotationHealth] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [rotationHistory, setRotationHistory] = useState<any[]>([]);
  const [keyMetadata, setKeyMetadata] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'history' | 'health' | 'integrations'>('overview');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      await keyRotationService.initialize();
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to initialize enhanced dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [stats, health, monthly, lifecycleData, history, metadata] = await Promise.all([
        keyRotationService.getKeyRotationStatus(),
        keyRotationService.monitorKeyRotationHealth(),
        keyRotationService.getMonthlyRotationStats(),
        keyRotationService.implementAdvancedKeyLifecycle(),
        keyRotationService.getRotationHistory(),
        keyRotationService.getAllKeyMetadata()
      ]);

      setKeyStats(stats);
      setRotationHealth(health);
      setMonthlyStats(monthly);
      setLifecycle(lifecycleData);
      setRotationHistory(history.slice(0, 20)); // Last 20 events
      setKeyMetadata(metadata);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleEmergencyRotation = () => {
    Alert.alert(
      'Emergency Key Rotation',
      'This will immediately rotate ALL encryption keys. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate All Keys',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await keyRotationService.emergencyRotateAll('Manual emergency rotation');
              Alert.alert(
                'Emergency Rotation Complete',
                `Rotated: ${result.rotated.length} keys\nFailed: ${result.failed.length} keys`
              );
              await loadDashboardData();
            } catch (error) {
              Alert.alert('Error', 'Failed to perform emergency rotation');
            }
          }
        }
      ]
    );
  };

  const handleManualRotation = (keyId: string) => {
    Alert.alert(
      'Manual Key Rotation',
      `Rotate key: ${keyId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          onPress: async () => {
            try {
              const result = await keyRotationService.rotateKey(keyId, 'manual');
              if (result.success) {
                Alert.alert('Success', `Key rotated to version ${result.newVersion}`);
                await loadDashboardData();
              } else {
                Alert.alert('Error', result.error || 'Failed to rotate key');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to rotate key');
            }
          }
        }
      ]
    );
  };

  const handleIntegrateAWS = () => {
    Alert.alert(
      'AWS KMS Integration',
      'Configure AWS KMS for enterprise key management with monthly rotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Configure',
          onPress: async () => {
            try {
              const success = await keyRotationService.integrateWithAWSKMS({
                region: 'us-east-1',
                keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
                monthlyRotation: true
              });
              
              if (success) {
                Alert.alert('Success', 'AWS KMS integration configured with monthly rotation');
                await loadDashboardData();
              } else {
                Alert.alert('Error', 'Failed to configure AWS KMS integration');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to integrate with AWS KMS');
            }
          }
        }
      ]
    );
  };

  const handleIntegrateVault = () => {
    Alert.alert(
      'HashiCorp Vault Integration',
      'Configure HashiCorp Vault for enterprise key management with monthly rotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Configure',
          onPress: async () => {
            try {
              const success = await keyRotationService.integrateWithHashiCorpVault({
                endpoint: 'https://vault.company.com:8200',
                token: 'hvs.CAESIJ...',
                namespace: 'admin',
                monthlyRotation: true
              });
              
              if (success) {
                Alert.alert('Success', 'HashiCorp Vault integration configured with monthly rotation');
                await loadDashboardData();
              } else {
                Alert.alert('Error', 'Failed to configure HashiCorp Vault integration');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to integrate with HashiCorp Vault');
            }
          }
        }
      ]
    );
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return '#10B981';
      case 'good': return '#3B82F6';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return CheckCircle;
      case 'good': return Shield;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertCircle;
      default: return Clock;
    }
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Health Status Card */}
      <View style={styles.card}>
        <LinearGradient
          colors={[getHealthColor(rotationHealth?.overallHealth || 'warning'), getHealthColor(rotationHealth?.overallHealth || 'warning') + '80']}
          style={styles.healthHeader}
        >
          <View style={styles.healthHeaderContent}>
            {React.createElement(getHealthIcon(rotationHealth?.overallHealth || 'warning'), {
              size: 32,
              color: '#FFFFFF'
            })}
            <View style={styles.healthHeaderText}>
              <Text style={styles.healthTitle}>Key Rotation Health</Text>
              <Text style={styles.healthStatus}>
                {rotationHealth?.overallHealth?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.cardContent}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Key size={20} color="#3B82F6" />
              <Text style={styles.statValue}>{keyStats?.totalKeys || 0}</Text>
              <Text style={styles.statLabel}>Total Keys</Text>
            </View>
            <View style={styles.statItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.statValue}>{keyStats?.activeKeys || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <AlertTriangle size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{keyStats?.expiredKeys || 0}</Text>
              <Text style={styles.statLabel}>Expired</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={20} color="#EF4444" />
              <Text style={styles.statValue}>{keyStats?.rotationsDue || 0}</Text>
              <Text style={styles.statLabel}>Due</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Monthly Rotation Stats */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Calendar size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Monthly Rotation Statistics</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.monthlyStatsGrid}>
            <View style={styles.monthlyStatItem}>
              <Text style={styles.monthlyStatValue}>{monthlyStats?.totalRotations || 0}</Text>
              <Text style={styles.monthlyStatLabel}>Total Rotations</Text>
            </View>
            <View style={styles.monthlyStatItem}>
              <Text style={[styles.monthlyStatValue, { color: '#10B981' }]}>
                {monthlyStats?.successfulRotations || 0}
              </Text>
              <Text style={styles.monthlyStatLabel}>Successful</Text>
            </View>
            <View style={styles.monthlyStatItem}>
              <Text style={[styles.monthlyStatValue, { color: '#EF4444' }]}>
                {monthlyStats?.failedRotations || 0}
              </Text>
              <Text style={styles.monthlyStatLabel}>Failed</Text>
            </View>
          </View>
          
          {monthlyStats?.nextScheduledRotation && (
            <View style={styles.nextRotationInfo}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.nextRotationText}>
                Next rotation: {formatRelativeTime(new Date(monthlyStats.nextScheduledRotation))}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* External Integrations Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Server size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>External Key Management</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.integrationItem}>
            <View style={styles.integrationInfo}>
              <Database size={18} color="#FF9500" />
              <Text style={styles.integrationName}>AWS KMS</Text>
            </View>
            <View style={styles.integrationStatus}>
              {monthlyStats?.kmsStatus ? (
                <>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={[styles.integrationStatusText, { color: '#10B981' }]}>Active</Text>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#6B7280" />
                  <Text style={[styles.integrationStatusText, { color: '#6B7280' }]}>Not Configured</Text>
                </>
              )}
            </View>
          </View>
          
          <View style={styles.integrationItem}>
            <View style={styles.integrationInfo}>
              <Lock size={18} color="#000000" />
              <Text style={styles.integrationName}>HashiCorp Vault</Text>
            </View>
            <View style={styles.integrationStatus}>
              {monthlyStats?.vaultStatus ? (
                <>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={[styles.integrationStatusText, { color: '#10B981' }]}>Active</Text>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#6B7280" />
                  <Text style={[styles.integrationStatusText, { color: '#6B7280' }]}>Not Configured</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Zap size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Quick Actions</Text>
        </View>
        <View style={styles.cardContent}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEmergencyRotation}>
            <AlertTriangle size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Emergency Rotation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleIntegrateAWS}>
            <Database size={18} color="#3B82F6" />
            <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Configure AWS KMS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleIntegrateVault}>
            <Lock size={18} color="#3B82F6" />
            <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Configure Vault</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderKeysTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Key size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Key Management</Text>
          <TouchableOpacity 
            style={styles.visibilityToggle}
            onPress={() => setShowSensitiveData(!showSensitiveData)}
          >
            {showSensitiveData ? (
              <EyeOff size={18} color="#6B7280" />
            ) : (
              <Eye size={18} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.cardContent}>
          {keyMetadata.map((key, index) => (
            <View key={index} style={styles.keyItem}>
              <View style={styles.keyInfo}>
                <Text style={styles.keyId}>
                  {showSensitiveData ? key.keyId : `***${key.keyId.slice(-4)}`}
                </Text>
                <Text style={styles.keyDetails}>
                  v{key.version} • {key.algorithm} • {key.keySize}bit
                </Text>
                <Text style={styles.keyTimestamp}>
                  Created: {formatRelativeTime(new Date(key.createdAt))}
                </Text>
              </View>
              <View style={styles.keyActions}>
                <View style={[styles.keyStatus, { 
                  backgroundColor: key.status === 'active' ? '#10B981' : 
                                 key.status === 'deprecated' ? '#F59E0B' : '#EF4444'
                }]}>
                  <Text style={styles.keyStatusText}>{key.status}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.rotateButton}
                  onPress={() => handleManualRotation(key.keyId)}
                >
                  <MoveRight size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Activity size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Rotation History</Text>
        </View>
        <View style={styles.cardContent}>
          {rotationHistory.map((event, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                {event.success ? (
                  <CheckCircle size={16} color="#10B981" />
                ) : (
                  <AlertCircle size={16} color="#EF4444" />
                )}
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>
                  {event.keyId} v{event.oldVersion} → v{event.newVersion}
                </Text>
                <Text style={styles.historyDetails}>
                  {event.reason} • {formatRelativeTime(new Date(event.timestamp))}
                </Text>
                {event.error && (
                  <Text style={styles.historyError}>{event.error}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderHealthTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TrendingUp size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Health Monitoring</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.healthMetrics}>
            <View style={styles.healthMetric}>
              <Text style={styles.healthMetricLabel}>Rotation Compliance</Text>
              <Text style={styles.healthMetricValue}>
                {rotationHealth?.metrics?.rotationCompliance?.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={styles.healthMetric}>
              <Text style={styles.healthMetricLabel}>Average Key Age</Text>
              <Text style={styles.healthMetricValue}>
                {Math.floor((rotationHealth?.metrics?.averageKeyAge || 0) / (24 * 60 * 60 * 1000))} days
              </Text>
            </View>
            <View style={styles.healthMetric}>
              <Text style={styles.healthMetricLabel}>Failed Rotations</Text>
              <Text style={styles.healthMetricValue}>
                {rotationHealth?.metrics?.failedRotations || 0}
              </Text>
            </View>
          </View>
          
          {rotationHealth?.issues && rotationHealth.issues.length > 0 && (
            <View style={styles.issuesSection}>
              <Text style={styles.issuesTitle}>Issues</Text>
              {rotationHealth.issues.map((issue: string, index: number) => (
                <View key={index} style={styles.issueItem}>
                  <AlertTriangle size={14} color="#F59E0B" />
                  <Text style={styles.issueText}>{issue}</Text>
                </View>
              ))}
            </View>
          )}
          
          {rotationHealth?.recommendations && rotationHealth.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.recommendationsTitle}>Recommendations</Text>
              {rotationHealth.recommendations.map((rec: string, index: number) => (
                <View key={index} style={styles.recommendationItem}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderIntegrationsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Server size={20} color="#3B82F6" />
          <Text style={styles.cardTitle}>Enterprise Integrations</Text>
        </View>
        <View style={styles.cardContent}>
          {/* AWS KMS Integration */}
          <View style={styles.integrationCard}>
            <View style={styles.integrationHeader}>
              <Database size={24} color="#FF9500" />
              <View style={styles.integrationHeaderText}>
                <Text style={styles.integrationTitle}>AWS Key Management Service</Text>
                <Text style={styles.integrationSubtitle}>Enterprise-grade key management with monthly rotation</Text>
              </View>
            </View>
            
            {monthlyStats?.kmsStatus ? (
              <View style={styles.integrationDetails}>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Status:</Text>
                  <Text style={[styles.integrationDetailValue, { color: '#10B981' }]}>Active</Text>
                </View>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Region:</Text>
                  <Text style={styles.integrationDetailValue}>{monthlyStats.kmsStatus.region}</Text>
                </View>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Rotations:</Text>
                  <Text style={styles.integrationDetailValue}>{monthlyStats.kmsStatus.rotationCount || 0}</Text>
                </View>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Next Rotation:</Text>
                  <Text style={styles.integrationDetailValue}>
                    {formatRelativeTime(new Date(monthlyStats.kmsStatus.nextRotation))}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.configureButton} onPress={handleIntegrateAWS}>
                <Settings size={16} color="#FFFFFF" />
                <Text style={styles.configureButtonText}>Configure AWS KMS</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* HashiCorp Vault Integration */}
          <View style={styles.integrationCard}>
            <View style={styles.integrationHeader}>
              <Lock size={24} color="#000000" />
              <View style={styles.integrationHeaderText}>
                <Text style={styles.integrationTitle}>HashiCorp Vault</Text>
                <Text style={styles.integrationSubtitle}>Secrets management with automated monthly rotation</Text>
              </View>
            </View>
            
            {monthlyStats?.vaultStatus ? (
              <View style={styles.integrationDetails}>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Status:</Text>
                  <Text style={[styles.integrationDetailValue, { color: '#10B981' }]}>Active</Text>
                </View>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Endpoint:</Text>
                  <Text style={styles.integrationDetailValue}>{monthlyStats.vaultStatus.endpoint}</Text>
                </View>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Namespace:</Text>
                  <Text style={styles.integrationDetailValue}>{monthlyStats.vaultStatus.namespace}</Text>
                </View>
                <View style={styles.integrationDetailItem}>
                  <Text style={styles.integrationDetailLabel}>Next Rotation:</Text>
                  <Text style={styles.integrationDetailValue}>
                    {formatRelativeTime(new Date(monthlyStats.vaultStatus.nextRotation))}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.configureButton} onPress={handleIntegrateVault}>
                <Settings size={16} color="#FFFFFF" />
                <Text style={styles.configureButtonText}>Configure Vault</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <RefreshCw size={32} color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Key Rotation Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Shield size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Enhanced Key Rotation</Text>
          </View>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'overview', label: 'Overview', icon: Activity },
            { key: 'keys', label: 'Keys', icon: Key },
            { key: 'history', label: 'History', icon: Clock },
            { key: 'health', label: 'Health', icon: TrendingUp },
            { key: 'integrations', label: 'Integrations', icon: Server }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.activeTabButton
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              {React.createElement(tab.icon, {
                size: 16,
                color: activeTab === tab.key ? '#3B82F6' : '#6B7280'
              })}
              <Text style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.activeTabButtonText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'keys' && renderKeysTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'health' && renderHealthTab()}
          {activeTab === 'integrations' && renderIntegrationsTab()}
        </RefreshControl>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500'
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  tabNavigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6'
  },
  tabButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280'
  },
  activeTabButtonText: {
    color: '#3B82F6'
  },
  content: {
    flex: 1
  },
  tabContent: {
    flex: 1,
    padding: 16
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1
  },
  cardContent: {
    padding: 16
  },
  healthHeader: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16
  },
  healthHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  healthHeaderText: {
    marginLeft: 12
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  healthStatus: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  monthlyStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  monthlyStatItem: {
    alignItems: 'center'
  },
  monthlyStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  monthlyStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  nextRotationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  nextRotationText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280'
  },
  integrationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  integrationInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  integrationName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937'
  },
  integrationStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  integrationStatusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  visibilityToggle: {
    padding: 4
  },
  keyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  keyInfo: {
    flex: 1
  },
  keyId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  keyDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  keyTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2
  },
  keyActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  keyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8
  },
  keyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  rotateButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6'
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  historyIcon: {
    marginRight: 12,
    marginTop: 2
  },
  historyContent: {
    flex: 1
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  historyDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  historyError: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  healthMetric: {
    alignItems: 'center'
  },
  healthMetricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  healthMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4
  },
  issuesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  issueText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6B7280',
    flex: 1
  },
  recommendationsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  recommendationText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6B7280',
    flex: 1
  },
  integrationCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  integrationHeaderText: {
    marginLeft: 12,
    flex: 1
  },
  integrationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  integrationSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  integrationDetails: {
    marginTop: 8
  },
  integrationDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  integrationDetailLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
  integrationDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937'
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8
  },
  configureButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});

export default EnhancedKeyRotationDashboard;