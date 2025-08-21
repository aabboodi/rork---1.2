import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Download, CheckCircle, AlertTriangle, Trash2, RefreshCw, HardDrive } from 'lucide-react-native';
import { ModelLoader, ModelArtifact, LoadedModel } from '@/services/ai/edge/runtime/model-loader';

export default function ModelLoaderDemo() {
  const [availableModels, setAvailableModels] = useState<ModelArtifact[]>([]);
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ loadedModels: 0, totalSize: 0, oldestModel: null });

  const modelLoader = ModelLoader.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAvailableModels(),
        loadModelStats()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const models = await modelLoader.getCompatibleModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load available models:', error);
    }
  };

  const loadModelStats = async () => {
    try {
      const modelStats = modelLoader.getStats();
      setStats(modelStats);
    } catch (error) {
      console.error('Failed to load model stats:', error);
    }
  };

  const handleLoadModel = async (modelId: string) => {
    try {
      setLoading(true);
      const loadedModel = await modelLoader.loadModel(modelId);
      
      Alert.alert(
        'تم التحميل بنجاح',
        `تم تحميل النموذج: ${loadedModel.name} v${loadedModel.version}`
      );
      
      await loadModelStats();
    } catch (error) {
      console.error('Failed to load model:', error);
      Alert.alert('خطأ', `فشل في تحميل النموذج: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnloadModel = async (modelId: string) => {
    try {
      await modelLoader.unloadModel(modelId);
      Alert.alert('تم الإلغاء', 'تم إلغاء تحميل النموذج من الذاكرة');
      await loadModelStats();
    } catch (error) {
      console.error('Failed to unload model:', error);
      Alert.alert('خطأ', 'فشل في إلغاء تحميل النموذج');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'تأكيد',
      'هل تريد مسح جميع النماذج المحملة من الذاكرة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            try {
              await modelLoader.clearCache();
              Alert.alert('تم المسح', 'تم مسح جميع النماذج من الذاكرة');
              await loadModelStats();
            } catch (error) {
              Alert.alert('خطأ', 'فشل في مسح الذاكرة');
            }
          }
        }
      ]
    );
  };

  const handleCleanupOldModels = async () => {
    Alert.alert(
      'تنظيف الملفات القديمة',
      'هل تريد حذف ملفات النماذج القديمة (أكثر من 7 أيام)؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تنظيف',
          onPress: async () => {
            try {
              setLoading(true);
              await modelLoader.cleanupOldModels();
              Alert.alert('تم التنظيف', 'تم حذف الملفات القديمة');
            } catch (error) {
              Alert.alert('خطأ', 'فشل في تنظيف الملفات');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getModelStatusColor = (model: ModelArtifact) => {
    if (model.expires_at && new Date(model.expires_at) < new Date()) {
      return '#ef4444'; // red for expired
    }
    return '#10b981'; // green for valid
  };

  const getModelStatusIcon = (model: ModelArtifact) => {
    if (model.expires_at && new Date(model.expires_at) < new Date()) {
      return <AlertTriangle size={16} color="#ef4444" />;
    }
    return <CheckCircle size={16} color="#10b981" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'محمل النماذج الموقعة',
          headerStyle: { backgroundColor: '#1f2937' },
          headerTintColor: '#ffffff'
        }} 
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>إحصائيات النماذج</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <HardDrive size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{stats.loadedModels}</Text>
              <Text style={styles.statLabel}>نماذج محملة</Text>
            </View>
            <View style={styles.statCard}>
              <Download size={24} color="#10b981" />
              <Text style={styles.statValue}>{availableModels.length}</Text>
              <Text style={styles.statLabel}>نماذج متاحة</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>إجراءات</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearCache}
              disabled={loading}
            >
              <Trash2 size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>مسح الذاكرة</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.cleanupButton]}
              onPress={handleCleanupOldModels}
              disabled={loading}
            >
              <RefreshCw size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>تنظيف الملفات</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Available Models Section */}
        <View style={styles.modelsContainer}>
          <Text style={styles.sectionTitle}>النماذج المتاحة</Text>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>جاري التحميل...</Text>
            </View>
          )}
          
          {availableModels.map((model) => (
            <View key={model.id} style={styles.modelCard}>
              <View style={styles.modelHeader}>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelVersion}>الإصدار: {model.version}</Text>
                  <Text style={styles.modelHardware}>الأجهزة: {model.target_hw}</Text>
                  <Text style={styles.modelQuantization}>الضغط: {model.quantization}</Text>
                </View>
                <View style={styles.modelStatus}>
                  {getModelStatusIcon(model)}
                </View>
              </View>
              
              <View style={styles.modelActions}>
                <TouchableOpacity
                  style={[styles.modelButton, styles.loadButton]}
                  onPress={() => handleLoadModel(model.id)}
                  disabled={loading}
                >
                  <Download size={16} color="#ffffff" />
                  <Text style={styles.modelButtonText}>تحميل</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modelButton, styles.unloadButton]}
                  onPress={() => handleUnloadModel(model.id)}
                  disabled={loading}
                >
                  <Trash2 size={16} color="#ffffff" />
                  <Text style={styles.modelButtonText}>إلغاء</Text>
                </TouchableOpacity>
              </View>
              
              {model.expires_at && (
                <Text style={styles.expiryText}>
                  ينتهي في: {new Date(model.expires_at).toLocaleDateString('ar')}
                </Text>
              )}
            </View>
          ))}
          
          {availableModels.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <AlertTriangle size={48} color="#6b7280" />
              <Text style={styles.emptyStateText}>لا توجد نماذج متاحة</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#ef4444',
  },
  cleanupButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  modelsContainer: {
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  modelCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'right',
  },
  modelVersion: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
    textAlign: 'right',
  },
  modelHardware: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
    textAlign: 'right',
  },
  modelQuantization: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'right',
  },
  modelStatus: {
    marginLeft: 12,
  },
  modelActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 6,
    gap: 6,
  },
  loadButton: {
    backgroundColor: '#3b82f6',
  },
  unloadButton: {
    backgroundColor: '#6b7280',
  },
  modelButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  expiryText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 8,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});