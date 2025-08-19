import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { AlertTriangle, Shield, ExternalLink, FileText, X } from 'lucide-react-native';

interface InlineSecurityWarningProps {
  type: 'link' | 'file';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  onDismiss?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
}

const InlineSecurityWarning: React.FC<InlineSecurityWarningProps> = ({
  type,
  riskLevel,
  warnings,
  onDismiss,
  onViewDetails,
  compact = false
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return <AlertTriangle size={compact ? 16 : 20} color={getRiskColor()} />;
      case 'medium':
        return <Shield size={compact ? 16 : 20} color={getRiskColor()} />;
      case 'low':
        return type === 'link' ? 
          <ExternalLink size={compact ? 16 : 20} color={getRiskColor()} /> :
          <FileText size={compact ? 16 : 20} color={getRiskColor()} />;
      default:
        return <Shield size={compact ? 16 : 20} color={getRiskColor()} />;
    }
  };

  const getRiskText = () => {
    switch (riskLevel) {
      case 'critical': return 'خطر شديد';
      case 'high': return 'خطر عالي';
      case 'medium': return 'خطر متوسط';
      case 'low': return 'تحذير بسيط';
      default: return 'تحذير';
    }
  };

  const getMainWarning = () => {
    if (warnings.length === 0) return 'محتوى قد يكون مشبوهاً';
    return warnings[0];
  };

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { backgroundColor: getRiskColor() + '15' },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.compactContent}>
          {getRiskIcon()}
          <Text style={[styles.compactText, { color: getRiskColor() }]} numberOfLines={1}>
            {getRiskText()}
          </Text>
          {onViewDetails && (
            <TouchableOpacity onPress={onViewDetails} style={styles.compactButton}>
              <Text style={[styles.compactButtonText, { color: getRiskColor() }]}>
                تفاصيل
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { borderLeftColor: getRiskColor() },
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {getRiskIcon()}
          <Text style={[styles.title, { color: getRiskColor() }]}>
            {getRiskText()}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <X size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.warningText} numberOfLines={2}>
        {getMainWarning()}
      </Text>

      {warnings.length > 1 && (
        <Text style={styles.additionalWarnings}>
          +{warnings.length - 1} تحذيرات إضافية
        </Text>
      )}

      {onViewDetails && (
        <TouchableOpacity onPress={onViewDetails} style={styles.detailsButton}>
          <Text style={[styles.detailsButtonText, { color: getRiskColor() }]}>
            عرض التفاصيل الكاملة
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fefefe',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4,
  },
  additionalWarnings: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  detailsButton: {
    alignSelf: 'flex-start',
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  compactContainer: {
    borderRadius: 6,
    padding: 8,
    marginVertical: 2,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  compactButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  compactButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default InlineSecurityWarning;