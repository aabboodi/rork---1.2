import { Animated, Platform, Easing } from 'react-native';

// Ensure easing functions are properly defined
const safeEasing = {
  quad: Easing.quad || Easing.linear,
  back: () => Easing.back ? Easing.back() : Easing.linear,
  linear: Easing.linear
};

// Micro-interaction utilities for smooth animations
export class MicroInteractions {
  // Smooth scale animation for touch feedback
  static createScaleAnimation(animatedValue: Animated.Value, toValue: number = 0.95, duration: number = 100) {
    return Animated.spring(animatedValue, {
      toValue,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    });
  }

  // Smooth opacity animation
  static createOpacityAnimation(animatedValue: Animated.Value, toValue: number, duration: number = 200) {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      useNativeDriver: true,
      easing: safeEasing.quad,
    });
  }

  // Bounce animation for success states
  static createBounceAnimation(animatedValue: Animated.Value) {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
        easing: safeEasing.back(),
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: safeEasing.quad,
      })
    ]);
  }

  // Slide animation for notifications and alerts
  static createSlideAnimation(animatedValue: Animated.Value, fromValue: number, toValue: number, duration: number = 300) {
    animatedValue.setValue(fromValue);
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      useNativeDriver: true,
      easing: safeEasing.quad,
    });
  }

  // Pulse animation for attention-grabbing elements
  static createPulseAnimation(animatedValue: Animated.Value, minValue: number = 0.8, maxValue: number = 1.2) {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: maxValue,
          duration: 800,
          useNativeDriver: true,
          easing: safeEasing.quad,
        }),
        Animated.timing(animatedValue, {
          toValue: minValue,
          duration: 800,
          useNativeDriver: true,
          easing: safeEasing.quad,
        })
      ])
    );
  }

  // Shake animation for error states
  static createShakeAnimation(animatedValue: Animated.Value) {
    return Animated.sequence([
      Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]);
  }

  // Rotation animation for loading states
  static createRotationAnimation(animatedValue: Animated.Value) {
    return Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: safeEasing.linear,
      })
    );
  }

  // Stagger animation for list items
  static createStaggerAnimation(animatedValues: Animated.Value[], delay: number = 100) {
    return Animated.stagger(
      delay,
      animatedValues.map(value => 
        Animated.timing(value, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: safeEasing.quad,
        })
      )
    );
  }

  // Haptic feedback simulation
  static triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
    if (Platform.OS === 'web') {
      // Web vibration API fallback
      if (navigator.vibrate) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 50;
        navigator.vibrate(duration);
      }
    }
    // Note: For native platforms, you would use expo-haptics here
    // but we're avoiding it for web compatibility
  }

  // Smooth color transition
  static createColorTransition(animatedValue: Animated.Value, fromColor: string, toColor: string) {
    return animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [fromColor, toColor],
    });
  }

  // Elastic animation for playful interactions
  static createElasticAnimation(animatedValue: Animated.Value, toValue: number = 1) {
    return Animated.spring(animatedValue, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 3,
    });
  }

  // Smooth entrance animation
  static createEntranceAnimation(scaleValue: Animated.Value, opacityValue: Animated.Value, delay: number = 0) {
    scaleValue.setValue(0.8);
    opacityValue.setValue(0);
    
    return Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
        easing: safeEasing.back(),
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
        easing: safeEasing.quad,
      })
    ]);
  }

  // Smooth exit animation
  static createExitAnimation(scaleValue: Animated.Value, opacityValue: Animated.Value) {
    return Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
        easing: safeEasing.quad,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: safeEasing.quad,
      })
    ]);
  }
}

// Pre-configured animation presets
export const AnimationPresets = {
  // Button press animation
  buttonPress: {
    scale: { from: 1, to: 0.95, duration: 100 },
    opacity: { from: 1, to: 0.8, duration: 100 }
  },
  
  // Success feedback
  success: {
    scale: { from: 1, to: 1.1, duration: 150 },
    bounce: true
  },
  
  // Error feedback
  error: {
    shake: true,
    color: '#FF4444'
  },
  
  // Loading state
  loading: {
    rotation: true,
    opacity: { from: 1, to: 0.6, duration: 500 }
  },
  
  // List item entrance
  listItem: {
    scale: { from: 0.9, to: 1, duration: 300 },
    opacity: { from: 0, to: 1, duration: 300 },
    stagger: 50
  }
};