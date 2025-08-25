import React from 'react';
import {
  View,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useThemeSafe } from '@/providers/ThemeProvider';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';
import { AccessibleText } from './AccessibleText';
import { AccessibleButton } from './AccessibleButton';
import { useAccessibility } from './AccessibilityProvider';
import { Settings, Eye, Volume2, Type, Contrast, Moon, Sun, Smartphone, Palette } from 'lucide-react-native';
import { router } from 'expo-router';

export const AccessibilitySettings: React.FC = () => {
  const { theme, setMode, toggleTheme } = useThemeSafe();
  const { colors } = theme;
  const mode = theme.mode;
  const { settings, preferences, updateSettings, updatePreferences } = useAccessibilityStore();
  const { announceForAccessibility } = useAccessibility();
  
  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
    announceForAccessibility(
      `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`,
      'low'
    );
  };
  
  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    updatePreferences({ [key]: value });
    announceForAccessibility(
      `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} changed to ${value}`,
      'low'
    );
  };
  
  const handleThemeToggle = () => {
    toggleTheme();
    const newMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
    announceForAccessibility(`Theme changed to ${newMode} mode`, 'low');
  };
  
  const showAccessibilityInfo = () => {
    Alert.alert(
      'Accessibility Information',
      'This app supports various accessibility features including screen readers, high contrast, reduced motion, and more. These settings help customize the app for your needs.',
      [{ text: 'OK' }]
    );
  };
  
  const SettingRow: React.FC<{
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: React.ReactNode;
    disabled?: boolean;
  }> = ({ title, description, value, onValueChange, icon, disabled = false }) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <AccessibleText variant="body" weight="medium">
          {title}
        </AccessibleText>
        <AccessibleText variant="caption" color="secondary" style={styles.settingDescription}>
          {description}
        </AccessibleText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: colors.disabled,
          true: colors.primary,
        }}
        thumbColor={value ? colors.background : colors.textSecondary}
        accessibilityLabel={`${title} toggle`}
        accessibilityHint={`${value ? 'Disable' : 'Enable'} ${title.toLowerCase()}`}
      />
    </View>
  );
  
  const PreferenceRow: React.FC<{
    title: string;
    description: string;
    options: { label: string; value: any }[];
    currentValue: any;
    onValueChange: (value: any) => void;
    icon: React.ReactNode;
  }> = ({ title, description, options, currentValue, onValueChange, icon }) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <AccessibleText variant="body" weight="medium">
          {title}
        </AccessibleText>
        <AccessibleText variant="caption" color="secondary" style={styles.settingDescription}>
          {description}
        </AccessibleText>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <AccessibleButton
              key={option.value}
              title={option.label}
              variant={currentValue === option.value ? 'primary' : 'outline'}
              size="small"
              onPress={() => onValueChange(option.value)}
              style={styles.optionButton}
              accessibilityLabel={`${title}: ${option.label}`}
              accessibilityState={{ selected: currentValue === option.value }}
            />
          ))}
        </View>
      </View>
    </View>
  );
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      accessibilityLabel="Accessibility settings"
    >
      {/* Header */}
      <View style={styles.header}>
        <Settings size={24} color={colors.primary} />
        <AccessibleText variant="heading2" weight="bold" style={styles.headerTitle}>
          Accessibility Settings
        </AccessibleText>
        <View style={styles.headerButtons}>
          <AccessibleButton
            title="Showcase"
            variant="outline"
            size="small"
            onPress={() => router.push('/accessibility-showcase')}
            accessibilityLabel="Accessibility showcase"
            accessibilityHint="Opens accessibility components showcase"
            icon={<Palette size={16} color={colors.primary} />}
          />
          <AccessibleButton
            title="Info"
            variant="ghost"
            size="small"
            onPress={showAccessibilityInfo}
            accessibilityLabel="Accessibility information"
            accessibilityHint="Shows information about accessibility features"
          />
        </View>
      </View>
      
      {/* Theme Settings */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
          Theme & Display
        </AccessibleText>
        
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={styles.settingIcon}>
            {mode === 'dark' ? (
              <Moon size={20} color={colors.primary} />
            ) : mode === 'light' ? (
              <Sun size={20} color={colors.primary} />
            ) : (
              <Smartphone size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.settingContent}>
            <AccessibleText variant="body" weight="medium">
              Theme Mode
            </AccessibleText>
            <AccessibleText variant="caption" color="secondary" style={styles.settingDescription}>
              Current: {mode === 'auto' ? 'Auto (System)' : mode === 'dark' ? 'Dark' : 'Light'}
            </AccessibleText>
          </View>
          <AccessibleButton
            title="Toggle"
            variant="outline"
            size="small"
            onPress={handleThemeToggle}
            accessibilityLabel="Toggle theme mode"
            accessibilityHint="Cycles between light, dark, and auto theme modes"
          />
        </View>
        
        <PreferenceRow
          title="Font Size"
          description="Adjust text size throughout the app"
          options={[
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
            { label: 'Extra Large', value: 'extraLarge' },
          ]}
          currentValue={preferences.fontSize}
          onValueChange={(value) => handlePreferenceChange('fontSize', value)}
          icon={<Type size={20} color={colors.primary} />}
        />
        
        <PreferenceRow
          title="Contrast"
          description="Adjust color contrast for better visibility"
          options={[
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Extra High', value: 'extraHigh' },
          ]}
          currentValue={preferences.contrast}
          onValueChange={(value) => handlePreferenceChange('contrast', value)}
          icon={<Contrast size={20} color={colors.primary} />}
        />
      </View>
      
      {/* Motion & Animation */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
          Motion & Animation
        </AccessibleText>
        
        <SettingRow
          title="Reduce Motion"
          description="Minimize animations and transitions"
          value={settings.reduceMotionEnabled}
          onValueChange={(value) => handleSettingChange('reduceMotionEnabled', value)}
          icon={<Eye size={20} color={colors.primary} />}
          disabled={Platform.OS !== 'web'} // System controlled on mobile
        />
        
        <PreferenceRow
          title="Motion Preference"
          description="Control animation intensity"
          options={[
            { label: 'Full', value: 'full' },
            { label: 'Reduced', value: 'reduced' },
            { label: 'None', value: 'none' },
          ]}
          currentValue={preferences.motionPreference}
          onValueChange={(value) => handlePreferenceChange('motionPreference', value)}
          icon={<Eye size={20} color={colors.primary} />}
        />
      </View>
      
      {/* Audio & Feedback */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
          Audio & Feedback
        </AccessibleText>
        
        <SettingRow
          title="Announce Notifications"
          description="Speak notifications aloud for screen readers"
          value={settings.announceNotifications}
          onValueChange={(value) => handleSettingChange('announceNotifications', value)}
          icon={<Volume2 size={20} color={colors.primary} />}
        />
        
        <SettingRow
          title="Haptic Feedback"
          description="Vibration feedback for interactions"
          value={settings.hapticFeedbackEnabled}
          onValueChange={(value) => handleSettingChange('hapticFeedbackEnabled', value)}
          icon={<Smartphone size={20} color={colors.primary} />}
        />
        
        <SettingRow
          title="Audio Descriptions"
          description="Detailed audio descriptions for media content"
          value={settings.audioDescriptionsEnabled}
          onValueChange={(value) => handleSettingChange('audioDescriptionsEnabled', value)}
          icon={<Volume2 size={20} color={colors.primary} />}
        />
        
        <PreferenceRow
          title="Sound Preference"
          description="Control sound and audio feedback"
          options={[
            { label: 'Full', value: 'full' },
            { label: 'Reduced', value: 'reduced' },
            { label: 'None', value: 'none' },
          ]}
          currentValue={preferences.soundPreference}
          onValueChange={(value) => handlePreferenceChange('soundPreference', value)}
          icon={<Volume2 size={20} color={colors.primary} />}
        />
      </View>
      
      {/* System Accessibility Status */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <AccessibleText variant="heading3" weight="semibold" style={styles.sectionTitle}>
          System Accessibility Status
        </AccessibleText>
        
        <View style={styles.statusGrid}>
          <View style={[styles.statusItem, { backgroundColor: colors.backgroundSecondary }]}>
            <AccessibleText variant="caption" color="secondary">
              Screen Reader
            </AccessibleText>
            <AccessibleText 
              variant="body" 
              weight="medium" 
              color={settings.screenReaderEnabled ? 'success' : 'tertiary'}
            >
              {settings.screenReaderEnabled ? 'Enabled' : 'Disabled'}
            </AccessibleText>
          </View>
          
          <View style={[styles.statusItem, { backgroundColor: colors.backgroundSecondary }]}>
            <AccessibleText variant="caption" color="secondary">
              High Contrast
            </AccessibleText>
            <AccessibleText 
              variant="body" 
              weight="medium" 
              color={settings.highContrastEnabled ? 'success' : 'tertiary'}
            >
              {settings.highContrastEnabled ? 'Enabled' : 'Disabled'}
            </AccessibleText>
          </View>
          
          <View style={[styles.statusItem, { backgroundColor: colors.backgroundSecondary }]}>
            <AccessibleText variant="caption" color="secondary">
              Bold Text
            </AccessibleText>
            <AccessibleText 
              variant="body" 
              weight="medium" 
              color={settings.boldTextEnabled ? 'success' : 'tertiary'}
            >
              {settings.boldTextEnabled ? 'Enabled' : 'Disabled'}
            </AccessibleText>
          </View>
          
          <View style={[styles.statusItem, { backgroundColor: colors.backgroundSecondary }]}>
            <AccessibleText variant="caption" color="secondary">
              Reduce Transparency
            </AccessibleText>
            <AccessibleText 
              variant="body" 
              weight="medium" 
              color={settings.reduceTransparencyEnabled ? 'success' : 'tertiary'}
            >
              {settings.reduceTransparencyEnabled ? 'Enabled' : 'Disabled'}
            </AccessibleText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  settingIcon: {
    width: 32,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingDescription: {
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    minWidth: 60,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});