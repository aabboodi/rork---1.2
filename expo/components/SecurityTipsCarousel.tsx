import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle,
  Key,
  Users,
  Brain,
  Target,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Database
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SecurityTip {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  actionText: string;
  importance: 'high' | 'medium' | 'low';
}

interface SecurityTipsCarouselProps {
  onTipAction?: (tipId: string) => void;
}

const securityTips: SecurityTip[] = [
  {
    id: 'strong_passwords',
    title: 'استخدم كلمات مرور قوية',
    description: 'كلمة المرور القوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز. تجنب استخدام معلومات شخصية.',
    icon: <Lock size={24} color="#ffffff" />,
    color: '#10b981',
    actionText: 'تحديث كلمة المرور',
    importance: 'high'
  },
  {
    id: 'two_factor_auth',
    title: 'فعّل المصادقة الثنائية',
    description: 'طبقة حماية إضافية تجعل حسابك أكثر أماناً حتى لو تم اختراق كلمة المرور.',
    icon: <Shield size={24} color="#ffffff" />,
    color: '#3b82f6',
    actionText: 'تفعيل المصادقة الثنائية',
    importance: 'high'
  },
  {
    id: 'biometric_auth',
    title: 'استخدم المصادقة البيومترية',
    description: 'بصمة الإصبع أو التعرف على الوجه توفر أماناً إضافياً وسهولة في الاستخدام.',
    icon: <Eye size={24} color="#ffffff" />,
    color: '#8b5cf6',
    actionText: 'تفعيل البصمة',
    importance: 'medium'
  },
  {
    id: 'regular_updates',
    title: 'حدّث التطبيق بانتظام',
    description: 'التحديثات تحتوي على إصلاحات أمنية مهمة وميزات حماية جديدة.',
    icon: <RefreshCw size={24} color="#ffffff" />,
    color: '#f59e0b',
    actionText: 'فحص التحديثات',
    importance: 'medium'
  },
  {
    id: 'suspicious_links',
    title: 'احذر من الروابط المشبوهة',
    description: 'لا تضغط على روابط من مصادر غير موثوقة. تحقق دائماً من المرسل قبل النقر.',
    icon: <AlertTriangle size={24} color="#ffffff" />,
    color: '#ef4444',
    actionText: 'تعلم المزيد',
    importance: 'high'
  },
  {
    id: 'secure_networks',
    title: 'استخدم شبكات آمنة',
    description: 'تجنب الشبكات العامة للمعاملات الحساسة. استخدم VPN عند الضرورة.',
    icon: <Users size={24} color="#ffffff" />,
    color: '#06b6d4',
    actionText: 'إعدادات الشبكة',
    importance: 'medium'
  },
  {
    id: 'backup_data',
    title: 'اعمل نسخ احتياطية',
    description: 'النسخ الاحتياطية المنتظمة تحمي بياناتك من الفقدان أو الاختراق.',
    icon: <Database size={24} color="#ffffff" />,
    color: '#84cc16',
    actionText: 'إعداد النسخ الاحتياطية',
    importance: 'medium'
  },
  {
    id: 'privacy_settings',
    title: 'راجع إعدادات الخصوصية',
    description: 'تحكم في من يمكنه رؤية معلوماتك ومشاركة بياناتك مع التطبيقات الأخرى.',
    icon: <Eye size={24} color="#ffffff" />,
    color: '#6366f1',
    actionText: 'مراجعة الإعدادات',
    importance: 'low'
  }
];

const SecurityTipsCarousel: React.FC<SecurityTipsCarouselProps> = ({ onTipAction }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  useEffect(() => {
    if (!autoScrollEnabled) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % securityTips.length;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width * 0.85,
        animated: true
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, autoScrollEnabled]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (width * 0.85));
    setCurrentIndex(index);
  };

  const goToNext = () => {
    setAutoScrollEnabled(false);
    const nextIndex = (currentIndex + 1) % securityTips.length;
    setCurrentIndex(nextIndex);
    scrollViewRef.current?.scrollTo({
      x: nextIndex * width * 0.85,
      animated: true
    });
    setTimeout(() => setAutoScrollEnabled(true), 10000);
  };

  const goToPrevious = () => {
    setAutoScrollEnabled(false);
    const prevIndex = currentIndex === 0 ? securityTips.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    scrollViewRef.current?.scrollTo({
      x: prevIndex * width * 0.85,
      animated: true
    });
    setTimeout(() => setAutoScrollEnabled(true), 10000);
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getImportanceText = (importance: string) => {
    switch (importance) {
      case 'high': return 'مهم جداً';
      case 'medium': return 'مهم';
      case 'low': return 'مفيد';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💡 نصائح أمنية يومية</Text>
        <Text style={styles.headerSubtitle}>تعلم كيف تحمي نفسك بشكل أفضل</Text>
      </View>

      <View style={styles.carouselContainer}>
        <TouchableOpacity onPress={goToPrevious} style={styles.navButton}>
          <ChevronLeft size={20} color="#6b7280" />
        </TouchableOpacity>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {securityTips.map((tip, index) => (
            <View key={tip.id} style={styles.tipCard}>
              <LinearGradient
                colors={[tip.color, tip.color + 'CC']}
                style={styles.tipGradient}
              >
                <View style={styles.tipHeader}>
                  <View style={styles.iconContainer}>
                    {tip.icon}
                  </View>
                  <View style={[styles.importanceBadge, { backgroundColor: getImportanceColor(tip.importance) }]}>
                    <Text style={styles.importanceText}>{getImportanceText(tip.importance)}</Text>
                  </View>
                </View>

                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onTipAction?.(tip.id)}
                >
                  <Text style={styles.actionButtonText}>{tip.actionText}</Text>
                  <ChevronRight size={16} color="#ffffff" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity onPress={goToNext} style={styles.navButton}>
          <ChevronRight size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {securityTips.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === currentIndex ? securityTips[currentIndex].color : '#e5e7eb',
                transform: [{ scale: index === currentIndex ? 1.2 : 1 }]
              }
            ]}
          />
        ))}
      </View>

      {/* Auto-scroll indicator */}
      {autoScrollEnabled && (
        <View style={styles.autoScrollIndicator}>
          <View style={styles.autoScrollDot} />
          <Text style={styles.autoScrollText}>التمرير التلقائي مفعل</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  navButton: {
    padding: 12,
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  tipCard: {
    width: width * 0.75,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tipGradient: {
    padding: 20,
    minHeight: 200,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  importanceText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 16,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  autoScrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    gap: 6,
  },
  autoScrollDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  autoScrollText: {
    fontSize: 10,
    color: '#6b7280',
  },
});

export default SecurityTipsCarousel;