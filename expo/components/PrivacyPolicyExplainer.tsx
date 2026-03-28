import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  Server,
  Cloud,
  Bell,
  MapPin,
  CreditCard,
  Brain,
  Camera,
  Mic,
  Users,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle,
  X,
  Info,
  ExternalLink,
  Database,
  Smartphone,
  Globe,
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface ThirdPartyService {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  purpose: string;
  dataCollected: string[];
  dataShared: string[];
  retentionPeriod: string;
  location: string;
  privacyPolicy: string;
  optOut: boolean;
  essential: boolean;
  alternatives: string[];
  securityMeasures: string[];
  userControl: string[];
}

interface PrivacyPolicyExplainerProps {
  visible: boolean;
  onClose: () => void;
  service?: string;
}

const thirdPartyServices: ThirdPartyService[] = [
  {
    id: 'expo_services',
    name: 'Expo Development Services',
    category: 'تطوير التطبيق',
    icon: <Smartphone size={24} color="#000020" />,
    color: '#000020',
    purpose: 'توفير خدمات تطوير التطبيق والنشر والتحديثات',
    dataCollected: [
      'معرف الجهاز الفريد',
      'نوع الجهاز ونظام التشغيل',
      'إصدار التطبيق',
      'سجلات الأخطاء والأداء',
      'بيانات الاستخدام الأساسية'
    ],
    dataShared: [
      'معلومات تقنية عن الجهاز',
      'سجلات الأخطاء (مجهولة الهوية)',
      'إحصائيات الاستخدام العامة'
    ],
    retentionPeriod: '90 يوم للسجلات، سنة واحدة للإحصائيات',
    location: 'الولايات المتحدة الأمريكية',
    privacyPolicy: 'https://expo.dev/privacy',
    optOut: false,
    essential: true,
    alternatives: ['React Native CLI', 'Flutter'],
    securityMeasures: [
      'تشفير البيانات أثناء النقل',
      'تجهيل البيانات الشخصية',
      'حماية البنية التحتية',
      'مراجعات أمنية دورية'
    ],
    userControl: [
      'يمكن تعطيل تقارير الأخطاء',
      'يمكن تعطيل التحليلات',
      'لا يمكن تعطيل الخدمات الأساسية'
    ]
  },
  {
    id: 'expo_crypto',
    name: 'Expo Crypto Services',
    category: 'التشفير والأمان',
    icon: <Lock size={24} color="#10b981" />,
    color: '#10b981',
    purpose: 'توفير خدمات التشفير والحماية للبيانات الحساسة',
    dataCollected: [
      'مفاتيح التشفير المحلية',
      'بصمات التشفير',
      'معلومات الجلسة المشفرة'
    ],
    dataShared: [
      'لا يتم مشاركة أي بيانات تشفير',
      'جميع العمليات محلية'
    ],
    retentionPeriod: 'محلي فقط - لا يتم تخزين البيانات خارجياً',
    location: 'محلي على الجهاز',
    privacyPolicy: 'https://docs.expo.dev/versions/latest/sdk/crypto/',
    optOut: false,
    essential: true,
    alternatives: ['React Native Crypto', 'Native Crypto APIs'],
    securityMeasures: [
      'تشفير AES-256',
      'مفاتيح محلية فقط',
      'لا يتم نقل البيانات',
      'حماية الذاكرة'
    ],
    userControl: [
      'تحكم كامل في المفاتيح',
      'يمكن حذف البيانات المحلية',
      'لا توجد بيانات خارجية'
    ]
  },
  {
    id: 'expo_secure_store',
    name: 'Expo Secure Store',
    category: 'التخزين الآمن',
    icon: <Database size={24} color="#3b82f6" />,
    color: '#3b82f6',
    purpose: 'تخزين البيانات الحساسة بشكل آمن على الجهاز',
    dataCollected: [
      'الرموز المميزة (Tokens)',
      'كلمات المرور المشفرة',
      'إعدادات الأمان',
      'مفاتيح التشفير المحلية'
    ],
    dataShared: [
      'لا يتم مشاركة أي بيانات',
      'التخزين محلي بالكامل'
    ],
    retentionPeriod: 'حتى إلغاء تثبيت التطبيق أو حذف البيانات',
    location: 'محلي على الجهاز (Keychain/Keystore)',
    privacyPolicy: 'https://docs.expo.dev/versions/latest/sdk/securestore/',
    optOut: false,
    essential: true,
    alternatives: ['AsyncStorage مع تشفير', 'Native Keychain'],
    securityMeasures: [
      'تشفير على مستوى النظام',
      'حماية Keychain/Keystore',
      'عدم إمكانية الوصول من تطبيقات أخرى',
      'حماية من Root/Jailbreak'
    ],
    userControl: [
      'يمكن حذف البيانات المحفوظة',
      'يمكن تعطيل التخزين الآمن',
      'تحكم كامل في البيانات المحلية'
    ]
  },
  {
    id: 'expo_notifications',
    name: 'Expo Notifications',
    category: 'الإشعارات',
    icon: <Bell size={24} color="#f59e0b" />,
    color: '#f59e0b',
    purpose: 'إرسال الإشعارات والتنبيهات للمستخدمين',
    dataCollected: [
      'رمز الإشعارات (Push Token)',
      'معرف الجهاز',
      'إعدادات الإشعارات',
      'سجل التفاعل مع الإشعارات'
    ],
    dataShared: [
      'رمز الإشعارات مع خدمة الإشعارات',
      'إحصائيات التسليم (مجهولة)',
      'معلومات الجهاز الأساسية'
    ],
    retentionPeriod: '30 يوم للسجلات، 6 أشهر للإحصائيات',
    location: 'الولايات المتحدة وأوروبا',
    privacyPolicy: 'https://docs.expo.dev/push-notifications/privacy/',
    optOut: true,
    essential: false,
    alternatives: ['Firebase Cloud Messaging', 'OneSignal'],
    securityMeasures: [
      'تشفير الإشعارات',
      'رموز مميزة آمنة',
      'حماية من الإشعارات المزيفة',
      'تحقق من المرسل'
    ],
    userControl: [
      'يمكن تعطيل الإشعارات بالكامل',
      'تحكم في أنواع الإشعارات',
      'يمكن حذف رمز الإشعارات'
    ]
  },
  {
    id: 'expo_location',
    name: 'Expo Location Services',
    category: 'خدمات الموقع',
    icon: <MapPin size={24} color="#ef4444" />,
    color: '#ef4444',
    purpose: 'تحديد الموقع لميزات الأصدقاء القريبين والخدمات المحلية',
    dataCollected: [
      'إحداثيات GPS الدقيقة',
      'سجل المواقع',
      'دقة الموقع',
      'طوابع زمنية للمواقع'
    ],
    dataShared: [
      'الموقع التقريبي مع الأصدقاء (بإذن)',
      'إحصائيات الاستخدام (مجهولة)',
      'بيانات تحسين الخدمة'
    ],
    retentionPeriod: '24 ساعة للموقع الدقيق، 30 يوم للتقريبي',
    location: 'محلي مع نسخ احتياطية مشفرة',
    privacyPolicy: 'https://docs.expo.dev/versions/latest/sdk/location/',
    optOut: true,
    essential: false,
    alternatives: ['خدمات الموقع المحلية', 'تعطيل الميزة'],
    securityMeasures: [
      'تشفير بيانات الموقع',
      'طلب إذن صريح',
      'حذف تلقائي للبيانات القديمة',
      'عدم مشاركة الموقع الدقيق'
    ],
    userControl: [
      'يمكن تعطيل خدمات الموقع',
      'تحكم في دقة الموقع',
      'يمكن حذف سجل المواقع',
      'تحكم في مشاركة الموقع'
    ]
  },
  {
    id: 'expo_camera',
    name: 'Expo Camera & Media',
    category: 'الكاميرا والوسائط',
    icon: <Camera size={24} color="#8b5cf6" />,
    color: '#8b5cf6',
    purpose: 'التقاط الصور ومقاطع الفيديو ومعالجة الوسائط',
    dataCollected: [
      'الصور ومقاطع الفيديو',
      'بيانات EXIF (الموقع، الوقت)',
      'إعدادات الكاميرا',
      'معلومات الجهاز'
    ],
    dataShared: [
      'الوسائط المشاركة مع المستخدمين الآخرين',
      'بيانات تحسين جودة الصورة (مجهولة)',
      'إحصائيات الاستخدام'
    ],
    retentionPeriod: 'حسب اختيار المستخدم، حد أقصى سنتان',
    location: 'محلي مع نسخ احتياطية مشفرة',
    privacyPolicy: 'https://docs.expo.dev/versions/latest/sdk/camera/',
    optOut: true,
    essential: false,
    alternatives: ['كاميرا النظام الافتراضية'],
    securityMeasures: [
      'تشفير الوسائط المحفوظة',
      'إزالة بيانات EXIF الحساسة',
      'طلب إذن صريح',
      'حماية من الوصول غير المصرح'
    ],
    userControl: [
      'يمكن تعطيل الكاميرا',
      'تحكم في حفظ الوسائط',
      'يمكن حذف الوسائط المحفوظة',
      'تحكم في مشاركة الوسائط'
    ]
  },
  {
    id: 'expo_biometrics',
    name: 'Expo Local Authentication',
    category: 'المصادقة البيومترية',
    icon: <Eye size={24} color="#06b6d4" />,
    color: '#06b6d4',
    purpose: 'توفير المصادقة البيومترية (بصمة الإصبع، الوجه)',
    dataCollected: [
      'نتائج المصادقة البيومترية',
      'نوع المصادقة المستخدمة',
      'طوابع زمنية للمصادقة'
    ],
    dataShared: [
      'لا يتم مشاركة البيانات البيومترية',
      'نتائج المصادقة فقط (نجح/فشل)'
    ],
    retentionPeriod: 'لا يتم تخزين البيانات البيومترية',
    location: 'محلي على الجهاز (Secure Enclave)',
    privacyPolicy: 'https://docs.expo.dev/versions/latest/sdk/local-authentication/',
    optOut: true,
    essential: false,
    alternatives: ['كلمة مرور تقليدية', 'PIN'],
    securityMeasures: [
      'البيانات البيومترية لا تغادر الجهاز',
      'تشفير على مستوى الأجهزة',
      'Secure Enclave/TEE',
      'عدم إمكانية استخراج البيانات'
    ],
    userControl: [
      'يمكن تعطيل المصادقة البيومترية',
      'يمكن حذف البيانات البيومترية',
      'تحكم كامل في الاستخدام'
    ]
  },
  {
    id: 'ai_services',
    name: 'خدمات الذكاء الاصطناعي',
    category: 'الذكاء الاصطناعي',
    icon: <Brain size={24} color="#ec4899" />,
    color: '#ec4899',
    purpose: 'تحسين تجربة المستخدم وتوفير اقتراحات ذكية',
    dataCollected: [
      'أنماط الاستخدام',
      'تفضيلات المستخدم',
      'بيانات التفاعل (مجهولة)',
      'نصوص للمعالجة (مشفرة)'
    ],
    dataShared: [
      'بيانات مجهولة للتدريب',
      'إحصائيات الاستخدام',
      'نماذج التحسين'
    ],
    retentionPeriod: '30 يوم للبيانات الشخصية، سنة للنماذج',
    location: 'خوادم مشفرة في أوروبا والولايات المتحدة',
    privacyPolicy: 'https://toolkit.rork.com/privacy',
    optOut: true,
    essential: false,
    alternatives: ['تعطيل الاقتراحات الذكية'],
    securityMeasures: [
      'تشفير البيانات المرسلة',
      'تجهيل البيانات الشخصية',
      'حذف تلقائي للبيانات',
      'عدم تخزين المحتوى الحساس'
    ],
    userControl: [
      'يمكن تعطيل خدمات الذكاء الاصطناعي',
      'تحكم في نوع البيانات المشاركة',
      'يمكن حذف البيانات المجمعة'
    ]
  },
  {
    id: 'analytics_services',
    name: 'خدمات التحليلات',
    category: 'التحليلات والإحصائيات',
    icon: <Zap size={24} color="#f97316" />,
    color: '#f97316',
    purpose: 'تحسين أداء التطبيق وفهم استخدام المستخدمين',
    dataCollected: [
      'إحصائيات الاستخدام',
      'أوقات الجلسات',
      'الميزات المستخدمة',
      'معلومات الأداء'
    ],
    dataShared: [
      'بيانات مجمعة ومجهولة',
      'إحصائيات عامة',
      'تقارير الأداء'
    ],
    retentionPeriod: '90 يوم للبيانات التفصيلية، سنتان للإحصائيات',
    location: 'خوادم آمنة في أوروبا',
    privacyPolicy: 'سياسة خصوصية داخلية',
    optOut: true,
    essential: false,
    alternatives: ['تعطيل التحليلات'],
    securityMeasures: [
      'تجهيل كامل للبيانات',
      'تشفير أثناء النقل',
      'حذف البيانات الشخصية',
      'عدم ربط البيانات بالهوية'
    ],
    userControl: [
      'يمكن تعطيل التحليلات بالكامل',
      'تحكم في نوع البيانات المجمعة',
      'يمكن طلب حذف البيانات'
    ]
  }
];

const PrivacyPolicyExplainer: React.FC<PrivacyPolicyExplainerProps> = ({
  visible,
  onClose,
  service
}) => {
  const [selectedService, setSelectedService] = useState<ThirdPartyService | null>(
    service ? thirdPartyServices.find(s => s.id === service) || null : null
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

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedService(null);
      onClose();
    });
  };

  const handleServiceSelect = (service: ThirdPartyService) => {
    setSelectedService(service);
  };

  const getServicesByCategory = () => {
    const categories: { [key: string]: ThirdPartyService[] } = {};
    thirdPartyServices.forEach(service => {
      if (!categories[service.category]) {
        categories[service.category] = [];
      }
      categories[service.category].push(service);
    });
    return categories;
  };

  const renderServiceOverview = () => {
    const categories = getServicesByCategory();

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
          >
            <Shield size={32} color="#ffffff" />
            <Text style={styles.headerTitle}>سياسة الخصوصية التفصيلية</Text>
            <Text style={styles.headerSubtitle}>
              شرح شامل لجميع خدمات الطرف الثالث المستخدمة
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Info size={20} color={Colors.primary} />
            <Text style={styles.summaryTitle}>ملخص سريع</Text>
          </View>
          <Text style={styles.summaryText}>
            نحن نستخدم {thirdPartyServices.length} خدمات طرف ثالث لتحسين تجربتك. 
            {thirdPartyServices.filter(s => s.essential).length} منها ضرورية لعمل التطبيق، 
            و {thirdPartyServices.filter(s => !s.essential).length} اختيارية يمكنك تعطيلها.
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.statText}>
                {thirdPartyServices.filter(s => s.optOut).length} قابلة للتعطيل
              </Text>
            </View>
            <View style={styles.statItem}>
              <Lock size={16} color={Colors.primary} />
              <Text style={styles.statText}>
                {thirdPartyServices.filter(s => s.location.includes('محلي')).length} محلية فقط
              </Text>
            </View>
          </View>
        </View>

        {Object.entries(categories).map(([category, services]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServiceSelect(service)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[service.color + '20', service.color + '10']}
                  style={styles.serviceGradient}
                >
                  <View style={styles.serviceHeader}>
                    <View style={[styles.serviceIcon, { backgroundColor: service.color + '30' }]}>
                      {service.icon}
                    </View>
                    <View style={styles.serviceInfo}>
                      <View style={styles.serviceTitleRow}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        {service.essential && (
                          <View style={styles.essentialBadge}>
                            <Text style={styles.essentialText}>ضروري</Text>
                          </View>
                        )}
                        {service.optOut && (
                          <View style={styles.optionalBadge}>
                            <Text style={styles.optionalText}>اختياري</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.servicePurpose}>{service.purpose}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.serviceQuickInfo}>
                    <View style={styles.quickInfoItem}>
                      <Database size={14} color={service.color} />
                      <Text style={styles.quickInfoText}>
                        {service.dataCollected.length} نوع بيانات
                      </Text>
                    </View>
                    <View style={styles.quickInfoItem}>
                      <MapPin size={14} color={service.color} />
                      <Text style={styles.quickInfoText}>{service.location}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.learnMoreButton}>
                    <Text style={[styles.learnMoreText, { color: service.color }]}>
                      اعرف التفاصيل
                    </Text>
                    <ExternalLink size={16} color={service.color} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.privacyTips}>
          <Text style={styles.tipsTitle}>💡 نصائح للخصوصية</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.tipText}>راجع إعدادات الخصوصية بانتظام</Text>
            </View>
            <View style={styles.tipItem}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.tipText}>عطّل الخدمات غير الضرورية</Text>
            </View>
            <View style={styles.tipItem}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.tipText}>اقرأ سياسات الخصوصية للخدمات الخارجية</Text>
            </View>
            <View style={styles.tipItem}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.tipText}>استخدم المصادقة الثنائية</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderServiceDetail = (service: ThirdPartyService) => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => setSelectedService(null)} style={styles.backButton}>
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
        <LinearGradient
          colors={[service.color, service.color + 'CC']}
          style={styles.detailHeaderGradient}
        >
          <View style={styles.detailIcon}>
            {service.icon}
          </View>
          <Text style={styles.detailTitle}>{service.name}</Text>
          <Text style={styles.detailCategory}>{service.category}</Text>
          <Text style={styles.detailPurpose}>{service.purpose}</Text>
        </LinearGradient>
      </View>

      <View style={styles.detailContent}>
        {/* البيانات المجمعة */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={service.color} />
            <Text style={styles.sectionTitle}>البيانات المجمعة</Text>
          </View>
          {service.dataCollected.map((data, index) => (
            <View key={index} style={styles.dataItem}>
              <View style={[styles.dataDot, { backgroundColor: service.color }]} />
              <Text style={styles.dataText}>{data}</Text>
            </View>
          ))}
        </View>

        {/* البيانات المشاركة */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={service.color} />
            <Text style={styles.sectionTitle}>البيانات المشاركة</Text>
          </View>
          {service.dataShared.map((data, index) => (
            <View key={index} style={styles.dataItem}>
              <View style={[styles.dataDot, { backgroundColor: service.color }]} />
              <Text style={styles.dataText}>{data}</Text>
            </View>
          ))}
        </View>

        {/* معلومات التخزين */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Server size={20} color={service.color} />
            <Text style={styles.sectionTitle}>معلومات التخزين</Text>
          </View>
          <View style={styles.storageInfo}>
            <View style={styles.storageItem}>
              <Text style={styles.storageLabel}>مدة الاحتفاظ:</Text>
              <Text style={styles.storageValue}>{service.retentionPeriod}</Text>
            </View>
            <View style={styles.storageItem}>
              <Text style={styles.storageLabel}>موقع التخزين:</Text>
              <Text style={styles.storageValue}>{service.location}</Text>
            </View>
          </View>
        </View>

        {/* الإجراءات الأمنية */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={service.color} />
            <Text style={styles.sectionTitle}>الإجراءات الأمنية</Text>
          </View>
          {service.securityMeasures.map((measure, index) => (
            <View key={index} style={styles.securityItem}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.securityText}>{measure}</Text>
            </View>
          ))}
        </View>

        {/* تحكم المستخدم */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eye size={20} color={service.color} />
            <Text style={styles.sectionTitle}>تحكم المستخدم</Text>
          </View>
          {service.userControl.map((control, index) => (
            <View key={index} style={styles.controlItem}>
              <CheckCircle size={16} color={Colors.primary} />
              <Text style={styles.controlText}>{control}</Text>
            </View>
          ))}
        </View>

        {/* البدائل */}
        {service.alternatives.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color={service.color} />
              <Text style={styles.sectionTitle}>البدائل المتاحة</Text>
            </View>
            {service.alternatives.map((alternative, index) => (
              <View key={index} style={styles.alternativeItem}>
                <Text style={styles.alternativeNumber}>{index + 1}</Text>
                <Text style={styles.alternativeText}>{alternative}</Text>
              </View>
            ))}
          </View>
        )}

        {/* سياسة الخصوصية */}
        <View style={styles.section}>
          <View style={styles.privacyPolicyCard}>
            <ExternalLink size={20} color={service.color} />
            <View style={styles.privacyPolicyInfo}>
              <Text style={styles.privacyPolicyTitle}>سياسة الخصوصية الرسمية</Text>
              <Text style={styles.privacyPolicyUrl}>{service.privacyPolicy}</Text>
            </View>
          </View>
        </View>

        {/* تحذيرات مهمة */}
        <View style={styles.section}>
          <View style={styles.warningCard}>
            <AlertTriangle size={20} color="#f59e0b" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>معلومة مهمة</Text>
              <Text style={styles.warningText}>
                {service.essential 
                  ? 'هذه الخدمة ضرورية لعمل التطبيق ولا يمكن تعطيلها.'
                  : 'يمكنك تعطيل هذه الخدمة من إعدادات الخصوصية دون تأثير على الوظائف الأساسية.'
                }
              </Text>
            </View>
          </View>
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
          
          {selectedService ? renderServiceDetail(selectedService) : renderServiceOverview()}
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
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  categorySection: {
    margin: 16,
    marginTop: 0,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  serviceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  serviceGradient: {
    padding: 20,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  essentialBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  essentialText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '600',
  },
  optionalBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  optionalText: {
    fontSize: 10,
    color: '#065f46',
    fontWeight: '600',
  },
  servicePurpose: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  serviceQuickInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickInfoText: {
    fontSize: 12,
    color: '#4b5563',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  privacyTips: {
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
    marginBottom: 4,
    textAlign: 'center',
  },
  detailCategory: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  detailPurpose: {
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
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dataDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dataText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  storageInfo: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  storageValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  securityText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  controlText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  alternativeNumber: {
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
  alternativeText: {
    fontSize: 15,
    color: '#4b5563',
    flex: 1,
    lineHeight: 22,
  },
  privacyPolicyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  privacyPolicyInfo: {
    flex: 1,
  },
  privacyPolicyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  privacyPolicyUrl: {
    fontSize: 12,
    color: '#6b7280',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
});

export default PrivacyPolicyExplainer;