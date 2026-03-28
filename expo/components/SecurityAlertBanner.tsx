import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  Shield,
  X,
  ChevronRight,
  Bell
} from 'lucide-react-native';
import SecurityBreachService, { SecurityAlert } from '@/services/security/SecurityBreachService';

const { width } = Dimensions.get('window');

interface SecurityAlertBannerProps {
  onAlertPress?: (alert: SecurityAlert) => void;
  onDismiss?: () => void;
  style?: any;
}

const SecurityAlertBanner: React.FC<SecurityAlertBannerProps> = ({
  onAlertPress,
  onDismiss,
  style
}) => {
  const [currentAlert, setCurrentAlert] = useState<SecurityAlert | null>(null);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(false);
  
  const breachService = SecurityBreachService.getInstance();

  useEffect(() => {
    checkForAlerts();
    const interval = setInterval(checkForAlerts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkForAlerts = async () => {
    try {
      const alerts = breachService.getAlerts({
        read: false,
        actionRequired: true,
        limit: 1
      });
      
      if (alerts.length > 0 && alerts[0].id !== currentAlert?.id) {
        setCurrentAlert(alerts[0]);
        showBanner();
      } else if (alerts.length === 0 && isVisible) {
        hideBanner();
      }
    } catch (error) {
      console.error('Failed to check for alerts:', error);
    }
  };

  const showBanner = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      setIsVisible(false);
      setCurrentAlert(null);
    });
  };

  const handlePress = () => {
    if (currentAlert) {
      onAlertPress?.(currentAlert);
      handleDismiss();
    }
  };

  const handleDismiss = async () => {
    if (currentAlert) {
      await breachService.markAlertAsRead(currentAlert.id);
      hideBanner();
      onDismiss?.();
    }
  };

  const getPriorityColors = (priority: SecurityAlert['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          gradient: ['#FF3B30', '#FF453A'],
          icon: '#FFFFFF',
          text: '#FFFFFF'
        };
      case 'error':
        return {
          gradient: ['#FF9500', '#FF9F0A'],
          icon: '#FFFFFF',
          text: '#FFFFFF'
        };
      case 'warning':
        return {
          gradient: ['#FFCC00', '#FFD60A'],
          icon: '#1C1C1E',
          text: '#1C1C1E'
        };
      case 'info':
      default:
        return {
          gradient: ['#007AFF', '#0A84FF'],
          icon: '#FFFFFF',
          text: '#FFFFFF'
        };
    }
  };

  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'breach':
        return AlertTriangle;
      case 'threat':
        return Shield;
      case 'vulnerability':
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  if (!isVisible || !currentAlert) {
    return null;
  }

  const colors = getPriorityColors(currentAlert.priority);
  const IconComponent = getAlertIcon(currentAlert.type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim
        },
        style
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors.gradient}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <IconComponent size={20} color={colors.icon} />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {currentAlert.title}
              </Text>
              <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
                {currentAlert.message}
              </Text>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronRight size={16} color={colors.icon} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Priority Indicator */}
          <View style={[
            styles.priorityIndicator,
            {
              backgroundColor: currentAlert.priority === 'critical' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(0, 0, 0, 0.1)'
            }
          ]} />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Pulse Animation for Critical Alerts */}
      {currentAlert.priority === 'critical' && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3]
              }),
              transform: [{
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.1]
                })
              }]
            }
          ]}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 1000
  },
  banner: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
      },
      android: {
        elevation: 8
      }
    })
  },
  gradient: {
    padding: 16
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1,
    marginRight: 12
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  message: {
    fontSize: 12,
    opacity: 0.9,
    lineHeight: 16
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButton: {
    padding: 4,
    marginRight: 8
  },
  dismissButton: {
    padding: 4
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12
  },
  pulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF3B30'
  }
});

export default SecurityAlertBanner;