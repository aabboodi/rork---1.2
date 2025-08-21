import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Cloud, Server, Zap, Shield, Activity, CheckCircle, XCircle, Clock } from 'lucide-react-native';

interface TaskRequest {
  id: string;
  type: 'llm' | 'moderation' | 'rag' | 'analysis';
  payload: any;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

interface TaskResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  processingTime?: number;
  strategy: 'local' | 'hybrid' | 'cloud';
}

interface OrchestratorMetrics {
  totalRequests: number;
  localProcessed: number;
  cloudOffloaded: number;
  averageLatency: number;
  successRate: number;
}

export default function Phase2OrchestratorDemo() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [metrics, setMetrics] = useState<OrchestratorMetrics>({
    totalRequests: 0,
    localProcessed: 0,
    cloudOffloaded: 0,
    averageLatency: 0,
    successRate: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<'auto' | 'local' | 'cloud'>('auto');

  // Simulate Phase 2 offload decision logic
  const makeOrchestratorDecision = (task: TaskRequest): 'local' | 'hybrid' | 'cloud' => {
    if (selectedStrategy === 'local') return 'local';
    if (selectedStrategy === 'cloud') return 'cloud';
    
    // Auto strategy - Phase 2 offload rules
    const deviceLoad = Math.random(); // Simulate device load
    const networkQuality = Math.random(); // Simulate network quality
    
    // Simulate token estimation based on task type
    const tokenEstimates = {
      'llm': 150000 + Math.random() * 100000, // 150k-250k tokens
      'analysis': 120000 + Math.random() * 80000, // 120k-200k tokens
      'rag': 80000 + Math.random() * 60000, // 80k-140k tokens
      'moderation': 20000 + Math.random() * 30000 // 20k-50k tokens
    };
    
    // Simulate processing time based on device and task
    const baseProcessingTimes = {
      'llm': 800,
      'analysis': 600,
      'rag': 400,
      'moderation': 200
    };
    
    const deviceMultiplier = deviceLoad > 0.7 ? 2.0 : deviceLoad > 0.4 ? 1.5 : 1.0;
    const estimatedTokens = tokenEstimates[task.type as keyof typeof tokenEstimates] || 100000;
    const estimatedTime = (baseProcessingTimes[task.type as keyof typeof baseProcessingTimes] || 400) * deviceMultiplier;
    
    console.log(`🎯 Task ${task.type}: ${Math.round(estimatedTokens)} tokens, ${Math.round(estimatedTime)}ms`);
    
    // Phase 2 Rule: > 180k tokens OR > 600ms => offload to cloud
    if (estimatedTokens > 180000 || estimatedTime > 600) {
      console.log(`📤 Offloading: ${estimatedTokens > 180000 ? 'tokens > 180k' : 'time > 600ms'}`);
      return 'cloud';
    }
    
    // High priority tasks with good conditions stay local
    if (task.priority === 'high' && deviceLoad < 0.3) {
      return 'local';
    }
    
    // Moderation usually stays local (unless offload criteria met)
    if (task.type === 'moderation') {
      return 'local';
    }
    
    // Good network + high load = hybrid approach
    if (networkQuality > 0.8 && deviceLoad > 0.6) {
      return 'hybrid';
    }
    
    return 'local'; // Default to local
  };

  // Simulate task processing
  const processTask = async (taskRequest: TaskRequest): Promise<TaskResponse> => {
    const strategy = makeOrchestratorDecision(taskRequest);
    const startTime = Date.now();
    
    // Simulate processing time based on strategy
    const processingTime = {
      local: 100 + Math.random() * 200, // 100-300ms
      hybrid: 200 + Math.random() * 300, // 200-500ms
      cloud: 300 + Math.random() * 700  // 300-1000ms
    }[strategy];
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    const success = Math.random() > 0.1; // 90% success rate
    
    return {
      id: taskRequest.id,
      status: success ? 'completed' : 'failed',
      result: success ? `Processed via ${strategy}` : undefined,
      error: success ? undefined : 'Processing failed',
      processingTime: Date.now() - startTime,
      strategy
    };
  };

  // Create sample tasks
  const createSampleTask = (type: TaskRequest['type'], priority: TaskRequest['priority']) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: taskId,
      type,
      payload: { content: `Sample ${type} task` },
      priority,
      timestamp: Date.now()
    };
  };

  // Handle task submission
  const submitTask = async (type: TaskRequest['type'], priority: TaskRequest['priority']) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const taskRequest = createSampleTask(type, priority);
    
    try {
      const response = await processTask(taskRequest);
      
      setTasks(prev => [response, ...prev.slice(0, 9)]); // Keep last 10 tasks
      
      // Update metrics
      setMetrics(prev => {
        const newTotal = prev.totalRequests + 1;
        const newLocal = response.strategy === 'local' ? prev.localProcessed + 1 : prev.localProcessed;
        const newCloud = response.strategy === 'cloud' ? prev.cloudOffloaded + 1 : prev.cloudOffloaded;
        const newSuccess = response.status === 'completed' ? 1 : 0;
        
        return {
          totalRequests: newTotal,
          localProcessed: newLocal,
          cloudOffloaded: newCloud,
          averageLatency: response.processingTime || 0,
          successRate: ((prev.successRate * (newTotal - 1)) + newSuccess) / newTotal
        };
      });
    } catch {
      Alert.alert('Error', 'Failed to process task');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'local': return '#4CAF50';
      case 'hybrid': return '#FF9800';
      case 'cloud': return '#2196F3';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} color="#4CAF50" />;
      case 'failed': return <XCircle size={16} color="#F44336" />;
      case 'processing': return <Clock size={16} color="#FF9800" />;
      default: return <Activity size={16} color="#757575" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Phase 2: Central Orchestrator',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff'
        }} 
      />
      
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Server size={24} color="#2196F3" />
            <Text style={styles.title}>Central Orchestration Demo</Text>
          </View>
          <Text style={styles.subtitle}>
            Intelligent task routing between local and cloud processing
          </Text>
        </View>

        {/* Strategy Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Processing Strategy</Text>
          <View style={styles.strategyContainer}>
            {(['auto', 'local', 'cloud'] as const).map((strategy) => (
              <TouchableOpacity
                key={strategy}
                style={[
                  styles.strategyButton,
                  selectedStrategy === strategy && styles.strategyButtonActive
                ]}
                onPress={() => setSelectedStrategy(strategy)}
              >
                <Text style={[
                  styles.strategyButtonText,
                  selectedStrategy === strategy && styles.strategyButtonTextActive
                ]}>
                  {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Metrics Dashboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Orchestrator Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Activity size={20} color="#2196F3" />
              <Text style={styles.metricValue}>{metrics.totalRequests}</Text>
              <Text style={styles.metricLabel}>Total Requests</Text>
            </View>
            <View style={styles.metricCard}>
              <Shield size={20} color="#4CAF50" />
              <Text style={styles.metricValue}>{metrics.localProcessed}</Text>
              <Text style={styles.metricLabel}>Local Processed</Text>
            </View>
            <View style={styles.metricCard}>
              <Cloud size={20} color="#FF9800" />
              <Text style={styles.metricValue}>{metrics.cloudOffloaded}</Text>
              <Text style={styles.metricLabel}>Cloud Offloaded</Text>
            </View>
            <View style={styles.metricCard}>
              <Zap size={20} color="#9C27B0" />
              <Text style={styles.metricValue}>{Math.round(metrics.averageLatency)}ms</Text>
              <Text style={styles.metricLabel}>Avg Latency</Text>
            </View>
          </View>
        </View>

        {/* Offload Decision Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phase 2 Offload Rules</Text>
          <View style={styles.offloadRulesContainer}>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleTitle}>Token Limit</Text>
              <Text style={styles.ruleDescription}>
                Tasks {'>'} 180,000 tokens {'->'} Cloud
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleTitle}>Processing Time</Text>
              <Text style={styles.ruleDescription}>
                Local processing {'>'} 600ms {'->'} Cloud
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleTitle}>Summary Only</Text>
              <Text style={styles.ruleDescription}>
                Offloaded tasks send compressed summaries
              </Text>
            </View>
          </View>
        </View>

        {/* Task Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit Tasks</Text>
          <Text style={styles.sectionSubtitle}>
            Test offload decision logic with different task types
          </Text>
          <View style={styles.taskGrid}>
            {[
              { type: 'llm' as const, label: 'LLM Query (Heavy)', priority: 'high' as const, description: '~200k tokens' },
              { type: 'analysis' as const, label: 'Data Analysis', priority: 'low' as const, description: '~150k tokens' },
              { type: 'rag' as const, label: 'RAG Search', priority: 'medium' as const, description: '~100k tokens' },
              { type: 'moderation' as const, label: 'Content Moderation', priority: 'medium' as const, description: '~35k tokens' }
            ].map((task) => (
              <TouchableOpacity
                key={task.type}
                style={[
                  styles.taskButton,
                  isProcessing && styles.taskButtonDisabled
                ]}
                onPress={() => submitTask(task.type, task.priority)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.taskButtonContent}>
                    <Text style={styles.taskButtonText}>{task.label}</Text>
                    <Text style={styles.taskButtonDescription}>{task.description}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Task History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tasks submitted yet</Text>
            </View>
          ) : (
            <View style={styles.taskList}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskStatus}>
                      {getStatusIcon(task.status)}
                      <Text style={styles.taskId}>{task.id.split('_')[2]}</Text>
                    </View>
                    <View style={[
                      styles.strategyBadge,
                      { backgroundColor: getStrategyColor(task.strategy) }
                    ]}>
                      <Text style={styles.strategyBadgeText}>{task.strategy}</Text>
                    </View>
                  </View>
                  <View style={styles.taskDetails}>
                    <Text style={styles.taskResult}>
                      {task.result || task.error || 'Processing...'}
                    </Text>
                    {task.processingTime && (
                      <Text style={styles.taskTime}>
                        {task.processingTime}ms
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Success Rate */}
        <View style={styles.section}>
          <View style={styles.successRateContainer}>
            <Text style={styles.successRateLabel}>Success Rate</Text>
            <Text style={styles.successRateValue}>
              {(metrics.successRate * 100).toFixed(1)}%
            </Text>
          </View>
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
  strategyContainer: {
    flexDirection: 'row',
    gap: 8
  },
  strategyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  strategyButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  strategyButtonText: {
    textAlign: 'center',
    color: '#888',
    fontWeight: '500'
  },
  strategyButtonTextActive: {
    color: '#fff'
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
    fontSize: 24,
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
  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  taskButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center'
  },
  taskButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.6
  },
  taskButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center'
  },
  taskList: {
    gap: 12
  },
  taskItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  taskId: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace'
  },
  strategyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  strategyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  taskResult: {
    color: '#fff',
    fontSize: 14,
    flex: 1
  },
  taskTime: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace'
  },
  emptyState: {
    padding: 32,
    alignItems: 'center'
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16
  },
  successRateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  successRateLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  successRateValue: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold'
  },
  offloadRulesContainer: {
    gap: 12
  },
  ruleItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  ruleTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  ruleDescription: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    lineHeight: 20
  },
  taskButtonContent: {
    alignItems: 'center'
  },
  taskButtonDescription: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  }
});