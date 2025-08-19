import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
  AccessibilityRole,
  GestureResponderEvent,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';

interface AccessibleCardProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  onPress,
  variant = 'default',
  padding = 'medium',
  margin = 'small',
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  testID,
}) => {
  const { colors } = useThemeStore();
  const { settings } = useAccessibilityStore();
  
  const getCardStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: settings.buttonShapesEnabled ? 8 : 12,
      overflow: 'hidden',
    };
    
    // Padding
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.padding = 8;
        break;
      case 'medium':
        baseStyle.padding = 16;
        break;
      case 'large':
        baseStyle.padding = 24;
        break;
    }
    
    // Margin
    switch (margin) {
      case 'none':
        break;
      case 'small':
        baseStyle.margin = 4;
        break;
      case 'medium':
        baseStyle.margin = 8;
        break;
      case 'large':
        baseStyle.margin = 16;
        break;
    }
    
    // Variant styles
    switch (variant) {
      case 'default':
        baseStyle.backgroundColor = colors.surface;
        if (settings.highContrastEnabled) {
          baseStyle.borderWidth = 1;
          baseStyle.borderColor = colors.border;
        }
        break;
      case 'elevated':
        baseStyle.backgroundColor = colors.surface;
        if (Platform.OS === 'ios') {
          baseStyle.shadowColor = colors.shadow;
          baseStyle.shadowOffset = { width: 0, height: 2 };
          baseStyle.shadowOpacity = settings.reduceTransparencyEnabled ? 0.3 : 0.1;
          baseStyle.shadowRadius = 4;
        } else {
          baseStyle.elevation = settings.reduceTransparencyEnabled ? 8 : 4;
        }
        if (settings.highContrastEnabled) {
          baseStyle.borderWidth = 1;
          baseStyle.borderColor = colors.border;
        }
        break;
      case 'outlined':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = settings.highContrastEnabled ? 2 : 1;
        baseStyle.borderColor = colors.border;
        break;
      case 'filled':
        baseStyle.backgroundColor = colors.backgroundSecondary;
        if (settings.highContrastEnabled) {
          baseStyle.borderWidth = 1;
          baseStyle.borderColor = colors.border;
        }
        break;
    }
    
    // Disabled state
    if (disabled) {
      baseStyle.opacity = 0.6;
    }
    
    return baseStyle;
  };
  
  const getAccessibilityProps = () => {
    const baseProps = {
      accessible: true,
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole: accessibilityRole || (onPress ? 'button' : 'none'),
      accessibilityState: {
        disabled,
      },
      testID,
    };
    
    if (Platform.OS === 'ios' && onPress) {
      return {
        ...baseProps,
        accessibilityTraits: disabled ? ['button', 'disabled'] : ['button'],
      };
    }
    
    return baseProps;
  };
  
  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyles(), style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={settings.reduceMotionEnabled ? 0.8 : 0.7}
        {...getAccessibilityProps()}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return (
    <View
      style={[getCardStyles(), style]}
      {...getAccessibilityProps()}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // Additional styles can be added here if needed
});