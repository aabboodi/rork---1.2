import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { Info, X, CheckCircle, AlertTriangle, Shield } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SecurityTooltipProps {
  title: string;
  description: string;
  type?: 'info' | 'warning' | 'success' | 'security';
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const SecurityTooltip: React.FC<SecurityTooltipProps> = ({
  title,
  description,
  type = 'info',
  children,
  position = 'top'
}) => {
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const getTypeConfig = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle size={16} color="#f59e0b" />,
          color: '#f59e0b',
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b'
        };
      case 'success':
        return {
          icon: <CheckCircle size={16} color="#10b981" />,
          color: '#10b981',
          backgroundColor: '#d1fae5',
          borderColor: '#10b981'
        };
      case 'security':
        return {
          icon: <Shield size={16} color="#3b82f6" />,
          color: '#3b82f6',
          backgroundColor: '#dbeafe',
          borderColor: '#3b82f6'
        };
      default:
        return {
          icon: <Info size={16} color="#6b7280" />,
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          borderColor: '#6b7280'
        };
    }
  };

  const showTooltip = () => {
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideTooltip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  const typeConfig = getTypeConfig();

  return (
    <>
      <TouchableOpacity onPress={showTooltip} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={hideTooltip}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={hideTooltip}
        >
          <Animated.View
            style={[
              styles.tooltip,
              {
                backgroundColor: typeConfig.backgroundColor,
                borderColor: typeConfig.borderColor,
                opacity: fadeAnim,
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.tooltipHeader}>
              <View style={styles.titleContainer}>
                {typeConfig.icon}
                <Text style={[styles.tooltipTitle, { color: typeConfig.color }]}>
                  {title}
                </Text>
              </View>
              <TouchableOpacity onPress={hideTooltip} style={styles.closeButton}>
                <X size={16} color={typeConfig.color} />
              </TouchableOpacity>
            </View>
            <Text style={styles.tooltipDescription}>{description}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltip: {
    maxWidth: width * 0.8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default SecurityTooltip;