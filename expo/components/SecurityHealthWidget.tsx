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
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Lock,
  Users,
  Brain
} from 'lucide-react-native';
import SecurityTooltip from './SecurityTooltip';

const { width } = Dimensions.get('window');

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  maxValue: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description: string;
}

interface SecurityHealthWidgetProps {
  onPress?: () => void;
  showDetails?: boolean;
}

const SecurityHealthWidget: React.FC<SecurityHealthWidgetProps> = ({
  onPress,
  showDetails = true
}) => {
  const [animatedValues] = useState({
    overall: new Animated.Value(0),
    encryption: new Animated.Value(0),
    access: new Animated.Value(0),
    monitoring: new Animated.Value(0),
    biometric: new Animated.Value(0),
  });

  const [metrics] = useState<SecurityMetric[]>([
    {
      id: 'encryption',
      name: 'التشفير',
      value: 95,
      maxValue: 100,
      status: 'excellent',
      icon: <Lock size={16} color="#10b981" />,
      description: 'جميع الرسائل مشفرة بأمان'
    },
    {
      id: 'access',
      name: 'التحكم في الوصول',
      value: 88,
      maxValue: 100,
      status: 'good',
      icon: <Users size={16} color="#3b82f6" />,
      description: 'صلاحيات محددة بدقة'
    },
    {
      id: 'monitoring',
      name: 'المراقبة الذكية',
      value: 92,
      maxValue: 100,
      status: 'excellent',
      icon: <Brain size={16} color="#8b5cf6" />,
      description: 'نظام مراقبة نشط'
    },
    {
      id: 'biometric',
      name: 'المصادقة البيومترية',
      value: 75,
      maxValue: 100,
      status: 'good',
      icon: <Eye size={16} color="#f59e0b" />,
      description: 'متاح ومفعل جزئياً'
    }
  ]);

  const overallScore = Math.round(
    metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length
  );

  useEffect(() => {
    // Animate overall score
    Animated.timing(animatedValues.overall, {
      toValue: overallScore,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Animate individual metrics
    metrics.forEach((metric) => {
      Animated.timing(animatedValues[metric.id as keyof typeof animatedValues], {
        toValue: metric.value,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    });
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'ممتاز';
    if (score >= 75) return 'جيد';
    if (score >= 60) return 'مقبول';
    return 'يحتاج تحسين';
  };

  const getStatusIcon = (score: number) => {
    if (score >= 90) return <CheckCircle size={20} color="#10b981" />;
    if (score >= 75) return <Shield size={20} color="#3b82f6" />;
    if (score >= 60) return <AlertTriangle size={20} color="#f59e0b" />;
    return <XCircle size={20} color="#ef4444" />;
  };

  const renderCircularProgress = (value: Animated.Value, maxValue: number, color: string, size: number = 120) => {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
      <View style={[styles.circularProgress, { width: size, height: size }]}>
        <Animated.View
          style={[
            styles.progressCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color + '20',
            }
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: size - 10,
                height: size - 10,
                borderRadius: (size - 10) / 2,
                borderColor: color,
                borderWidth: 4,
                transform: [
                  {
                    rotate: value.interpolate({
                      inputRange: [0, maxValue],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }
            ]}
          />
        </Animated.View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[getScoreColor(overallScore) + '10', getScoreColor(overallScore) + '05']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {getStatusIcon(overallScore)}
            <Text style={styles.title}>حالة الأمان العامة</Text>
          </View>
          <SecurityTooltip
            title="كيف يتم حساب درجة الأمان؟"
            description="تعتمد على متوسط جميع المقاييس الأمنية: التشفير، التحكم في الوصول، المراقبة الذكية، والمصادقة البيومترية."
            type="info"
          >
            <Activity size={16} color="#6b7280" />
          </SecurityTooltip>
        </View>

        {/* Main Score */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            {renderCircularProgress(
              animatedValues.overall,
              100,
              getScoreColor(overallScore),
              100
            )}
            <View style={styles.scoreContent}>
              <Animated.Text style={[styles.scoreValue, { color: getScoreColor(overallScore) }]}>
                {animatedValues.overall.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0', overallScore.toString()],
                  extrapolate: 'clamp',
                })}
              </Animated.Text>
              <Text style={styles.scoreUnit}>%</Text>
            </View>
          </View>
          
          <View style={styles.scoreInfo}>
            <Text style={[styles.scoreStatus, { color: getScoreColor(overallScore) }]}>
              {getScoreStatus(overallScore)}
            </Text>
            <Text style={styles.scoreDescription}>
              نظامك محمي بمستوى {getScoreStatus(overallScore).toLowerCase()} من الأمان
            </Text>
          </View>
        </View>

        {/* Detailed Metrics */}
        {showDetails && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>تفاصيل المقاييس الأمنية</Text>
            <View style={styles.metricsList}>
              {metrics.map((metric) => (
                <SecurityTooltip
                  key={metric.id}
                  title={metric.name}
                  description={metric.description}
                  type="info"
                >
                  <View style={styles.metricItem}>
                    <View style={styles.metricHeader}>
                      {metric.icon}
                      <Text style={styles.metricName}>{metric.name}</Text>
                    </View>
                    
                    <View style={styles.metricProgress}>
                      <View style={styles.progressTrack}>
                        <Animated.View
                          style={[
                            styles.progressBar,
                            {
                              width: animatedValues[metric.id as keyof typeof animatedValues].interpolate({
                                inputRange: [0, metric.maxValue],
                                outputRange: ['0%', '100%'],
                                extrapolate: 'clamp',
                              }),
                              backgroundColor: getScoreColor(metric.value),
                            }
                          ]}
                        />
                      </View>
                      <Animated.Text style={[styles.metricValue, { color: getScoreColor(metric.value) }]}>
                        {animatedValues[metric.id as keyof typeof animatedValues].interpolate({
                          inputRange: [0, metric.maxValue],
                          outputRange: ['0', metric.value.toString()],
                          extrapolate: 'clamp',
                        })}%
                      </Animated.Text>
                    </View>
                  </View>
                </SecurityTooltip>
              ))}
            </View>
          </View>
        )}

        {/* Trend Indicator */}
        <View style={styles.trendContainer}>
          <TrendingUp size={16} color="#10b981" />
          <Text style={styles.trendText}>
            تحسن بنسبة 12% هذا الأسبوع
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 20,
  },
  scoreCircle: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgress: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFill: {
    position: 'absolute',
    borderTopWidth: 4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  scoreContent: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreUnit: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 2,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  metricsContainer: {
    marginBottom: 20,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  metricsList: {
    gap: 12,
  },
  metricItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  metricProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  trendText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
});

export default SecurityHealthWidget;