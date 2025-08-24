import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Bot, 
  Shield, 
  Settings,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause
} from 'lucide-react-native';

import { useThemeStore } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';
import useChatAutoReply from '@/hooks/useChatAutoReply';
import { AutoReplyGuards, StyleProfile } from '@/services/ai/ChatAutoReplyService';

export default function ChatAutoReplyDashboard() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const {
    guards,
    updateGuards,
    emergencyStop,
    resumeAfterStop,
    extractStyleProfile,
    loading,
    error
  } = useChatAutoReply();

  const [localGuards, setLocalGuards] = useState<AutoReplyGuards | null>(null);
  const [styleAnalysis, setStyleAnalysis] = useState<StyleProfile | null>(null);
  const [testContent, setTestContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (guards) {
      setLocalGuards(guards);
    }
  }, [guards]);

  const handleUpdateGuards = async (updates: Partial<AutoReplyGuards>) => {
    try {
      const newGuards = { ...localGuards!, ...updates };
      setLocalGuards(newGuards);
      await updateGuards(updates);
      Alert.alert('Success', 'Auto-reply settings updated successfully');
    } catch (err) {
      console.error('Failed to update guards:', err);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleEmergencyStop = async () => {
    Alert.alert(
      'Emergency Stop',
      'This will immediately stop all auto-reply functionality. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Stop All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyStop();
              Alert.alert('Stopped', 'All auto-reply functionality has been stopped');
            } catch (err) {
              Alert.alert('Error', 'Failed to activate emergency stop');
            }
          }
        }
      ]
    );
  };

  const handleResume = async () => {
    try {
      await resumeAfterStop();
      Alert.alert('Resumed', 'Auto-reply functionality has been resumed');
    } catch (err) {
      Alert.alert('Error', 'Failed to resume auto-reply');
    }
  };

  const handleAnalyzeStyle = async () => {
    if (!testContent.trim()) {
      Alert.alert('Error', 'Please enter some text to analyze');
      return;
    }

    try {
      setAnalyzing(true);
      const profile = await extractStyleProfile(testContent);
      setStyleAnalysis(profile);
    } catch (err) {
      Alert.alert('Error', 'Failed to analyze writing style');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!localGuards) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AccessibleText variant="body">Loading auto-reply settings...</AccessibleText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AccessibleButton
          title=""
          onPress={() => router.back()}
          variant="ghost"
          size="small"
          icon={<ArrowLeft size={24} color={colors.text} />}
          accessibilityLabel="Go back"
        />
        <AccessibleText variant="heading2" weight="bold">
          Chat Auto-Reply
        </AccessibleText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Controls */}
        <AccessibleCard variant="elevated" padding="large" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color={localGuards.emergencyStop ? colors.error : colors.success} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Emergency Controls
            </AccessibleText>
          </View>
          
          <View style={[styles.statusCard, { 
            backgroundColor: localGuards.emergencyStop ? colors.error + '20' : colors.success + '20',
            borderColor: localGuards.emergencyStop ? colors.error : colors.success
          }]}>
            {localGuards.emergencyStop ? (
              <>
                <XCircle size={20} color={colors.error} />
                <AccessibleText variant="body" weight="medium" color="error" style={styles.statusText}>
                  Auto-reply is STOPPED
                </AccessibleText>
              </>
            ) : (
              <>
                <CheckCircle size={20} color={colors.success} />
                <AccessibleText variant="body" weight="medium" color="success" style={styles.statusText}>
                  Auto-reply is ACTIVE
                </AccessibleText>
              </>
            )}
          </View>

          <View style={styles.buttonRow}>
            {localGuards.emergencyStop ? (
              <AccessibleButton
                title="Resume Auto-Reply"
                onPress={handleResume}
                variant="success"
                size="medium"
                icon={<Play size={20} color={colors.textInverse} />}
                style={styles.controlButton}
              />
            ) : (
              <AccessibleButton
                title="Emergency Stop"
                onPress={handleEmergencyStop}
                variant="danger"
                size="medium"
                icon={<Pause size={20} color={colors.textInverse} />}
                style={styles.controlButton}
              />
            )}
          </View>
        </AccessibleCard>

        {/* Safety Guards */}
        <AccessibleCard variant="elevated" padding="large" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={24} color={colors.primary} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Safety Guards
            </AccessibleText>
          </View>

          {/* Max Length */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <AccessibleText variant="body" weight="medium">
                Max Reply Length
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                Maximum characters per auto-reply
              </AccessibleText>
            </View>
            <TextInput
              style={[styles.numberInput, { color: colors.text, borderColor: colors.border }]}
              value={localGuards.maxLength.toString()}
              onChangeText={(value) => {
                const num = parseInt(value) || 0;
                if (num > 0 && num <= 500) {
                  handleUpdateGuards({ maxLength: num });
                }
              }}
              keyboardType="numeric"
              placeholder="280"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Min Confidence */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <AccessibleText variant="body" weight="medium">
                Min Confidence ({Math.round(localGuards.minConfidence * 100)}%)
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                Minimum confidence required to send reply
              </AccessibleText>
            </View>
            <View style={styles.sliderContainer}>
              <AccessibleButton
                title="-"
                onPress={() => {
                  const newValue = Math.max(0.1, localGuards.minConfidence - 0.1);
                  handleUpdateGuards({ minConfidence: newValue });
                }}
                variant="ghost"
                size="small"
              />
              <AccessibleText variant="body" style={styles.sliderValue}>
                {Math.round(localGuards.minConfidence * 100)}%
              </AccessibleText>
              <AccessibleButton
                title="+"
                onPress={() => {
                  const newValue = Math.min(1.0, localGuards.minConfidence + 0.1);
                  handleUpdateGuards({ minConfidence: newValue });
                }}
                variant="ghost"
                size="small"
              />
            </View>
          </View>

          {/* Rate Limit */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <AccessibleText variant="body" weight="medium">
                Rate Limit (per hour)
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                Maximum auto-replies per chat per hour
              </AccessibleText>
            </View>
            <TextInput
              style={[styles.numberInput, { color: colors.text, borderColor: colors.border }]}
              value={localGuards.rateLimitPerHour.toString()}
              onChangeText={(value) => {
                const num = parseInt(value) || 0;
                if (num >= 0 && num <= 50) {
                  handleUpdateGuards({ rateLimitPerHour: num });
                }
              }}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </AccessibleCard>

        {/* Style Analyzer */}
        <AccessibleCard variant="elevated" padding="large" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={24} color={colors.primary} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Style Analyzer
            </AccessibleText>
          </View>

          <AccessibleText variant="body" color="secondary" style={styles.analyzerDescription}>
            Test the style extraction by entering sample text
          </AccessibleText>

          <TextInput
            style={[styles.testInput, { 
              color: colors.text, 
              borderColor: colors.border,
              backgroundColor: colors.surface
            }]}
            value={testContent}
            onChangeText={setTestContent}
            placeholder="Enter sample text to analyze writing style..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />

          <AccessibleButton
            title={analyzing ? "Analyzing..." : "Analyze Style"}
            onPress={handleAnalyzeStyle}
            variant="primary"
            size="medium"
            disabled={analyzing || !testContent.trim()}
            icon={<Bot size={20} color={colors.textInverse} />}
            style={styles.analyzeButton}
          />

          {styleAnalysis && (
            <View style={[styles.analysisResult, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AccessibleText variant="body" weight="semibold" style={styles.analysisTitle}>
                Style Analysis Result:
              </AccessibleText>
              
              <View style={styles.analysisGrid}>
                <View style={styles.analysisItem}>
                  <AccessibleText variant="caption" color="secondary">Tone</AccessibleText>
                  <AccessibleText variant="body" weight="medium">{styleAnalysis.tone}</AccessibleText>
                </View>
                <View style={styles.analysisItem}>
                  <AccessibleText variant="caption" color="secondary">Length</AccessibleText>
                  <AccessibleText variant="body" weight="medium">{styleAnalysis.length}</AccessibleText>
                </View>
                <View style={styles.analysisItem}>
                  <AccessibleText variant="caption" color="secondary">Punctuation</AccessibleText>
                  <AccessibleText variant="body" weight="medium">{styleAnalysis.punctuation}</AccessibleText>
                </View>
                <View style={styles.analysisItem}>
                  <AccessibleText variant="caption" color="secondary">Emoji Usage</AccessibleText>
                  <AccessibleText variant="body" weight="medium">{styleAnalysis.emoji}</AccessibleText>
                </View>
              </View>

              {styleAnalysis.vocabulary.length > 0 && (
                <View style={styles.vocabularySection}>
                  <AccessibleText variant="caption" color="secondary" style={styles.vocabularyTitle}>
                    Common Words:
                  </AccessibleText>
                  <View style={styles.vocabularyTags}>
                    {styleAnalysis.vocabulary.slice(0, 8).map((word, index) => (
                      <View key={index} style={[styles.vocabularyTag, { backgroundColor: colors.primary + '20' }]}>
                        <AccessibleText variant="caption" color="primary">{word}</AccessibleText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </AccessibleCard>

        {/* Status Info */}
        {error && (
          <AccessibleCard variant="elevated" padding="large" style={[styles.section, styles.errorSection]}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={24} color={colors.error} />
              <AccessibleText variant="heading3" weight="semibold" style={[styles.sectionTitle, { color: colors.error }]}>
                Error
              </AccessibleText>
            </View>
            <AccessibleText variant="body" color="error">
              {error}
            </AccessibleText>
          </AccessibleCard>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 12,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  controlButton: {
    minWidth: 160,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    width: 80,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderValue: {
    marginHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  analyzerDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  testInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 100,
    fontSize: 16,
    marginBottom: 16,
  },
  analyzeButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  analysisResult: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  analysisTitle: {
    marginBottom: 12,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  analysisItem: {
    width: '50%',
    marginBottom: 12,
  },
  vocabularySection: {
    marginTop: 8,
  },
  vocabularyTitle: {
    marginBottom: 8,
  },
  vocabularyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  vocabularyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  errorSection: {
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});