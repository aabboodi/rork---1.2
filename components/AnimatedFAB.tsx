import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform, View } from 'react-native';
import Colors from '@/constants/colors';
import { MicroInteractions } from '@/utils/microInteractions';

interface AnimatedFABProps {
  onPress: () => void;
  icon: React.ReactNode;
  size?: number;
  backgroundColor?: string;
  disabled?: boolean;
  style?: any;
  showPulse?: boolean;
  showRipple?: boolean;
}

export default function AnimatedFAB({
  onPress,
  icon,
  size = 56,
  backgroundColor = Colors.primary,
  disabled = false,
  style,
  showPulse = false,
  showRipple = true
}: AnimatedFABProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [rippleVisible, setRippleVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    // Entrance animation
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
        delay: 300,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation if enabled
    if (showPulse) {
      MicroInteractions.createPulseAnimation(pulseAnim, 0.9, 1.1).start();
    }
  }, [showPulse]);

  const handlePressIn = () => {
    if (disabled) return;
    
    setIsPressed(true);
    MicroInteractions.triggerHapticFeedback('medium');
    
    // Scale down animation
    Animated.parallel([
      MicroInteractions.createScaleAnimation(scaleAnim, 0.9, 100),
      MicroInteractions.createOpacityAnimation(opacityAnim, 0.8, 100)
    ]).start();
    
    // Ripple effect
    if (showRipple && Platform.OS === 'android') {
      setRippleVisible(true);
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    setIsPressed(false);
    
    // Scale back up with bounce
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      MicroInteractions.createOpacityAnimation(opacityAnim, 1, 150)
    ]).start();
    
    // Hide ripple
    if (showRipple && Platform.OS === 'android') {
      setTimeout(() => {
        setRippleVisible(false);
        rippleAnim.setValue(0);
      }, 300);
    }
  };

  const handlePress = () => {
    if (disabled) return;
    
    MicroInteractions.triggerHapticFeedback('heavy');
    
    // Success animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      })
    ]).start();
    
    // Rotation animation for icon
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });
    
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) }
          ],
          opacity: opacityAnim
        },
        disabled && styles.disabled,
        style
      ]}
    >
      <TouchableOpacity
        style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        {/* Ripple Effect */}
        {rippleVisible && showRipple && (
          <Animated.View
            style={[
              styles.ripple,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
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
        
        {/* Icon with rotation animation */}
        <Animated.View
          style={{
            transform: [{
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              })
            }]
          }}
        >
          {icon}
        </Animated.View>
        
        {/* Glow effect for pressed state */}
        {isPressed && (
          <Animated.View
            style={[
              styles.glow,
              {
                width: size + 20,
                height: size + 20,
                borderRadius: (size + 20) / 2,
                opacity: opacityAnim.interpolate({
                  inputRange: [0.8, 1],
                  outputRange: [0.3, 0],
                })
              }
            ]}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: -10,
    left: -10,
  },
  disabled: {
    opacity: 0.5,
    elevation: 2,
    shadowOpacity: 0.1,
  },
});