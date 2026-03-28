import React, { ReactNode, useRef, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View, Animated, Platform } from 'react-native';
import Colors from '@/constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [rippleVisible, setRippleVisible] = useState(false);
  const getButtonStyle = () => {
    let buttonStyle: ViewStyle = {};
    
    // Variant styles
    switch (variant) {
      case 'primary':
        buttonStyle = styles.primaryButton;
        break;
      case 'secondary':
        buttonStyle = styles.secondaryButton;
        break;
      case 'outline':
        buttonStyle = styles.outlineButton;
        break;
    }
    
    // Size styles
    switch (size) {
      case 'small':
        buttonStyle = { ...buttonStyle, ...styles.smallButton };
        break;
      case 'medium':
        buttonStyle = { ...buttonStyle, ...styles.mediumButton };
        break;
      case 'large':
        buttonStyle = { ...buttonStyle, ...styles.largeButton };
        break;
    }
    
    // Disabled style
    if (disabled) {
      buttonStyle = { ...buttonStyle, ...styles.disabledButton };
    }
    
    return buttonStyle;
  };
  
  const getTextStyle = () => {
    let textStyleObj: TextStyle = {};
    
    // Variant text styles
    switch (variant) {
      case 'primary':
        textStyleObj = styles.primaryText;
        break;
      case 'secondary':
        textStyleObj = styles.secondaryText;
        break;
      case 'outline':
        textStyleObj = styles.outlineText;
        break;
    }
    
    // Size text styles
    switch (size) {
      case 'small':
        textStyleObj = { ...textStyleObj, ...styles.smallText };
        break;
      case 'medium':
        textStyleObj = { ...textStyleObj, ...styles.mediumText };
        break;
      case 'large':
        textStyleObj = { ...textStyleObj, ...styles.largeText };
        break;
    }
    
    // Disabled text style
    if (disabled) {
      textStyleObj = { ...textStyleObj, ...styles.disabledText };
    }
    
    return textStyleObj;
  };

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    // Scale down animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    // Ripple effect
    if (Platform.OS === 'android') {
      setRippleVisible(true);
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    // Scale back up animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
    
    // Hide ripple
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setRippleVisible(false);
        rippleAnim.setValue(0);
      }, 200);
    }
  };

  const handlePress = () => {
    if (disabled || loading) return;
    
    // Haptic feedback simulation for web
    if (Platform.OS === 'web') {
      // Web vibration API fallback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
    
    // Success animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    onPress();
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        style
      ]}
    >
      <TouchableOpacity
        style={[styles.button, getButtonStyle()]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {/* Ripple Effect for Android */}
        {rippleVisible && Platform.OS === 'android' && (
          <Animated.View
            style={[
              styles.ripple,
              {
                transform: [{
                  scale: rippleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 2],
                  })
                }],
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 0.2, 0],
                })
              }
            ]}
          />
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              color={variant === 'outline' ? Colors.primary : 'white'} 
              size="small" 
            />
            <Animated.View
              style={{
                opacity: opacityAnim.interpolate({
                  inputRange: [0.8, 1],
                  outputRange: [0, 1],
                }),
                marginLeft: 8
              }}
            >
              <Text style={[getTextStyle(), textStyle, styles.loadingText]}>جاري التحميل...</Text>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            {icon && (
              <Animated.View 
                style={[
                  styles.iconContainer,
                  {
                    transform: [{
                      rotate: loading ? '360deg' : '0deg'
                    }]
                  }
                ]}
              >
                {icon}
              </Animated.View>
            )}
            <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: -10,
    marginLeft: -10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  // Variant styles
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  // Size styles
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  // Text styles
  primaryText: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryText: {
    color: Colors.dark,
    fontWeight: '600',
  },
  outlineText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Text size styles
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  // Disabled styles
  disabledButton: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
  },
  disabledText: {
    color: Colors.medium,
  },
});