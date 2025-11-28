import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Micro-interactions utility for creating smooth animations and haptic feedback
 */
export class MicroInteractions {
  /**
   * Trigger haptic feedback
   */
  static triggerHapticFeedback(
    style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium'
  ): void {
    try {
      switch (style) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback not supported:', error);
    }
  }

  /**
   * Create a bounce animation
   */
  static createBounceAnimation(
    animatedValue: Animated.Value,
    toValue: number = 1,
    duration: number = 300
  ): Animated.CompositeAnimation {
    return Animated.spring(animatedValue, {
      toValue,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    });
  }

  /**
   * Create a scale animation (press effect)
   */
  static createPressAnimation(
    animatedValue: Animated.Value,
    duration: number = 100
  ): {
    pressIn: Animated.CompositeAnimation;
    pressOut: Animated.CompositeAnimation;
  } {
    return {
      pressIn: Animated.timing(animatedValue, {
        toValue: 0.95,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      pressOut: Animated.spring(animatedValue, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    };
  }

  /**
   * Create a fade animation
   */
  static createFadeAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
  }

  /**
   * Create a slide animation
   */
  static createSlideAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
  }

  /**
   * Create a rotate animation
   */
  static createRotateAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    });
  }

  /**
   * Create a pulse animation (for notifications)
   */
  static createPulseAnimation(
    animatedValue: Animated.Value,
    minScale: number = 1,
    maxScale: number = 1.1,
    duration: number = 1000
  ): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: maxScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: minScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
  }

  /**
   * Create a shake animation (for errors)
   */
  static createShakeAnimation(
    animatedValue: Animated.Value,
    duration: number = 400
  ): Animated.CompositeAnimation {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 10,
        duration: duration / 4,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: -10,
        duration: duration / 4,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 10,
        duration: duration / 4,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: duration / 4,
        useNativeDriver: true,
      }),
    ]);
  }

  /**
   * Create a parallax animation
   */
  static createParallaxAnimation(
    scrollY: Animated.Value,
    parallaxFactor: number = 0.5
  ): Animated.AnimatedInterpolation<string | number> {
    return scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, -100 * parallaxFactor],
      extrapolate: 'extend',
    });
  }

  /**
   * Create a stagger animation (for lists)
   */
  static createStaggerAnimation(
    items: any[],
    animationFactory: (item: any, index: number) => Animated.CompositeAnimation,
    staggerDelay: number = 50
  ): Animated.CompositeAnimation {
    return Animated.stagger(
      staggerDelay,
      items.map((item, index) => animationFactory(item, index))
    );
  }

  /**
   * Create a sequential animation
   */
  static createSequenceAnimation(
    animations: Animated.CompositeAnimation[]
  ): Animated.CompositeAnimation {
    return Animated.sequence(animations);
  }

  /**
   * Create a parallel animation
   */
  static createParallelAnimation(
    animations: Animated.CompositeAnimation[]
  ): Animated.CompositeAnimation {
    return Animated.parallel(animations);
  }

  /**
   * Create a spring animation (for natural movement)
   */
  static createSpringAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    config?: {
      friction?: number;
      tension?: number;
      speed?: number;
      bounciness?: number;
    }
  ): Animated.CompositeAnimation {
    return Animated.spring(animatedValue, {
      toValue,
      friction: config?.friction || 7,
      tension: config?.tension || 40,
      speed: config?.speed,
      bounciness: config?.bounciness,
      useNativeDriver: true,
    });
  }

  /**
   * Create a timing animation with custom easing
   */
  static createTimingAnimation(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300,
    easing: ((value: number) => number) = Easing.inOut(Easing.ease)
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing,
      useNativeDriver: true,
    });
  }

  /**
   * Create a ripple effect animation
   */
  static createRippleAnimation(
    scaleValue: Animated.Value,
    opacityValue: Animated.Value,
    duration: number = 600
  ): Animated.CompositeAnimation {
    return Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 2,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
  }

  /**
   * Create a slide in from direction animation
   */
  static createSlideInAnimation(
    animatedValue: Animated.Value,
    direction: 'left' | 'right' | 'top' | 'bottom',
    distance: number = 100,
    duration: number = 300
  ): Animated.CompositeAnimation {
    const startValue = direction === 'left' || direction === 'top' ? -distance : distance;
    animatedValue.setValue(startValue);

    return Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
  }

  /**
   * Create a loading spinner animation
   */
  static createSpinAnimation(
    animatedValue: Animated.Value
  ): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
  }

  /**
   * Interpolate rotation
   */
  static interpolateRotation(
    animatedValue: Animated.Value
  ): Animated.AnimatedInterpolation<string> {
    return animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
  }

  /**
   * Create a smooth transition for layout changes
   */
  static createLayoutTransition(
    animatedValue: Animated.Value,
    toValue: number,
    duration: number = 300
  ): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false, // Layout animations can't use native driver
    });
  }
}

/**
 * Common animation presets
 */
export const AnimationPresets = {
  // Quick tap feedback
  quickTap: {
    duration: 100,
    scaleDecrease: 0.97,
  },

  // Button press
  buttonPress: {
    duration: 150,
    scaleDecrease: 0.95,
  },

  // Card press
  cardPress: {
    duration: 200,
    scaleDecrease: 0.98,
  },

  // Modal slide in
  modalSlide: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },

  // Fade transitions
  fade: {
    duration: 250,
    easing: Easing.inOut(Easing.ease),
  },

  // Bounce effect
  bounce: {
    friction: 3,
    tension: 40,
  },

  // Elastic effect
  elastic: {
    friction: 5,
    tension: 20,
  },
};

export default MicroInteractions;