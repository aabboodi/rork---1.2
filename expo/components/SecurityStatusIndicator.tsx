import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react-native';
import SecurityTooltip from './SecurityTooltip';

interface SecurityStatusIndicatorProps {
  status: 'secure' | 'warning' | 'critical' | 'loading' | 'unknown';
  feature: string;
  description: string;
  onPress?: () => void;
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const SecurityStatusIndicator: React.FC<SecurityStatusIndicatorProps> = ({
  status,
  feature,
  description,
  onPress,
  showTooltip = true,
  size = 'medium'
}) => {
  const [pulseAnim] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    if (status === 'loading') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'secure':
        return {
          icon: <CheckCircle size={getIconSize()} color="#10b981" />,
          color: '#10b981',
          backgroundColor: '#d1fae5',
          borderColor: '#10b981',
          text: 'آمن',
          tooltipType: 'success' as const
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={getIconSize()} color="#f59e0b" />,
          color: '#f59e0b',
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          text: 'تحذير',
          tooltipType: 'warning' as const
        };
      case 'critical':
        return {
          icon: <XCircle size={getIconSize()} color="#ef4444" />,
          color: '#ef4444',
          backgroundColor: '#fee2e2',
          borderColor: '#ef4444',
          text: 'حرج',
          tooltipType: 'warning' as const
        };
      case 'loading':
        return {
          icon: <Zap size={getIconSize()} color="#3b82f6" />,
          color: '#3b82f6',
          backgroundColor: '#dbeafe',
          borderColor: '#3b82f6',
          text: 'جاري التحميل',
          tooltipType: 'info' as const
        };
      default:
        return {
          icon: <Clock size={getIconSize()} color="#6b7280" />,
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          borderColor: '#6b7280',
          text: 'غير معروف',
          tooltipType: 'info' as const
        };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getContainerStyle = () => {
    const baseStyle = styles.container;
    switch (size) {
      case 'small':
        return [baseStyle, styles.smallContainer];
      case 'large':
        return [baseStyle, styles.largeContainer];
      default:
        return baseStyle;
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'large':
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  const config = getStatusConfig();

  const indicator = (
    <TouchableOpacity
      style={[
        getContainerStyle(),
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          status === 'loading' && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {config.icon}
      </Animated.View>
      <Text style={[getTextStyle(), { color: config.color }]}>
        {config.text}
      </Text>
    </TouchableOpacity>
  );

  if (showTooltip) {
    return (
      <SecurityTooltip
        title={`${feature} - ${config.text}`}
        description={description}
        type={config.tooltipType}
      >
        {indicator}
      </SecurityTooltip>
    );
  }

  return indicator;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  smallContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  largeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mediumText: {
    fontSize: 14,
    fontWeight: '500',
  },
  largeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SecurityStatusIndicator;