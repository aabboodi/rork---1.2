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
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Brain, 
  Shield, 
  Activity, 
  Users, 
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Eye,
  TrendingUp
} from 'lucide-react-native';
import { EdgeAIOrchestrator } from '@/services/ai/EdgeAIOrchestrator';
import type { AITask } from '@/services/ai/EdgeAIOrchestrator';

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  status: 'success' | 'warning' | 'error' | 'info';
  onPress?: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  status, 
  onPress 
}) => {
  const statusColors = {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  };

  return (
    <TouchableOpacity 
      style={[styles.statusCard, { borderLeftColor: statusColors[status] }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: statusColors[status] + '20' }]}>
          {React.createElement(icon, { size: 24, color: statusColors[status] })}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.cardValue, { color: statusColors[status] }]}>{value}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function EdgeAIDashboard() {
  const [orchestrator] = useState(() => EdgeAIOrchestrator.getInstance());
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [databaseStats, setDatabaseStats] = useState<any>(null);
  const [telemetrySummary, setTelemetrySummary] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      await initializeEdgeAI();
    };
    init();
  }, []);

  const initializeEdgeAI = async () => {
    try {
      setIsLoading(true);
      
      console.log('🚀 Initializing Edge AI system...');
      await orchestrator.initialize();
      
      await updateStatus();
      
      console.log('✅ Edge AI system initialized successfully');
    } catch (error) {
      console.error('❌ Edge AI initialization failed:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize Edge AI system. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async () => {
    const currentStatus = orchestrator.getStatus();
    setStatus(currentStatus);
    
    // Get database statistics
    try {
      const dbStats = await orchestrator.getDatabaseStats();
      setDatabaseStats(dbStats);
      
      const telemetrySum = await orchestrator.getTelemetrySummary();
      setTelemetrySummary(telemetrySum);
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await orchestrator.updatePolicies();
      await orchestrator.updateModels();
      await updateStatus();
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      Alert.alert('Refresh Error', 'Failed to update policies and models.');
    } finally {
      setRefreshing(false);
    }
  };

  const runTestTask = async (taskType: 'chat' | 'classification' | 'moderation' | 'recommendation') => {
    try {
      const testInputs = {
        chat: 'مرحبا، كيف يمكنني استخدام تطبيق مدى؟',
        classification: 'هذا تطبيق رائع وسهل الاستخدام',
        moderation: 'محتوى آمن للاختبار',
        recommendation: { userId: 'test_user', preferences: ['finance', 'technology'] }
      };

      const task: AITask = {
        id: `test_${taskType}_${Date.now()}`,
        type: taskType,
        input: testInputs[taskType],
        priority: 'medium'
      };

      console.log(`🧪 Running test task: ${taskType}`);
      const startTime = Date.now();
      
      const result = await orchestrator.processTask(task);
      const endTime = Date.now();

      const testResult = {
        taskType,
        success: true,
        processingTime: endTime - startTime,
        tokensUsed: result.tokensUsed,
        source: result.source,
        confidence: result.confidence,
        timestamp: Date.now()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
      await updateStatus();

      Alert.alert(
        'Test Completed',
        `Task: ${taskType}\nProcessing Time: ${result.processingTime}ms\nTokens Used: ${result.tokensUsed}\nSource: ${result.source}\nConfidence: ${(result.confidence * 100).toFixed(1)}%`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error(`❌ Test task ${taskType} failed:`, error);
      
      const testResult = {
        taskType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);

      Alert.alert(
        'Test Failed',
        `Task ${taskType} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const participateInFederatedLearning = async () => {
    try {
      console.log('🤝 Starting federated learning participation...');
      await orchestrator.participateInFederatedLearning();
      
      Alert.alert(
        'Federated Learning',
        'Successfully participated in federated learning round.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Federated learning failed:', error);
      Alert.alert(
        'Federated Learning Error',
        'Failed to participate in federated learning.',
        [{ text: 'OK' }]
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Activity size={48} color="#3B82F6" />
          <Text style={styles.loadingText}>Initializing Edge AI System...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!status) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load Edge AI status</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeEdgeAI}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getTokenBudgetStatus = () => {
    const percentage = status.tokenBudget?.usagePercentage || 0;
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>مدى Edge AI</Text>
            <Text style={styles.subtitle}>On-Device Intelligence & Central Orchestration</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RefreshCw size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* System Status Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.cardGrid}>
            <StatusCard
              title="System Status"
              value={status.isInitialized ? "Active" : "Inactive"}
              icon={CheckCircle}
              status={status.isInitialized ? "success" : "error"}
            />
            
            <StatusCard
              title="Token Budget"
              value={`${status.tokenBudget?.usagePercentage?.toFixed(1) || 0}%`}
              subtitle={`${status.tokenBudget?.remainingTokens || 0} remaining`}
              icon={Zap}
              status={getTokenBudgetStatus()}
            />
            
            <StatusCard
              title="Active Tasks"
              value={status.activeTasks || 0}
              icon={Activity}
              status="info"
            />
            
            <StatusCard
              title="Session Uptime"
              value={formatUptime(status.sessionUptime || 0)}
              icon={Clock}
              status="info"
            />
          </View>
        </View>

        {/* Phase 1 MVP Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phase 1: Local Intelligence MVP</Text>
          <TouchableOpacity 
            style={styles.mvpDemoButton}
            onPress={() => {
              // Navigate to Phase 1 demo
              console.log('Navigate to Phase 1 MVP Demo');
            }}
          >
            <Brain size={24} color="#FFFFFF" />
            <View style={styles.mvpDemoContent}>
              <Text style={styles.mvpDemoTitle}>Local Intelligence MVP Demo</Text>
              <Text style={styles.mvpDemoSubtitle}>
                LLM محلي خفيف + مصنف إساءة + RAG محلي عملي
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* AI Task Testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Task Testing</Text>
          <View style={styles.taskButtons}>
            <TouchableOpacity 
              style={[styles.taskButton, styles.chatButton]}
              onPress={() => runTestTask('chat')}
            >
              <Brain size={20} color="#FFFFFF" />
              <Text style={styles.taskButtonText}>Test Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.taskButton, styles.classificationButton]}
              onPress={() => runTestTask('classification')}
            >
              <BarChart3 size={20} color="#FFFFFF" />
              <Text style={styles.taskButtonText}>Test Classification</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.taskButton, styles.moderationButton]}
              onPress={() => runTestTask('moderation')}
            >
              <Shield size={20} color="#FFFFFF" />
              <Text style={styles.taskButtonText}>Test Moderation</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.taskButton, styles.recommendationButton]}
              onPress={() => runTestTask('recommendation')}
            >
              <Users size={20} color="#FFFFFF" />
              <Text style={styles.taskButtonText}>Test Recommendation</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Federated Learning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Federated Learning</Text>
          <TouchableOpacity 
            style={styles.federatedButton}
            onPress={participateInFederatedLearning}
          >
            <Users size={24} color="#FFFFFF" />
            <View style={styles.federatedButtonContent}>
              <Text style={styles.federatedButtonTitle}>Participate in Learning</Text>
              <Text style={styles.federatedButtonSubtitle}>
                Contribute to model improvement while preserving privacy
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Behavior Analytics */}
        {status.behaviorAnalytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Behavior Analytics (UEBA Lite)</Text>
            <View style={styles.cardGrid}>
              <StatusCard
                title="Risk Score"
                value={`${status.behaviorAnalytics.riskScore}/100`}
                subtitle={status.behaviorAnalytics.riskLevel}
                icon={Eye}
                status={status.behaviorAnalytics.riskLevel === 'low' ? 'success' : 
                       status.behaviorAnalytics.riskLevel === 'medium' ? 'warning' : 'error'}
              />
              
              <StatusCard
                title="Recent Events"
                value={status.behaviorAnalytics.recentEvents}
                subtitle="Last 24 hours"
                icon={Activity}
                status="info"
              />
              
              <StatusCard
                title="Anomalies"
                value={status.behaviorAnalytics.recentAnomalies}
                subtitle="Detected today"
                icon={AlertTriangle}
                status={status.behaviorAnalytics.recentAnomalies > 0 ? 'warning' : 'success'}
              />
              
              <StatusCard
                title="Top Patterns"
                value={status.behaviorAnalytics.topPatterns?.length || 0}
                subtitle="Learned behaviors"
                icon={TrendingUp}
                status="info"
              />
            </View>
            
            {status.behaviorAnalytics.topPatterns && status.behaviorAnalytics.topPatterns.length > 0 && (
              <View style={styles.patternsContainer}>
                <Text style={styles.patternsTitle}>Top Behavior Patterns</Text>
                {status.behaviorAnalytics.topPatterns.slice(0, 3).map((pattern, index) => (
                  <View key={index} style={styles.patternItem}>
                    <View style={styles.patternHeader}>
                      <Text style={styles.patternType}>{pattern.type}</Text>
                      <Text style={[styles.patternRisk, {
                        color: pattern.riskLevel === 'low' ? '#10B981' :
                               pattern.riskLevel === 'medium' ? '#F59E0B' : '#EF4444'
                      }]}>
                        {pattern.riskLevel}
                      </Text>
                    </View>
                    <Text style={styles.patternFrequency}>
                      Frequency: {pattern.frequency} occurrences
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Recent Test Results */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Test Results</Text>
            {testResults.slice(0, 5).map((result, index) => (
              <View key={index} style={styles.testResult}>
                <View style={styles.testResultHeader}>
                  <Text style={styles.testResultType}>{result.taskType}</Text>
                  <Text style={styles.testResultTime}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                {result.success ? (
                  <View style={styles.testResultDetails}>
                    <Text style={styles.testResultSuccess}>
                      ✅ {result.processingTime}ms • {result.tokensUsed} tokens • {result.source}
                    </Text>
                    <Text style={styles.testResultConfidence}>
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.testResultError}>❌ {result.error}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Database Statistics */}
        {databaseStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Statistics</Text>
            <View style={styles.cardGrid}>
              <StatusCard
                title="Device Profiles"
                value={databaseStats.deviceProfiles}
                icon={Users}
                status="info"
              />
              
              <StatusCard
                title="Policies"
                value={databaseStats.policies}
                icon={Shield}
                status="info"
              />
              
              <StatusCard
                title="Model Artifacts"
                value={databaseStats.modelArtifacts}
                icon={Brain}
                status="info"
              />
              
              <StatusCard
                title="Telemetry Records"
                value={databaseStats.telemetryRecords}
                icon={BarChart3}
                status="info"
              />
            </View>
            
            <View style={styles.storageInfo}>
              <Text style={styles.storageLabel}>Storage Used:</Text>
              <Text style={styles.storageValue}>
                {(databaseStats.totalStorageUsed / 1024).toFixed(1)} KB
              </Text>
            </View>
          </View>
        )}

        {/* Telemetry Summary */}
        {telemetrySummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Telemetry Summary (24h)</Text>
            <View style={styles.cardGrid}>
              <StatusCard
                title="Total Records"
                value={telemetrySummary.totalRecords}
                icon={Activity}
                status="info"
              />
              
              <StatusCard
                title="Avg Tokens"
                value={Math.round(telemetrySummary.avgTokensUsed)}
                icon={Zap}
                status="info"
              />
              
              <StatusCard
                title="Avg Processing"
                value={`${Math.round(telemetrySummary.avgProcessingTime)}ms`}
                icon={Clock}
                status="info"
              />
              
              <StatusCard
                title="Task Types"
                value={Object.keys(telemetrySummary.taskTypeDistribution).length}
                icon={BarChart3}
                status="info"
              />
            </View>
            
            {Object.keys(telemetrySummary.taskTypeDistribution).length > 0 && (
              <View style={styles.taskDistribution}>
                <Text style={styles.distributionTitle}>Task Type Distribution</Text>
                {Object.entries(telemetrySummary.taskTypeDistribution).map(([type, count]) => (
                  <View key={type} style={styles.distributionItem}>
                    <Text style={styles.distributionType}>{type}</Text>
                    <Text style={styles.distributionCount}>{count as number} tasks</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Configuration Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <View style={styles.configInfo}>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Device ID:</Text>
              <Text style={styles.configValue}>{status.config?.deviceId || 'N/A'}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Model Version:</Text>
              <Text style={styles.configValue}>{status.config?.modelVersion || 'N/A'}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Policy Version:</Text>
              <Text style={styles.configValue}>{status.config?.policyVersion || 'N/A'}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Security Level:</Text>
              <Text style={styles.configValue}>{status.config?.securityLevel || 'N/A'}</Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Platform:</Text>
              <Text style={styles.configValue}>{Platform.OS}</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  taskButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  chatButton: {
    backgroundColor: '#3B82F6',
  },
  classificationButton: {
    backgroundColor: '#10B981',
  },
  moderationButton: {
    backgroundColor: '#EF4444',
  },
  recommendationButton: {
    backgroundColor: '#8B5CF6',
  },
  taskButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  federatedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  federatedButtonContent: {
    flex: 1,
  },
  federatedButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  federatedButtonSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  testResult: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testResultType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  testResultTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  testResultDetails: {
    gap: 2,
  },
  testResultSuccess: {
    fontSize: 12,
    color: '#10B981',
  },
  testResultConfidence: {
    fontSize: 12,
    color: '#6B7280',
  },
  testResultError: {
    fontSize: 12,
    color: '#EF4444',
  },
  configInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  configLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  configValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  patternsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  patternsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  patternItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patternType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  patternRisk: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  patternFrequency: {
    fontSize: 12,
    color: '#6B7280',
  },
  storageInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  storageValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  taskDistribution: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  distributionType: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  distributionCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  mvpDemoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  mvpDemoContent: {
    flex: 1,
  },
  mvpDemoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mvpDemoSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
});