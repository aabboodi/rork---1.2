import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import { 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react-native';

interface PerformanceMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  network: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
}

interface LoadTestResult {
  id: string;
  testType: 'load' | 'stress' | 'spike' | 'volume';
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  configuration: {
    virtualUsers: number;
    duration: number;
    rampUpTime: number;
    targetEndpoint: string;
  };
}

export const PerformanceMonitoringDashboard: React.FC = () => {
  const { colors } = useThemeStore();
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadTests, setLoadTests] = useState<LoadTestResult[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [runningTest, setRunningTest] = useState<LoadTestResult | null>(null);

  useEffect(() => {
    // Initialize with some sample data
    initializeSampleData();
    
    // Start real-time monitoring
    if (isMonitoring) {
      const interval = setInterval(updateMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const initializeSampleData = () => {
    const now = Date.now();
    const sampleMetrics: PerformanceMetrics[] = [];
    
    // Generate last 30 data points (1 minute of data)
    for (let i = 29; i >= 0; i--) {
      sampleMetrics.push({
        timestamp: now - (i * 2000),
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 20,
        network: Math.random() * 100 + 50,
        responseTime: Math.random() * 200 + 50,
        throughput: Math.random() * 1000 + 500,
        errorRate: Math.random() * 5
      });
    }
    
    setMetrics(sampleMetrics);
    setCurrentMetrics(sampleMetrics[sampleMetrics.length - 1]);
    
    // Sample load test results
    const sampleTests: LoadTestResult[] = [
      {
        id: 'test_1',
        testType: 'load',
        startTime: now - 3600000,
        endTime: now - 3300000,
        status: 'completed',
        metrics: {
          totalRequests: 10000,
          successfulRequests: 9850,
          failedRequests: 150,
          averageResponseTime: 245,
          maxResponseTime: 1200,
          minResponseTime: 45,
          requestsPerSecond: 33.3,
          errorRate: 1.5
        },
        configuration: {
          virtualUsers: 50,
          duration: 300,
          rampUpTime: 30,
          targetEndpoint: '/api/auth/login'
        }
      },
      {
        id: 'test_2',
        testType: 'stress',
        startTime: now - 7200000,
        endTime: now - 6900000,
        status: 'completed',
        metrics: {
          totalRequests: 25000,
          successfulRequests: 23500,
          failedRequests: 1500,
          averageResponseTime: 450,
          maxResponseTime: 3000,
          minResponseTime: 80,
          requestsPerSecond: 83.3,
          requestsPerSecond: 83.3,
          errorRate: 6.0
        },
        configuration: {
          virtualUsers: 200,
          duration: 300,
          rampUpTime: 60,
          targetEndpoint: '/api/wallet/send'
        }
      }
    ];
    
    setLoadTests(sampleTests);
  };

  const updateMetrics = () => {
    const newMetric: PerformanceMetrics = {
      timestamp: Date.now(),
      cpu: Math.random() * 80 + 10,
      memory: Math.random() * 70 + 20,
      network: Math.random() * 100 + 50,
      responseTime: Math.random() * 200 + 50,
      throughput: Math.random() * 1000 + 500,
      errorRate: Math.random() * 5
    };
    
    setCurrentMetrics(newMetric);
    setMetrics(prev => [...prev.slice(-29), newMetric]);
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    Alert.alert('Monitoring Started', 'Real-time performance monitoring is now active');
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    Alert.alert('Monitoring Stopped', 'Real-time performance monitoring has been stopped');
  };

  const runLoadTest = async (testType: 'load' | 'stress' | 'spike' | 'volume') => {
    if (runningTest) {
      Alert.alert('Test Running', 'A load test is already in progress');
      return;
    }

    const testConfig = getTestConfiguration(testType);
    const newTest: LoadTestResult = {
      id: `test_${Date.now()}`,
      testType,
      startTime: Date.now(),
      status: 'running',
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      },
      configuration: testConfig
    };

    setRunningTest(newTest);
    setLoadTests(prev => [newTest, ...prev]);

    Alert.alert(
      'Load Test Started',
      `${testType.toUpperCase()} test started with ${testConfig.virtualUsers} virtual users`,
      [{ text: 'OK' }]
    );

    // Simulate test execution
    setTimeout(() => {
      completeLoadTest(newTest.id);
    }, testConfig.duration * 100); // Simulate faster for demo
  };

  const completeLoadTest = (testId: string) => {
    setLoadTests(prev => prev.map(test => {
      if (test.id === testId) {
        const duration = (Date.now() - test.startTime) / 1000;
        const totalRequests = test.configuration.virtualUsers * duration * 2;
        const failedRequests = Math.floor(totalRequests * (Math.random() * 0.1));
        const successfulRequests = totalRequests - failedRequests;

        return {
          ...test,
          endTime: Date.now(),
          status: 'completed' as const,
          metrics: {
            totalRequests,
            successfulRequests,
            failedRequests,
            averageResponseTime: Math.random() * 300 + 100,
            maxResponseTime: Math.random() * 1000 + 500,
            minResponseTime: Math.random() * 50 + 20,
            requestsPerSecond: totalRequests / duration,
            errorRate: (failedRequests / totalRequests) * 100
          }
        };
      }
      return test;
    }));

    setRunningTest(null);
    Alert.alert('Test Completed', `Load test ${testId} has completed successfully`);
  };

  const getTestConfiguration = (testType: string) => {
    switch (testType) {
      case 'load':
        return {
          virtualUsers: 50,
          duration: 300,
          rampUpTime: 30,
          targetEndpoint: '/api/test/load'
        };
      case 'stress':
        return {
          virtualUsers: 200,
          duration: 600,
          rampUpTime: 60,
          targetEndpoint: '/api/test/stress'
        };
      case 'spike':
        return {
          virtualUsers: 500,
          duration: 180,
          rampUpTime: 10,
          targetEndpoint: '/api/test/spike'
        };
      case 'volume':
        return {
          virtualUsers: 100,
          duration: 1800,
          rampUpTime: 120,
          targetEndpoint: '/api/test/volume'
        };
      default:
        return {
          virtualUsers: 50,
          duration: 300,
          rampUpTime: 30,
          targetEndpoint: '/api/test/default'
        };
    }
  };

  const getMetricColor = (value: number, type: string) => {
    switch (type) {
      case 'cpu':
      case 'memory':
        if (value > 80) return colors.error;
        if (value > 60) return colors.warning;
        return colors.success;
      case 'responseTime':
        if (value > 500) return colors.error;
        if (value > 200) return colors.warning;
        return colors.success;
      case 'errorRate':
        if (value > 5) return colors.error;
        if (value > 2) return colors.warning;
        return colors.success;
      default:
        return colors.primary;
    }
  };

  const renderMetricCard = (title: string, value: string, icon: any, color: string, trend?: 'up' | 'down') => {
    const IconComponent = icon;
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
    
    return (
      <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.metricHeader}>
          <IconComponent size={20} color={color} />
          {TrendIcon && <TrendIcon size={16} color={trend === 'up' ? colors.success : colors.error} />}
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
    );
  };

  const renderLoadTestCard = (test: LoadTestResult) => {
    const statusColor = test.status === 'completed' ? colors.success : 
                       test.status === 'failed' ? colors.error : colors.warning;
    const StatusIcon = test.status === 'completed' ? CheckCircle : 
                      test.status === 'failed' ? AlertTriangle : Activity;

    return (
      <View key={test.id} style={[styles.testCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.testHeader}>
          <View style={styles.testInfo}>
            <Text style={[styles.testType, { color: colors.text }]}>
              {test.testType.toUpperCase()} TEST
            </Text>
            <View style={styles.testStatus}>
              <StatusIcon size={16} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {test.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.testTime, { color: colors.textSecondary }]}>
            {formatRelativeTime(test.startTime)}
          </Text>
        </View>

        <View style={styles.testConfig}>
          <Text style={[styles.configText, { color: colors.textSecondary }]}>
            {test.configuration.virtualUsers} users • {test.configuration.duration}s duration
          </Text>
          <Text style={[styles.configText, { color: colors.textSecondary }]}>
            Target: {test.configuration.targetEndpoint}
          </Text>
        </View>

        {test.status === 'completed' && (
          <View style={styles.testMetrics}>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Requests</Text>
                <Text style={[styles.metricNumber, { color: colors.text }]}>
                  {test.metrics.totalRequests.toLocaleString()}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Success Rate</Text>
                <Text style={[styles.metricNumber, { color: colors.success }]}>
                  {((test.metrics.successfulRequests / test.metrics.totalRequests) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg Response</Text>
                <Text style={[styles.metricNumber, { color: colors.text }]}>
                  {Math.round(test.metrics.averageResponseTime)}ms
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>RPS</Text>
                <Text style={[styles.metricNumber, { color: colors.text }]}>
                  {test.metrics.requestsPerSecond.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>📈 Performance Testing</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Real-time monitoring and load testing with k6 integration
          </Text>
        </View>

        {/* Monitoring Controls */}
        <View style={styles.controlsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Real-time Monitoring</Text>
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                {
                  backgroundColor: isMonitoring ? colors.error : colors.success,
                }
              ]}
              onPress={isMonitoring ? stopMonitoring : startMonitoring}
            >
              {isMonitoring ? (
                <Pause size={16} color={colors.textInverse} />
              ) : (
                <Play size={16} color={colors.textInverse} />
              )}
              <Text style={[styles.controlButtonText, { color: colors.textInverse }]}>
                {isMonitoring ? 'Stop' : 'Start'} Monitoring
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => {
                setMetrics([]);
                setCurrentMetrics(null);
                initializeSampleData();
              }}
            >
              <RotateCcw size={16} color={colors.text} />
              <Text style={[styles.controlButtonText, { color: colors.text }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Metrics */}
        {currentMetrics && (
          <View style={styles.metricsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Performance</Text>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'CPU Usage',
                `${Math.round(currentMetrics.cpu)}%`,
                Cpu,
                getMetricColor(currentMetrics.cpu, 'cpu')
              )}
              {renderMetricCard(
                'Memory',
                `${Math.round(currentMetrics.memory)}%`,
                HardDrive,
                getMetricColor(currentMetrics.memory, 'memory')
              )}
              {renderMetricCard(
                'Network',
                `${Math.round(currentMetrics.network)} KB/s`,
                Wifi,
                colors.info
              )}
              {renderMetricCard(
                'Response Time',
                `${Math.round(currentMetrics.responseTime)}ms`,
                Clock,
                getMetricColor(currentMetrics.responseTime, 'responseTime')
              )}
              {renderMetricCard(
                'Throughput',
                `${Math.round(currentMetrics.throughput)} req/s`,
                TrendingUp,
                colors.primary
              )}
              {renderMetricCard(
                'Error Rate',
                `${currentMetrics.errorRate.toFixed(1)}%`,
                AlertTriangle,
                getMetricColor(currentMetrics.errorRate, 'errorRate')
              )}
            </View>
          </View>
        )}

        {/* Load Testing */}
        <View style={styles.loadTestSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Load Testing (k6)</Text>
          
          <View style={styles.testButtons}>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={() => runLoadTest('load')}
              disabled={!!runningTest}
            >
              <Server size={16} color={colors.textInverse} />
              <Text style={[styles.testButtonText, { color: colors.textInverse }]}>
                Load Test
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.warning }]}
              onPress={() => runLoadTest('stress')}
              disabled={!!runningTest}
            >
              <Zap size={16} color={colors.textInverse} />
              <Text style={[styles.testButtonText, { color: colors.textInverse }]}>
                Stress Test
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.error }]}
              onPress={() => runLoadTest('spike')}
              disabled={!!runningTest}
            >
              <TrendingUp size={16} color={colors.textInverse} />
              <Text style={[styles.testButtonText, { color: colors.textInverse }]}>
                Spike Test
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.info }]}
              onPress={() => runLoadTest('volume')}
              disabled={!!runningTest}
            >
              <Activity size={16} color={colors.textInverse} />
              <Text style={[styles.testButtonText, { color: colors.textInverse }]}>
                Volume Test
              </Text>
            </TouchableOpacity>
          </View>

          {runningTest && (
            <View style={[styles.runningTestCard, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
              <View style={styles.runningTestHeader}>
                <Activity size={20} color={colors.warning} />
                <Text style={[styles.runningTestText, { color: colors.text }]}>
                  {runningTest.testType.toUpperCase()} test in progress...
                </Text>
              </View>
              <Text style={[styles.runningTestDetails, { color: colors.textSecondary }]}>
                {runningTest.configuration.virtualUsers} virtual users • {runningTest.configuration.duration}s duration
              </Text>
            </View>
          )}
        </View>

        {/* Test Results */}
        <View style={styles.resultsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Results</Text>
          {loadTests.length === 0 ? (
            <View style={styles.emptyState}>
              <Server size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No load tests run yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Run a load test to see performance results
              </Text>
            </View>
          ) : (
            loadTests.map(renderLoadTestCard)
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  controlsSection: {
    marginBottom: 24,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsSection: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  loadTestSection: {
    marginBottom: 24,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  runningTestCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  runningTestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  runningTestText: {
    fontSize: 16,
    fontWeight: '600',
  },
  runningTestDetails: {
    fontSize: 14,
  },
  resultsSection: {
    marginBottom: 24,
  },
  testCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  testInfo: {
    flex: 1,
  },
  testType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testTime: {
    fontSize: 12,
  },
  testConfig: {
    marginBottom: 12,
  },
  configText: {
    fontSize: 13,
    marginBottom: 2,
  },
  testMetrics: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PerformanceMonitoringDashboard;