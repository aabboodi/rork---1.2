import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Search, Database, FileText, Zap, BarChart3 } from 'lucide-react-native';
import { getEdgeRAGService, SearchResult } from '@/services/ai/edge/rag';

export default function EdgeRAGDemo() {
  const [ragService] = useState(() => getEdgeRAGService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [newDocContent, setNewDocContent] = useState('');
  const [indexStats, setIndexStats] = useState({
    documentCount: 0,
    sizeBytes: 0,
    version: '1.0.0',
    lastUpdated: Date.now()
  });

  const initializeRAG = useCallback(async () => {
    try {
      setIsLoading(true);
      await ragService.initialize();
      setIsInitialized(true);
      updateStats();
      
      // Add some sample documents if index is empty
      const stats = ragService.getIndexStats();
      if (stats.documentCount === 0) {
        await addSampleDocuments();
      }
    } catch (error) {
      console.error('Failed to initialize RAG:', error);
      Alert.alert('خطأ', 'فشل في تهيئة نظام RAG');
    } finally {
      setIsLoading(false);
    }
  }, [ragService, updateStats, addSampleDocuments]);

  const updateStats = useCallback(() => {
    const stats = ragService.getIndexStats();
    setIndexStats(stats);
  }, [ragService]);

  const addSampleDocuments = useCallback(async () => {
    const sampleDocs = [
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
        content: 'الذكاء الاصطناعي على الجهاز يوفر خصوصية أفضل ووقت استجابة أسرع للمستخدمين.',
        metadata: {
          source: 'ai_features',
          timestamp: Date.now(),
          category: 'technology',
          priority: 2
        }
      },
      {
        id: 'doc3',
        content: 'نظام RAG المحلي يستخدم فهارس HNSW مضغوطة لتوفير بحث سريع وفعال في المستندات.',
        metadata: {
          source: 'technical_docs',
          timestamp: Date.now(),
          category: 'technical',
          priority: 1
        }
      },
      {
        id: 'doc4',
        content: 'الأمان والخصوصية هما أولوية قصوى في تصميم جميع خدمات مدى المالية.',
        metadata: {
          source: 'security_policy',
          timestamp: Date.now(),
          category: 'security',
          priority: 3
        }
      }
    ];

    for (const doc of sampleDocs) {
      await ragService.addDocument(doc);
    }
    
    updateStats();
  }, [ragService, updateStats]);

  useEffect(() => {
    initializeRAG();
  }, [initializeRAG]);



  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsLoading(true);
      const results = await ragService.search(searchQuery, 5);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('خطأ', 'فشل في البحث');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocContent.trim()) return;
    
    try {
      setIsLoading(true);
      const newDoc = {
        id: `doc_${Date.now()}`,
        content: newDocContent,
        metadata: {
          source: 'user_input',
          timestamp: Date.now(),
          category: 'user_generated',
          priority: 1
        }
      };
      
      await ragService.addDocument(newDoc);
      setNewDocContent('');
      updateStats();
      Alert.alert('نجح', 'تم إضافة المستند بنجاح');
    } catch (error) {
      console.error('Failed to add document:', error);
      Alert.alert('خطأ', 'فشل في إضافة المستند');
    } finally {
      setIsLoading(false);
    }
  };

  const generateContext = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsLoading(true);
      const context = await ragService.generateContext(searchQuery, 1000);
      Alert.alert('السياق المُولّد', context || 'لم يتم العثور على سياق مناسب');
    } catch (error) {
      console.error('Failed to generate context:', error);
      Alert.alert('خطأ', 'فشل في توليد السياق');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Edge RAG Demo', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>جاري تهيئة نظام RAG...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Edge RAG Demo', headerShown: true }} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Database size={32} color="#007AFF" />
          <Text style={styles.title}>نظام RAG المحلي</Text>
          <Text style={styles.subtitle}>البحث والاسترجاع الذكي على الجهاز</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <BarChart3 size={20} color="#34C759" />
            <Text style={styles.statsTitle}>إحصائيات الفهرس</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{indexStats.documentCount}</Text>
              <Text style={styles.statLabel}>المستندات</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatBytes(indexStats.sizeBytes)}</Text>
              <Text style={styles.statLabel}>الحجم</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{indexStats.version}</Text>
              <Text style={styles.statLabel}>الإصدار</Text>
            </View>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Search size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>البحث في المستندات</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ادخل استعلام البحث..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              multiline
            />
            <View style={styles.searchButtons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSearch}
                disabled={isLoading}
              >
                <Search size={16} color="white" />
                <Text style={styles.buttonText}>بحث</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={generateContext}
                disabled={isLoading}
              >
                <Zap size={16} color="#007AFF" />
                <Text style={styles.secondaryButtonText}>توليد السياق</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>نتائج البحث ({searchResults.length})</Text>
              {searchResults.map((result, index) => (
                <View key={index} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultScore}>
                      النقاط: {(result.score * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.resultCategory}>
                      {result.document.metadata.category}
                    </Text>
                  </View>
                  <Text style={styles.resultContent} numberOfLines={3}>
                    {result.document.content}
                  </Text>
                  <Text style={styles.resultSource}>
                    المصدر: {result.document.metadata.source}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Add Document Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color="#34C759" />
            <Text style={styles.sectionTitle}>إضافة مستند جديد</Text>
          </View>
          
          <TextInput
            style={styles.documentInput}
            placeholder="ادخل محتوى المستند..."
            value={newDocContent}
            onChangeText={setNewDocContent}
            multiline
            numberOfLines={4}
          />
          
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={handleAddDocument}
            disabled={isLoading || !newDocContent.trim()}
          >
            <FileText size={16} color="white" />
            <Text style={styles.buttonText}>إضافة مستند</Text>
          </TouchableOpacity>
        </View>

        {/* Features Info */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>مميزات النظام</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>• فهرسة HNSW خفيفة الوزن</Text>
            <Text style={styles.featureItem}>• ضغط المحتوى التلقائي</Text>
            <Text style={styles.featureItem}>• تحديثات تفاضلية</Text>
            <Text style={styles.featureItem}>• حد أقصى 30 ميجابايت</Text>
            <Text style={styles.featureItem}>• بحث سريع وفعال</Text>
            <Text style={styles.featureItem}>• خصوصية كاملة على الجهاز</Text>
          </View>
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8,
  },
  searchContainer: {
    gap: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  documentInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  resultsContainer: {
    marginTop: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  resultItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  resultCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultContent: {
    fontSize: 14,
    color: '#1D1D1F',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultSource: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});