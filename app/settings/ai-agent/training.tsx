import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  FileText,
  Upload,
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

const MAX_WORDS = 10000;

export default function TrainingDataScreen() {
  const router = useRouter();
  const colors = useSafeThemeColors();
  const [trainingText, setTrainingText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTrainingData();
  }, []);

  useEffect(() => {
    const words = trainingText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [trainingText]);

  const loadTrainingData = async () => {
    try {
      setLoading(true);
      const storedData = await SecureStore.getItemAsync('ai_agent_training_data');
      if (storedData) {
        setTrainingText(storedData);
      }
    } catch (error) {
      console.error('Failed to load training data:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات التدريب');
    } finally {
      setLoading(false);
    }
  };

  const saveTrainingData = async () => {
    if (wordCount > MAX_WORDS) {
      Alert.alert('تجاوز الحد المسموح', `يجب أن يكون النص أقل من ${MAX_WORDS.toLocaleString()} كلمة`);
      return;
    }

    try {
      setSaving(true);
      await SecureStore.setItemAsync('ai_agent_training_data', trainingText);
      
      // Update settings with new word count
      const settingsData = await SecureStore.getItemAsync('ai_agent_settings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        settings.trainingDataLength = wordCount;
        settings.lastTrainingUpdate = new Date().toISOString();
        await SecureStore.setItemAsync('ai_agent_settings', JSON.stringify(settings));
      }

      Alert.alert('تم الحفظ', 'تم حفظ بيانات التدريب بنجاح');
    } catch (error) {
      console.error('Failed to save training data:', error);
      Alert.alert('خطأ', 'فشل في حفظ بيانات التدريب');
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
          onPress: () => {
            setTrainingText('');
            setWordCount(0);
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
});