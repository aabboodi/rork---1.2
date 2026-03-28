import React from 'react';
import {
  Text,
  TextStyle,
  AccessibilityRole,
  Platform,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';

interface AccessibleTextProps {
  children: React.ReactNode;
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'success' | 'warning' | 'error';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  style?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
  testID?: string;
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  align = 'left',
  weight = 'normal',
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  numberOfLines,
  ellipsizeMode,
  selectable = false,
  testID,
}) => {
  const { colors } = useThemeStore();
  const { settings, preferences } = useAccessibilityStore();
  
  const getTextStyles = (): TextStyle => {
    const baseStyle: TextStyle = {
      textAlign: align,
      includeFontPadding: false,
      textAlignVertical: 'center',
    };
    
    // Font size based on variant and user preferences
    const fontSizeMultiplier = preferences.fontSize === 'small' ? 0.875 : 
                              preferences.fontSize === 'large' ? 1.125 : 
                              preferences.fontSize === 'extraLarge' ? 1.25 : 1;
    
    switch (variant) {
      case 'heading1':
        baseStyle.fontSize = Math.round(28 * fontSizeMultiplier);
        baseStyle.fontWeight = settings.boldTextEnabled ? '800' : '700';
        baseStyle.lineHeight = Math.round(34 * fontSizeMultiplier);
        break;
      case 'heading2':
        baseStyle.fontSize = Math.round(24 * fontSizeMultiplier);
        baseStyle.fontWeight = settings.boldTextEnabled ? '700' : '600';
        baseStyle.lineHeight = Math.round(30 * fontSizeMultiplier);
        break;
      case 'heading3':
        baseStyle.fontSize = Math.round(20 * fontSizeMultiplier);
        baseStyle.fontWeight = settings.boldTextEnabled ? '700' : '600';
        baseStyle.lineHeight = Math.round(26 * fontSizeMultiplier);
        break;
      case 'body':
        baseStyle.fontSize = Math.round(16 * fontSizeMultiplier);
        baseStyle.fontWeight = settings.boldTextEnabled ? '500' : '400';
        baseStyle.lineHeight = Math.round(22 * fontSizeMultiplier);
        break;
      case 'caption':
        baseStyle.fontSize = Math.round(14 * fontSizeMultiplier);
        baseStyle.fontWeight = settings.boldTextEnabled ? '500' : '400';
        baseStyle.lineHeight = Math.round(18 * fontSizeMultiplier);
        break;
      case 'label':
        baseStyle.fontSize = Math.round(12 * fontSizeMultiplier);
        baseStyle.fontWeight = settings.boldTextEnabled ? '600' : '500';
        baseStyle.lineHeight = Math.round(16 * fontSizeMultiplier);
        break;
    }
    
    // Apply weight override
    if (weight !== 'normal') {
      switch (weight) {
        case 'medium':
          baseStyle.fontWeight = settings.boldTextEnabled ? '600' : '500';
          break;
        case 'semibold':
          baseStyle.fontWeight = settings.boldTextEnabled ? '700' : '600';
          break;
        case 'bold':
          baseStyle.fontWeight = settings.boldTextEnabled ? '800' : '700';
          break;
      }
    }
    
    // Color based on theme and accessibility settings
    switch (color) {
      case 'primary':
        baseStyle.color = colors.text;
        break;
      case 'secondary':
        baseStyle.color = colors.textSecondary;
        break;
      case 'tertiary':
        baseStyle.color = colors.textTertiary;
        break;
      case 'inverse':
        baseStyle.color = colors.textInverse;
        break;
      case 'success':
        baseStyle.color = colors.success;
        break;
      case 'warning':
        baseStyle.color = colors.warning;
        break;
      case 'error':
        baseStyle.color = colors.error;
        break;
    }
    
    // High contrast adjustments
    if (settings.highContrastEnabled) {
      if (color === 'secondary' || color === 'tertiary') {
        baseStyle.color = colors.text; // Use primary text color for better contrast
      }
    }
    
    return baseStyle;
  };
  
  const getAccessibilityRole = (): AccessibilityRole | undefined => {
    if (accessibilityRole) return accessibilityRole;
    
    switch (variant) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
        return 'header';
      default:
        return 'text';
    }
  };
  
  const accessibilityProps = {
    accessible: true,
    accessibilityRole: getAccessibilityRole(),
    accessibilityLabel,
    accessibilityHint,
    ...(Platform.OS === 'ios' && variant.startsWith('heading') && {
      accessibilityTraits: ['header'],
    }),
    testID,
  };
  
  return (
    <Text
      style={[getTextStyles(), style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      selectable={selectable}
      {...accessibilityProps}
    >
      {children}
    </Text>
  );
};