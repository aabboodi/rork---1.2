import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  Bot,
  MessageCircle,
  Users,
  Hash,
  Clock,
  FileText,
  Shield,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

import { useSafeThemeColors } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';

interface AIAgentSettings {
  enabled: boolean;
  scope: 'all' | 'dms_only' | 'groups_only';
  allowlist: string[];
  blocklist: string[];
  scheduleEnabled: boolean;
  scheduleFrom: string;
  scheduleTo: string;
  trainingDataLength: number;
  lastTrainingUpdate: string | null;
  autoReplyEnabled: boolean;
  suggestionsEnabled: boolean;
}

const DEFAULT_SETTINGS: AIAgentSettings = {
  enabled: false,
  scope: 'dms_only',
  allowlist: [],
  blocklist: [],
  scheduleEnabled: false,
  scheduleFrom: '09:00',
  scheduleTo: '17:00',
  trainingDataLength: 0,
  lastTrainingUpdate: null,
  autoReplyEnabled: false,
  suggestionsEnabled: true,
};

export default function AIAgentSettingsScreen() {
  const router = useRouter();
  const colors = useSafeThemeColors();
  const [settings, setSettings] = useState<AIAgentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const storedSettings = await SecureStore.getItemAsync('ai_agent_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load AI agent settings:', error);
      Alert.alert('خطأ', 'فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: AIAgentSettings) => {
    try {
      setSaving(true);
      await SecureStore.setItemAsync('ai_agent_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      console.log('AI agent settings saved successfully');
    } catch (error) {
      console.error('Failed to save AI agent settings:', error);
      Alert.alert('خطأ', 'فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled && !settings.enabled) {
      Alert.alert(
        'تفعيل المساعد الذكي',
        'سيتم تفعيل المساعد الذكي للمحادثات. يمكنك تخصيص الإعدادات في أي وقت.',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'تفعيل',
            onPress: () => saveSettings({ ...settings, enabled: true }),
          },
        ]
      );
    } else {
      saveSettings({ ...settings, enabled });
    }
  };

  const handleScopeChange = (scope: AIAgentSettings['scope']) => {
    saveSettings({ ...settings, scope });
  };

  const handleToggleAutoReply = (autoReplyEnabled: boolean) => {
    if (autoReplyEnabled) {
      Alert.alert(
        'تفعيل الرد التلقائي',
        'سيتم تفعيل الرد التلقائي. تأكد من مراجعة قائمة الاستثناءات والجدولة.',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'تفعيل',
            onPress: () => saveSettings({ ...settings, autoReplyEnabled: true }),
          },
        ]
      );
    } else {
      saveSettings({ ...settings, autoReplyEnabled });
    }
  };

  const SettingCard = ({
    icon: Icon,
    title,
    description,
    onPress,
    rightElement,
    warning = false,
  }: {
    icon: any;
    title: string;
    description: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    warning?: boolean;
  }) => (
    <AccessibleCard
      variant="default"
      padding="medium"
      style={[styles.settingCard, warning && styles.warningCard]}
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, warning && styles.warningIconContainer]}>
          <Icon
            size={20}
            color={warning ? colors.warning : colors.primary}
          />
        </View>
        <View style={styles.settingContent}>
          <AccessibleText variant="body" weight="medium">
            {title}
          </AccessibleText>
          <AccessibleText variant="caption" color="secondary" style={styles.settingDescription}>
            {description}
          </AccessibleText>
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {onPress && <ChevronRight size={20} color={colors.textSecondary} />}
      </View>
    </AccessibleCard>
  );

  const ScopeSelector = () => (
    <View style={styles.scopeContainer}>
      <AccessibleText variant="body" weight="medium" style={styles.sectionTitle}>
        نطاق التطبيق
      </AccessibleText>
      <View style={styles.scopeOptions}>
        {[
          { key: 'dms_only', label: 'المحادثات الخاصة فقط', icon: MessageCircle },
          { key: 'groups_only', label: 'المجموعات فقط', icon: Users },
          { key: 'all', label: 'جميع المحادثات', icon: Hash },
        ].map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.scopeOption,
              settings.scope === key && styles.scopeOptionSelected,
            ]}
            onPress={() => handleScopeChange(key as AIAgentSettings['scope'])}
            accessibilityRole="radio"
            accessibilityState={{ selected: settings.scope === key }}
          >
            <Icon
              size={18}
              color={settings.scope === key ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.scopeOptionText,
                { color: settings.scope === key ? colors.primary : colors.text },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const StatusIndicator = () => {
    const isActive = settings.enabled && (settings.suggestionsEnabled || settings.autoReplyEnabled);
    const statusText = isActive ? 'نشط' : 'غير نشط';
    return (
      <View style={[styles.statusIndicator, isActive && styles.statusActive]}>
        {isActive ? (
          <CheckCircle size={16} color={colors.success} />
        ) : (
          <AlertTriangle size={16} color={colors.textSecondary} />
        )}
        <AccessibleText
          variant="caption"
          color={isActive ? 'success' : 'secondary'}
          style={styles.statusText}
        >
          {statusText}
        </AccessibleText>
      </View>
    );
  };

  const getTrainingDescription = () => {
    const count = settings.trainingDataLength.toLocaleString();
    return count + ' كلمة من أصل 10,000';
  };

  const getExceptionsDescription = () => {
    const count = settings.allowlist.length + settings.blocklist.length;
    return count + ' جهة اتصال';
  };

  const getScheduleDescription = () => {
    if (settings.scheduleEnabled) {
      return 'نشط من ' + settings.scheduleFrom + ' إلى ' + settings.scheduleTo;
    }
    return 'غير مفعل';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Bot size={48} color={colors.primary} />
          <AccessibleText variant="body" color="secondary" style={styles.loadingText}>
            جاري تحميل الإعدادات...
          </AccessibleText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Status */}
        <AccessibleCard variant="filled" padding="large" style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Bot size={32} color={colors.primary} />
              <View style={styles.headerText}>
                <AccessibleText variant="heading3" weight="bold">
                  مساعد المحادثات الذكي
                </AccessibleText>
                <AccessibleText variant="caption" color="secondary">
                  تخصيص الردود والاقتراحات التلقائية
                </AccessibleText>
              </View>
            </View>
            <StatusIndicator />
          </View>
        </AccessibleCard>

        {/* Main Toggle */}
        <SettingCard
          icon={Bot}
          title="تفعيل المساعد الذكي"
          description="تشغيل أو إيقاف جميع ميزات المساعد الذكي"
          rightElement={
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={settings.enabled ? colors.primary : colors.textSecondary}
              disabled={saving}
            />
          }
        />

        {settings.enabled && (
          <>
            {/* Scope Selection */}
            <AccessibleCard variant="default" padding="large" style={styles.sectionCard}>
              <ScopeSelector />
            </AccessibleCard>

            {/* Features */}
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionHeader}>
              الميزات
            </AccessibleText>

            <SettingCard
              icon={MessageCircle}
              title="اقتراحات الردود"
              description="عرض اقتراحات للردود السريعة"
              rightElement={
                <Switch
                  value={settings.suggestionsEnabled}
                  onValueChange={(suggestionsEnabled) =>
                    saveSettings({ ...settings, suggestionsEnabled })
                  }
                  trackColor={{ false: colors.border, true: colors.primary + '40' }}
                  thumbColor={settings.suggestionsEnabled ? colors.primary : colors.textSecondary}
                  disabled={saving}
                />
              }
            />

            <SettingCard
              icon={Bot}
              title="الرد التلقائي"
              description="إرسال ردود تلقائية في المحادثات المحددة"
              rightElement={
                <Switch
                  value={settings.autoReplyEnabled}
                  onValueChange={handleToggleAutoReply}
                  trackColor={{ false: colors.border, true: colors.warning + '40' }}
                  thumbColor={settings.autoReplyEnabled ? colors.warning : colors.textSecondary}
                  disabled={saving}
                />
              }
              warning={settings.autoReplyEnabled}
            />

            {/* Configuration */}
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionHeader}>
              التكوين
            </AccessibleText>

            <SettingCard
              icon={FileText}
              title="بيانات التدريب"
              description={getTrainingDescription()}
              onPress={() => router.push('/settings/ai-agent/training')}
            />

            <SettingCard
              icon={Users}
              title="الاستثناءات"
              description={getExceptionsDescription()}
              onPress={() => router.push('/settings/ai-agent/exceptions')}
            />

            <SettingCard
              icon={Clock}
              title="الجدولة"
              description={getScheduleDescription()}
              onPress={() => router.push('/settings/ai-agent/schedule')}
            />

            {/* Security Notice */}
            <AccessibleCard variant="outlined" padding="large" style={styles.securityNotice}>
              <View style={styles.securityHeader}>
                <Shield size={20} color={colors.success} />
                <AccessibleText variant="body" weight="medium" style={styles.securityTitle}>
                  الخصوصية والأمان
                </AccessibleText>
              </View>
              <View style={styles.securityPoints}>
                <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
                  • جميع البيانات مشفرة ومحفوظة محلياً
                </AccessibleText>
                <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
                  • لا يتم إرسال النصوص الخام للخوادم
                </AccessibleText>
                <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
                  • يمكن حذف جميع البيانات في أي وقت
                </AccessibleText>
                <AccessibleText variant="caption" color="secondary" style={styles.securityPoint}>
                  • لا يتم الوصول للمحفظة أو المعاملات المالية
                </AccessibleText>
              </View>
            </AccessibleCard>

            {/* Advanced Settings */}
            <AccessibleText variant="heading3" weight="semibold" style={styles.sectionHeader}>
              إعدادات متقدمة
            </AccessibleText>

            <SettingCard
              icon={Settings}
              title="إعدادات النموذج"
              description="تخصيص سلوك النموذج والاستجابة"
              onPress={() => {
                Alert.alert('قريباً', 'هذه الميزة ستكون متاحة قريباً');
              }}
            />

            <SettingCard
              icon={Info}
              title="إحصائيات الاستخدام"
              description="عرض إحصائيات الأداء والاستخدام"
              onPress={() => {
                Alert.alert('قريباً', 'هذه الميزة ستكون متاحة قريباً');
              }}
            />

            {/* Reset Button */}
            <AccessibleButton
              title="إعادة تعيين جميع الإعدادات"
              onPress={() => {
                Alert.alert(
                  'إعادة تعيين الإعدادات',
                  'سيتم حذف جميع الإعدادات وبيانات التدريب. هل أنت متأكد؟',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    {
                      text: 'إعادة تعيين',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await SecureStore.deleteItemAsync('ai_agent_settings');
                          await SecureStore.deleteItemAsync('ai_agent_training_data');
                          setSettings(DEFAULT_SETTINGS);
                          Alert.alert('تم', 'تم إعادة تعيين جميع الإعدادات');
                        } catch {
                          Alert.alert('خطأ', 'فشل في إعادة تعيين الإعدادات');
                        }
                      },
                    },
                  ]
                );
              }}
              variant="danger"
              size="large"
              style={styles.resetButton}
            />
          </>
        )}
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
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  warningCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningIconContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  settingContent: {
    flex: 1,
  },
  settingDescription: {
    marginTop: 2,
    lineHeight: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCard: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  scopeContainer: {
    marginBottom: 8,
  },
  scopeOptions: {
    gap: 8,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  scopeOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  scopeOptionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  securityNotice: {
    marginTop: 20,
    marginBottom: 20,
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
  resetButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});