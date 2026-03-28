import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  FileText,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

import { useSafeThemeColors } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';
import TrainingService from '@/services/chat/ai-reply/training';

const MAX_WORDS = 10000;

export default function TrainingDataScreen() {
  const colors = useSafeThemeColors();
  const [trainingText, setTrainingText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const trainingService = TrainingService.getInstance();

  const loadTrainingData = useCallback(async () => {
    try {
      setLoading(true);
      const trainingData = await trainingService.getTrainingData();
      if (trainingData) {
        setTrainingText(trainingData.content);
        setWordCount(trainingData.wordCount);
        
        // Analyze existing text
        if (trainingData.content) {
          const textAnalysis = await trainingService.analyzeText(trainingData.content);
          setAnalysis(textAnalysis);
        }
      }
    } catch (error) {
      console.error('Failed to load training data:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات التدريب');
    } finally {
      setLoading(false);
    }
  }, [trainingService]);

  useEffect(() => {
    loadTrainingData();
  }, [loadTrainingData]);

  useEffect(() => {
    const words = trainingText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [trainingText]);



  const saveTrainingData = async () => {
    if (wordCount > MAX_WORDS) {
      Alert.alert('تجاوز الحد المسموح', `يجب أن يكون النص أقل من ${MAX_WORDS.toLocaleString()} كلمة`);
      return;
    }

    try {
      setSaving(true);
      const trainingData = await trainingService.saveTrainingData(trainingText);
      
      // Update settings with new word count
      const settingsData = await SecureStore.getItemAsync('ai_agent_settings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        settings.trainingDataLength = trainingData.wordCount;
        settings.lastTrainingUpdate = new Date().toISOString();
        await SecureStore.setItemAsync('ai_agent_settings', JSON.stringify(settings));
      }

      // Update analysis
      if (trainingData.extractedFeatures) {
        const textAnalysis = await trainingService.analyzeText(trainingText);
        setAnalysis(textAnalysis);
      }

      Alert.alert('تم الحفظ', 'تم حفظ بيانات التدريب بنجاح وتحليل الأسلوب');
    } catch (error) {
      console.error('Failed to save training data:', error);
      Alert.alert('خطأ', error.message || 'فشل في حفظ بيانات التدريب');
    } finally {
      setSaving(false);
    }
  };

  const clearTrainingData = () => {
    Alert.alert(
      'حذف بيانات التدريب',
      'هل أنت متأكد من حذف جميع بيانات التدريب؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await trainingService.clearTrainingData();
              setTrainingText('');
              setWordCount(0);
              setAnalysis(null);
              Alert.alert('تم الحذف', 'تم حذف جميع بيانات التدريب');
            } catch {
              Alert.alert('خطأ', 'فشل في حذف بيانات التدريب');
            }
          },
        },
      ]
    );
  };

  const getWordCountColor = () => {
    if (wordCount > MAX_WORDS) return colors.error;
    if (wordCount > MAX_WORDS * 0.8) return colors.warning;
    return colors.success;
  };

  const getWordCountText = () => {
    return `${wordCount.toLocaleString()} / ${MAX_WORDS.toLocaleString()} كلمة`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <FileText size={48} color={colors.primary} />
          <AccessibleText variant="body" color="secondary" style={styles.loadingText}>
            جاري تحميل بيانات التدريب...
          </AccessibleText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <AccessibleCard variant="filled" padding="large" style={styles.headerCard}>
          <View style={styles.headerContent}>
            <FileText size={32} color={colors.primary} />
            <View style={styles.headerText}>
              <AccessibleText variant="heading3" weight="bold">
                بيانات التدريب
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                أدخل النصوص لتدريب المساعد على أسلوبك
              </AccessibleText>
            </View>
          </View>
        </AccessibleCard>

        {/* Word Count Status */}
        <AccessibleCard variant="outlined" padding="medium" style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={styles.statusLeft}>
              {wordCount > MAX_WORDS ? (
                <AlertCircle size={20} color={colors.error} />
              ) : (
                <CheckCircle size={20} color={getWordCountColor()} />
              )}
              <AccessibleText variant="body" weight="medium" style={styles.statusText}>
                {getWordCountText()}
              </AccessibleText>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((wordCount / MAX_WORDS) * 100, 100)}%`,
                    backgroundColor: getWordCountColor(),
                  },
                ]}
              />
            </View>
          </View>
        </AccessibleCard>

        {/* Instructions */}
        <AccessibleCard variant="default" padding="large" style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <Info size={20} color={colors.primary} />
            <AccessibleText variant="body" weight="medium" style={styles.instructionsTitle}>
              إرشادات التدريب
            </AccessibleText>
          </View>
          <View style={styles.instructionsList}>
            <AccessibleText variant="caption" color="secondary" style={styles.instructionItem}>
              • أدخل نصوص من محادثاتك السابقة
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.instructionItem}>
              • استخدم أسلوبك الطبيعي في الكتابة
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.instructionItem}>
              • تجنب المعلومات الشخصية الحساسة
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.instructionItem}>
              • الحد الأقصى 10,000 كلمة
            </AccessibleText>
          </View>
        </AccessibleCard>

        {/* Text Input */}
        <AccessibleCard variant="default" padding="none" style={styles.inputCard}>
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: wordCount > MAX_WORDS ? colors.error : colors.border,
              },
            ]}
            value={trainingText}
            onChangeText={setTrainingText}
            placeholder="أدخل النصوص هنا لتدريب المساعد على أسلوبك في الكتابة..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
            accessibilityLabel="نص التدريب"
            accessibilityHint="أدخل النصوص لتدريب المساعد الذكي"
          />
        </AccessibleCard>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <AccessibleButton
            title="حفظ البيانات"
            onPress={saveTrainingData}
            variant="primary"
            size="large"
            style={[styles.actionButton, styles.saveButton]}
            icon={<Save size={20} color={colors.textInverse} />}
            disabled={saving || wordCount === 0 || wordCount > MAX_WORDS}
            loading={saving}
          />

          <AccessibleButton
            title="حذف الكل"
            onPress={clearTrainingData}
            variant="danger"
            size="large"
            style={[styles.actionButton, styles.clearButton]}
            icon={<Trash2 size={20} color={colors.textInverse} />}
            disabled={saving || wordCount === 0}
          />
        </View>

        {/* Analysis Results */}
        {analysis && (
          <AccessibleCard variant="default" padding="large" style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <CheckCircle size={20} color={colors.success} />
              <AccessibleText variant="body" weight="medium" style={styles.analysisTitle}>
                تحليل الأسلوب
              </AccessibleText>
            </View>
            <View style={styles.analysisGrid}>
              <View style={styles.analysisItem}>
                <AccessibleText variant="caption" color="secondary">النبرة</AccessibleText>
                <AccessibleText variant="body" weight="medium">
                  {analysis.tone === 'formal' ? 'رسمي' :
                   analysis.tone === 'casual' ? 'عادي' :
                   analysis.tone === 'friendly' ? 'ودود' :
                   analysis.tone === 'professional' ? 'مهني' : 'مرح'}
                </AccessibleText>
              </View>
              <View style={styles.analysisItem}>
                <AccessibleText variant="caption" color="secondary">الطول</AccessibleText>
                <AccessibleText variant="body" weight="medium">
                  {analysis.length === 'short' ? 'قصير' :
                   analysis.length === 'medium' ? 'متوسط' : 'طويل'}
                </AccessibleText>
              </View>
              <View style={styles.analysisItem}>
                <AccessibleText variant="caption" color="secondary">علامات الترقيم</AccessibleText>
                <AccessibleText variant="body" weight="medium">
                  {analysis.punctuation === 'minimal' ? 'قليل' :
                   analysis.punctuation === 'standard' ? 'عادي' : 'تعبيري'}
                </AccessibleText>
              </View>
              <View style={styles.analysisItem}>
                <AccessibleText variant="caption" color="secondary">الرموز التعبيرية</AccessibleText>
                <AccessibleText variant="body" weight="medium">
                  {analysis.emoji === 'none' ? 'لا يوجد' :
                   analysis.emoji === 'occasional' ? 'أحياناً' : 'كثيراً'}
                </AccessibleText>
              </View>
              <View style={styles.analysisItem}>
                <AccessibleText variant="caption" color="secondary">سهولة القراءة</AccessibleText>
                <AccessibleText variant="body" weight="medium">
                  {analysis.readability === 'easy' ? 'سهل' :
                   analysis.readability === 'medium' ? 'متوسط' : 'معقد'}
                </AccessibleText>
              </View>
              <View style={styles.analysisItem}>
                <AccessibleText variant="caption" color="secondary">المفردات</AccessibleText>
                <AccessibleText variant="body" weight="medium">
                  {analysis.vocabulary} كلمة فريدة
                </AccessibleText>
              </View>
            </View>
            {analysis.patterns.length > 0 && (
              <View style={styles.patternsSection}>
                <AccessibleText variant="caption" color="secondary" style={styles.patternsTitle}>
                  الأنماط المكتشفة:
                </AccessibleText>
                <View style={styles.patternsTags}>
                  {analysis.patterns.map((pattern: string, index: number) => (
                    <View key={index} style={[styles.patternTag, { backgroundColor: colors.primary + '20' }]}>
                      <AccessibleText variant="caption" color="primary">
                        {pattern === 'opinion_starter' ? 'بادئ رأي' :
                         pattern === 'topic_changer' ? 'مغير موضوع' :
                         pattern === 'contrasting' ? 'متناقض' :
                         pattern === 'sequential' ? 'متسلسل' :
                         pattern === 'causal' ? 'سببي' :
                         pattern === 'exemplifying' ? 'توضيحي' : pattern}
                      </AccessibleText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </AccessibleCard>
        )}

        {/* Security Notice */}
        <AccessibleCard variant="outlined" padding="large" style={styles.securityNotice}>
          <View style={styles.securityHeader}>
            <AlertCircle size={20} color={colors.warning} />
            <AccessibleText variant="body" weight="medium" style={styles.securityTitle}>
              ملاحظة أمنية
            </AccessibleText>
          </View>
          <View style={styles.securityPoints}>
            <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
              • جميع البيانات محفوظة محلياً ومشفرة
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
              • لا يتم إرسال النصوص للخوادم الخارجية
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
              • تجنب إدخال كلمات مرور أو معلومات مالية
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
              • يمكن حذف البيانات في أي وقت
            </AccessibleText>
          </View>
        </AccessibleCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  },
  headerCard: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusContent: {
    gap: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    flex: 1,
    textAlign: 'right',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  instructionsCard: {
    marginBottom: 20,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionsTitle: {
    marginLeft: 8,
  },
  instructionsList: {
    gap: 6,
  },
  instructionItem: {
    lineHeight: 18,
  },
  inputCard: {
    marginBottom: 20,
    minHeight: 200,
  },
  textInput: {
    minHeight: 200,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
  },
  saveButton: {},
  clearButton: {},
  securityNotice: {
    marginBottom: 40,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTitle: {
    marginLeft: 8,
  },
  securityPoints: {
    gap: 4,
  },
  securityPoint: {
    lineHeight: 18,
  },
  analysisCard: {
    marginBottom: 20,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    marginLeft: 8,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analysisItem: {
    width: '48%',
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 8,
    alignItems: 'center',
  },
  patternsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.2)',
  },
  patternsTitle: {
    marginBottom: 8,
  },
  patternsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patternTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});