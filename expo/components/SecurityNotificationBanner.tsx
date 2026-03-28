import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Bell,
  Info,
  Lock,
  Eye,
  Key
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SecurityNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'security';
  title: string;
  message: string;
  action?: {
    text: string;
    onPress: () => void;
  };
  autoHide?: boolean;
  duration?: number;
}

interface SecurityNotificationBannerProps {
  notification: SecurityNotification | null;
  onDismiss: () => void;
}

const SecurityNotificationBanner: React.FC<SecurityNotificationBannerProps> = ({
  notification,
  onDismiss
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      if (notification.autoHide) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, notification.duration || 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [notification]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss();
    });
  };

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle size={20} color="#ffffff" />,
          colors: ['#10b981', '#059669'],
          textColor: '#ffffff'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} color="#ffffff" />,
          colors: ['#f59e0b', '#d97706'],
          textColor: '#ffffff'
        };
      case 'security':
        return {
          icon: <Shield size={20} color="#ffffff" />,
          colors: ['#3b82f6', '#2563eb'],
          textColor: '#ffffff'
        };
      default:
        return {
          icon: <Info size={20} color="#ffffff" />,
          colors: ['#6b7280', '#4b5563'],
          textColor: '#ffffff'
        };
    }
  };

  if (!notification || !visible) {
    return null;
  }

  const config = getNotificationConfig(notification.type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={config.colors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {config.icon}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: config.textColor }]}>
              {notification.title}
            </Text>
            <Text style={[styles.message, { color: config.textColor }]}>
              {notification.message}
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            {notification.action && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={notification.action.onPress}
              >
                <Text style={styles.actionText}>
                  {notification.action.text}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
            >
              <X size={16} color={config.textColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar for auto-hide */}
        {notification.autoHide && (
          <AutoHideProgressBar duration={notification.duration || 5000} />
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const AutoHideProgressBar: React.FC<{ duration: number }> = ({ duration }) => {
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
  }, [duration]);

  return (
    <View style={styles.progressContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

// Hook for managing security notifications
export const useSecurityNotifications = () => {
  const [notification, setNotification] = useState<SecurityNotification | null>(null);

  const showNotification = (notif: Omit<SecurityNotification, 'id'>) => {
    setNotification({
      ...notif,
      id: Date.now().toString(),
    });
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  // Predefined notification types
  const showSecurityAlert = (message: string, action?: SecurityNotification['action']) => {
    showNotification({
      type: 'security',
      title: 'تنبيه أمني',
      message,
      action,
      autoHide: false,
    });
  };

  const showSecuritySuccess = (message: string) => {
    showNotification({
      type: 'success',
      title: 'تم بنجاح',
      message,
      autoHide: true,
      duration: 3000,
    });
  };

  const showSecurityWarning = (message: string, action?: SecurityNotification['action']) => {
    showNotification({
      type: 'warning',
      title: 'تحذير',
      message,
      action,
      autoHide: false,
    });
  };

  const showSecurityInfo = (message: string) => {
    showNotification({
      type: 'info',
      title: 'معلومة',
      message,
      autoHide: true,
      duration: 4000,
    });
  };

  return {
    notification,
    showNotification,
    dismissNotification,
    showSecurityAlert,
    showSecuritySuccess,
    showSecurityWarning,
    showSecurityInfo,
  };
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  gradient: {
    paddingTop: 50, // Account for status bar
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    opacity: 0.9,
    lineHeight: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 8,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 1,
  },
});

export default SecurityNotificationBanner;