import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
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
  Info,
  X,
  MessageCircle,
  Key,
  Users,
  Brain,
  Activity,
  Zap,
  Clock,
  Target,
  Search
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface SecurityFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  benefits: string[];
  howItWorks: string;
  userImpact: string;
  examples: string[];
}

interface SecurityExplainerProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

const securityFeatures: SecurityFeature[] = [
  {
    id: 'e2ee',
    title: 'التشفير من طرف إلى طرف',
    description: 'حماية رسائلك بحيث لا يمكن لأحد قراءتها سواك أنت والمستقبل',
    icon: <Lock size={24} color="#10b981" />,
    color: '#10b981',
    benefits: [
      'رسائلك محمية بالكامل',
      'لا يمكن لأحد اعتراض محادثاتك',
      'حتى نحن لا نستطيع قراءة رسائلك',
      'أمان مطلق لمعلوماتك الشخصية'
    ],
    howItWorks: 'يتم تشفير كل رسالة على جهازك قبل إرسالها، ولا يمكن فك التشفير إلا على جهاز المستقبل',
    userImpact: 'تشعر بالأمان التام عند مشاركة المعلومات الحساسة',
    examples: [
      'إرسال معلومات بنكية',
      'مشاركة صور شخصية',
      'محادثات عمل سرية',
      'معلومات طبية حساسة'
    ]
  },
  {
    id: 'biometric',
    title: 'المصادقة البيومترية',
    description: 'استخدم بصمة إصبعك أو وجهك لحماية تطبيقك',
    icon: <Eye size={24} color="#3b82f6" />,
    color: '#3b82f6',
    benefits: [
      'دخول سريع وآمن',
      'لا حاجة لتذكر كلمات مرور معقدة',
      'حماية فريدة لا يمكن تقليدها',
      'راحة بال تامة'
    ],
    howItWorks: 'يستخدم التطبيق مستشعرات جهازك للتعرف على بصمتك أو وجهك',
    userImpact: 'دخول فوري للتطبيق دون عناء كتابة كلمات المرور',
    examples: [
      'فتح التطبيق ببصمة الإصبع',
      'تأكيد المعاملات المالية',
      'الوصول للمحادثات الحساسة',
      'حماية الملفات المهمة'
    ]
  },
  {
    id: 'ueba',
    title: 'مراقبة السلوك الذكية',
    description: 'نظام ذكي يتعلم عاداتك ويحميك من الأنشطة المشبوهة',
    icon: <Brain size={24} color="#8b5cf6" />,
    color: '#8b5cf6',
    benefits: [
      'حماية تلقائية من التهديدات',
      'اكتشاف محاولات الاختراق',
      'تنبيهات فورية للأنشطة المشبوهة',
      'تعلم مستمر لتحسين الحماية'
    ],
    howItWorks: 'يراقب النظام أنماط استخدامك العادية وينبهك عند حدوث شيء غير طبيعي',
    userImpact: 'حماية استباقية دون تدخل منك',
    examples: [
      'تسجيل دخول من مكان غريب',
      'استخدام التطبيق في أوقات غير عادية',
      'محاولة الوصول لبيانات حساسة',
      'سلوك مختلف عن المعتاد'
    ]
  },
  {
    id: 'access_control',
    title: 'التحكم الدقيق في الصلاحيات',
    description: 'تحكم كامل في من يمكنه الوصول لماذا ومتى',
    icon: <Users size={24} color="#f59e0b" />,
    color: '#f59e0b',
    benefits: [
      'تحكم دقيق في الصلاحيات',
      'حماية البيانات الحساسة',
      'مرونة في إدارة الوصول',
      'شفافية كاملة في العمليات'
    ],
    howItWorks: 'يحدد النظام من يمكنه الوصول لأي معلومة بناءً على قواعد ذكية ومرنة',
    userImpact: 'ثقة أكبر في مشاركة المعلومات مع الأشخاص المناسبين',
    examples: [
      'السماح للزملاء برؤية ملفات العمل فقط',
      'منع الوصول للصور الشخصية',
      'تحديد أوقات الوصول للمعلومات',
      'إعطاء صلاحيات مؤقتة'
    ]
  },
  {
    id: 'threat_detection',
    title: 'كشف التهديدات المتقدم',
    description: 'حماية استباقية من التهديدات السيبرانية',
    icon: <Target size={24} color="#ef4444" />,
    color: '#ef4444',
    benefits: [
      'حماية من الفيروسات والبرمجيات الخبيثة',
      'كشف محاولات الاختراق',
      'حماية من الروابط الضارة',
      'تحديث مستمر لقواعد الحماية'
    ],
    howItWorks: 'يفحص النظام جميع الأنشطة والملفات للبحث عن علامات التهديد',
    userImpact: 'استخدام آمن دون القلق من التهديدات الخفية',
    examples: [
      'حجب الروابط الضارة',
      'منع تحميل ملفات مشبوهة',
      'كشف محاولات سرقة البيانات',
      'تنبيهات أمنية فورية'
    ]
  },
  {
    id: 'secure_storage',
    title: 'التخزين الآمن',
    description: 'حفظ بياناتك بطريقة مشفرة وآمنة',
    icon: <Shield size={24} color="#06b6d4" />,
    color: '#06b6d4',
    benefits: [
      'بياناتك محفوظة بأمان',
      'تشفير قوي لجميع المعلومات',
      'حماية من فقدان البيانات',
      'نسخ احتياطية آمنة'
    ],
    howItWorks: 'يتم تشفير جميع بياناتك قبل حفظها وتبقى مشفرة حتى عند الحاجة إليها',
    userImpact: 'راحة بال كاملة بأن معلوماتك محفوظة بأمان',
    examples: [
      'حفظ كلمات المرور',
      'تخزين الصور والفيديوهات',
      'حماية المعلومات الشخصية',
      'النسخ الاحتياطية الآمنة'
    ]
  }
];

const SecurityExplainer: React.FC<SecurityExplainerProps> = ({ visible, onClose, feature }) => {
  const [selectedFeature, setSelectedFeature] = useState<SecurityFeature | null>(
    feature ? securityFeatures.find(f => f.id === feature) || null : null
  );
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleFeatureSelect = (feature: SecurityFeature) => {
    setSelectedFeature(feature);
  };

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedFeature(null);
      onClose();
    });
  };

  const renderFeatureOverview = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.headerGradient}
        >
          <Shield size={32} color="#ffffff" />
          <Text style={styles.headerTitle}>دليل الأمان الشامل</Text>
          <Text style={styles.headerSubtitle}>
            تعرف على الميزات الأمنية التي تحميك
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.featuresGrid}>
        {securityFeatures.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={styles.featureCard}
            onPress={() => handleFeatureSelect(feature)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[feature.color + '20', feature.color + '10']}
              style={styles.featureGradient}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '30' }]}>
                {feature.icon}
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
              <View style={styles.learnMoreButton}>
                <Text style={[styles.learnMoreText, { color: feature.color }]}>
                  اعرف المزيد
                </Text>
                <Info size={16} color={feature.color} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.securityTips}>
        <Text style={styles.tipsTitle}>💡 نصائح أمنية سريعة</Text>
        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.tipText}>استخدم كلمات مرور قوية ومختلفة</Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.tipText}>فعّل المصادقة الثنائية دائماً</Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.tipText}>تحديث التطبيق بانتظام</Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.tipText}>كن حذراً من الروابط المشبوهة</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderFeatureDetail = (feature: SecurityFeature) => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => setSelectedFeature(null)} style={styles.backButton}>
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
        <LinearGradient
          colors={[feature.color, feature.color + 'CC']}
          style={styles.detailHeaderGradient}
        >
          <View style={styles.detailIcon}>
            {feature.icon}
          </View>
          <Text style={styles.detailTitle}>{feature.title}</Text>
          <Text style={styles.detailDescription}>{feature.description}</Text>
        </LinearGradient>
      </View>

      <View style={styles.detailContent}>
        {/* كيف يعمل */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={20} color={feature.color} />
            <Text style={styles.sectionTitle}>كيف يعمل؟</Text>
          </View>
          <Text style={styles.sectionText}>{feature.howItWorks}</Text>
        </View>

        {/* الفوائد */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={20} color={feature.color} />
            <Text style={styles.sectionTitle}>الفوائد</Text>
          </View>
          {feature.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={[styles.benefitDot, { backgroundColor: feature.color }]} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* التأثير على المستخدم */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={20} color={feature.color} />
            <Text style={styles.sectionTitle}>ماذا يعني لك؟</Text>
          </View>
          <View style={[styles.impactCard, { borderLeftColor: feature.color }]}>
            <Text style={styles.impactText}>{feature.userImpact}</Text>
          </View>
        </View>

        {/* أمثلة عملية */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Search size={20} color={feature.color} />
            <Text style={styles.sectionTitle}>أمثلة عملية</Text>
          </View>
          {feature.examples.map((example, index) => (
            <View key={index} style={styles.exampleItem}>
              <Text style={styles.exampleNumber}>{index + 1}</Text>
              <Text style={styles.exampleText}>{example}</Text>
            </View>
          ))}
        </View>

        {/* نصائح إضافية */}
        <View style={styles.section}>
          <View style={styles.additionalTips}>
            <AlertTriangle size={20} color="#f59e0b" />
            <Text style={styles.tipsHeader}>نصيحة مهمة</Text>
          </View>
          <Text style={styles.additionalTipsText}>
            هذه الميزة تعمل تلقائياً في الخلفية لحمايتك. لا تحتاج لفعل أي شيء إضافي!
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          {selectedFeature ? renderFeatureDetail(selectedFeature) : renderFeatureOverview()}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: width * 0.95,
    height: height * 0.9,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e5e7eb',
    textAlign: 'center',
    opacity: 0.9,
  },
  featuresGrid: {
    padding: 16,
    gap: 16,
  },
  featureCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureGradient: {
    padding: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  securityTips: {
    margin: 16,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  detailHeader: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
  },
  detailHeaderGradient: {
    padding: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailDescription: {
    fontSize: 16,
    color: '#e5e7eb',
    textAlign: 'center',
    opacity: 0.9,
  },
  detailContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  benefitText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  impactCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  impactText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    lineHeight: 24,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  exampleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  exampleText: {
    fontSize: 15,
    color: '#4b5563',
    flex: 1,
    lineHeight: 22,
  },
  additionalTips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  additionalTipsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default SecurityExplainer;