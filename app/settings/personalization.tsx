import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Bot, 
  Users, 
  MessageSquare, 
  Shield, 
  BookOpen,
  CheckCircle,
  Info,
  Trash2
} from 'lucide-react-native';

import { useThemeStore } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';
import PersonalizationSettingsService, { PersonalizationSettings } from '@/services/ai/PersonalizationSettingsService';
import PersonalizationSignalsService from '@/services/ai/PersonalizationSignalsService';

export default function PersonalizationSettingsScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainerContent, setTrainerContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [insights, setInsights] = useState<any>(null);

  const settingsService = PersonalizationSettingsService.getInstance();
  const signalsService = PersonalizationSignalsService.getInstance();

  useEffect(() => {
    loadSettings();
    loadInsights();
  }, []);

  useEffect(() => {
    const words = trainerContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
  }, [trainerContent]);

  const loadSettings = async () => {
    try {
      const currentSettings = await settingsService.getSettings();
      setSettings(currentSettings);
      setTrainerContent(currentSettings.trainer.content);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      const personalInsights = await signalsService.getPersonalizationInsights();
      setInsights(personalInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  const updateSetting = async (updates: Partial<PersonalizationSettings>) => {
    try {
      await settingsService.updateSettings(updates);
      await loadSettings();
    } catch (error) {
      console.error('Failed to update settings:', error);
      Alert.alert('خطأ', 'فشل في تحديث الإعدادات');
    }
  };

  const handleConsentToggle = async (value: boolean) => {
    try {
      if (value) {
        await settingsService.giveConsent();
        Alert.alert(
          'تم منح الموافقة',
          'تم تفعيل ميزات الذكاء الاصطناعي للمحادثات. يمكنك تخصيص الإعدادات أدناه.',
          [{ text: 'حسناً' }]
        );
      } else {
        Alert.alert(
          'إلغاء الموافقة',
          'سيتم حذف جميع البيانات المحفوظة وإيقاف جميع ميزات الذكاء الاصطناعي. هل أنت متأكد؟',
          [
            { text: 'إلغاء', style: 'cancel' },
            { 
              text: 'نعم، احذف البيانات', 
              style: 'destructive',
              onPress: async () => {
                await settingsService.revokeConsent();
                await loadSettings();
                Alert.alert('تم الحذف', 'تم حذف جميع البيانات وإيقاف الميزات.');
              }
            }
          ]
        );
        return;
      }
      await loadSettings();
    } catch (error) {
      console.error('Failed to toggle consent:', error);
      Alert.alert('خطأ', 'فشل في تحديث الموافقة');
    }
  };

  const handleTrainerSave = async () => {
    try {
      if (wordCount > 10000) {
        Alert.alert('تجاوز الحد المسموح', `المحتوى يحتوي على ${wordCount} كلمة. الحد الأقصى هو 10,000 كلمة.`);
        return;
      }

      await settingsService.updateTrainerContent(trainerContent);
      await loadSettings();
      Alert.alert('تم الحفظ', 'تم حفظ محتوى التدريب بنجاح.');
    } catch (error) {
      console.error('Failed to save trainer content:', error);
      Alert.alert('خطأ', 'فشل في حفظ محتوى التدريب');
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      'حذف جميع البيانات',
      'سيتم حذف جميع الإعدادات والبيانات المحفوظة. هذا الإجراء لا يمكن التراجع عنه.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              await settingsService.revokeConsent();
              await signalsService.clearAllSignals();
              await loadSettings();
              Alert.alert('تم الحذف', 'تم حذف جميع البيانات.');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('خطأ', 'فشل في حذف البيانات');
            }
          }
        }
      ]
    );
  };

  if (loading || !settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AccessibleText variant="body">Loading...</AccessibleText>
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
          accessibilityLabel="العودة"
        />
        <AccessibleText variant="heading2" weight="bold">
          AI Personalization Settings
        </AccessibleText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Consent Section */}
        <AccessibleCard variant="elevated" padding="large" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color={colors.primary} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
              Consent & Privacy
            </AccessibleText>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <AccessibleText variant="body" weight="medium">
                Enable AI Features
              </AccessibleText>
              <AccessibleText variant="caption" color="secondary">
                Allow AI to analyze conversations and provide suggestions
              </AccessibleText>
            </View>
            <Switch
              value={settings.consent.given}
              onValueChange={handleConsentToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>

          {settings.consent.given && (
            <View style={[styles.consentInfo, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <CheckCircle size={16} color={colors.success} />
              <AccessibleText variant="caption" color="success" style={styles.consentText}>
                Consent given on {new Date(settings.consent.timestamp).toLocaleDateString()}
              </AccessibleText>
            </View>
          )}
        </AccessibleCard>

        {/* Reply Assistant Settings */}
        {settings.consent.given && (
          <AccessibleCard variant="elevated" padding="large" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bot size={24} color={colors.primary} />
              <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
                Reply Assistant
              </AccessibleText>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <AccessibleText variant="body" weight="medium">
                  Enable Reply Assistant
                </AccessibleText>
                <AccessibleText variant="caption" color="secondary">
                  Suggest smart replies in conversations
                </AccessibleText>
              </View>
              <Switch
                value={settings.replyAssistant.enabled}
                onValueChange={(value) => updateSetting({
                  replyAssistant: { ...settings.replyAssistant, enabled: value }
                })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>

            {settings.replyAssistant.enabled && (
              <>
                {/* Scope Selection */}
                <View style={styles.settingGroup}>
                  <AccessibleText variant="body" weight="medium" style={styles.groupTitle}>
                    Scope
                  </AccessibleText>
                  
                  {[
                    { key: 'all', label: 'All Conversations', icon: MessageSquare },
                    { key: 'dms_only', label: 'Direct Messages Only', icon: Users },
                    { key: 'groups_only', label: 'Groups Only', icon: Users }
                  ].map(({ key, label, icon: Icon }) => (
                    <AccessibleButton
                      key={key}
                      title={label}
                      onPress={() => updateSetting({
                        replyAssistant: { ...settings.replyAssistant, scope: key as any }
                      })}
                      variant={settings.replyAssistant.scope === key ? 'primary' : 'ghost'}
                      size="medium"
                      style={styles.scopeButton}
                      icon={<Icon size={20} color={settings.replyAssistant.scope === key ? colors.textInverse : colors.text} />}
                    />
                  ))}
                </View>

                {/* Schedule Settings */}
                <View style={styles.settingGroup}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <AccessibleText variant="body" weight="medium">
                        Schedule
                      </AccessibleText>
                      <AccessibleText variant="caption" color="secondary">
                        Set assistant working hours
                      </AccessibleText>
                    </View>
                    <Switch
                      value={settings.replyAssistant.schedule.enabled}
                      onValueChange={(value) => updateSetting({
                        replyAssistant: { 
                          ...settings.replyAssistant, 
                          schedule: { ...settings.replyAssistant.schedule, enabled: value }
                        }
                      })}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.background}
                    />
                  </View>

                  {settings.replyAssistant.schedule.enabled && (
                    <View style={styles.timeInputs}>
                      <View style={styles.timeInput}>
                        <AccessibleText variant="caption" color="secondary">From</AccessibleText>
                        <TextInput
                          style={[styles.timeField, { color: colors.text, borderColor: colors.border }]}
                          value={settings.replyAssistant.schedule.from}
                          onChangeText={(value) => updateSetting({
                            replyAssistant: { 
                              ...settings.replyAssistant, 
                              schedule: { ...settings.replyAssistant.schedule, from: value }
                            }
                          })}
                          placeholder="09:00"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <View style={styles.timeInput}>
                        <AccessibleText variant="caption" color="secondary">To</AccessibleText>
                        <TextInput
                          style={[styles.timeField, { color: colors.text, borderColor: colors.border }]}
                          value={settings.replyAssistant.schedule.to}
                          onChangeText={(value) => updateSetting({
                            replyAssistant: { 
                              ...settings.replyAssistant, 
                              schedule: { ...settings.replyAssistant.schedule, to: value }
                            }
                          })}
                          placeholder="17:00"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </AccessibleCard>
        )}

        {/* Trainer Section */}
        {settings.consent.given && (
          <AccessibleCard variant="elevated" padding="large" style={styles.section}>
            <View style={styles.sectionHeader}>
              <BookOpen size={24} color={colors.primary} />
              <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
                Training Content
              </AccessibleText>
            </View>

            <AccessibleText variant="body" color="secondary" style={styles.trainerDescription}>
              Add content to train AI on your writing style (max 10,000 words)
            </AccessibleText>

            <View style={styles.trainerContainer}>
              <TextInput
                style={[styles.trainerInput, { 
                  color: colors.text, 
                  borderColor: wordCount > 10000 ? colors.error : colors.border,
                  backgroundColor: colors.surface
                }]}
                value={trainerContent}
                onChangeText={setTrainerContent}
                placeholder="Write examples of your writing style here..."
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
              />
              
              <View style={styles.trainerFooter}>
                <AccessibleText 
                  variant="caption" 
                  color={wordCount > 10000 ? 'error' : 'secondary'}
                >
                  {wordCount.toLocaleString()} / 10,000 words
                </AccessibleText>
                
                <AccessibleButton
                  title="Save"
                  onPress={handleTrainerSave}
                  variant="primary"
                  size="small"
                  disabled={wordCount > 10000}
                />
              </View>
            </View>
          </AccessibleCard>
        )}

        {/* Insights Section */}
        {settings.consent.given && insights && (
          <AccessibleCard variant="elevated" padding="large" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Info size={24} color={colors.primary} />
              <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
                Personal Insights
              </AccessibleText>
            </View>

            {insights.topCategories.length > 0 && (
              <View style={styles.insightGroup}>
                <AccessibleText variant="body" weight="medium">
                  Preferred Content
                </AccessibleText>
                <View style={styles.insightTags}>
                  {insights.topCategories.map((category: string, index: number) => (
                    <View key={index} style={[styles.insightTag, { backgroundColor: colors.primary + '20' }]}>
                      <AccessibleText variant="caption" color="primary">
                        {category === 'post' ? 'Posts' : 
                         category === 'video' ? 'Videos' :
                         category === 'voice' ? 'Voice Messages' : 'Games'}
                      </AccessibleText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {insights.preferredTimes.length > 0 && (
              <View style={styles.insightGroup}>
                <AccessibleText variant="body" weight="medium">
                  Preferred Times
                </AccessibleText>
                <View style={styles.insightTags}>
                  {insights.preferredTimes.map((time: string, index: number) => (
                    <View key={index} style={[styles.insightTag, { backgroundColor: colors.success + '20' }]}>
                      <AccessibleText variant="caption" color="success">
                        {time === 'morning' ? 'Morning' : 
                         time === 'afternoon' ? 'Afternoon' : 'Evening'}
                      </AccessibleText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </AccessibleCard>
        )}

        {/* Danger Zone */}
        {settings.consent.given && (
          <AccessibleCard variant="elevated" padding="large" style={[styles.section, styles.dangerSection]}>
            <View style={styles.sectionHeader}>
              <Trash2 size={24} color={colors.error} />
              <AccessibleText variant="heading3" weight="semibold" style={[styles.sectionTitle, { color: colors.error }]}>
                Danger Zone
              </AccessibleText>
            </View>

            <AccessibleText variant="body" color="secondary" style={styles.dangerDescription}>
              Delete all saved data and settings
            </AccessibleText>

            <AccessibleButton
              title="Delete All Data"
              onPress={clearAllData}
              variant="danger"
              size="medium"
              icon={<Trash2 size={20} color={colors.textInverse} />}
              style={styles.dangerButton}
            />
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
  settingGroup: {
    marginTop: 16,
  },
  groupTitle: {
    marginBottom: 12,
  },
  scopeButton: {
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeField: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  consentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  consentText: {
    marginLeft: 8,
  },
  trainerDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  trainerContainer: {
    borderRadius: 12,
  },
  trainerInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 120,
    fontSize: 16,
  },
  trainerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  insightGroup: {
    marginBottom: 16,
  },
  insightTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  insightTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  dangerSection: {
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  dangerDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    alignSelf: 'flex-start',
  },
  bottomSpacing: {
    height: 40,
  },
});