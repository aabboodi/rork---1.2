import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  AccessibilityRole,
  AccessibilityState,
  GestureResponderEvent,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';
import { useAccessibility } from './AccessibilityProvider';

interface AccessibleButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  testID?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
}) => {
  const { colors } = useThemeStore();
  const { settings, preferences } = useAccessibilityStore();
  const { announceForAccessibility } = useAccessibility();
  const buttonRef = useRef<TouchableOpacity>(null);
  
  const handlePress = (event: GestureResponderEvent) => {
    if (disabled || loading) return;
    
    // Announce button press for screen readers
    if (settings.screenReaderEnabled && settings.announceNotifications) {
      announceForAccessibility(`${title} button pressed`, 'low');
    }
    
    onPress(event);
  };
  
  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: iconPosition === 'right' ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: settings.buttonShapesEnabled ? 8 : 12,
      paddingHorizontal: size === 'small' ? 12 : size === 'large' ? 24 : 16,
      paddingVertical: size === 'small' ? 8 : size === 'large' ? 16 : 12,
      minHeight: size === 'small' ? 36 : size === 'large' ? 56 : 44,
      opacity: disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : undefined,
    };
    
    // Apply high contrast styles if enabled
    if (settings.highContrastEnabled) {
      baseStyle.borderWidth = 2;
    }
    
    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.disabled : colors.primary,
          borderColor: settings.highContrastEnabled ? colors.text : colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.disabled : colors.secondary,
          borderColor: settings.highContrastEnabled ? colors.text : colors.secondary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: settings.highContrastEnabled ? 3 : 1,
          borderColor: disabled ? colors.disabled : colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderColor: settings.highContrastEnabled ? colors.border : 'transparent',
          borderWidth: settings.highContrastEnabled ? 1 : 0,
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.disabled : colors.error,
          borderColor: settings.highContrastEnabled ? colors.text : colors.error,
        };
      default:
        return baseStyle;
    }
  };
  
  const getTextStyles = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontSize: preferences.fontSize === 'small' ? 14 : 
                preferences.fontSize === 'large' ? 18 : 
                preferences.fontSize === 'extraLarge' ? 20 : 16,
      fontWeight: settings.boldTextEnabled ? '700' : '600',
      textAlign: 'center',
      marginLeft: icon && iconPosition === 'left' ? 8 : 0,
      marginRight: icon && iconPosition === 'right' ? 8 : 0,
    };
    
    switch (variant) {
      case 'primary':
      case 'danger':
        return {
          ...baseTextStyle,
          color: colors.textInverse,
        };
      case 'secondary':
        return {
          ...baseTextStyle,
          color: colors.text,
        };
      case 'outline':
      case 'ghost':
        return {
          ...baseTextStyle,
          color: disabled ? colors.disabled : colors.primary,
        };
      default:
        return baseTextStyle;
    }
  };
  
  const accessibilityProps = {
    accessible: true,
    accessibilityRole,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint,
    accessibilityState: {
      disabled,
      busy: loading,
      ...accessibilityState,
    },
    ...(Platform.OS === 'ios' && {
      accessibilityTraits: disabled ? ['button', 'disabled'] : ['button'],
    }),
    testID,
  };
  
  return (
    <TouchableOpacity
      ref={buttonRef}
      style={[getButtonStyles(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={settings.reduceMotionEnabled ? 0.8 : 0.7}
      {...accessibilityProps}
    >
      {icon && iconPosition === 'left' && icon}
      <Text style={[getTextStyles(), textStyle]}>
        {loading ? 'Loading...' : title}
      </Text>
      {icon && iconPosition === 'right' && icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Additional styles can be added here if needed
});