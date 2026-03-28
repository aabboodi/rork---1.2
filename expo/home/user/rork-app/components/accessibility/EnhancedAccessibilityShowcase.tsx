import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Settings,
  Accessibility,
  Type,
  Contrast,
  Zap,
  Globe,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleInput } from '@/components/accessibility/AccessibleInput';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';

interface EnhancedAccessibilityShowcaseProps {
  onClose?: () => void;
}

const EnhancedAccessibilityShowcase: React.FC<EnhancedAccessibilityShowcaseProps> = ({ onClose }) => {
  const { colors } = useThemeStore();
  const { settings, preferences, updateSettings, updatePreferences } = useAccessibilityStore();
  const { announceForAccessibility, isScreenReaderEnabled, isReduceMotionEnabled } = useAccessibility();
  
  const [demoText, setDemoText] = useState('مرحباً بك في عرض الوصولية');
  const [demoCounter, setDemoCounter] = useState(0);
  const inputRef = useRef<any>(null);

  const handleAnnouncementDemo = () => {
    const message = `تم الضغط على الزر ${demoCounter + 1} مرة`;
    announceForAccessibility(message, 'high');
    setDemoCounter(prev => prev + 1);
  };

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large' | 'extraLarge') => {
    updatePreferences({ fontSize: size });
    announceForAccessibility(`تم تغيير حجم الخط إلى ${size === 'small' ? 'صغير' : size === 'medium' ? 'متوسط' : size === 'large' ? 'كبير' : 'كبير جداً'}`, 'low');
  };

  const handleContrastChange = (contrast: 'normal' | 'high' | 'extraHigh') => {
    updatePreferences({ contrast });
    announceForAccessibility(`تم تغيير التباين إلى ${contrast === 'normal' ? 'عادي' : contrast === 'high' ? 'عالي' : 'عالي جداً'}`, 'low');
  };

  const handleMotionPreferenceChange = (motion: 'full' | 'reduced' | 'none') => {
    updatePreferences({ motionPreference: motion });
    announceForAccessibility(`تم تغيير تفضيل الحركة إلى ${motion === 'full' ? 'كامل' : motion === 'reduced' ? 'مقلل' : 'بدون'}`, 'low');
  };

  const getFontSize = () => {
    switch (preferences.fontSize) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 20;
      case 'extraLarge': return 24;
      default: return 16;
    }
  };

  const getContrastColors = () => {
    const baseColors = colors;
    switch (preferences.contrast) {
      case 'high':
        return {
          ...baseColors,
          text: baseColors.colorScheme === 'dark' ? '#FFFFFF' : '#000000',
          background: baseColors.colorScheme === 'dark' ? '#000000' : '#FFFFFF',
          border: baseColors.colorScheme === 'dark' ? '#FFFFFF' : '#000000',
        };
      case 'extraHigh':
        return {
          ...baseColors,
          text: baseColors.colorScheme === 'dark' ? '#FFFFFF' : '#000000',
          background: baseColors.colorScheme === 'dark' ? '#000000' : '#FFFFFF',
          border: baseColors.colorScheme === 'dark' ? '#FFFFFF' : '#000000',
          primary: '#0066CC',
          secondary: baseColors.colorScheme === 'dark' ? '#FFFFFF' : '#000000',
        };
      default:
        return baseColors;
    }
  };

  const contrastColors = getContrastColors();
  const fontSize = getFontSize();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: contrastColors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: contrastColors.border,
    },
    headerTitle: {
      fontSize: Math.max(24, fontSize + 8),
      fontWeight: 'bold',
      color: contrastColors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: Math.max(20, fontSize + 4),
      fontWeight: '600',
      color: contrastColors.text,
      marginBottom: 16,
      textAlign: 'right',
    },
    card: {
      backgroundColor: contrastColors.surface,
      borderRadius: isReduceMotionEnabled ? 4 : 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: preferences.contrast !== 'normal' ? 2 : 1,
      borderColor: contrastColors.border,
      shadowColor: preferences.contrast === 'normal' ? contrastColors.shadow : 'transparent',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: preferences.contrast === 'normal' ? 0.1 : 0,
      shadowRadius: 4,
      elevation: preferences.contrast === 'normal' ? 3 : 0,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: Math.max(18, fontSize + 2),
      fontWeight: '600',
      color: contrastColors.text,
      marginLeft: 8,
      flex: 1,
      textAlign: 'right',
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: contrastColors.border + '30',
    },
    settingLabel: {
      fontSize: fontSize,
      color: contrastColors.text,
      flex: 1,
      textAlign: 'right',
    },
    settingValue: {
      fontSize: fontSize,
      color: contrastColors.textSecondary,
      fontWeight: '500',
    },
    buttonGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    optionButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: isReduceMotionEnabled ? 4 : 8,
      borderWidth: 2,
      borderColor: contrastColors.border,
      backgroundColor: contrastColors.surface,
      minWidth: 80,
      alignItems: 'center',
    },
    activeOptionButton: {
      borderColor: contrastColors.primary,
      backgroundColor: contrastColors.primary + '20',
    },
    optionButtonText: {
      fontSize: fontSize - 2,
      color: contrastColors.text,
      fontWeight: '500',
    },
    activeOptionButtonText: {
      color: contrastColors.primary,
      fontWeight: '600',
    },
    demoArea: {
      backgroundColor: contrastColors.backgroundSecondary,
      borderRadius: isReduceMotionEnabled ? 4 : 8,
      padding: 16,
      marginTop: 12,
      borderWidth: preferences.contrast !== 'normal' ? 2 : 1,
      borderColor: contrastColors.border,
    },
    demoText: {
      fontSize: fontSize,
      color: contrastColors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: contrastColors.backgroundSecondary,
      borderRadius: isReduceMotionEnabled ? 4 : 8,
      padding: 12,
      marginBottom: 8,
    },
    statusText: {
      fontSize: fontSize,
      marginLeft: 8,
      flex: 1,
      textAlign: 'right',
    },
    enabledStatus: {
      color: contrastColors.success,
    },
    disabledStatus: {
      color: contrastColors.textTertiary,
    },
    warningStatus: {
      color: contrastColors.warning,
    },
    infoBox: {
      backgroundColor: contrastColors.info + '20',
      borderRadius: isReduceMotionEnabled ? 4 : 8,
      padding: 12,
      marginTop: 12,
      borderLeftWidth: 4,
      borderLeftColor: contrastColors.info,
    },
    infoText: {
      fontSize: fontSize - 1,
      color: contrastColors.info,
      textAlign: 'right',
      lineHeight: fontSize * 1.4,
    },
    closeButton: {
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 1,
    },
    closeButtonText: {
      fontSize: Math.max(16, fontSize),
      color: contrastColors.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[contrastColors.primary + '10', contrastColors.background]}
        style={styles.header}
      >
        {onClose && (
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            accessibilityLabel="إغلاق عرض الوصولية"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>إغلاق</Text>
          </TouchableOpacity>
        )}
        <AccessibleText
          style={styles.headerTitle}
          accessibilityRole="header"
          accessibilityLabel="عرض ميزات الوصولية المحسنة"
        >
          عرض الوصولية المحسن
        </AccessibleText>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* System Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>حالة النظام</Text>
          <AccessibleCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>إعدادات النظام المكتشفة</Text>
              <Smartphone size={24} color={contrastColors.primary} />
            </View>

            <View style={styles.statusIndicator}>
              {isScreenReaderEnabled ? (
                <Eye size={20} color={contrastColors.success} />
              ) : (
                <EyeOff size={20} color={contrastColors.textTertiary} />
              )}
              <Text style={[
                styles.statusText,
                isScreenReaderEnabled ? styles.enabledStatus : styles.disabledStatus
              ]}>
                قارئ الشاشة: {isScreenReaderEnabled ? 'مفعل' : 'معطل'}
              </Text>
            </View>

            <View style={styles.statusIndicator}>
              {settings.reduceMotionEnabled ? (
                <Zap size={20} color={contrastColors.warning} />
              ) : (
                <Zap size={20} color={contrastColors.textTertiary} />
              )}
              <Text style={[
                styles.statusText,
                settings.reduceMotionEnabled ? styles.warningStatus : styles.disabledStatus
              ]}>
                تقليل الحركة: {settings.reduceMotionEnabled ? 'مفعل' : 'معطل'}
              </Text>
            </View>

            <View style={styles.statusIndicator}>
              {settings.highContrastEnabled ? (
                <Contrast size={20} color={contrastColors.success} />
              ) : (
                <Contrast size={20} color={contrastColors.textTertiary} />
              )}
              <Text style={[
                styles.statusText,
                settings.highContrastEnabled ? styles.enabledStatus : styles.disabledStatus
              ]}>
                التباين العالي: {settings.highContrastEnabled ? 'مفعل' : 'معطل'}
              </Text>
            </View>

            {Platform.OS === 'ios' && (
              <>
                <View style={styles.statusIndicator}>
                  {settings.boldTextEnabled ? (
                    <Type size={20} color={contrastColors.success} />
                  ) : (
                    <Type size={20} color={contrastColors.textTertiary} />
                  )}
                  <Text style={[
                    styles.statusText,
                    settings.boldTextEnabled ? styles.enabledStatus : styles.disabledStatus
                  ]}>
                    النص العريض: {settings.boldTextEnabled ? 'مفعل' : 'معطل'}
                  </Text>
                </View>

                <View style={styles.statusIndicator}>
                  {settings.invertColorsEnabled ? (
                    <Contrast size={20} color={contrastColors.success} />
                  ) : (
                    <Contrast size={20} color={contrastColors.textTertiary} />
                  )}
                  <Text style={[
                    styles.statusText,
                    settings.invertColorsEnabled ? styles.enabledStatus : styles.disabledStatus
                  ]}>
                    عكس الألوان: {settings.invertColorsEnabled ? 'مفعل' : 'معطل'}
                  </Text>
                </View>
              </>
            )}
          </AccessibleCard>
        </View>

        {/* Font Size Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إعدادات الخط</Text>
          <AccessibleCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>حجم الخط</Text>
              <Type size={24} color={contrastColors.primary} />
            </View>

            <View style={styles.buttonGroup}>
              {(['small', 'medium', 'large', 'extraLarge'] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.optionButton,
                    preferences.fontSize === size && styles.activeOptionButton
                  ]}
                  onPress={() => handleFontSizeChange(size)}
                  accessibilityLabel={`تغيير حجم الخط إلى ${size === 'small' ? 'صغير' : size === 'medium' ? 'متوسط' : size === 'large' ? 'كبير' : 'كبير جداً'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preferences.fontSize === size }}
                >
                  <Text style={[
                    styles.optionButtonText,
                    preferences.fontSize === size && styles.activeOptionButtonText
                  ]}>
                    {size === 'small' ? 'صغير' : 
                     size === 'medium' ? 'متوسط' : 
                     size === 'large' ? 'كبير' : 'كبير جداً'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.demoArea}>
              <Text style={styles.demoText}>
                نص تجريبي لعرض حجم الخط الحالي
              </Text>
            </View>
          </AccessibleCard>
        </View>

        {/* Contrast Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إعدادات التباين</Text>
          <AccessibleCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>مستوى التباين</Text>
              <Contrast size={24} color={contrastColors.primary} />
            </View>

            <View style={styles.buttonGroup}>
              {(['normal', 'high', 'extraHigh'] as const).map((contrast) => (
                <TouchableOpacity
                  key={contrast}
                  style={[
                    styles.optionButton,
                    preferences.contrast === contrast && styles.activeOptionButton
                  ]}
                  onPress={() => handleContrastChange(contrast)}
                  accessibilityLabel={`تغيير التباين إلى ${contrast === 'normal' ? 'عادي' : contrast === 'high' ? 'عالي' : 'عالي جداً'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preferences.contrast === contrast }}
                >
                  <Text style={[
                    styles.optionButtonText,
                    preferences.contrast === contrast && styles.activeOptionButtonText
                  ]}>
                    {contrast === 'normal' ? 'عادي' : 
                     contrast === 'high' ? 'عالي' : 'عالي جداً'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                التباين العالي يحسن من وضوح النص والعناصر للمستخدمين ذوي ضعف البصر
              </Text>
            </View>
          </AccessibleCard>
        </View>

        {/* Motion Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفضيلات الحركة</Text>
          <AccessibleCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>مستوى الحركة</Text>
              <Zap size={24} color={contrastColors.primary} />
            </View>

            <View style={styles.buttonGroup}>
              {(['full', 'reduced', 'none'] as const).map((motion) => (
                <TouchableOpacity
                  key={motion}
                  style={[
                    styles.optionButton,
                    preferences.motionPreference === motion && styles.activeOptionButton
                  ]}
                  onPress={() => handleMotionPreferenceChange(motion)}
                  accessibilityLabel={`تغيير تفضيل الحركة إلى ${motion === 'full' ? 'كامل' : motion === 'reduced' ? 'مقلل' : 'بدون'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preferences.motionPreference === motion }}
                >
                  <Text style={[
                    styles.optionButtonText,
                    preferences.motionPreference === motion && styles.activeOptionButtonText
                  ]}>
                    {motion === 'full' ? 'كامل' : 
                     motion === 'reduced' ? 'مقلل' : 'بدون'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                تقليل الحركة يساعد المستخدمين الذين يعانون من الدوار أو صعوبة في التركيز
              </Text>
            </View>
          </AccessibleCard>
        </View>

        {/* Interactive Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>عرض تفاعلي</Text>
          <AccessibleCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>اختبار الإعلانات الصوتية</Text>
              <Volume2 size={24} color={contrastColors.primary} />
            </View>

            <AccessibleInput
              ref={inputRef}
              value={demoText}
              onChangeText={setDemoText}
              placeholder="أدخل نصاً للاختبار"
              accessibilityLabel="حقل النص التجريبي"
              accessibilityHint="أدخل نصاً لاختبار الإعلانات الصوتية"
              style={{
                borderWidth: 1,
                borderColor: contrastColors.border,
                borderRadius: isReduceMotionEnabled ? 4 : 8,
                padding: 12,
                fontSize: fontSize,
                color: contrastColors.text,
                backgroundColor: contrastColors.background,
                marginBottom: 12,
                textAlign: 'right'
              }}
            />

            <AccessibleButton
              onPress={handleAnnouncementDemo}
              accessibilityLabel={`اختبار الإعلان الصوتي، تم الضغط ${demoCounter} مرة`}
              accessibilityHint="اضغط لسماع إعلان صوتي تجريبي"
              style={{
                backgroundColor: contrastColors.primary,
                borderRadius: isReduceMotionEnabled ? 4 : 8,
                padding: 12,
                alignItems: 'center',
                marginBottom: 12
              }}
            >
              <Text style={{
                color: contrastColors.textInverse,
                fontSize: fontSize,
                fontWeight: '600'
              }}>
                اختبار الإعلان الصوتي ({demoCounter})
              </Text>
            </AccessibleButton>

            <View style={styles.demoArea}>
              <Text style={styles.demoText}>
                {demoText}
              </Text>
              <Text style={[styles.demoText, { fontSize: fontSize - 2, color: contrastColors.textSecondary }]}>
                عدد مرات الضغط: {demoCounter}
              </Text>
            </View>
          </AccessibleCard>
        </View>

        {/* Accessibility Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>نصائح الوصولية</Text>
          <AccessibleCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>أفضل الممارسات</Text>
              <Info size={24} color={contrastColors.primary} />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                • استخدم قارئ الشاشة للتنقل في التطبيق{'\n'}
                • فعّل التباين العالي لوضوح أفضل{'\n'}
                • قلل الحركة إذا كنت تعاني من الدوار{'\n'}
                • اضبط حجم الخط حسب راحتك{'\n'}
                • استخدم الإيماءات المخصصة للتنقل السريع
              </Text>
            </View>
          </AccessibleCard>
        </View>
      </ScrollView>
    </View>
  );
};

export default EnhancedAccessibilityShowcase;