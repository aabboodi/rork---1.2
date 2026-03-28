import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Eye, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Camera,
  Brain,
  Settings,
  BarChart3,
  Upload,
  Download,
  RefreshCw,
  Zap,
  Target,
  TrendingUp,
  Users,
  FileImage,
  Cpu
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AIVisionService, { 
  VisionAnalysisResult, 
  LocalModelConfig, 
  TrainingData 
} from '@/services/security/AIVisionService';

interface AIVisionDashboardProps {
  onClose?: () => void;
}

const AIVisionDashboard: React.FC<AIVisionDashboardProps> = ({ onClose }) => {
  const [visionService] = useState(() => AIVisionService.getInstance());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analyze' | 'training' | 'analytics' | 'settings'>('analyze');
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localModel, setLocalModel] = useState<LocalModelConfig | null>(null);
  const [trainingQueueSize, setTrainingQueueSize] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [settings, setSettings] = useState({
    provider: 'hybrid' as 'google' | 'aws' | 'azure' | 'local' | 'hybrid',
    enableFaceDetection: true,
    enableTextDetection: true,
    enableObjectDetection: true,
    enableLandmarkDetection: false,
    cacheResults: true,
    autoTrain: true
  });

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      await visionService.initialize();
      setLocalModel(visionService.getLocalModelInfo());
      setTrainingQueueSize(visionService.getTrainingQueueSize());
      const analyticsData = await visionService.generateAnalyticsReport();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to initialize AI Vision Dashboard:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
        await analyzeImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
        await analyzeImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    setLoading(true);
    try {
      const result = await visionService.analyzeImage(imageBase64, {
        provider: settings.provider,
        enableFaceDetection: settings.enableFaceDetection,
        enableTextDetection: settings.enableTextDetection,
        enableObjectDetection: settings.enableObjectDetection,
        enableLandmarkDetection: settings.enableLandmarkDetection,
        cacheResults: settings.cacheResults
      });
      
      setAnalysisResult(result);
      
      // Update analytics
      const updatedAnalytics = await visionService.generateAnalyticsReport();
      setAnalytics(updatedAnalytics);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const provideFeedback = async (feedback: 'correct' | 'incorrect') => {
    if (!selectedImage || !analysisResult) return;
    
    try {
      await visionService.provideFeedback(
        selectedImage,
        analysisResult,
        feedback,
        feedback === 'incorrect' ? feedbackText.split(',').map(s => s.trim()) : undefined
      );
      
      setShowFeedbackModal(false);
      setFeedbackText('');
      setTrainingQueueSize(visionService.getTrainingQueueSize());
      
      Alert.alert('Success', 'Feedback provided successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to provide feedback');
    }
  };

  const trainModel = async () => {
    if (trainingQueueSize < 10) {
      Alert.alert('Insufficient Data', 'Need at least 10 training samples to train the model');
      return;
    }
    
    setLoading(true);
    try {
      const trainingData = await visionService.exportTrainingData();
      await visionService.trainLocalModel(trainingData);
      
      setLocalModel(visionService.getLocalModelInfo());
      setTrainingQueueSize(visionService.getTrainingQueueSize());
      
      Alert.alert('Success', 'Model training completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to train model');
    } finally {
      setLoading(false);
    }
  };

  const exportTrainingData = async () => {
    try {
      const data = await visionService.exportTrainingData();
      // In a real app, you would save this to a file or send to server
      Alert.alert('Export Complete', `Exported ${data.length} training samples`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export training data');
    }
  };

  const clearCache = async () => {
    try {
      await visionService.clearCache();
      Alert.alert('Success', 'Cache cleared successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const renderAnalysisTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Image Analysis</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Upload size={20} color="#fff" />
            <Text style={styles.buttonText}>Pick Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Camera size={20} color="#fff" />
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {selectedImage && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
              style={styles.selectedImage}
              resizeMode="contain"
            />
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Analyzing image...</Text>
          </View>
        )}

        {analysisResult && (
          <View style={styles.resultContainer}>
            <LinearGradient
              colors={analysisResult.isSafe ? ['#4CAF50', '#45a049'] : ['#f44336', '#d32f2f']}
              style={styles.resultHeader}
            >
              {analysisResult.isSafe ? (
                <CheckCircle size={24} color="#fff" />
              ) : (
                <XCircle size={24} color="#fff" />
              )}
              <Text style={styles.resultTitle}>
                {analysisResult.isSafe ? 'Safe Content' : 'Unsafe Content'}
              </Text>
              <Text style={styles.confidenceText}>
                {Math.round(analysisResult.confidence * 100)}% confidence
              </Text>
            </LinearGradient>

            <View style={styles.resultDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Risk Score:</Text>
                <Text style={styles.detailValue}>
                  {Math.round(analysisResult.riskScore * 100)}%
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Provider:</Text>
                <Text style={styles.detailValue}>{analysisResult.provider}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Action:</Text>
                <Text style={[
                  styles.detailValue,
                  { color: getActionColor(analysisResult.suggestedAction) }
                ]}>
                  {analysisResult.suggestedAction.toUpperCase()}
                </Text>
              </View>

              {analysisResult.detectedObjects.length > 0 && (
                <View style={styles.objectsContainer}>
                  <Text style={styles.objectsTitle}>Detected Objects:</Text>
                  {analysisResult.detectedObjects.slice(0, 5).map((obj, index) => (
                    <View key={index} style={styles.objectItem}>
                      <Text style={styles.objectName}>{obj.name}</Text>
                      <Text style={styles.objectConfidence}>
                        {Math.round(obj.confidence * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {analysisResult.detectedText && (
                <View style={styles.textContainer}>
                  <Text style={styles.textTitle}>Detected Text:</Text>
                  <Text style={styles.detectedText}>{analysisResult.detectedText}</Text>
                </View>
              )}

              <View style={styles.feedbackButtons}>
                <TouchableOpacity 
                  style={[styles.feedbackButton, styles.correctButton]}
                  onPress={() => provideFeedback('correct')}
                >
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.feedbackButtonText}>Correct</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.feedbackButton, styles.incorrectButton]}
                  onPress={() => setShowFeedbackModal(true)}
                >
                  <XCircle size={16} color="#fff" />
                  <Text style={styles.feedbackButtonText}>Incorrect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderTrainingTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local Model Training</Text>
        
        {localModel ? (
          <View style={styles.modelInfo}>
            <View style={styles.modelHeader}>
              <Brain size={24} color="#007AFF" />
              <Text style={styles.modelTitle}>Local Model Status</Text>
            </View>
            
            <View style={styles.modelDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Version:</Text>
                <Text style={styles.detailValue}>{localModel.version}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Accuracy:</Text>
                <Text style={styles.detailValue}>
                  {Math.round(localModel.accuracy * 100)}%
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Training Data:</Text>
                <Text style={styles.detailValue}>{localModel.trainingDataSize} samples</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Trained:</Text>
                <Text style={styles.detailValue}>
                  {localModel.lastTrained.toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noModelContainer}>
            <Cpu size={48} color="#ccc" />
            <Text style={styles.noModelText}>No local model available</Text>
            <Text style={styles.noModelSubtext}>
              Train a model with at least 10 samples
            </Text>
          </View>
        )}

        <View style={styles.trainingQueue}>
          <Text style={styles.queueTitle}>Training Queue</Text>
          <Text style={styles.queueCount}>{trainingQueueSize} samples</Text>
          
          <View style={styles.trainingActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { opacity: trainingQueueSize < 10 ? 0.5 : 1 }]}
              onPress={trainModel}
              disabled={trainingQueueSize < 10 || loading}
            >
              <Brain size={20} color="#fff" />
              <Text style={styles.buttonText}>Train Model</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={exportTrainingData}>
              <Download size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Export Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analytics & Insights</Text>
        
        {analytics && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <FileImage size={24} color="#007AFF" />
                <Text style={styles.statNumber}>{analytics.totalAnalyses}</Text>
                <Text style={styles.statLabel}>Total Analyses</Text>
              </View>
              
              <View style={styles.statCard}>
                <CheckCircle size={24} color="#4CAF50" />
                <Text style={styles.statNumber}>{analytics.safeImages}</Text>
                <Text style={styles.statLabel}>Safe Images</Text>
              </View>
              
              <View style={styles.statCard}>
                <AlertTriangle size={24} color="#FF9800" />
                <Text style={styles.statNumber}>{analytics.flaggedImages}</Text>
                <Text style={styles.statLabel}>Flagged</Text>
              </View>
              
              <View style={styles.statCard}>
                <XCircle size={24} color="#f44336" />
                <Text style={styles.statNumber}>{analytics.blockedImages}</Text>
                <Text style={styles.statLabel}>Blocked</Text>
              </View>
            </View>

            <View style={styles.confidenceCard}>
              <Text style={styles.cardTitle}>Average Confidence</Text>
              <Text style={styles.confidenceValue}>
                {Math.round(analytics.averageConfidence * 100)}%
              </Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { width: `${analytics.averageConfidence * 100}%` }
                  ]} 
                />
              </View>
            </View>

            {analytics.topDetectedObjects.length > 0 && (
              <View style={styles.objectsAnalytics}>
                <Text style={styles.cardTitle}>Top Detected Objects</Text>
                {analytics.topDetectedObjects.slice(0, 5).map((obj: any, index: number) => (
                  <View key={index} style={styles.objectAnalyticsItem}>
                    <Text style={styles.objectAnalyticsName}>{obj.name}</Text>
                    <Text style={styles.objectAnalyticsCount}>{obj.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {analytics.providerUsage.length > 0 && (
              <View style={styles.providerAnalytics}>
                <Text style={styles.cardTitle}>Provider Usage</Text>
                {analytics.providerUsage.map((provider: any, index: number) => (
                  <View key={index} style={styles.providerItem}>
                    <Text style={styles.providerName}>{provider.provider}</Text>
                    <Text style={styles.providerCount}>{provider.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Vision Settings</Text>
        
        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Provider Selection</Text>
          <View style={styles.providerButtons}>
            {['hybrid', 'google', 'aws', 'azure', 'local'].map((provider) => (
              <TouchableOpacity
                key={provider}
                style={[
                  styles.providerButton,
                  settings.provider === provider && styles.providerButtonActive
                ]}
                onPress={() => setSettings(prev => ({ ...prev, provider: provider as any }))}
              >
                <Text style={[
                  styles.providerButtonText,
                  settings.provider === provider && styles.providerButtonTextActive
                ]}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Detection Features</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Face Detection</Text>
            <Switch
              value={settings.enableFaceDetection}
              onValueChange={(value) => setSettings(prev => ({ ...prev, enableFaceDetection: value }))}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Text Detection</Text>
            <Switch
              value={settings.enableTextDetection}
              onValueChange={(value) => setSettings(prev => ({ ...prev, enableTextDetection: value }))}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Object Detection</Text>
            <Switch
              value={settings.enableObjectDetection}
              onValueChange={(value) => setSettings(prev => ({ ...prev, enableObjectDetection: value }))}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Landmark Detection</Text>
            <Switch
              value={settings.enableLandmarkDetection}
              onValueChange={(value) => setSettings(prev => ({ ...prev, enableLandmarkDetection: value }))}
            />
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Performance</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Cache Results</Text>
            <Switch
              value={settings.cacheResults}
              onValueChange={(value) => setSettings(prev => ({ ...prev, cacheResults: value }))}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto Training</Text>
            <Switch
              value={settings.autoTrain}
              onValueChange={(value) => setSettings(prev => ({ ...prev, autoTrain: value }))}
            />
          </View>
        </View>

        <View style={styles.settingActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={clearCache}>
            <RefreshCw size={20} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'allow': return '#4CAF50';
      case 'flag': return '#FF9800';
      case 'block': return '#f44336';
      case 'quarantine': return '#9C27B0';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Eye size={24} color="#fff" />
            <Text style={styles.headerTitle}>AI Vision</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XCircle size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.tabBar}>
        {[
          { key: 'analyze', icon: Eye, label: 'Analyze' },
          { key: 'training', icon: Brain, label: 'Training' },
          { key: 'analytics', icon: BarChart3, label: 'Analytics' },
          { key: 'settings', icon: Settings, label: 'Settings' }
        ].map(({ key, icon: Icon, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabButton, activeTab === key && styles.tabButtonActive]}
            onPress={() => setActiveTab(key as any)}
          >
            <Icon size={20} color={activeTab === key ? '#007AFF' : '#666'} />
            <Text style={[
              styles.tabButtonText,
              activeTab === key && styles.tabButtonTextActive
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'analyze' && renderAnalysisTab()}
      {activeTab === 'training' && renderTrainingTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'settings' && renderSettingsTab()}

      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Provide Correct Labels</Text>
            <Text style={styles.modalSubtitle}>
              Enter the correct labels separated by commas
            </Text>
            
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="e.g., person, car, building"
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => provideFeedback('incorrect')}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff'
  },
  closeButton: {
    padding: 4
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF'
  },
  tabButtonText: {
    fontSize: 12,
    color: '#666'
  },
  tabButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600'
  },
  tabContent: {
    flex: 1
  },
  section: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontWeight: '600'
  },
  imageContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden'
  },
  selectedImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0'
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32
  },
  loadingText: {
    marginTop: 12,
    color: '#666'
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  resultTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  confidenceText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9
  },
  resultDetails: {
    padding: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  objectsContainer: {
    marginTop: 16
  },
  objectsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  objectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  objectName: {
    fontSize: 14,
    color: '#666'
  },
  objectConfidence: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF'
  },
  textContainer: {
    marginTop: 16
  },
  textTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  detectedText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6
  },
  correctButton: {
    backgroundColor: '#4CAF50'
  },
  incorrectButton: {
    backgroundColor: '#f44336'
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  modelInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  modelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  modelDetails: {
    gap: 8
  },
  noModelContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16
  },
  noModelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12
  },
  noModelSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4
  },
  trainingQueue: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  queueCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  trainingActions: {
    flexDirection: 'row',
    gap: 12
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  confidenceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  confidenceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 12
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#007AFF'
  },
  objectsAnalytics: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  objectAnalyticsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  objectAnalyticsName: {
    fontSize: 14,
    color: '#333'
  },
  objectAnalyticsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF'
  },
  providerAnalytics: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  providerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  providerName: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize'
  },
  providerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF'
  },
  settingGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  settingGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  providerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  providerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  providerButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  providerButtonText: {
    fontSize: 14,
    color: '#666'
  },
  providerButtonTextActive: {
    color: '#fff'
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLabel: {
    fontSize: 16,
    color: '#333'
  },
  settingActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666'
  },
  modalButtonTextPrimary: {
    color: '#fff'
  }
});

export default AIVisionDashboard;