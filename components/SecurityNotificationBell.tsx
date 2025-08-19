import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';
import { Bell, AlertTriangle } from 'lucide-react-native';
import SecurityNotificationService, { SecurityAlert } from '@/services/security/SecurityNotificationService';
import SecurityNotificationCenter from './SecurityNotificationCenter';

interface SecurityNotificationBellProps {
  size?: number;
  color?: string;
  showBadge?: boolean;
}

const SecurityNotificationBell: React.FC<SecurityNotificationBellProps> = ({
  size = 24,
  color = '#6B7280',
  showBadge = true
}) => {
  const [notifications, setNotifications] = useState<SecurityAlert[]>([]);
  const [showCenter, setShowCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasHighPriority, setHasHighPriority] = useState(false);
  const shakeAnimation = new Animated.Value(0);

  const notificationService = SecurityNotificationService.getInstance();

  useEffect(() => {
    loadNotifications();
    
    // Set up periodic refresh
    const interval = setInterval(loadNotifications, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasHighPriority) {
      startShakeAnimation();
    }
  }, [hasHighPriority]);

  const loadNotifications = async () => {
    try {
      const stored = await notificationService.getStoredNotifications();
      setNotifications(stored);
      
      // Calculate unread count (notifications from last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = stored.filter(n => new Date(n.timestamp) > oneDayAgo);
      setUnreadCount(recent.length);
      
      // Check for high priority alerts
      const highPriority = stored.some(n => 
        (n.severity === 'CRITICAL' || n.severity === 'HIGH') && 
        new Date(n.timestamp) > oneDayAgo
      );
      setHasHighPriority(highPriority);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const startShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    setShowCenter(true);
    // Reset high priority flag when user opens the center
    setHasHighPriority(false);
  };

  const getBellColor = () => {
    if (hasHighPriority) {
      return '#DC2626'; // Red for high priority
    }
    if (unreadCount > 0) {
      return '#F59E0B'; // Amber for unread
    }
    return color; // Default color
  };

  const getBellIcon = () => {
    return hasHighPriority ? AlertTriangle : Bell;
  };

  const BellIcon = getBellIcon();
  const bellColor = getBellColor();

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.container}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ translateX: shakeAnimation }]
            }
          ]}
        >
          <BellIcon size={size} color={bellColor} />
          
          {showBadge && unreadCount > 0 && (
            <View style={[
              styles.badge,
              hasHighPriority && styles.highPriorityBadge
            ]}>
              <Text style={[
                styles.badgeText,
                hasHighPriority && styles.highPriorityBadgeText
              ]}>
                {unreadCount > 99 ? '99+' : unreadCount.toString()}
              </Text>
            </View>
          )}
          
          {hasHighPriority && (
            <View style={styles.pulseIndicator}>
              <Animated.View style={[
                styles.pulse,
                {
                  opacity: shakeAnimation.interpolate({
                    inputRange: [-10, 0, 10],
                    outputRange: [0.3, 1, 0.3],
                  })
                }
              ]} />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      <SecurityNotificationCenter
        visible={showCenter}
        onClose={() => setShowCenter(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  highPriorityBadge: {
    backgroundColor: '#DC2626',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  highPriorityBadgeText: {
    color: '#FFFFFF',
  },
  pulseIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
});

export default SecurityNotificationBell;