import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Cpu, Brain, Shield, Zap, Clock, CheckCircle, AlertTriangle } from 'lucide-react-native';

// Import our Phase 1 components
import { LocalLLM, createLocalLLM, LLMRequest, LLMResponse } from '@/services/ai/edge/llm/local-llm';
import { AbuseClassifier, createAbuseClassifier, AbuseClassificationRequest } from '@/services/ai/edge/llm/abuse-classifier';
import { getEdgeRAGService } from '@/services/ai/edge/rag/index';

interface DemoStats {
  llmResponseTime: number;
  classifierResponseTime: number;
  ragDocuments: number;
  totalRequests: number;
}

export default function LocalIntelligenceMVPDemo() {
  const [localLLM, setLocalLLM] = useState<LocalLLM | null>(null);
  const [abuseClassifier, setAbuseClassifier] = useState<AbuseClassifier | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Demo inputs
  const [userPrompt, setUserPrompt] = useState('');
  const [testText, setTestText] = useState('');
  
  // Demo outputs
  const [llmResponse, setLlmResponse] = useState<LLMResponse | null>(null);
  const [classificationResult, setClassificationResult] = useState<any>(null);
  
  // Demo settings
  const [enableRAG, setEnableRAG] = useState(true);
  const [enableModeration, setEnableModeration] = useState(true);
  
  // Demo stats
  const [stats, setStats] = useState<DemoStats>({
    llmResponseTime: 0,
    classifierResponseTime: 0,
    ragDocuments: 0,
    totalRequests: 0
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    setIsInitializing(true);
    try {
      console.log('🚀 Initializing Phase 1 Local Intelligence MVP...');

      // Initialize LocalLLM
      const llm = createLocalLLM({
        modelId: 'llm-mobile-4bit-v1',
        maxTokens: 256,
        temperature: 0.7,
        maxResponseTime: 300,
        enableRAG,
        enableModeration
      });

      // Initialize AbuseClassifier
      const classifier = createAbuseClassifier({
        modelId: 'abuse-classifier-v1',
        threshold: 0.7,
        enableContextAnalysis: true,
        maxProcessingTime: 100
      });

      // Initialize services
      await llm.initialize();
      await classifier.initialize();

      // Initialize RAG service and add some demo documents
      const ragService = getEdgeRAGService();
      await ragService.initialize();
      
      // Add demo documents to RAG
      await addDemoDocuments(ragService);

      setLocalLLM(llm);
      setAbuseClassifier(classifier);
      setIsInitialized(true);
      
      // Update stats
      const ragStats = ragService.getIndexStats();
      setStats(prev => ({
        ...prev,
        ragDocuments: ragStats.documentCount
      }));

      console.log('✅ Phase 1 MVP initialized successfully');
      Alert.alert('Success', 'Local Intelligence MVP initialized successfully!');

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      Alert.alert('Error', `Initialization failed: ${error.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const addDemoDocuments = async (ragService: any) => {
    const demoDocuments = [
      {
        id: 'doc1',
        content: 'مدى هي منصة مالية رقمية تقدم خدمات مصرفية متطورة للمستخدمين في المملكة العربية السعودية.',
        metadata: {
          source: 'company_info',
          timestamp: Date.now(),
          category: 'general',
          priority: 1
        }
      },
      {
        id: 'doc2',
        content: 'يمكن للمستخدمين إرسال واستقبال الأموال بسهولة وأمان عبر تطبيق مدى المحمول.',
        metadata: {
          source: 'features',
          timestamp: Date.now(),
          category: 'payments',
          priority: 2
        }
      },
      {
        id: 'doc3',
        content: 'نحن نستخدم أحدث تقنيات الأمان والتشفير لحماية بيانات المستخدمين ومعاملاتهم المالية.',
        metadata: {
          source: 'security',
          timestamp: Date.now(),
          category: 'security',
          priority: 3
        }
      }
    ];

    for (const doc of demoDocuments) {
      await ragService.addDocument(doc);
    }
  };

  const testLLMGeneration = async () => {
    if (!localLLM || !userPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt and ensure LLM is initialized');
      return;
    }

    setIsProcessing(true);
    try {
      const request: LLMRequest = {
        prompt: userPrompt,
        taskType: 'chat',
        maxTokens: 128,
        systemPrompt: 'You are a helpful AI assistant for Mada financial platform.',
        userId: 'demo-user'
      };

      const startTime = Date.now();
      const response = await localLLM.generate(request);
      const responseTime = Date.now() - startTime;

      setLlmResponse(response);
      setStats(prev => ({
        ...prev,
        llmResponseTime: responseTime,
        totalRequests: prev.totalRequests + 1
      }));

      console.log('✅ LLM Response generated:', response);

    } catch (error) {
      console.error('❌ LLM generation failed:', error);
      Alert.alert('Error', `LLM generation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const testAbuseClassification = async () => {
    if (!abuseClassifier || !testText.trim()) {
      Alert.alert('Error', 'Please enter text and ensure classifier is initialized');
      return;
    }

    setIsProcessing(true);
    try {
      const request: AbuseClassificationRequest = {
        text: testText,
        userId: 'demo-user',
        metadata: {
          source: 'chat',
          timestamp: Date.now()
        }
      };

      const startTime = Date.now();
      const result = await abuseClassifier.classify(request);
      const responseTime = Date.now() - startTime;

      setClassificationResult(result);
      setStats(prev => ({
        ...prev,
        classifierResponseTime: responseTime,
        totalRequests: prev.totalRequests + 1
      }));

      console.log('✅ Classification result:', result);

    } catch (error) {
      console.error('❌ Classification failed:', error);
      Alert.alert('Error', `Classification failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDemo = () => {
    setUserPrompt('');
    setTestText('');
    setLlmResponse(null);
    setClassificationResult(null);
    setStats({
      llmResponseTime: 0,
      classifierResponseTime: 0,
      ragDocuments: stats.ragDocuments,
      totalRequests: 0
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Phase 1: Local Intelligence MVP',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff'
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Brain size={32} color="#4CAF50" />
          <Text style={styles.title}>Local Intelligence MVP</Text>
          <Text style={styles.subtitle}>Phase 1: LLM محلي خفيف + مصنف إساءة + RAG</Text>
        </View>

        {/* Status Cards */}
        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, isInitialized ? styles.statusSuccess : styles.statusPending]}>
            <Cpu size={20} color={isInitialized ? '#4CAF50' : '#FF9800'} />
            <Text style={styles.statusText}>
              {isInitialized ? 'Initialized' : 'Initializing...'}
            </Text>
          </View>
          
          <View style={styles.statusCard}>
            <Zap size={20} color="#2196F3" />
            <Text style={styles.statusText}>{stats.totalRequests} Requests</Text>
          </View>
          
          <View style={styles.statusCard}>
            <Clock size={20} color="#9C27B0" />
            <Text style={styles.statusText}>
              {stats.llmResponseTime > 0 ? `${stats.llmResponseTime}ms` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.statusCard}>
            <Shield size={20} color="#FF5722" />
            <Text style={styles.statusText}>
              {stats.classifierResponseTime > 0 ? `${stats.classifierResponseTime}ms` : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Enable RAG</Text>
            <Switch
              value={enableRAG}
              onValueChange={setEnableRAG}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
            />
          </View>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Enable Moderation</Text>
            <Switch
              value={enableModeration}
              onValueChange={setEnableModeration}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
            />
          </View>
        </View>

        {/* LLM Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 Local LLM (4-8bit)</Text>
          <Text style={styles.sectionDescription}>
            حوار قصير ≤ 256 توكن، زمن استجابة &lt; 300ms
          </Text>
          
          <TextInput
            style={styles.textInput}
            placeholder="Enter your prompt here..."
            placeholderTextColor="#666"
            value={userPrompt}
            onChangeText={setUserPrompt}
            multiline
          />
          
          <TouchableOpacity
            style={[styles.button, (!isInitialized || isProcessing) && styles.buttonDisabled]}
            onPress={testLLMGeneration}
            disabled={!isInitialized || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Generate Response</Text>
            )}
          </TouchableOpacity>
          
          {llmResponse && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <CheckCircle size={16} color="#4CAF50" />
                <Text style={styles.resultTitle}>LLM Response</Text>
              </View>
              <Text style={styles.resultText}>{llmResponse.text}</Text>
              <View style={styles.resultMeta}>
                <Text style={styles.metaText}>Tokens: {llmResponse.tokensUsed}</Text>
                <Text style={styles.metaText}>Time: {llmResponse.responseTime}ms</Text>
                <Text style={styles.metaText}>RAG: {llmResponse.ragUsed ? 'Yes' : 'No'}</Text>
                <Text style={styles.metaText}>Model: {llmResponse.model}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Abuse Classifier Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Abuse Classifier</Text>
          <Text style={styles.sectionDescription}>
            مصنف إساءة خفيف، زمن استجابة &lt; 100ms
          </Text>
          
          <TextInput
            style={styles.textInput}
            placeholder="Enter text to classify for abuse..."
            placeholderTextColor="#666"
            value={testText}
            onChangeText={setTestText}
            multiline
          />
          
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, (!isInitialized || isProcessing) && styles.buttonDisabled]}
            onPress={testAbuseClassification}
            disabled={!isInitialized || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Classify Content</Text>
            )}
          </TouchableOpacity>
          
          {classificationResult && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                {classificationResult.isAbusive ? (
                  <AlertTriangle size={16} color="#FF5722" />
                ) : (
                  <CheckCircle size={16} color="#4CAF50" />
                )}
                <Text style={styles.resultTitle}>
                  {classificationResult.isAbusive ? 'Abusive Content' : 'Clean Content'}
                </Text>
              </View>
              
              <Text style={styles.resultText}>
                Confidence: {(classificationResult.confidence * 100).toFixed(1)}%
              </Text>
              <Text style={styles.resultText}>
                Severity: {classificationResult.severity}
              </Text>
              
              {classificationResult.flags.length > 0 && (
                <Text style={styles.resultText}>
                  Flags: {classificationResult.flags.join(', ')}
                </Text>
              )}
              
              <View style={styles.resultMeta}>
                <Text style={styles.metaText}>Time: {classificationResult.processingTime}ms</Text>
                <Text style={styles.metaText}>
                  Categories: {Object.entries(classificationResult.categories)
                    .filter(([, score]) => score > 0.1)
                    .map(([cat, score]) => `${cat}: ${(score * 100).toFixed(0)}%`)
                    .join(', ') || 'None'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* RAG Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 RAG محلي</Text>
          <Text style={styles.sectionDescription}>
            فهرس صغير ≤ 30MB + تحديث تفاضلي
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.ragDocuments}</Text>
              <Text style={styles.statLabel}>Documents</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>30MB</Text>
              <Text style={styles.statLabel}>Max Size</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>384</Text>
              <Text style={styles.statLabel}>Embedding Dim</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={resetDemo}
          >
            <Text style={[styles.buttonText, styles.buttonTextOutline]}>Reset Demo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, isInitializing && styles.buttonDisabled]}
            onPress={initializeServices}
            disabled={isInitializing}
          >
            {isInitializing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reinitialize</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Performance Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Performance Targets</Text>
          <View style={styles.targetsList}>
            <View style={styles.targetItem}>
              <Text style={styles.targetText}>LLM Response: &lt; 300ms</Text>
              <Text style={[
                styles.targetStatus,
                stats.llmResponseTime > 0 && stats.llmResponseTime < 300 ? styles.targetSuccess : styles.targetPending
              ]}>
                {stats.llmResponseTime > 0 ? `${stats.llmResponseTime}ms` : 'Not tested'}
              </Text>
            </View>
            
            <View style={styles.targetItem}>
              <Text style={styles.targetText}>Classifier: &lt; 100ms</Text>
              <Text style={[
                styles.targetStatus,
                stats.classifierResponseTime > 0 && stats.classifierResponseTime < 100 ? styles.targetSuccess : styles.targetPending
              ]}>
                {stats.classifierResponseTime > 0 ? `${stats.classifierResponseTime}ms` : 'Not tested'}
              </Text>
            </View>
            
            <View style={styles.targetItem}>
              <Text style={styles.targetText}>Max Tokens: 256</Text>
              <Text style={styles.targetStatus}>Configured</Text>
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
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statusPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  configLabel: {
    color: '#fff',
    fontSize: 16,
  },
  textInput: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonSecondary: {
    backgroundColor: '#2196F3',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#555',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: '#4CAF50',
  },
  resultCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  metaText: {
    color: '#888',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  targetsList: {
    gap: 12,
  },
  targetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  targetText: {
    color: '#fff',
    fontSize: 14,
  },
  targetStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetSuccess: {
    color: '#4CAF50',
  },
  targetPending: {
    color: '#888',
  },
});