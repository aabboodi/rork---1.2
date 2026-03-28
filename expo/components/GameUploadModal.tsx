import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { 
  GamesUploadService, 
  GameUploadRequest, 
  GameUploadResponse,
  GameReviewStatus,
  SecurityIssue
} from '@/services/GamesUploadService';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  X,
  Gamepad2,
  Shield,
  Eye,
  AlertCircle
} from 'lucide-react-native';
import AnimatedLoader from '@/components/AnimatedLoader';

interface GameUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadComplete: (response: GameUploadResponse) => void;
}

export default function GameUploadModal({ visible, onClose, onUploadComplete }: GameUploadModalProps) {
  const { colors } = useThemeStore();
  const { language } = useAuthStore();
  const t = translations[language];
  
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<'form' | 'uploading' | 'scanning' | 'result'>('form');
  const [uploadResult, setUploadResult] = useState<GameUploadResponse | null>(null);
  const [reviewStatus, setReviewStatus] = useState<GameReviewStatus | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'casual',
    version: '1.0.0',
    developer: '',
    tags: '',
    minPlayers: 1,
    maxPlayers: 4,
    estimatedPlayTime: 10
  });
  
  const [selectedFiles, setSelectedFiles] = useState<{
    zipFile: File | null;
    icon: File | null;
    screenshots: File[];
  }>({
    zipFile: null,
    icon: null,
    screenshots: []
  });

  const uploadService = GamesUploadService.getInstance();

  const categories = [
    { id: 'puzzle', name: 'Puzzle', icon: '🧩' },
    { id: 'action', name: 'Action', icon: '⚡' },
    { id: 'strategy', name: 'Strategy', icon: '♟️' },
    { id: 'casual', name: 'Casual', icon: '🎯' },
    { id: 'multiplayer', name: 'Multiplayer', icon: '👥' },
    { id: 'educational', name: 'Educational', icon: '📚' },
    { id: 'arcade', name: 'Arcade', icon: '🕹️' },
    { id: 'simulation', name: 'Simulation', icon: '🌍' }
  ];

  const handleFileSelect = useCallback((type: 'zip' | 'icon' | 'screenshot') => {
    if (Platform.OS === 'web') {
      // Web file selection
      const input = document.createElement('input');
      input.type = 'file';
      
      if (type === 'zip') {
        input.accept = '.zip,application/zip';
      } else if (type === 'icon') {
        input.accept = 'image/jpeg,image/png,image/webp';
      } else {
        input.accept = 'image/jpeg,image/png,image/webp';
        input.multiple = true;
      }
      
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files) return;
        
        if (type === 'zip' && files[0]) {
          setSelectedFiles(prev => ({ ...prev, zipFile: files[0] }));
        } else if (type === 'icon' && files[0]) {
          setSelectedFiles(prev => ({ ...prev, icon: files[0] }));
        } else if (type === 'screenshot') {
          const newScreenshots = Array.from(files);
          setSelectedFiles(prev => ({ 
            ...prev, 
            screenshots: [...prev.screenshots, ...newScreenshots].slice(0, 5) // Max 5 screenshots
          }));
        }
      };
      
      input.click();
    } else {
      // Mobile file selection would use expo-document-picker
      Alert.alert('File Selection', 'File selection is only available on web in this demo.');
    }
  }, []);

  const validateForm = useCallback((): string | null => {
    if (!formData.name.trim()) return 'Game name is required';
    if (formData.name.length < 3) return 'Game name must be at least 3 characters';
    if (!formData.description.trim()) return 'Game description is required';
    if (formData.description.length < 10) return 'Game description must be at least 10 characters';
    if (!selectedFiles.zipFile) return 'Game ZIP file is required';
    if (!formData.developer.trim()) return 'Developer name is required';
    
    return null;
  }, [formData, selectedFiles]);

  const handleUpload = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    try {
      setIsUploading(true);
      setCurrentStep('uploading');
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Prepare upload request
      const uploadRequest: GameUploadRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        zipFile: {
          uri: selectedFiles.zipFile!.name, // Mock URI for web
          name: selectedFiles.zipFile!.name,
          type: selectedFiles.zipFile!.type,
          size: selectedFiles.zipFile!.size
        },
        icon: selectedFiles.icon ? {
          uri: selectedFiles.icon.name,
          name: selectedFiles.icon.name,
          type: selectedFiles.icon.type
        } : undefined,
        screenshots: selectedFiles.screenshots.map(file => ({
          uri: file.name,
          name: file.name,
          type: file.type
        })),
        metadata: {
          version: formData.version,
          developer: formData.developer.trim(),
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          minPlayers: formData.minPlayers,
          maxPlayers: formData.maxPlayers,
          estimatedPlayTime: formData.estimatedPlayTime
        }
      };

      // Switch to scanning step
      setTimeout(() => {
        setCurrentStep('scanning');
        setUploadProgress(100);
      }, 2000);

      // Perform upload
      const userId = 'user_123'; // Mock user ID
      const response = await uploadService.uploadGame(uploadRequest, userId);
      
      // Get review status
      const status = await uploadService.getUploadStatus(response.gameId);
      
      setUploadResult(response);
      setReviewStatus(status);
      setCurrentStep('result');
      
      console.log('🎮 Game upload completed:', response);

    } catch (error) {
      console.error('❌ Upload failed:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Failed to upload game'
      );
      setCurrentStep('form');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [formData, selectedFiles, validateForm, uploadService]);

  const handleClose = useCallback(() => {
    if (isUploading) {
      Alert.alert(
        'Upload in Progress',
        'Are you sure you want to cancel the upload?',
        [
          { text: 'Continue Upload', style: 'cancel' },
          { text: 'Cancel Upload', style: 'destructive', onPress: () => {
            setIsUploading(false);
            setCurrentStep('form');
            onClose();
          }}
        ]
      );
    } else {
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'casual',
        version: '1.0.0',
        developer: '',
        tags: '',
        minPlayers: 1,
        maxPlayers: 4,
        estimatedPlayTime: 10
      });
      setSelectedFiles({
        zipFile: null,
        icon: null,
        screenshots: []
      });
      setCurrentStep('form');
      setUploadResult(null);
      setReviewStatus(null);
      onClose();
    }
  }, [isUploading, onClose]);

  const handleComplete = useCallback(() => {
    if (uploadResult) {
      onUploadComplete(uploadResult);
    }
    handleClose();
  }, [uploadResult, onUploadComplete, handleClose]);

  const renderFormStep = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      {/* Basic Information */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Game Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="Enter game name"
            placeholderTextColor={colors.textSecondary}
            maxLength={50}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your game..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {formData.description.length}/500
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: formData.category === category.id ? colors.primary : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, category: category.id }))}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: formData.category === category.id ? colors.background : colors.text
                    }
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Files */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Files</Text>
        
        {/* ZIP File */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Game ZIP File *</Text>
          <TouchableOpacity
            style={[styles.fileButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => handleFileSelect('zip')}
          >
            <FileText size={20} color={colors.primary} />
            <Text style={[styles.fileButtonText, { color: colors.text }]}>
              {selectedFiles.zipFile ? selectedFiles.zipFile.name : 'Select ZIP file'}
            </Text>
            {selectedFiles.zipFile && (
              <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                {(selectedFiles.zipFile.size / 1024 / 1024).toFixed(1)}MB
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Game Icon</Text>
          <TouchableOpacity
            style={[styles.fileButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => handleFileSelect('icon')}
          >
            <ImageIcon size={20} color={colors.primary} />
            <Text style={[styles.fileButtonText, { color: colors.text }]}>
              {selectedFiles.icon ? selectedFiles.icon.name : 'Select icon (optional)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metadata */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Metadata</Text>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: colors.text }]}>Version</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.version}
              onChangeText={(text) => setFormData(prev => ({ ...prev, version: text }))}
              placeholder="1.0.0"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: colors.text }]}>Developer *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={formData.developer}
              onChangeText={(text) => setFormData(prev => ({ ...prev, developer: text }))}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Tags</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={formData.tags}
            onChangeText={(text) => setFormData(prev => ({ ...prev, tags: text }))}
            placeholder="puzzle, fun, casual (comma separated)"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderUploadingStep = () => (
    <View style={styles.statusContainer}>
      <AnimatedLoader size={64} color={colors.primary} />
      <Text style={[styles.statusTitle, { color: colors.text }]}>
        Uploading Game...
      </Text>
      <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>
        Please wait while we upload your game files
      </Text>
      
      <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
        <View 
          style={[
            styles.progressBar, 
            { backgroundColor: colors.primary, width: `${uploadProgress}%` }
          ]} 
        />
      </View>
      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
        {uploadProgress}%
      </Text>
    </View>
  );

  const renderScanningStep = () => (
    <View style={styles.statusContainer}>
      <Shield size={64} color={colors.primary} />
      <Text style={[styles.statusTitle, { color: colors.text }]}>
        Security Scanning...
      </Text>
      <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>
        Running security checks and content analysis
      </Text>
      
      <View style={styles.scanningSteps}>
        <View style={styles.scanStep}>
          <CheckCircle size={16} color={colors.success} />
          <Text style={[styles.scanStepText, { color: colors.text }]}>Virus scan</Text>
        </View>
        <View style={styles.scanStep}>
          <CheckCircle size={16} color={colors.success} />
          <Text style={[styles.scanStepText, { color: colors.text }]}>API validation</Text>
        </View>
        <View style={styles.scanStep}>
          <AnimatedLoader size={16} color={colors.primary} />
          <Text style={[styles.scanStepText, { color: colors.text }]}>Content analysis</Text>
        </View>
      </View>
    </View>
  );

  const renderResultStep = () => {
    if (!uploadResult || !reviewStatus) return null;

    const isApproved = uploadResult.status === 'approved';
    const isRejected = uploadResult.status === 'rejected';
    const isUnderReview = uploadResult.status === 'under_review';

    return (
      <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
        {/* Status Header */}
        <View style={[styles.statusHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isApproved && <CheckCircle size={48} color={colors.success} />}
          {isRejected && <AlertTriangle size={48} color={colors.error} />}
          {isUnderReview && <Clock size={48} color={colors.warning} />}
          
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {isApproved && 'Game Approved!'}
            {isRejected && 'Game Rejected'}
            {isUnderReview && 'Under Review'}
          </Text>
          
          <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>
            {uploadResult.message}
          </Text>
          
          {uploadResult.estimatedReviewTime && (
            <Text style={[styles.reviewTime, { color: colors.textSecondary }]}>
              Estimated review time: {uploadResult.estimatedReviewTime}
            </Text>
          )}
        </View>

        {/* Security Scan Results */}
        {reviewStatus.securityScanResults && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Security Scan Results</Text>
            
            <View style={styles.scanResults}>
              <View style={styles.riskScore}>
                <Text style={[styles.riskScoreLabel, { color: colors.text }]}>Risk Score</Text>
                <Text style={[
                  styles.riskScoreValue, 
                  { 
                    color: reviewStatus.securityScanResults.riskScore > 50 
                      ? colors.error 
                      : reviewStatus.securityScanResults.riskScore > 20 
                        ? colors.warning 
                        : colors.success 
                  }
                ]}>
                  {reviewStatus.securityScanResults.riskScore}/100
                </Text>
              </View>
              
              <View style={styles.scanChecks}>
                <View style={styles.scanCheck}>
                  {reviewStatus.securityScanResults.virusScanPassed ? (
                    <CheckCircle size={16} color={colors.success} />
                  ) : (
                    <AlertCircle size={16} color={colors.error} />
                  )}
                  <Text style={[styles.scanCheckText, { color: colors.text }]}>Virus Scan</Text>
                </View>
                
                <View style={styles.scanCheck}>
                  {reviewStatus.securityScanResults.domAnalysisPassed ? (
                    <CheckCircle size={16} color={colors.success} />
                  ) : (
                    <AlertCircle size={16} color={colors.error} />
                  )}
                  <Text style={[styles.scanCheckText, { color: colors.text }]}>DOM Analysis</Text>
                </View>
                
                <View style={styles.scanCheck}>
                  {reviewStatus.securityScanResults.apiWhitelistPassed ? (
                    <CheckCircle size={16} color={colors.success} />
                  ) : (
                    <AlertCircle size={16} color={colors.error} />
                  )}
                  <Text style={[styles.scanCheckText, { color: colors.text }]}>API Whitelist</Text>
                </View>
              </View>
            </View>

            {/* Security Issues */}
            {reviewStatus.securityScanResults.issues.length > 0 && (
              <View style={styles.issuesContainer}>
                <Text style={[styles.issuesTitle, { color: colors.text }]}>Security Issues</Text>
                {reviewStatus.securityScanResults.issues.map((issue, index) => (
                  <View key={index} style={[styles.issueItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.issueHeader}>
                      <AlertTriangle 
                        size={16} 
                        color={
                          issue.severity === 'critical' ? colors.error :
                          issue.severity === 'high' ? colors.error :
                          issue.severity === 'medium' ? colors.warning :
                          colors.textSecondary
                        } 
                      />
                      <Text style={[styles.issueSeverity, { color: colors.text }]}>
                        {issue.severity.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.issueDescription, { color: colors.text }]}>
                      {issue.description}
                    </Text>
                    {issue.recommendation && (
                      <Text style={[styles.issueRecommendation, { color: colors.textSecondary }]}>
                        💡 {issue.recommendation}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Next Steps */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Next Steps</Text>
          
          {isApproved && (
            <Text style={[styles.nextStepsText, { color: colors.text }]}>
              🎉 Your game has been approved and is now available in the games library! 
              Players can discover and play your game immediately.
            </Text>
          )}
          
          {isRejected && (
            <Text style={[styles.nextStepsText, { color: colors.text }]}>
              ❌ Your game was rejected. Please review the security issues above, 
              make the necessary changes, and submit again.
            </Text>
          )}
          
          {isUnderReview && (
            <Text style={[styles.nextStepsText, { color: colors.text }]}>
              ⏳ Your game is under review by our moderation team. 
              You&apos;ll receive a notification once the review is complete.
            </Text>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Upload size={24} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {currentStep === 'form' && 'Upload Game'}
                {currentStep === 'uploading' && 'Uploading...'}
                {currentStep === 'scanning' && 'Security Scan'}
                {currentStep === 'result' && 'Upload Complete'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.error }]}
              onPress={handleClose}
              disabled={isUploading}
            >
              <X size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
          
          {/* Progress Steps */}
          <View style={styles.progressSteps}>
            {['form', 'uploading', 'scanning', 'result'].map((step, index) => (
              <View key={step} style={styles.progressStep}>
                <View 
                  style={[
                    styles.progressStepCircle,
                    {
                      backgroundColor: 
                        currentStep === step ? colors.primary :
                        ['form', 'uploading', 'scanning', 'result'].indexOf(currentStep) > index ? colors.success :
                        colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                >
                  <Text style={[
                    styles.progressStepNumber,
                    {
                      color: 
                        currentStep === step ? colors.background :
                        ['form', 'uploading', 'scanning', 'result'].indexOf(currentStep) > index ? colors.background :
                        colors.textSecondary
                    }
                  ]}>
                    {index + 1}
                  </Text>
                </View>
                {index < 3 && (
                  <View 
                    style={[
                      styles.progressStepLine,
                      {
                        backgroundColor: ['form', 'uploading', 'scanning', 'result'].indexOf(currentStep) > index ? colors.success : colors.border
                      }
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {currentStep === 'form' && renderFormStep()}
          {currentStep === 'uploading' && renderUploadingStep()}
          {currentStep === 'scanning' && renderScanningStep()}
          {currentStep === 'result' && renderResultStep()}
        </View>

        {/* Footer */}
        {currentStep === 'form' && (
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.footerButton, styles.uploadButton, { backgroundColor: colors.primary }]}
              onPress={handleUpload}
              disabled={isUploading}
            >
              <Upload size={16} color={colors.background} />
              <Text style={[styles.uploadButtonText, { color: colors.background }]}>
                Upload Game
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {currentStep === 'result' && (
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.footerButton, styles.uploadButton, { backgroundColor: colors.primary }]}
              onPress={handleComplete}
            >
              <Gamepad2 size={16} color={colors.background} />
              <Text style={[styles.uploadButtonText, { color: colors.background }]}>
                {uploadResult?.status === 'approved' ? 'View in Library' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressStepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  fileButtonText: {
    flex: 1,
    fontSize: 14,
  },
  fileSize: {
    fontSize: 12,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  scanningSteps: {
    marginTop: 24,
    gap: 12,
  },
  scanStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanStepText: {
    fontSize: 14,
  },
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  statusHeader: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewTime: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  scanResults: {
    gap: 16,
  },
  riskScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  riskScoreLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  riskScoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scanChecks: {
    gap: 8,
  },
  scanCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanCheckText: {
    fontSize: 14,
  },
  issuesContainer: {
    marginTop: 16,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  issueItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  issueSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  issueDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  issueRecommendation: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  nextStepsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  uploadButton: {
    // No additional styles needed
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});