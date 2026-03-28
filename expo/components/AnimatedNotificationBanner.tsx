import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MicroInteractions } from '@/utils/microInteractions';

const { width } = Dimensions.get('window');

interface AnimatedNotificationBannerProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  position?: 'top' | 'bottom';
}

export default function AnimatedNotificationBanner({
  visible,
  type,
  title,
  message,
  duration = 4000,
  onDismiss,
  action,
  position = 'top'
}: AnimatedNotificationBannerProps) {
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      showBanner();
      
      // Auto dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideBanner();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      hideBanner();
    }
  }, [visible, duration]);

  const showBanner = () => {
    // Reset animations
    slideAnim.setValue(position === 'top' ? -100 : 100);
    opacityAnim.setValue(0);
    scaleAnim.setValue(0.9);
    progressAnim.setValue(0);
    
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      })
    ]).start();
    
    // Progress bar animation
    if (duration > 0) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start();
    }
    
    // Pulse animation for error type
    if (type === 'error') {
      MicroInteractions.createPulseAnimation(pulseAnim, 0.95, 1.05).start();
    }
    
    // Haptic feedback
    MicroInteractions.triggerHapticFeedback(type === 'error' ? 'heavy' : 'medium');
  };

  const hideBanner = () => {
    // Stop pulse animation
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    
    // Exit animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  const handleDismiss = () => {
    MicroInteractions.triggerHapticFeedback('light');
    hideBanner();
  };

  const handleActionPress = () => {
    MicroInteractions.triggerHapticFeedback('medium');
    action?.onPress();
    hideBanner();
  };

  const getIcon = () => {
    const iconSize = 20;
    const iconColor = 'white';
    
    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'error':
        return <AlertCircle size={iconSize} color={iconColor} />;
      case 'warning':
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case 'info':
        return <Info size={iconSize} color={iconColor} />;
      default:
        return <Info size={iconSize} color={iconColor} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.error;
      case 'warning':
        return Colors.warning || '#f59e0b';
      case 'info':
        return Colors.primary;
      default:
        return Colors.primary;
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          [position]: Platform.OS === 'ios' ? 50 : 20,
          backgroundColor: getBackgroundColor(),
          transform: [
            { translateY: slideAnim },
            { scale: Animated.multiply(scaleAnim, pulseAnim) }
          ],
          opacity: opacityAnim
        }
      ]}
    >
      {/* Progress bar */}
      {duration > 0 && (
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              })
            }
          ]}
        />
      )}
      
      <View style={styles.content}>
        {/* Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{
                scale: pulseAnim
              }]
            }
          ]}
        >
          {getIcon()}
        </Animated.View>
        
        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
        
        {/* Action button */}
        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleActionPress}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
        
        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
          <X size={18} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 19, // Extra space for progress bar
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  dismissButton: {
    padding: 4,
  },
});