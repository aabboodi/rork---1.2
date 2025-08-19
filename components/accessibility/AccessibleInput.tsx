import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  AccessibilityRole,
} from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useAccessibilityStore } from '@/services/accessibility/AccessibilityService';
import { AccessibleText } from './AccessibleText';
import { Eye, EyeOff } from 'lucide-react-native';
import { AccessibleButton } from './AccessibleButton';

interface AccessibleInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  error,
  hint,
  required = false,
  style,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'none',
  testID,
  onFocus,
  onBlur,
}) => {
  const { colors } = useThemeStore();
  const { settings, preferences } = useAccessibilityStore();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const getContainerStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginBottom: 16,
    };
    
    return baseStyle;
  };
  
  const getInputContainerStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      borderWidth: settings.highContrastEnabled ? 2 : 1,
      borderRadius: settings.buttonShapesEnabled ? 8 : 12,
      paddingHorizontal: 16,
      paddingVertical: multiline ? 12 : 14,
      backgroundColor: colors.surface,
      minHeight: multiline ? numberOfLines * 24 + 24 : 48,
    };
    
    // Border color based on state
    if (error) {
      baseStyle.borderColor = colors.error;
      if (settings.highContrastEnabled) {
        baseStyle.borderWidth = 3;
      }
    } else if (isFocused) {
      baseStyle.borderColor = colors.primary;
      if (settings.highContrastEnabled) {
        baseStyle.borderWidth = 3;
      }
    } else {
      baseStyle.borderColor = colors.border;
    }
    
    // Opacity for disabled state
    if (!editable) {
      baseStyle.opacity = 0.6;
      baseStyle.backgroundColor = colors.disabled;
    }
    
    return baseStyle;
  };
  
  const getInputStyles = (): TextStyle => {
    const fontSizeMultiplier = preferences.fontSize === 'small' ? 0.875 : 
                              preferences.fontSize === 'large' ? 1.125 : 
                              preferences.fontSize === 'extraLarge' ? 1.25 : 1;
    
    const baseStyle: TextStyle = {
      flex: 1,
      fontSize: Math.round(16 * fontSizeMultiplier),
      fontWeight: settings.boldTextEnabled ? '500' : '400',
      color: colors.text,
      textAlignVertical: multiline ? 'top' : 'center',
      includeFontPadding: false,
    };
    
    // High contrast text color
    if (settings.highContrastEnabled && !editable) {
      baseStyle.color = colors.textSecondary;
    }
    
    return baseStyle;
  };
  
  const getAccessibilityProps = () => {
    const baseProps = {
      accessible: true,
      accessibilityRole: accessibilityRole || 'none',
      accessibilityLabel: accessibilityLabel || label || placeholder,
      accessibilityHint: accessibilityHint || hint,
      accessibilityState: {
        disabled: !editable,
      },
      testID,
    };
    
    // Add required state for screen readers
    if (required) {
      baseProps.accessibilityLabel = `${baseProps.accessibilityLabel}, required`;
    }
    
    // Add error state
    if (error) {
      baseProps.accessibilityLabel = `${baseProps.accessibilityLabel}, error: ${error}`;
    }
    
    // Add character count for screen readers
    if (maxLength && value.length > 0) {
      baseProps.accessibilityHint = `${baseProps.accessibilityHint || ''} ${value.length} of ${maxLength} characters`;
    }
    
    return baseProps;
  };
  
  return (
    <View style={[getContainerStyles(), style]}>
      {/* Label */}
      {label && (
        <AccessibleText 
          variant="label" 
          weight="medium" 
          style={styles.label}
          accessibilityRole="none"
        >
          {label}
          {required && (
            <AccessibleText variant="label" color="error">
              {' *'}
            </AccessibleText>
          )}
        </AccessibleText>
      )}
      
      {/* Input Container */}
      <View style={getInputContainerStyles()}>
        <TextInput
          ref={inputRef}
          style={[getInputStyles(), inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...getAccessibilityProps()}
        />
        
        {/* Password Toggle Button */}
        {secureTextEntry && (
          <AccessibleButton
            title=""
            onPress={togglePasswordVisibility}
            variant="ghost"
            size="small"
            style={styles.passwordToggle}
            icon={showPassword ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityHint="Toggles password visibility"
          />
        )}
      </View>
      
      {/* Hint Text */}
      {hint && !error && (
        <AccessibleText 
          variant="caption" 
          color="secondary" 
          style={styles.hint}
          accessibilityRole="none"
        >
          {hint}
        </AccessibleText>
      )}
      
      {/* Error Text */}
      {error && (
        <AccessibleText 
          variant="caption" 
          color="error" 
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AccessibleText>
      )}
      
      {/* Character Count */}
      {maxLength && (
        <AccessibleText 
          variant="caption" 
          color="secondary" 
          style={styles.characterCount}
          accessibilityRole="none"
        >
          {value.length}/{maxLength}
        </AccessibleText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
  },
  hint: {
    marginTop: 4,
  },
  error: {
    marginTop: 4,
  },
  characterCount: {
    marginTop: 4,
    textAlign: 'right',
  },
  passwordToggle: {
    marginLeft: 8,
    padding: 4,
  },
});