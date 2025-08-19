import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  Lock,
  Eye,
  Users,
  Brain,
  Target,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  tip: string;
}

interface SecurityOnboardingProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'مرحباً بك في عالم الأمان',
    description: 'سنأخذك في جولة سريعة لتتعرف على الميزات الأمنية المتقدمة التي تحميك',
    icon: <Shield size={48} color="#ffffff" />,
    color: '#667eea',
    features: [
      'حماية شاملة لبياناتك',
      'تشفير متقدم للرسائل',
      'مراقبة ذكية للتهديدات',
      'تحكم دقيق في الصلاحيات'
    ],
    tip: 'جميع هذه الميزات تعمل تلقائياً لحمايتك دون أي تدخل منك'
  },
  {
    id: 'encryption',
    title: 'التشفير من طرف إلى طرف',
    description: 'رسائلك محمية بأقوى أنواع التشفير. لا يمكن لأحد قراءتها سواك أنت والمستقبل',
    icon: <Lock size={48} color="#ffffff" />,
    color: '#10b981',
    features: [
      'تشفير تلقائي لجميع الرسائل',
      'مفاتيح تشفير فريدة لكل محادثة',
      'حماية من التنصت والاعتراض',
      'أمان مطلق للمعلومات الحساسة'
    ],
    tip: 'حتى نحن لا نستطيع قراءة رسائلك - هذا هو مستوى الأمان الذي نوفره'
  },
  {
    id: 'biometric',
    title: 'المصادقة البيومترية',
    description: 'استخدم بصمة إصبعك أو وجهك للدخول السريع والآمن للتطبيق',
    icon: <Eye size={48} color="#ffffff" />,
    color: '#3b82f6',
    features: [
      'دخول سريع ببصمة الإصبع',
      'التعرف على الوجه',
      'حماية فريدة لا يمكن تقليدها',
      'لا حاجة لتذكر كلمات مرور معقدة'
    ],
    tip: 'يمكنك تفعيل هذه الميزة من الإعدادات في أي وقت'
  },
  {
    id: 'access_control',
    title: 'التحكم الذكي في الصلاحيات',
    description: 'تحكم دقيق في من يمكنه الوصول لماذا ومتى، مع مرونة كاملة في الإدارة',
    icon: <Users size={48} color="#ffffff" />,
    color: '#f59e0b',
    features: [
      'صلاحيات مخصصة لكل مستخدم',
      'تحكم في أوقات الوصول',
      'حماية البيانات الحساسة',
      'مراجعة شاملة للأنشطة'
    ],
    tip: 'يمكنك تخصيص الصلاحيات بدقة حسب احتياجاتك'
  },
  {
    id: 'ai_monitoring',
    title: 'المراقبة الذكية بالذكاء الاصطناعي',
    description: 'نظام ذكي يتعلم عاداتك ويحميك من الأنشطة المشبوهة تلقائياً',
    icon: <Brain size={48} color="#ffffff" />,
    color: '#8b5cf6',
    features: [
      'كشف الأنشطة غير العادية',
      'تنبيهات فورية للتهديدات',
      'تعلم مستمر لتحسين الحماية',
      'حماية استباقية من المخاطر'
    ],
    tip: 'النظام يعمل في الخلفية ويتعلم من سلوكك لحمايتك بشكل أفضل'
  },
  {
    id: 'threat_detection',
    title: 'كشف التهديدات المتقدم',
    description: 'حماية شاملة من جميع أنواع التهديدات السيبرانية والبرمجيات الخبيثة',
    icon: <Target size={48} color="#ffffff" />,
    color: '#ef4444',
    features: [
      'كشف الفيروسات والبرمجيات الخبيثة',
      'حماية من الروابط الضارة',
      'مراقبة مستمرة للتهديدات',
      'تحديثات أمنية تلقائية'
    ],
    tip: 'التحديثات الأمنية تتم تلقائياً لضمان أحدث مستوى من الحماية'
  }
];

const SecurityOnboarding: React.FC<SecurityOnboardingProps> = ({
  visible,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const scrollViewRef = useRef<ScrollView>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      translateX.setValue(gestureState.dx);
    },
    onPanResponderRelease: (_, gestureState) => {
      const threshold = width * 0.3;
      
      if (gestureState.dx > threshold && currentStep > 0) {
        // Swipe right - previous step
        goToPreviousStep();
      } else if (gestureState.dx < -threshold && currentStep < onboardingSteps.length - 1) {
        // Swipe left - next step
        goToNextStep();
      }
      
      // Reset animation
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  const goToNextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    } else {
      handleComplete();
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    }
  };

  const handleComplete = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
      onClose();
    });
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleSkip}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>تخطي</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {onboardingSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index <= currentStep ? step.color : '#e5e7eb',
                  },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <Animated.View
            style={[styles.content, { transform: [{ translateX }] }]}
            {...panResponder.panHandlers}
          >
            <LinearGradient
              colors={[step.color, step.color + 'CC']}
              style={styles.stepHeader}
            >
              <View style={styles.iconContainer}>
                {step.icon}
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </LinearGradient>

            <ScrollView
              ref={scrollViewRef}
              style={styles.stepContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>الميزات الرئيسية:</Text>
                {step.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <CheckCircle size={16} color={step.color} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tipContainer}>
                <View style={styles.tipHeader}>
                  <View style={[styles.tipIcon, { backgroundColor: step.color + '20' }]}>
                    <Text style={styles.tipEmoji}>💡</Text>
                  </View>
                  <Text style={styles.tipTitle}>نصيحة مفيدة</Text>
                </View>
                <Text style={styles.tipText}>{step.tip}</Text>
              </View>
            </ScrollView>
          </Animated.View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              onPress={goToPreviousStep}
              style={[
                styles.navButton,
                styles.prevButton,
                currentStep === 0 && styles.disabledButton,
              ]}
              disabled={currentStep === 0}
            >
              <ChevronLeft size={20} color={currentStep === 0 ? '#9ca3af' : '#374151'} />
              <Text style={[
                styles.navButtonText,
                currentStep === 0 && styles.disabledText
              ]}>
                السابق
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToNextStep}
              style={[styles.navButton, styles.nextButton, { backgroundColor: step.color }]}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'ابدأ الآن' : 'التالي'}
              </Text>
              <ChevronRight size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    height: height * 0.85,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  stepHeader: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#e5e7eb',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    lineHeight: 22,
  },
  tipContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipEmoji: {
    fontSize: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tipText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  prevButton: {
    backgroundColor: '#f3f4f6',
  },
  nextButton: {
    minWidth: 120,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledText: {
    color: '#9ca3af',
  },
});

export default SecurityOnboarding;