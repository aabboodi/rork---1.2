import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Switch,
  Alert,
  Animated,
  Platform
} from 'react-native';
import { 
  Clock, 
  Shield, 
  Eye, 
  MapPin, 
  Smartphone, 
  Fingerprint,
  AlertTriangle,
  X,
  Check,
  Timer,
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { ExpirationPolicy, GeofenceArea } from '@/types';
import { MicroInteractions } from '@/utils/microInteractions';

interface SelfDestructMessageComposerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (policy: ExpirationPolicy, securityLevel: 'standard' | 'high' | 'maximum') => void;
  defaultDuration?: number;
}

const DURATION_PRESETS = [
  { label: '5 دقائق', value: 5 * 60 * 1000, icon: '⚡' },
  { label: '15 دقيقة', value: 15 * 60 * 1000, icon: '🔥' },
  { label: '1 ساعة', value: 60 * 60 * 1000, icon: '⏰' },
  { label: '6 ساعات', value: 6 * 60 * 60 * 1000, icon: '🌅' },
  { label: '24 ساعة', value: 24 * 60 * 60 * 1000, icon: '📅' },
  { label: '7 أيام', value: 7 * 24 * 60 * 60 * 1000, icon: '📆' },
];

const SECURITY_LEVELS = [
  {
    level: 'standard' as const,
    title: 'عادي',
    description: 'حذف بسيط عند انتهاء المدة',
    icon: '🔒',
    color: Colors.primary,
    features: ['حذف تلقائي', 'تشفير أساسي']
  },
  {
    level: 'high' as const,
    title: 'عالي',
    description: 'تشفير دائم + حماية من لقطات الشاشة',
    icon: '🛡️',
    color: '#FF8800',
    features: ['تشفير دائم', 'منع لقطات الشاشة', 'تسجيل الوصول']
  },
  {
    level: 'maximum' as const,
    title: 'أقصى',
    description: 'مسح آمن + حماية شاملة',
    icon: '🔐',
    color: '#FF4444',
    features: ['مسح آمن', 'ربط بالجهاز', 'مصادقة بيومترية', 'تسجيل شامل']
  }
];

export default function SelfDestructMessageComposer({
  visible,
  onClose,
  onConfirm,
  defaultDuration = 60 * 60 * 1000 // 1 hour
}: SelfDestructMessageComposerProps) {
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const [securityLevel, setSecurityLevel] = useState<'standard' | 'high' | 'maximum'>('standard');
  const [customDuration, setCustomDuration] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Policy settings
  const [maxViews, setMaxViews] = useState<number | undefined>(undefined);
  const [allowScreenshots, setAllowScreenshots] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowForward, setAllowForward] = useState(true);
  const [requireBiometric, setRequireBiometric] = useState(false);
  const [requireDeviceVerification, setRequireDeviceVerification] = useState(false);
  const [notifyOnView, setNotifyOnView] = useState(false);
  const [notifyOnExpiration, setNotifyOnExpiration] = useState(true);
  const [autoDestructOnSuspicious, setAutoDestructOnSuspicious] = useState(false);

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    MicroInteractions.triggerHapticFeedback('light');
  };

  const handleSecurityLevelSelect = (level: 'standard' | 'high' | 'maximum') => {
    setSecurityLevel(level);
    MicroInteractions.triggerHapticFeedback('medium');
    
    // Auto-adjust settings based on security level
    if (level === 'high') {
      setAllowScreenshots(false);
      setNotifyOnView(true);
    } else if (level === 'maximum') {
      setAllowScreenshots(false);
      setAllowCopy(false);
      setRequireBiometric(true);
      setRequireDeviceVerification(true);
      setNotifyOnView(true);
      setAutoDestructOnSuspicious(true);
    }
  };

  const handleConfirm = () => {
    if (selectedDuration <= 0) {
      Alert.alert('خطأ', 'يرجى اختيار مدة صالحة');
      return;
    }

    const policy: ExpirationPolicy = {
      type: 'time_based',
      duration: selectedDuration,
      maxViews,
      allowScreenshots,
      allowCopy,
      allowForward,
      notifyOnView,
      notifyOnExpiration,
      requireBiometricToView: requireBiometric,
      requireDeviceVerification,
      autoDestructOnSuspiciousActivity: autoDestructOnSuspicious,
      cascadeToReplies: false
    };

    MicroInteractions.triggerHapticFeedback('success');
    onConfirm(policy, securityLevel);
    onClose();
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    if (minutes > 0) return `${minutes} دقيقة`;
    return `${seconds} ثانية`;
  };

  const getSecurityLevelData = () => {
    return SECURITY_LEVELS.find(level => level.level === securityLevel)!;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }) },
                { scale: scaleAnim }
              ],
              opacity: slideAnim
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Timer size={24} color={Colors.primary} />
              <Text style={styles.title}>رسالة ذاتية التدمير</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.medium} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Duration Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ مدة الصلاحية</Text>
              <View style={styles.durationGrid}>
                {DURATION_PRESETS.map((preset, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.durationCard,
                      selectedDuration === preset.value && styles.selectedDurationCard
                    ]}
                    onPress={() => handleDurationSelect(preset.value)}
                  >
                    <Text style={styles.durationIcon}>{preset.icon}</Text>
                    <Text style={[
                      styles.durationLabel,
                      selectedDuration === preset.value && styles.selectedDurationLabel
                    ]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.selectedDurationDisplay}>
                <Clock size={16} color={Colors.primary} />
                <Text style={styles.selectedDurationText}>
                  ستنتهي صلاحية الرسالة خلال: {formatDuration(selectedDuration)}
                </Text>
              </View>
            </View>

            {/* Security Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛡️ مستوى الأمان</Text>
              {SECURITY_LEVELS.map((level, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.securityCard,
                    securityLevel === level.level && styles.selectedSecurityCard,
                    { borderColor: level.color }
                  ]}
                  onPress={() => handleSecurityLevelSelect(level.level)}
                >
                  <View style={styles.securityCardHeader}>
                    <View style={styles.securityCardLeft}>
                      <Text style={styles.securityIcon}>{level.icon}</Text>
                      <View>
                        <Text style={[
                          styles.securityTitle,
                          securityLevel === level.level && { color: level.color }
                        ]}>
                          {level.title}
                        </Text>
                        <Text style={styles.securityDescription}>
                          {level.description}
                        </Text>
                      </View>
                    </View>
                    {securityLevel === level.level && (
                      <Check size={20} color={level.color} />
                    )}
                  </View>
                  
                  <View style={styles.securityFeatures}>
                    {level.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <View style={[styles.featureDot, { backgroundColor: level.color }]} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Advanced Settings */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedToggleText}>
                {showAdvanced ? '🔽' : '▶️'} إعدادات متقدمة
              </Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚙️ إعدادات متقدمة</Text>
                
                {/* View Limit */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Eye size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>حد المشاهدات</Text>
                  </View>
                  <Switch
                    value={maxViews !== undefined}
                    onValueChange={(value) => setMaxViews(value ? 1 : undefined)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={maxViews !== undefined ? Colors.primary : Colors.medium}
                  />
                </View>

                {/* Screenshot Protection */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Shield size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>منع لقطات الشاشة</Text>
                  </View>
                  <Switch
                    value={!allowScreenshots}
                    onValueChange={(value) => setAllowScreenshots(!value)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={!allowScreenshots ? Colors.primary : Colors.medium}
                  />
                </View>

                {/* Copy Protection */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <AlertTriangle size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>منع النسخ</Text>
                  </View>
                  <Switch
                    value={!allowCopy}
                    onValueChange={(value) => setAllowCopy(!value)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={!allowCopy ? Colors.primary : Colors.medium}
                  />
                </View>

                {/* Forward Protection */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Zap size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>منع إعادة التوجيه</Text>
                  </View>
                  <Switch
                    value={!allowForward}
                    onValueChange={(value) => setAllowForward(!value)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={!allowForward ? Colors.primary : Colors.medium}
                  />
                </View>

                {/* Biometric Requirement */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Fingerprint size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>مطالبة بالمصادقة البيومترية</Text>
                  </View>
                  <Switch
                    value={requireBiometric}
                    onValueChange={setRequireBiometric}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={requireBiometric ? Colors.primary : Colors.medium}
                  />
                </View>

                {/* Device Verification */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Smartphone size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>التحقق من الجهاز</Text>
                  </View>
                  <Switch
                    value={requireDeviceVerification}
                    onValueChange={setRequireDeviceVerification}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={requireDeviceVerification ? Colors.primary : Colors.medium}
                  />
                </View>

                {/* View Notifications */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Eye size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>إشعار عند المشاهدة</Text>
                  </View>
                  <Switch
                    value={notifyOnView}
                    onValueChange={setNotifyOnView}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={notifyOnView ? Colors.primary : Colors.medium}
                  />
                </View>

                {/* Auto-destruct on suspicious activity */}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <AlertTriangle size={16} color={Colors.medium} />
                    <Text style={styles.settingLabel}>تدمير تلقائي عند نشاط مشبوه</Text>
                  </View>
                  <Switch
                    value={autoDestructOnSuspicious}
                    onValueChange={setAutoDestructOnSuspicious}
                    trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
                    thumbColor={autoDestructOnSuspicious ? Colors.primary : Colors.medium}
                  />
                </View>
              </View>
            )}

            {/* Warning */}
            <View style={styles.warningBox}>
              <AlertTriangle size={16} color="#FF8800" />
              <Text style={styles.warningText}>
                ⚠️ لا يمكن استرداد الرسائل ذاتية التدمير بعد انتهاء صلاحيتها
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Timer size={16} color="white" />
              <Text style={styles.confirmButtonText}>إنشاء رسالة</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDurationCard: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  durationIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.medium,
    textAlign: 'center',
  },
  selectedDurationLabel: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedDurationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
  },
  selectedDurationText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  securityCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedSecurityCard: {
    backgroundColor: Colors.secondary,
  },
  securityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  securityIcon: {
    fontSize: 24,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  securityDescription: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 2,
  },
  securityFeatures: {
    gap: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  featureText: {
    fontSize: 12,
    color: Colors.medium,
  },
  advancedToggle: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  advancedToggleText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.dark,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8800',
    marginTop: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#FF8800',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.medium,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});