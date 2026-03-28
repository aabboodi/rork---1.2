import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Shield, Users, TrendingUp, AlertTriangle, CheckCircle, BarChart3, Lock, Eye, Filter } from 'lucide-react-native';
import { SecureAggregationService } from '@/services/ai/SecureAggregationService';

interface SimulatedDevice {
  id: string;
  type: string;
  reliability: number;
  isOutlier: boolean;
}

interface AggregationMetrics {
  totalRounds: number;
  averageQuality: number;
  privacyBudgetUsed: number;
  outliersDetected: number;
  participantsCount: number;
}

export default function Phase3SecureAggregationDemo() {
  const [aggregationService] = useState(() => new SecureAggregationService());
  const [isAggregating, setIsAggregating] = useState(false);
  const [metrics, setMetrics] = useState<AggregationMetrics>({
    totalRounds: 0,
    averageQuality: 0,
    privacyBudgetUsed: 0,
    outliersDetected: 0,
    participantsCount: 0
  });
  const [lastResult, setLastResult] = useState<any>(null);
  const [simulatedDevices, setSimulatedDevices] = useState<SimulatedDevice[]>([]);
  const [privacyLevel, setPrivacyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [outlierSensitivity, setOutlierSensitivity] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    generateSimulatedDevices();
  }, []);

  const generateSimulatedDevices = () => {
    const deviceTypes = ['mobile_ios', 'mobile_android', 'web'];
    const devices: SimulatedDevice[] = [];
    
    for (let i = 0; i < 12; i++) {
      devices.push({
        id: `device_${i + 1}`,
        type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
        reliability: 0.3 + Math.random() * 0.7, // 0.3 to 1.0
        isOutlier: Math.random() < 0.15 // 15% chance of being outlier
      });
    }
    
    setSimulatedDevices(devices);
  };

  const generateMockModelUpdate = (device: SimulatedDevice) => {
    const gradientSize = 1000; // Simulate 1000-parameter model
    const gradients = new Float32Array(gradientSize);
    
    // Generate realistic gradients
    const baseValue = device.isOutlier ? (Math.random() - 0.5) * 10 : (Math.random() - 0.5) * 0.1;
    for (let i = 0; i < gradientSize; i++) {
      if (device.isOutlier) {
        // Outlier devices have unusual gradient patterns
        gradients[i] = baseValue + (Math.random() - 0.5) * 5;
      } else {
        // Normal devices have small, consistent gradients
        gradients[i] = baseValue + (Math.random() - 0.5) * 0.01;
      }
    }
    
    return {
      id: `update_${device.id}_${Date.now()}`,
      deviceId: device.id,
      timestamp: Date.now(),
      gradients,
      metadata: {
        modelVersion: '1.0.0',
        trainingSteps: Math.floor(50 + Math.random() * 200),
        datasetSize: Math.floor(100 + Math.random() * 500),
        deviceType: device.type,
        performanceMetrics: {
          accuracy: device.isOutlier ? 0.3 + Math.random() * 0.3 : 0.7 + Math.random() * 0.3,
          loss: device.isOutlier ? 2 + Math.random() * 5 : 0.1 + Math.random() * 0.5,
          convergence: device.reliability
        }
      }
    };
  };

  const updatePrivacySettings = () => {
    const privacyConfigs = {
      low: { epsilon: 2.0, delta: 1e-4, clipNorm: 2.0 },
      medium: { epsilon: 1.0, delta: 1e-5, clipNorm: 1.0 },
      high: { epsilon: 0.5, delta: 1e-6, clipNorm: 0.5 }
    };
    
    const outlierConfigs = {
      low: { zScoreThreshold: 3.0, iqrMultiplier: 2.0, maxOutlierRatio: 0.5 },
      medium: { zScoreThreshold: 2.5, iqrMultiplier: 1.5, maxOutlierRatio: 0.3 },
      high: { zScoreThreshold: 2.0, iqrMultiplier: 1.0, maxOutlierRatio: 0.2 }
    };
    
    aggregationService.updatePrivacyConfig(privacyConfigs[privacyLevel]);
    aggregationService.updateOutlierConfig(outlierConfigs[outlierSensitivity]);
  };

  const runSecureAggregation = async () => {
    if (isAggregating) return;
    
    setIsAggregating(true);
    updatePrivacySettings();
    
    try {
      // Generate model updates from simulated devices
      const updates = simulatedDevices.map(device => generateMockModelUpdate(device));
      
      console.log(`🚀 Starting secure aggregation with ${updates.length} updates`);
      console.log(`📊 Outliers in simulation: ${simulatedDevices.filter(d => d.isOutlier).length}`);
      
      // Perform secure aggregation
      const result = await aggregationService.aggregateUpdates(updates);
      setLastResult(result);
      
      // Update metrics
      const stats = aggregationService.getAggregationStats();
      setMetrics({
        totalRounds: stats.totalAggregations,
        averageQuality: stats.averageQuality,
        privacyBudgetUsed: stats.privacyBudgetUsed,
        outliersDetected: result.outlierCount,
        participantsCount: result.participantCount
      });
      
      console.log(`✅ Aggregation completed:`);
      console.log(`   Quality Score: ${result.qualityScore.toFixed(3)}`);
      console.log(`   Participants: ${result.participantCount}`);
      console.log(`   Outliers Detected: ${result.outlierCount}`);
      console.log(`   Privacy Budget: ε=${result.privacyBudget}`);
      
    } catch (error) {
      console.error('❌ Aggregation failed:', error);
      Alert.alert('Aggregation Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsAggregating(false);
    }
  };

  const getPrivacyLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#FF9800';
      case 'medium': return '#2196F3';
      case 'high': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile_ios': return '📱';
      case 'mobile_android': return '🤖';
      case 'web': return '🌐';
      default: return '📟';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Phase 3: Secure Aggregation',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff'
        }} 
      />
      
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Shield size={24} color="#4CAF50" />
            <Text style={styles.title}>Secure Aggregation Demo</Text>
          </View>
          <Text style={styles.subtitle}>
            Differential privacy + anonymization + outlier rejection for federated learning
          </Text>
        </View>

        {/* Privacy & Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security Configuration</Text>
          
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Privacy Level (ε-differential privacy)</Text>
            <View style={styles.settingButtons}>
              {(['low', 'medium', 'high'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.settingButton,
                    privacyLevel === level && { backgroundColor: getPrivacyLevelColor(level) }
                  ]}
                  onPress={() => setPrivacyLevel(level)}
                >
                  <Text style={[
                    styles.settingButtonText,
                    privacyLevel === level && { color: '#fff' }
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Outlier Detection Sensitivity</Text>
            <View style={styles.settingButtons}>
              {(['low', 'medium', 'high'] as const).map((sensitivity) => (
                <TouchableOpacity
                  key={sensitivity}
                  style={[
                    styles.settingButton,
                    outlierSensitivity === sensitivity && { backgroundColor: '#FF5722' }
                  ]}
                  onPress={() => setOutlierSensitivity(sensitivity)}
                >
                  <Text style={[
                    styles.settingButtonText,
                    outlierSensitivity === sensitivity && { color: '#fff' }
                  ]}>
                    {sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Simulated Devices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simulated Federated Devices</Text>
          <View style={styles.devicesGrid}>
            {simulatedDevices.map((device) => (
              <View key={device.id} style={[
                styles.deviceCard,
                device.isOutlier && styles.deviceCardOutlier
              ]}>
                <Text style={styles.deviceIcon}>{getDeviceIcon(device.type)}</Text>
                <Text style={styles.deviceId}>{device.id}</Text>
                <Text style={styles.deviceReliability}>
                  {(device.reliability * 100).toFixed(0)}%
                </Text>
                {device.isOutlier && (
                  <View style={styles.outlierBadge}>
                    <AlertTriangle size={12} color="#FF5722" />
                  </View>
                )}
              </View>
            ))}
          </View>
          <TouchableOpacity 
            style={styles.regenerateButton}
            onPress={generateSimulatedDevices}
          >
            <Text style={styles.regenerateButtonText}>Regenerate Devices</Text>
          </TouchableOpacity>
        </View>

        {/* Aggregation Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aggregation Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <BarChart3 size={20} color="#2196F3" />
              <Text style={styles.metricValue}>{metrics.totalRounds}</Text>
              <Text style={styles.metricLabel}>Total Rounds</Text>
            </View>
            <View style={styles.metricCard}>
              <TrendingUp size={20} color="#4CAF50" />
              <Text style={styles.metricValue}>{(metrics.averageQuality * 100).toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Avg Quality</Text>
            </View>
            <View style={styles.metricCard}>
              <Users size={20} color="#FF9800" />
              <Text style={styles.metricValue}>{metrics.participantsCount}</Text>
              <Text style={styles.metricLabel}>Participants</Text>
            </View>
            <View style={styles.metricCard}>
              <Filter size={20} color="#F44336" />
              <Text style={styles.metricValue}>{metrics.outliersDetected}</Text>
              <Text style={styles.metricLabel}>Outliers Filtered</Text>
            </View>
          </View>
        </View>

        {/* Privacy Budget */}
        <View style={styles.section}>
          <View style={styles.privacyBudgetContainer}>
            <View style={styles.privacyBudgetHeader}>
              <Lock size={20} color="#9C27B0" />
              <Text style={styles.privacyBudgetTitle}>Privacy Budget Used</Text>
            </View>
            <Text style={styles.privacyBudgetValue}>
              ε = {metrics.privacyBudgetUsed.toFixed(2)}
            </Text>
            <Text style={styles.privacyBudgetDescription}>
              Lower values indicate stronger privacy protection
            </Text>
          </View>
        </View>

        {/* Last Aggregation Result */}
        {lastResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Aggregation Result</Text>
            <View style={styles.resultContainer}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Quality Score:</Text>
                <Text style={styles.resultValue}>{(lastResult.qualityScore * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Participants:</Text>
                <Text style={styles.resultValue}>{lastResult.participantCount}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Outliers Detected:</Text>
                <Text style={styles.resultValue}>{lastResult.outlierCount}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Privacy Budget (ε):</Text>
                <Text style={styles.resultValue}>{lastResult.privacyBudget}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Convergence Stability:</Text>
                <Text style={styles.resultValue}>{(lastResult.convergenceMetrics.stability * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Model Improvement:</Text>
                <Text style={styles.resultValue}>{(lastResult.convergenceMetrics.improvement * 100).toFixed(1)}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Security Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features Implemented</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Differential Privacy (ε-DP)</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Device Anonymization</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Gradient Clipping</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Statistical Outlier Detection</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Weighted Secure Aggregation</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Metadata Generalization</Text>
            </View>
          </View>
        </View>

        {/* Run Aggregation Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.aggregateButton,
              isAggregating && styles.aggregateButtonDisabled
            ]}
            onPress={runSecureAggregation}
            disabled={isAggregating}
          >
            {isAggregating ? (
              <View style={styles.aggregateButtonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.aggregateButtonText}>Aggregating...</Text>
              </View>
            ) : (
              <View style={styles.aggregateButtonContent}>
                <Shield size={20} color="#fff" />
                <Text style={styles.aggregateButtonText}>Run Secure Aggregation</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  content: {
    flex: 1,
    padding: 16
  },
  header: {
    marginBottom: 24
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    lineHeight: 22
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12
  },
  settingGroup: {
    marginBottom: 16
  },
  settingLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8
  },
  settingButtons: {
    flexDirection: 'row',
    gap: 8
  },
  settingButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333'
  },
  settingButtonText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    fontWeight: '500'
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  deviceCard: {
    width: '22%',
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative'
  },
  deviceCardOutlier: {
    borderColor: '#FF5722',
    backgroundColor: '#2a1a1a'
  },
  deviceIcon: {
    fontSize: 16,
    marginBottom: 4
  },
  deviceId: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center'
  },
  deviceReliability: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600'
  },
  outlierBadge: {
    position: 'absolute',
    top: 2,
    right: 2
  },
  regenerateButton: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center'
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center'
  },
  privacyBudgetContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center'
  },
  privacyBudgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  privacyBudgetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  privacyBudgetValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 4
  },
  privacyBudgetDescription: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center'
  },
  resultContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  resultLabel: {
    color: '#888',
    fontSize: 14
  },
  resultValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  featuresList: {
    gap: 8
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  featureText: {
    color: '#ccc',
    fontSize: 14
  },
  aggregateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  aggregateButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.6
  },
  aggregateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  aggregateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});