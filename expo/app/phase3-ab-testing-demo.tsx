import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  TestTube, 
  TrendingUp, 
  Battery, 
  Zap, 
  Target, 
  BarChart3, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  Wifi
} from 'lucide-react-native';
import { ABTestingBudgetService } from '@/services/ai/ABTestingBudgetService';

interface SimulatedDevice {
  id: string;
  type: string;
  batteryLevel: number;
  networkType: string;
  performanceClass: string;
  assignedStrategy: string;
}

export default function Phase3ABTestingDemo() {
  const [abTestService] = useState(() => new ABTestingBudgetService());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [simulatedDevices, setSimulatedDevices] = useState<SimulatedDevice[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [totalMetrics, setTotalMetrics] = useState(0);

  useEffect(() => {
    generateSimulatedDevices();
    updateTestResults();
  }, []);

  const generateSimulatedDevices = () => {
    const deviceTypes = ['mobile_ios', 'mobile_android', 'web'];
    const networkTypes = ['wifi', 'cellular', 'ethernet'];
    const performanceClasses = ['low', 'medium', 'high', 'premium'];
    const devices: SimulatedDevice[] = [];

    for (let i = 0; i < 15; i++) {
      const deviceInfo = {
        type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
        batteryLevel: Math.floor(20 + Math.random() * 80),
        networkType: networkTypes[Math.floor(Math.random() * networkTypes.length)],
        performanceClass: performanceClasses[Math.floor(Math.random() * performanceClasses.length)]
      };

      const strategy = abTestService.getStrategyForDevice(deviceInfo);

      devices.push({
        id: `device_${i + 1}`,
        ...deviceInfo,
        assignedStrategy: strategy.id
      });
    }

    setSimulatedDevices(devices);
  };

  const generateTestData = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      console.log('🧪 Generating A/B test data for all device segments...');

      // Generate metrics for each simulated device
      for (const device of simulatedDevices) {
        const deviceInfo = {
          type: device.type,
          batteryLevel: device.batteryLevel,
          networkType: device.networkType,
          performanceClass: device.performanceClass
        };

        // Generate 30-50 metrics per device to simulate usage over time
        const metricsCount = 30 + Math.floor(Math.random() * 21);
        abTestService.generateSimulatedMetrics(deviceInfo, metricsCount);
      }

      updateTestResults();
      Alert.alert('Success', 'A/B test data generated successfully!');
    } catch (error) {
      console.error('❌ Failed to generate test data:', error);
      Alert.alert('Error', 'Failed to generate test data');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateTestResults = () => {
    const results = abTestService.getABTestResults();
    setTestResults(results);
    setTotalMetrics(results.reduce((acc, r) => acc + r.sampleSize, 0));
  };

  const exportResults = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const csvData = abTestService.exportMetrics();
      console.log('📊 A/B Test Results (CSV Format):');
      console.log(csvData);
      
      Alert.alert(
        'Export Complete', 
        'A/B test results have been exported to console. In a real app, this would be saved to device storage or sent to analytics.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Failed to export results:', error);
      Alert.alert('Error', 'Failed to export results');
    } finally {
      setIsExporting(false);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all A/B test metrics. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            abTestService.clearMetrics();
            setTestResults([]);
            setTotalMetrics(0);
            Alert.alert('Success', 'All A/B test data cleared');
          }
        }
      ]
    );
  };

  const getStrategyColor = (strategyId: string) => {
    const colors: { [key: string]: string } = {
      conservative: '#FF9800',
      balanced: '#2196F3',
      performance: '#4CAF50',
      adaptive: '#9C27B0'
    };
    return colors[strategyId] || '#757575';
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile_ios':
      case 'mobile_android':
        return <Smartphone size={16} color="#888" />;
      case 'web':
        return <Monitor size={16} color="#888" />;
      default:
        return <Smartphone size={16} color="#888" />;
    }
  };

  const getPerformanceColor = (performanceClass: string) => {
    const colors: { [key: string]: string } = {
      low: '#F44336',
      medium: '#FF9800',
      high: '#4CAF50',
      premium: '#9C27B0'
    };
    return colors[performanceClass] || '#757575';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Phase 3: A/B Budget Testing',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff'
        }} 
      />
      
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TestTube size={24} color="#9C27B0" />
            <Text style={styles.title}>A/B Budget Policy Testing</Text>
          </View>
          <Text style={styles.subtitle}>
            Comparing RAG/budget strategies across device segments for optimal performance and battery efficiency
          </Text>
        </View>

        {/* Test Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Overview</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Target size={20} color="#2196F3" />
              <Text style={styles.overviewValue}>{testResults.length}</Text>
              <Text style={styles.overviewLabel}>Active Tests</Text>
            </View>
            <View style={styles.overviewCard}>
              <BarChart3 size={20} color="#4CAF50" />
              <Text style={styles.overviewValue}>{totalMetrics}</Text>
              <Text style={styles.overviewLabel}>Total Metrics</Text>
            </View>
            <View style={styles.overviewCard}>
              <TrendingUp size={20} color="#FF9800" />
              <Text style={styles.overviewValue}>
                {testResults.filter(r => r.statisticalSignificance).length}
              </Text>
              <Text style={styles.overviewLabel}>Significant</Text>
            </View>
            <View style={styles.overviewCard}>
              <Battery size={20} color="#9C27B0" />
              <Text style={styles.overviewValue}>
                {testResults.length > 0 ? 
                  Math.round(testResults.reduce((acc, r) => acc + r.improvementOverBaseline.batteryEfficiency, 0) / testResults.length) : 0}%
              </Text>
              <Text style={styles.overviewLabel}>Avg Battery Gain</Text>
            </View>
          </View>
        </View>

        {/* Simulated Devices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simulated Test Devices</Text>
          <View style={styles.devicesGrid}>
            {simulatedDevices.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceHeader}>
                  {getDeviceIcon(device.type)}
                  <Text style={styles.deviceId}>{device.id}</Text>
                </View>
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceInfoRow}>
                    <Battery size={10} color="#4CAF50" />
                    <Text style={styles.deviceInfoText}>{device.batteryLevel}%</Text>
                  </View>
                  <View style={styles.deviceInfoRow}>
                    <Wifi size={10} color="#666" />
                    <Text style={styles.deviceInfoText}>{device.networkType}</Text>
                  </View>
                  <View style={styles.deviceInfoRow}>
                    <View style={[
                      styles.performanceDot,
                      { backgroundColor: getPerformanceColor(device.performanceClass) }
                    ]} />
                    <Text style={styles.deviceInfoText}>{device.performanceClass}</Text>
                  </View>
                </View>
                <View style={[
                  styles.strategyBadge,
                  { backgroundColor: getStrategyColor(device.assignedStrategy) }
                ]}>
                  <Text style={styles.strategyBadgeText}>{device.assignedStrategy}</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity 
            style={styles.regenerateButton}
            onPress={generateSimulatedDevices}
          >
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.regenerateButtonText}>Regenerate Devices</Text>
          </TouchableOpacity>
        </View>

        {/* Budget Strategies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Strategies Being Tested</Text>
          {abTestService.getStrategies().map((strategy) => (
            <View key={strategy.id} style={styles.strategyCard}>
              <View style={styles.strategyHeader}>
                <View style={[
                  styles.strategyIndicator,
                  { backgroundColor: getStrategyColor(strategy.id) }
                ]} />
                <Text style={styles.strategyName}>{strategy.name}</Text>
              </View>
              <Text style={styles.strategyDescription}>{strategy.description}</Text>
              <View style={styles.strategyMetrics}>
                <View style={styles.strategyMetric}>
                  <Text style={styles.strategyMetricLabel}>RAG Limit:</Text>
                  <Text style={styles.strategyMetricValue}>{(strategy.ragTokenLimit / 1000).toFixed(0)}k</Text>
                </View>
                <View style={styles.strategyMetric}>
                  <Text style={styles.strategyMetricLabel}>Compression:</Text>
                  <Text style={styles.strategyMetricValue}>{(strategy.contextCompressionRatio * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.strategyMetric}>
                  <Text style={styles.strategyMetricLabel}>Offload:</Text>
                  <Text style={styles.strategyMetricValue}>{(strategy.offloadThreshold / 1000).toFixed(0)}k</Text>
                </View>
                <View style={styles.strategyMetric}>
                  <Text style={styles.strategyMetricLabel}>Battery Opt:</Text>
                  <Text style={styles.strategyMetricValue}>{strategy.batteryOptimization ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Test Results */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>A/B Test Results</Text>
            {testResults.map((result) => (
              <View key={`${result.strategyId}_${result.deviceSegment}`} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultTitleContainer}>
                    <View style={[
                      styles.strategyIndicator,
                      { backgroundColor: getStrategyColor(result.strategyId) }
                    ]} />
                    <Text style={styles.resultTitle}>
                      {result.strategyId} vs baseline
                    </Text>
                  </View>
                  <View style={styles.resultBadges}>
                    <Text style={styles.segmentBadge}>{result.deviceSegment}</Text>
                    {result.statisticalSignificance ? (
                      <View style={styles.significantBadge}>
                        <CheckCircle size={12} color="#4CAF50" />
                        <Text style={styles.significantText}>Significant</Text>
                      </View>
                    ) : (
                      <View style={styles.notSignificantBadge}>
                        <AlertTriangle size={12} color="#FF9800" />
                        <Text style={styles.notSignificantText}>Not Significant</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.resultMetrics}>
                  <View style={styles.resultMetric}>
                    <Text style={styles.resultMetricLabel}>Accuracy Improvement:</Text>
                    <Text style={[
                      styles.resultMetricValue,
                      { color: result.improvementOverBaseline.accuracy > 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {result.improvementOverBaseline.accuracy > 0 ? '+' : ''}
                      {result.improvementOverBaseline.accuracy.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.resultMetric}>
                    <Text style={styles.resultMetricLabel}>Satisfaction Improvement:</Text>
                    <Text style={[
                      styles.resultMetricValue,
                      { color: result.improvementOverBaseline.satisfaction > 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {result.improvementOverBaseline.satisfaction > 0 ? '+' : ''}
                      {result.improvementOverBaseline.satisfaction.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.resultMetric}>
                    <Text style={styles.resultMetricLabel}>Battery Efficiency:</Text>
                    <Text style={[
                      styles.resultMetricValue,
                      { color: result.improvementOverBaseline.batteryEfficiency > 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                      {result.improvementOverBaseline.batteryEfficiency > 0 ? '+' : ''}
                      {result.improvementOverBaseline.batteryEfficiency.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                
                <View style={styles.resultStats}>
                  <Text style={styles.resultStatsText}>Sample Size: {result.sampleSize}</Text>
                  <Text style={styles.resultStatsText}>
                    Avg Battery Usage: {result.metrics.avgBatteryUsage.toFixed(1)} mAh
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Acceptance Criteria */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phase 3 Acceptance Criteria</Text>
          <View style={styles.criteriaList}>
            <View style={styles.criteriaItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.criteriaText}>No raw data leakage (anonymized metrics only)</Text>
            </View>
            <View style={styles.criteriaItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.criteriaText}>≥5% improvement in accuracy/satisfaction metrics</Text>
            </View>
            <View style={styles.criteriaItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.criteriaText}>No significant battery usage increase</Text>
            </View>
            <View style={styles.criteriaItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.criteriaText}>Statistical significance validation</Text>
            </View>
            <View style={styles.criteriaItem}>
              <CheckCircle size={16} color="#4CAF50" />
              <Text style={styles.criteriaText}>Device segment-specific optimization</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.generateButton,
                isGenerating && styles.actionButtonDisabled
              ]}
              onPress={generateTestData}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Zap size={20} color="#fff" />
              )}
              <Text style={styles.actionButtonText}>
                {isGenerating ? 'Generating...' : 'Generate Test Data'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.exportButton,
                isExporting && styles.actionButtonDisabled
              ]}
              onPress={exportResults}
              disabled={isExporting || testResults.length === 0}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Download size={20} color="#fff" />
              )}
              <Text style={styles.actionButtonText}>
                {isExporting ? 'Exporting...' : 'Export Results'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={clearAllData}
          >
            <Text style={styles.actionButtonText}>Clear All Data</Text>
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
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8
  },
  overviewLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center'
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  deviceCard: {
    width: '30%',
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  deviceId: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600'
  },
  deviceInfo: {
    gap: 2,
    marginBottom: 6
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  deviceInfoText: {
    fontSize: 8,
    color: '#888'
  },
  performanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  strategyBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  strategyBadgeText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '600'
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
    gap: 6
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  strategyCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  strategyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  strategyDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12
  },
  strategyMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  strategyMetric: {
    flex: 1,
    minWidth: '40%'
  },
  strategyMetricLabel: {
    fontSize: 12,
    color: '#888'
  },
  strategyMetricValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  resultTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  resultBadges: {
    alignItems: 'flex-end',
    gap: 4
  },
  segmentBadge: {
    fontSize: 10,
    color: '#888',
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  significantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1B5E20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  significantText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600'
  },
  notSignificantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E65100',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  notSignificantText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600'
  },
  resultMetrics: {
    gap: 8,
    marginBottom: 12
  },
  resultMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultMetricLabel: {
    fontSize: 14,
    color: '#888'
  },
  resultMetricValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  resultStatsText: {
    fontSize: 12,
    color: '#666'
  },
  criteriaList: {
    gap: 8
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  criteriaText: {
    color: '#ccc',
    fontSize: 14
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8
  },
  generateButton: {
    backgroundColor: '#4CAF50'
  },
  exportButton: {
    backgroundColor: '#2196F3'
  },
  clearButton: {
    backgroundColor: '#F44336'
  },
  actionButtonDisabled: {
    opacity: 0.6
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});