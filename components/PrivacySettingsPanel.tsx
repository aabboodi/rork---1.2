import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { Shield, Eye, Database, Bell, MapPin, Camera, Brain, Zap, Info, Settings, ExternalLink } from 'lucide-react-native';
import Colors from '@/constants/colors';
import PrivacyPolicyExplainer from './PrivacyPolicyExplainer';

interface PrivacySettings {
  analytics: boolean;
  crashReporting: boolean;
  locationServices: boolean;
  cameraAccess: boolean;
  notificationTracking: boolean;
  aiProcessing: boolean;
  performanceMonitoring: boolean;
  thirdPartyIntegrations: boolean;
}

interface PrivacySettingsPanelProps {
  onClose?: () => void;
}

export default function PrivacySettingsPanel({ onClose }: PrivacySettingsPanelProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    analytics: false,
    crashReporting: true,
    locationServices: false,
    cameraAccess: true,
    notificationTracking: true,
    aiProcessing: false,
    performanceMonitoring: true,
    thirdPartyIntegrations: false,
  });

  const [showExplainer, setShowExplainer] = useState(false);
  const [selectedService, setSelectedService] = useState<string | undefined>();

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      // في التطبيق الحقيقي، سيتم تحميل الإعدادات من التخزين الآمن
      console.log('Loading privacy settings...');
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const savePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // في التطبيق الحقيقي، سيتم حفظ الإعدادات في التخزين الآمن
      console.log('Privacy settings saved:', updatedSettings);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      Alert.alert('خطأ', 'فشل في حفظ إعدادات الخصوصية');
    }
  };

  const handleSettingToggle = async (setting: keyof PrivacySettings, value: boolean) => {
    // تحذيرات خاصة لبعض الإعدادات
    if (setting === 'crashReporting' && !value) {
      Alert.alert(
        'تعطيل تقارير الأخطاء',
        'تعطيل تقارير الأخطاء قد يؤثر على قدرتنا على إصلاح المشاكل وتحسين التطبيق. هل تريد المتابعة؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'تعطيل', 
            style: 'destructive',
            onPress: () => savePrivacySettings({ [setting]: value })
          }
        ]
      );
      return;
    }

    if (setting === 'aiProcessing' && value) {
      Alert.alert(
        'تفعيل معالجة الذكاء الاصطناعي',
        'سيتم إرسال بعض البيانات المجهولة لتحسين الاقتراحات. يمكنك مراجعة التفاصيل في سياسة الخصوصية.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'تفعيل', 
            onPress: () => savePrivacySettings({ [setting]: value })
          }
        ]
      );
      return;
    }

    await savePrivacySettings({ [setting]: value });
  };

  const handleLearnMore = (serviceId: string) => {
    setSelectedService(serviceId);
    setShowExplainer(true);
  };

  const renderPrivacySetting = (
    key: keyof PrivacySettings,
    title: string,
    description: string,
    icon: React.ReactNode,
    serviceId?: string,
    essential: boolean = false
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingHeader}>
        <View style={styles.settingIcon}>
          {icon}
        </View>
        <View style={styles.settingInfo}>
          <View style={styles.settingTitleRow}>
            <Text style={styles.settingTitle}>{title}</Text>
            {essential && (
              <View style={styles.essentialBadge}>
                <Text style={styles.essentialText}>ضروري</Text>
              </View>
            )}
          </View>
          <Text style={styles.settingDescription}>{description}</Text>
          {serviceId && (
            <TouchableOpacity 
              style={styles.learnMoreButton}
              onPress={() => handleLearnMore(serviceId)}
            >
              <Text style={styles.learnMoreText}>اعرف المزيد</Text>
              <ExternalLink size={12} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <Switch
          value={settings[key]}
          onValueChange={(value) => handleSettingToggle(key, value)}
          trackColor={{ false: Colors.inactive, true: Colors.primary + '40' }}
          thumbColor={settings[key] ? Colors.primary : Colors.medium}
          disabled={essential}
        />
      </View>
    </View>
  );

  const getPrivacyScore = () => {
    const totalSettings = Object.keys(settings).length;
    const enabledSettings = Object.values(settings).filter(Boolean).length;
    const privacyFriendlySettings = Object.entries(settings).filter(([key, value]) => {
      // الإعدادات التي تحسن الخصوصية عند تعطيلها
      const privacyFriendly = ['analytics', 'aiProcessing', 'thirdPartyIntegrations'];
      return privacyFriendly.includes(key) ? !value : value;
    }).length;
    
    return Math.round((privacyFriendlySettings / totalSettings) * 100);
  };

  const privacyScore = getPrivacyScore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Shield size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>إعدادات الخصوصية</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>إغلاق</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* نقاط الخصوصية */}
      <View style={styles.privacyScoreCard}>
        <View style={styles.scoreHeader}>
          <Eye size={20} color={Colors.primary} />
          <Text style={styles.scoreTitle}>نقاط الخصوصية</Text>
        </View>
        <View style={styles.scoreContent}>
          <Text style={styles.scoreValue}>{privacyScore}/100</Text>
          <View style={styles.scoreBar}>
            <View 
              style={[
                styles.scoreProgress, 
                { 
                  width: `${privacyScore}%`,
                  backgroundColor: privacyScore >= 80 ? Colors.success : 
                                 privacyScore >= 60 ? Colors.warning : Colors.error
                }
              ]} 
            />
          </View>
          <Text style={styles.scoreDescription}>
            {privacyScore >= 80 ? 'ممتاز! خصوصيتك محمية بشكل جيد' :
             privacyScore >= 60 ? 'جيد، يمكن تحسين بعض الإعدادات' :
             'يحتاج تحسين - راجع الإعدادات أدناه'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* الخدمات الأساسية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الخدمات الأساسية</Text>
          <Text style={styles.sectionDescription}>
            هذه الخدمات ضرورية لعمل التطبيق ولا يمكن تعطيلها
          </Text>
          
          {renderPrivacySetting(
            'crashReporting',
            'تقارير الأخطاء',
            'إرسال تقارير الأخطاء لتحسين استقرار التطبيق',
            <Shield size={20} color={Colors.primary} />,
            'expo_services',
            true
          )}

          {renderPrivacySetting(
            'performanceMonitoring',
            'مراقبة الأداء',
            'جمع بيانات الأداء لتحسين سرعة التطبيق',
            <Zap size={20} color={Colors.warning} />,
            'analytics_services',
            true
          )}
        </View>

        {/* الخدمات الاختيارية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الخدمات الاختيارية</Text>
          <Text style={styles.sectionDescription}>
            يمكنك تعطيل هذه الخدمات دون تأثير على الوظائف الأساسية
          </Text>

          {renderPrivacySetting(
            'analytics',
            'التحليلات',
            'جمع بيانات الاستخدام لتحسين التطبيق',
            <Database size={20} color={Colors.medium} />,
            'analytics_services'
          )}

          {renderPrivacySetting(
            'aiProcessing',
            'معالجة الذكاء الاصطناعي',
            'استخدام الذكاء الاصطناعي لتحسين الاقتراحات',
            <Brain size={20} color={Colors.secondary} />,
            'ai_services'
          )}

          {renderPrivacySetting(
            'thirdPartyIntegrations',
            'تكامل الطرف الثالث',
            'السماح بالتكامل مع خدمات خارجية',
            <ExternalLink size={20} color={Colors.medium} />,
            'expo_services'
          )}
        </View>

        {/* أذونات الجهاز */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أذونات الجهاز</Text>
          <Text style={styles.sectionDescription}>
            تحكم في وصول التطبيق لميزات جهازك
          </Text>

          {renderPrivacySetting(
            'locationServices',
            'خدمات الموقع',
            'الوصول لموقعك لميزات الأصدقاء القريبين',
            <MapPin size={20} color={Colors.error} />,
            'expo_location'
          )}

          {renderPrivacySetting(
            'cameraAccess',
            'الوصول للكاميرا',
            'استخدام الكاميرا لالتقاط الصور ومقاطع الفيديو',
            <Camera size={20} color={Colors.primary} />,
            'expo_camera'
          )}

          {renderPrivacySetting(
            'notificationTracking',
            'تتبع الإشعارات',
            'تتبع تفاعلك مع الإشعارات لتحسينها',
            <Bell size={20} color={Colors.warning} />,
            'expo_notifications'
          )}
        </View>

        {/* نصائح الخصوصية */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <Info size={20} color={Colors.primary} />
            <Text style={styles.tipsTitle}>نصائح لحماية خصوصيتك</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• راجع هذه الإعدادات بانتظام</Text>
            <Text style={styles.tipItem}>• عطّل الخدمات التي لا تحتاجها</Text>
            <Text style={styles.tipItem}>• اقرأ سياسات الخصوصية للخدمات الخارجية</Text>
            <Text style={styles.tipItem}>• استخدم المصادقة الثنائية</Text>
            <Text style={styles.tipItem}>• احذر من الروابط المشبوهة</Text>
          </View>
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowExplainer(true)}
          >
            <Info size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>عرض سياسة الخصوصية الكاملة</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => {
              Alert.alert(
                'إعادة تعيين الإعدادات',
                'هل تريد إعادة تعيين جميع إعدادات الخصوصية للقيم الافتراضية؟',
                [
                  { text: 'إلغاء', style: 'cancel' },
                  { 
                    text: 'إعادة تعيين', 
                    style: 'destructive',
                    onPress: () => {
                      setSettings({
                        analytics: false,
                        crashReporting: true,
                        locationServices: false,
                        cameraAccess: true,
                        notificationTracking: true,
                        aiProcessing: false,
                        performanceMonitoring: true,
                        thirdPartyIntegrations: false,
                      });
                      Alert.alert('تم', 'تم إعادة تعيين إعدادات الخصوصية');
                    }
                  }
                ]
              );
            }}
          >
            <Settings size={20} color={Colors.medium} />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              إعادة تعيين الإعدادات
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* مشروح سياسة الخصوصية */}
      <PrivacyPolicyExplainer
        visible={showExplainer}
        onClose={() => {
          setShowExplainer(false);
          setSelectedService(undefined);
        }}
        service={selectedService}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  privacyScoreCard: {
    margin: 16,
    padding: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 8,
  },
  scoreContent: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.inactive,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    fontSize: 14,
    color: Colors.medium,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.medium,
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginRight: 8,
  },
  essentialBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  essentialText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.medium,
    lineHeight: 18,
    marginBottom: 8,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  learnMoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  tipsSection: {
    margin: 16,
    padding: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 8,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  actionsSection: {
    margin: 16,
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.light,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.medium,
  },
});