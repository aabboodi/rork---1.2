import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Switch,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Shield, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Camera, 
  MessageSquare,
  Brain,
  Settings,
  TrendingUp,
  Filter
} from 'lucide-react-native';
import ContentModerationAIService, { 
  ImageModerationResult, 
  TextModerationResult 
} from '../services/security/ContentModerationAIService';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

interface AIContentModerationDashboardProps {
  onClose?: () => void;
}

const AIContentModerationDashboard: React.FC<AIContentModerationDashboardProps> = ({ onClose }) => {
  const [moderationService] = useState(() => ContentModerationAIService.getInstance());
  const [selectedTab, setSelectedTab] = useState<'overview' | 'text' | 'image' | 'settings'>('overview');
  const [textToModerate, setTextToModerate] = useState('');
  const [textResult, setTextResult] = useState<TextModerationResult | null>(null);
  const [imageResult, setImageResult] = useState<ImageModerationResult | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoModeration, setAutoModeration] = useState(true);
  const [useGoogleVision, setUseGoogleVision] = useState(true);
  const [moderationStats, setModerationStats] = useState({
    totalAnalyzed: 0,
    blocked: 0,
    flagged: 0,
    allowed: 0
  });

  useEffect(() => {
    loadModerationStats();
  }, []);

  const loadModerationStats = () => {
    // In production, load from actual analytics
    setModerationStats({
      totalAnalyzed: 1247,
      blocked: 89,
      flagged: 156,
      allowed: 1002
    });
  };

  const moderateText = async () => {
    if (!textToModerate.trim()) {
      Alert.alert('Error', 'Please enter text to moderate');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await moderationService.moderateText(textToModerate);
      setTextResult(result);
      updateStats(result.suggestedAction);
    } catch (error) {
      Alert.alert('Error', 'Failed to moderate text');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      if (result.assets[0].base64) {
        moderateImage(result.assets[0].base64);
      }
    }
  };

  const moderateImage = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await moderationService.moderateImage(base64, useGoogleVision);
      setImageResult(result);
      updateStats(result.suggestedAction);
    } catch (error) {
      Alert.alert('Error', 'Failed to moderate image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateStats = (action: 'allow' | 'flag' | 'block') => {
    setModerationStats(prev => ({
      ...prev,
      totalAnalyzed: prev.totalAnalyzed + 1,
      [action === 'allow' ? 'allowed' : action === 'flag' ? 'flagged' : 'blocked']: 
        prev[action === 'allow' ? 'allowed' : action === 'flag' ? 'flagged' : 'blocked'] + 1
    }));
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'block': return '#FF3B30';
      case 'flag': return '#FF9500';
      case 'allow': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#FF3B30';
    if (score >= 0.5) return '#FF9500';
    if (score >= 0.3) return '#FFCC00';
    return '#34C759';
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Moderation Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statGradient}>
              <Eye size={24} color="white" />
              <Text style={styles.statValue}>{moderationStats.totalAnalyzed}</Text>
              <Text style={styles.statLabel}>Total Analyzed</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.statGradient}>
              <XCircle size={24} color="white" />
              <Text style={styles.statValue}>{moderationStats.blocked}</Text>
              <Text style={styles.statLabel}>Blocked</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.statGradient}>
              <AlertTriangle size={24} color="white" />
              <Text style={styles.statValue}>{moderationStats.flagged}</Text>
              <Text style={styles.statLabel}>Flagged</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient colors={['#43e97b', '#38f9d7']} style={styles.statGradient}>
              <CheckCircle size={24} color="white" />
              <Text style={styles.statValue}>{moderationStats.allowed}</Text>
              <Text style={styles.statLabel}>Allowed</Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setSelectedTab('text')}
        >
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.quickActionGradient}>
            <MessageSquare size={24} color="white" />
            <Text style={styles.quickActionText}>Moderate Text</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setSelectedTab('image')}
        >
          <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.quickActionGradient}>
            <Camera size={24} color="white" />
            <Text style={styles.quickActionText}>Moderate Image</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTextTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text Content Moderation</Text>
        <Text style={styles.sectionDescription}>
          Analyze text for spam, hate speech, harassment, and other harmful content
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter text to moderate..."
            placeholderTextColor="#8E8E93"
            value={textToModerate}
            onChangeText={setTextToModerate}
            multiline
            numberOfLines={4}
          />
          
          <TouchableOpacity
            style={[styles.moderateButton, isAnalyzing && styles.moderateButtonDisabled]}
            onPress={moderateText}
            disabled={isAnalyzing}
          >
            <LinearGradient
              colors={isAnalyzing ? ['#8E8E93', '#8E8E93'] : ['#667eea', '#764ba2']}
              style={styles.moderateButtonGradient}
            >
              <Brain size={20} color="white" />
              <Text style={styles.moderateButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Moderate Text'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {textResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Moderation Results</Text>
            
            <View style={styles.resultHeader}>
              <View style={[styles.safetyBadge, { backgroundColor: textResult.isSafe ? '#34C759' : '#FF3B30' }]}>
                <Text style={styles.safetyBadgeText}>{textResult.isSafe ? 'SAFE' : 'UNSAFE'}</Text>
              </View>
              <View style={[styles.actionBadge, { backgroundColor: getActionColor(textResult.suggestedAction) }]}>
                <Text style={styles.actionBadgeText}>{textResult.suggestedAction.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Toxicity Score</Text>
              <View style={styles.scoreBar}>
                <View 
                  style={[
                    styles.scoreBarFill, 
                    { 
                      width: `${textResult.toxicityScore * 100}%`,
                      backgroundColor: getScoreColor(textResult.toxicityScore)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.scoreValue}>{(textResult.toxicityScore * 100).toFixed(1)}%</Text>
            </View>
            
            <View style={styles.categoriesContainer}>
              <Text style={styles.categoriesTitle}>Category Scores</Text>
              {Object.entries(textResult.categories).map(([category, score]) => (
                <View key={category} style={styles.categoryItem}>
                  <Text style={styles.categoryLabel}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                  <View style={styles.categoryScoreBar}>
                    <View 
                      style={[
                        styles.categoryScoreBarFill,
                        { 
                          width: `${score * 100}%`,
                          backgroundColor: getScoreColor(score)
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryScore}>{(score * 100).toFixed(0)}%</Text>
                </View>
              ))}
            </View>
            
            {textResult.flaggedPhrases.length > 0 && (
              <View style={styles.flaggedPhrasesContainer}>
                <Text style={styles.flaggedPhrasesTitle}>Flagged Phrases</Text>
                {textResult.flaggedPhrases.map((phrase, index) => (
                  <View key={index} style={styles.flaggedPhrase}>
                    <Text style={styles.flaggedPhraseText}>{phrase}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderImageTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Image Content Moderation</Text>
        <Text style={styles.sectionDescription}>
          Analyze images for adult content, violence, and inappropriate material
        </Text>
        
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.imagePickerGradient}>
            <Camera size={24} color="white" />
            <Text style={styles.imagePickerText}>Select Image to Moderate</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {selectedImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            {isAnalyzing && (
              <View style={styles.analyzingOverlay}>
                <Text style={styles.analyzingText}>Analyzing...</Text>
              </View>
            )}
          </View>
        )}

        {imageResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Image Moderation Results</Text>
            
            <View style={styles.resultHeader}>
              <View style={[styles.safetyBadge, { backgroundColor: imageResult.isSafe ? '#34C759' : '#FF3B30' }]}>
                <Text style={styles.safetyBadgeText}>{imageResult.isSafe ? 'SAFE' : 'UNSAFE'}</Text>
              </View>
              <View style={[styles.actionBadge, { backgroundColor: getActionColor(imageResult.suggestedAction) }]}>
                <Text style={styles.actionBadgeText}>{imageResult.suggestedAction.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.imageResultsGrid}>
              <View style={styles.imageResultItem}>
                <Text style={styles.imageResultLabel}>Adult Content</Text>
                <View style={[styles.imageResultBadge, { backgroundColor: imageResult.hasAdultContent ? '#FF3B30' : '#34C759' }]}>
                  <Text style={styles.imageResultBadgeText}>{imageResult.hasAdultContent ? 'DETECTED' : 'CLEAN'}</Text>
                </View>
              </View>
              
              <View style={styles.imageResultItem}>
                <Text style={styles.imageResultLabel}>Violence</Text>
                <View style={[styles.imageResultBadge, { backgroundColor: imageResult.hasViolentContent ? '#FF3B30' : '#34C759' }]}>
                  <Text style={styles.imageResultBadgeText}>{imageResult.hasViolentContent ? 'DETECTED' : 'CLEAN'}</Text>
                </View>
              </View>
              
              <View style={styles.imageResultItem}>
                <Text style={styles.imageResultLabel}>Racy Content</Text>
                <View style={[styles.imageResultBadge, { backgroundColor: imageResult.hasRacyContent ? '#FF9500' : '#34C759' }]}>
                  <Text style={styles.imageResultBadgeText}>{imageResult.hasRacyContent ? 'DETECTED' : 'CLEAN'}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confidence Level</Text>
              <Text style={styles.confidenceValue}>{(imageResult.confidence * 100).toFixed(1)}%</Text>
            </View>
            
            {imageResult.detectedObjects.length > 0 && (
              <View style={styles.detectedObjectsContainer}>
                <Text style={styles.detectedObjectsTitle}>Detected Objects</Text>
                <View style={styles.objectsGrid}>
                  {imageResult.detectedObjects.map((object, index) => (
                    <View key={index} style={styles.objectTag}>
                      <Text style={styles.objectTagText}>{object}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moderation Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto Moderation</Text>
            <Text style={styles.settingDescription}>
              Automatically moderate content in real-time
            </Text>
          </View>
          <Switch
            value={autoModeration}
            onValueChange={setAutoModeration}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor={autoModeration ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Use Google Vision API</Text>
            <Text style={styles.settingDescription}>
              Use Google Vision for image moderation (vs AWS Rekognition)
            </Text>
          </View>
          <Switch
            value={useGoogleVision}
            onValueChange={setUseGoogleVision}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor={useGoogleVision ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
        
        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.actionButtonGradient}>
            <Brain size={20} color="white" />
            <Text style={styles.actionButtonText}>Train Custom Model</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.actionButtonGradient}>
            <TrendingUp size={20} color="white" />
            <Text style={styles.actionButtonText}>Export Analytics</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Shield size={28} color="white" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>AI Content Moderation</Text>
              <Text style={styles.headerSubtitle}>Advanced Content Safety & Analysis</Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'text', label: 'Text', icon: MessageSquare },
          { key: 'image', label: 'Image', icon: Camera },
          { key: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, selectedTab === tab.key && styles.tabButtonActive]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <IconComponent 
                size={20} 
                color={selectedTab === tab.key ? '#667eea' : '#8E8E93'} 
              />
              <Text style={[styles.tabButtonText, selectedTab === tab.key && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverviewTab()}
      {selectedTab === 'text' && renderTextTab()}
      {selectedTab === 'image' && renderImageTab()}
      {selectedTab === 'settings' && renderSettingsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    paddingTop: 50,
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
    alignItems: 'center',
    flex: 1
  },
  headerTextContainer: {
    marginLeft: 12
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2
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
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: '#F0F0F5'
  },
  tabButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    fontWeight: '500'
  },
  tabButtonTextActive: {
    color: '#667eea'
  },
  tabContent: {
    flex: 1,
    padding: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16
  },
  statsContainer: {
    marginBottom: 24
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 12
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6
  },
  statGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4
  },
  quickActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  quickActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  inputContainer: {
    marginBottom: 20
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlignVertical: 'top',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  moderateButton: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  moderateButtonDisabled: {
    opacity: 0.6
  },
  moderateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  moderateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  imagePickerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20
  },
  imagePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  imagePickerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover'
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  analyzingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  safetyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  safetyBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  actionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  actionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  scoreContainer: {
    marginBottom: 16
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4
  },
  scoreValue: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right'
  },
  categoriesContainer: {
    marginBottom: 16
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  categoryLabel: {
    fontSize: 12,
    color: '#1C1C1E',
    width: 80
  },
  categoryScoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden'
  },
  categoryScoreBarFill: {
    height: '100%',
    borderRadius: 3
  },
  categoryScore: {
    fontSize: 12,
    color: '#8E8E93',
    width: 30,
    textAlign: 'right'
  },
  flaggedPhrasesContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA'
  },
  flaggedPhrasesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8
  },
  flaggedPhrase: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
    alignSelf: 'flex-start'
  },
  flaggedPhraseText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500'
  },
  imageResultsGrid: {
    marginBottom: 16
  },
  imageResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  imageResultLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500'
  },
  imageResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  imageResultBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  confidenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500'
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea'
  },
  detectedObjectsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA'
  },
  detectedObjectsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8
  },
  objectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  objectTag: {
    backgroundColor: '#E5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4
  },
  objectTagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500'
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  settingInfo: {
    flex: 1,
    marginRight: 16
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E'
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});

export default AIContentModerationDashboard;