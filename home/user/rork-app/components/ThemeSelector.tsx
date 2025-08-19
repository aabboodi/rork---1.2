import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Sun, 
  Moon, 
  Smartphone, 
  Clock, 
  MapPin, 
  Settings,
  Palette,
  Eye,
  Contrast
} from 'lucide-react-native';
import { useThemeStore, ThemeMode, AdaptiveMode } from '@/store/themeStore';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';

interface ThemeSelectorProps {
  onClose?: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onClose }) => {
  const {
    mode,
    colorScheme,
    colors,
    adaptiveMode,
    timeBasedTheme,
    isAutoAdaptive,
    setThemeMode,
    toggleTheme,
    setAdaptiveMode,
    updateTimeBasedTheme,
    enableAutoAdaptive,
    getThemeRecommendation
  } = useThemeStore();

  const { settings } = useAccessibilityStore();
  const [recommendation, setRecommendation] = useState<'light' | 'dark' | null>(null);
  const [lightStartTime, setLightStartTime] = useState(timeBasedTheme.lightStart);
  const [darkStartTime, setDarkStartTime] = useState(timeBasedTheme.darkStart);

  useEffect(() => {
    loadThemeRecommendation();
  }, [adaptiveMode, timeBasedTheme]);

  const loadThemeRecommendation = async () => {
    try {
      const recommended = await getThemeRecommendation();
      setRecommendation(recommended);
    } catch (error) {
      console.error('Failed to get theme recommendation:', error);
    }
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setThemeMode(newMode);
    if (newMode === 'auto' && isAutoAdaptive) {
      loadThemeRecommendation();
    }
  };

  const handleAdaptiveModeChange = (newAdaptiveMode: AdaptiveMode) => {
    setAdaptiveMode(newAdaptiveMode);
    loadThemeRecommendation();
  };

  const handleTimeConfigUpdate = () => {
    updateTimeBasedTheme({
      lightStart: lightStartTime,
      darkStart: darkStartTime
    });
    
    Alert.alert(
      'تم التحديث',
      'تم تحديث إعدادات الوقت بنجاح',
      [{ text: 'موافق', style: 'default' }]
    );
  };

  const getModeIcon = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case 'light':
        return <Sun size={20} color={colors.text} />;
      case 'dark':
        return <Moon size={20} color={colors.text} />;
      case 'auto':
        return <Smartphone size={20} color={colors.text} />;
      default:
        return <Palette size={20} color={colors.text} />;
    }
  };

  const getAdaptiveModeIcon = (adaptMode: AdaptiveMode) => {
    switch (adaptMode) {
      case 'system':
        return <Smartphone size={18} color={colors.text} />;
      case 'time':
        return <Clock size={18} color={colors.text} />;
      case 'location':
        return <MapPin size={18} color={colors.text} />;
      case 'manual':
        return <Settings size={18} color={colors.text} />;
      default:
        return <Palette size={18} color={colors.text} />;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
      textAlign: 'right',
    },
    modeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    modeButton: {
      flex: 1,
      marginHorizontal: 5,
      padding: 15,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
    },
    activeModeButton: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight + '20',
    },
    inactiveModeButton: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    modeText: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    activeModeText: {
      color: colors.primary,
    },
    inactiveModeText: {
      color: colors.textSecondary,
    },
    adaptiveSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    switchLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
      textAlign: 'right',
    },
    adaptiveModeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      marginBottom: 8,
    },
    activeAdaptiveMode: {
      backgroundColor: colors.primary + '20',
    },
    inactiveAdaptiveMode: {
      backgroundColor: colors.backgroundSecondary,
    },
    adaptiveModeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    adaptiveModeText: {
      marginLeft: 10,
      fontSize: 15,
      fontWeight: '500',
    },
    activeAdaptiveModeText: {
      color: colors.primary,
    },
    inactiveAdaptiveModeText: {
      color: colors.text,
    },
    timeConfigSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 15,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    timeLabel: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'right',
    },
    timeInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      minWidth: 80,
      textAlign: 'center',
      color: colors.text,
    },
    updateButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    updateButtonText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: '600',
    },
    recommendationCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.info,
    },
    recommendationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'right',
    },
    recommendationText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    accessibilityInfo: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 15,
      marginTop: 20,
    },
    accessibilityTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
      textAlign: 'right',
    },
    accessibilityItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    accessibilityLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    accessibilityStatus: {
      fontSize: 14,
      fontWeight: '500',
    },
    enabledStatus: {
      color: colors.success,
    },
    disabledStatus: {
      color: colors.textTertiary,
    },
    closeButton: {
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 1,
    },
    closeButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary + '10', colors.background]}
        style={styles.header}
      >
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>إغلاق</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>إعدادات المظهر</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Theme Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وضع المظهر</Text>
          <View style={styles.modeContainer}>
            {(['light', 'dark', 'auto'] as ThemeMode[]).map((themeMode) => (
              <TouchableOpacity
                key={themeMode}
                style={[
                  styles.modeButton,
                  mode === themeMode ? styles.activeModeButton : styles.inactiveModeButton
                ]}
                onPress={() => handleModeChange(themeMode)}
              >
                {getModeIcon(themeMode)}
                <Text
                  style={[
                    styles.modeText,
                    mode === themeMode ? styles.activeModeText : styles.inactiveModeText
                  ]}
                >
                  {themeMode === 'light' ? 'فاتح' : 
                   themeMode === 'dark' ? 'داكن' : 'تلقائي'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Theme Recommendation */}
        {mode === 'auto' && recommendation && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>التوصية الحالية</Text>
            <Text style={styles.recommendationText}>
              يُنصح باستخدام المظهر {recommendation === 'dark' ? 'الداكن' : 'الفاتح'} 
              {' '}بناءً على إعداداتك الحالية
            </Text>
          </View>
        )}

        {/* Auto-Adaptive Settings */}
        {mode === 'auto' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الإعدادات التكيفية</Text>
            <View style={styles.adaptiveSection}>
              <View style={styles.switchRow}>
                <Switch
                  value={isAutoAdaptive}
                  onValueChange={enableAutoAdaptive}
                  trackColor={{ false: colors.disabled, true: colors.primary + '40' }}
                  thumbColor={isAutoAdaptive ? colors.primary : colors.textTertiary}
                />
                <Text style={styles.switchLabel}>تفعيل التكيف التلقائي</Text>
              </View>

              {isAutoAdaptive && (
                <>
                  {(['system', 'time', 'location'] as AdaptiveMode[]).map((adaptMode) => (
                    <TouchableOpacity
                      key={adaptMode}
                      style={[
                        styles.adaptiveModeRow,
                        adaptiveMode === adaptMode ? styles.activeAdaptiveMode : styles.inactiveAdaptiveMode
                      ]}
                      onPress={() => handleAdaptiveModeChange(adaptMode)}
                    >
                      <View style={styles.adaptiveModeContent}>
                        {getAdaptiveModeIcon(adaptMode)}
                        <Text
                          style={[
                            styles.adaptiveModeText,
                            adaptiveMode === adaptMode ? styles.activeAdaptiveModeText : styles.inactiveAdaptiveModeText
                          ]}
                        >
                          {adaptMode === 'system' ? 'حسب النظام' :
                           adaptMode === 'time' ? 'حسب الوقت' :
                           adaptMode === 'location' ? 'حسب الموقع' : 'يدوي'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </View>
        )}

        {/* Time-based Configuration */}
        {mode === 'auto' && isAutoAdaptive && adaptiveMode === 'time' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إعدادات الوقت</Text>
            <View style={styles.timeConfigSection}>
              <View style={styles.switchRow}>
                <Switch
                  value={timeBasedTheme.enabled}
                  onValueChange={(enabled) => updateTimeBasedTheme({ enabled })}
                  trackColor={{ false: colors.disabled, true: colors.primary + '40' }}
                  thumbColor={timeBasedTheme.enabled ? colors.primary : colors.textTertiary}
                />
                <Text style={styles.switchLabel}>تفعيل التبديل حسب الوقت</Text>
              </View>

              {timeBasedTheme.enabled && (
                <>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>بداية المظهر الفاتح:</Text>
                    <Text style={styles.timeInput}>{lightStartTime}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>بداية المظهر الداكن:</Text>
                    <Text style={styles.timeInput}>{darkStartTime}</Text>
                  </View>
                  <TouchableOpacity style={styles.updateButton} onPress={handleTimeConfigUpdate}>
                    <Text style={styles.updateButtonText}>تحديث الإعدادات</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Accessibility Information */}
        <View style={styles.accessibilityInfo}>
          <Text style={styles.accessibilityTitle}>
            <Eye size={16} color={colors.text} /> معلومات الوصولية
          </Text>
          <View style={styles.accessibilityItem}>
            <Text
              style={[
                styles.accessibilityStatus,
                settings.screenReaderEnabled ? styles.enabledStatus : styles.disabledStatus
              ]}
            >
              {settings.screenReaderEnabled ? 'مفعل' : 'معطل'}
            </Text>
            <Text style={styles.accessibilityLabel}>قارئ الشاشة</Text>
          </View>
          <View style={styles.accessibilityItem}>
            <Text
              style={[
                styles.accessibilityStatus,
                settings.highContrastEnabled ? styles.enabledStatus : styles.disabledStatus
              ]}
            >
              {settings.highContrastEnabled ? 'مفعل' : 'معطل'}
            </Text>
            <Text style={styles.accessibilityLabel}>التباين العالي</Text>
          </View>
          <View style={styles.accessibilityItem}>
            <Text
              style={[
                styles.accessibilityStatus,
                settings.reduceMotionEnabled ? styles.enabledStatus : styles.disabledStatus
              ]}
            >
              {settings.reduceMotionEnabled ? 'مفعل' : 'معطل'}
            </Text>
            <Text style={styles.accessibilityLabel}>تقليل الحركة</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ThemeSelector;