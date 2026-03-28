import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { Bell, Shield, Database, Palette, Settings as SettingsIcon, MessageCircle, Eye, Lock, Users, Info } from 'lucide-react-native';
import Colors from '@/constants/colors';
import PrivacyPolicyExplainer from './PrivacyPolicyExplainer';

interface SocialSettingsProps {
  onClose: () => void;
}

export default function SocialSettings({ onClose }: SocialSettingsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [likesNotifications, setLikesNotifications] = useState(true);
  const [commentsNotifications, setCommentsNotifications] = useState(true);
  const [messagesNotifications, setMessagesNotifications] = useState(true);
  const [followNotifications, setFollowNotifications] = useState(true);
  
  const [profileVisibility, setProfileVisibility] = useState('friends'); // 'public', 'friends', 'private'
  const [storyVisibility, setStoryVisibility] = useState('friends');
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  
  const [dataCollection, setDataCollection] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('ar');
  
  const [socialChatEnabled, setSocialChatEnabled] = useState(true);
  const [storyComments, setStoryComments] = useState(true);
  const [privateMessages, setPrivateMessages] = useState(true);

  const [showPrivacyExplainer, setShowPrivacyExplainer] = useState(false);
  const [selectedPrivacyService, setSelectedPrivacyService] = useState<string | undefined>();

  const handleSave = () => {
    Alert.alert('تم الحفظ', 'تم حفظ جميع الإعدادات بنجاح');
    onClose();
  };

  const handlePrivacyInfo = (serviceId: string) => {
    setSelectedPrivacyService(serviceId);
    setShowPrivacyExplainer(true);
  };

  const renderSection = (title: string, icon: React.ReactNode, children: React.ReactNode, serviceId?: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
        {serviceId && (
          <TouchableOpacity 
            onPress={() => handlePrivacyInfo(serviceId)}
            style={styles.infoButton}
          >
            <Info size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );

  const renderSetting = (
    title: string, 
    description: string, 
    value: boolean, 
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
        thumbColor={value ? Colors.primary : Colors.medium}
      />
    </View>
  );

  const renderChoice = (
    title: string,
    options: { label: string; value: string }[],
    currentValue: string,
    onValueChange: (value: string) => void
  ) => (
    <View style={styles.choiceItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <View style={styles.choiceOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.choiceOption,
              currentValue === option.value && styles.choiceOptionActive
            ]}
            onPress={() => onValueChange(option.value)}
          >
            <Text style={[
              styles.choiceOptionText,
              currentValue === option.value && styles.choiceOptionTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelButton}>إلغاء</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>حفظ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSection(
          'الإشعارات',
          <Bell size={20} color={Colors.primary} />,
          <>
            {renderSetting(
              'تفعيل الإشعارات',
              'تلقي إشعارات من التطبيق',
              notificationsEnabled,
              setNotificationsEnabled
            )}
            {notificationsEnabled && (
              <>
                {renderSetting(
                  'إشعارات الإعجابات',
                  'عندما يعجب أحد بمنشورك',
                  likesNotifications,
                  setLikesNotifications
                )}
                {renderSetting(
                  'إشعارات التعليقات',
                  'عندما يعلق أحد على منشورك',
                  commentsNotifications,
                  setCommentsNotifications
                )}
                {renderSetting(
                  'إشعارات الرسائل',
                  'عندما تتلقى رسالة جديدة',
                  messagesNotifications,
                  setMessagesNotifications
                )}
                {renderSetting(
                  'إشعارات المتابعة',
                  'عندما يتابعك أحد',
                  followNotifications,
                  setFollowNotifications
                )}
              </>
            )}
            <View style={styles.privacyNote}>
              <Info size={14} color={Colors.medium} />
              <Text style={styles.privacyNoteText}>
                الإشعارات تستخدم خدمة Expo Push Notifications
              </Text>
              <TouchableOpacity onPress={() => handlePrivacyInfo('expo_notifications')}>
                <Text style={styles.privacyNoteLink}>اعرف المزيد</Text>
              </TouchableOpacity>
            </View>
          </>,
          'expo_notifications'
        )}

        {renderSection(
          'الخصوصية',
          <Shield size={20} color={Colors.primary} />,
          <>
            {renderChoice(
              'رؤية الملف الشخصي',
              [
                { label: 'عام', value: 'public' },
                { label: 'الأصدقاء', value: 'friends' },
                { label: 'خاص', value: 'private' }
              ],
              profileVisibility,
              setProfileVisibility
            )}
            {renderChoice(
              'رؤية القصص',
              [
                { label: 'عام', value: 'public' },
                { label: 'الأصدقاء', value: 'friends' },
                { label: 'خاص', value: 'private' }
              ],
              storyVisibility,
              setStoryVisibility
            )}
            {renderSetting(
              'إظهار الحالة النشطة',
              'السماح للآخرين برؤية وقت آخر ظهور لك',
              onlineStatus,
              setOnlineStatus
            )}
            {renderSetting(
              'إيصالات القراءة',
              'إظهار متى قرأت الرسائل',
              readReceipts,
              setReadReceipts
            )}
            <View style={styles.privacyNote}>
              <Lock size={14} color={Colors.success} />
              <Text style={styles.privacyNoteText}>
                بيانات الخصوصية محفوظة محلياً بتشفير آمن
              </Text>
              <TouchableOpacity onPress={() => handlePrivacyInfo('expo_secure_store')}>
                <Text style={styles.privacyNoteLink}>أمان البيانات</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {renderSection(
          'الأمان',
          <Lock size={20} color={Colors.primary} />,
          <>
            <TouchableOpacity style={styles.actionItem}>
              <Text style={styles.actionTitle}>تغيير كلمة المرور</Text>
              <Text style={styles.actionDescription}>تحديث كلمة مرور حسابك</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Text style={styles.actionTitle}>المصادقة الثنائية</Text>
              <Text style={styles.actionDescription}>تأمين إضافي لحسابك</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Text style={styles.actionTitle}>الجلسات النشطة</Text>
              <Text style={styles.actionDescription}>إدارة الأجهزة المتصلة</Text>
            </TouchableOpacity>
            <View style={styles.privacyNote}>
              <Eye size={14} color={Colors.primary} />
              <Text style={styles.privacyNoteText}>
                المصادقة البيومترية تستخدم Expo Local Authentication
              </Text>
              <TouchableOpacity onPress={() => handlePrivacyInfo('expo_biometrics')}>
                <Text style={styles.privacyNoteLink}>معلومات الأمان</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {renderSection(
          'البيانات والتخزين',
          <Database size={20} color={Colors.primary} />,
          <>
            {renderSetting(
              'جمع البيانات',
              'السماح بجمع بيانات الاستخدام لتحسين التطبيق',
              dataCollection,
              setDataCollection
            )}
            {renderSetting(
              'التخصيص',
              'استخدام بياناتك لتخصيص المحتوى',
              personalization,
              setPersonalization
            )}
            {renderSetting(
              'التحليلات',
              'مشاركة بيانات مجهولة للتحليل',
              analytics,
              setAnalytics
            )}
            <TouchableOpacity style={styles.actionItem}>
              <Text style={styles.actionTitle}>تصدير البيانات</Text>
              <Text style={styles.actionDescription}>تحميل نسخة من بياناتك</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Text style={[styles.actionTitle, { color: Colors.error }]}>حذف الحساب</Text>
              <Text style={styles.actionDescription}>حذف حسابك وجميع بياناتك نهائياً</Text>
            </TouchableOpacity>
            <View style={styles.privacyNote}>
              <Database size={14} color={Colors.medium} />
              <Text style={styles.privacyNoteText}>
                التحليلات تستخدم خدمات مجهولة ومشفرة
              </Text>
              <TouchableOpacity onPress={() => handlePrivacyInfo('analytics_services')}>
                <Text style={styles.privacyNoteLink}>سياسة التحليلات</Text>
              </TouchableOpacity>
            </View>
          </>,
          'analytics_services'
        )}

        {renderSection(
          'المظهر',
          <Palette size={20} color={Colors.primary} />,
          <>
            {renderSetting(
              'الوضع الليلي',
              'استخدام المظهر الداكن',
              darkMode,
              setDarkMode
            )}
            {renderChoice(
              'اللغة',
              [
                { label: 'العربية', value: 'ar' },
                { label: 'English', value: 'en' }
              ],
              language,
              setLanguage
            )}
            <View style={styles.privacyNote}>
              <Palette size={14} color={Colors.medium} />
              <Text style={styles.privacyNoteText}>
                إعدادات المظهر محفوظة محلياً فقط
              </Text>
            </View>
          </>
        )}

        {renderSection(
          'المحادثات الاجتماعية',
          <MessageCircle size={20} color={Colors.primary} />,
          <>
            {renderSetting(
              'تفعيل المحادثات الاجتماعية',
              'السماح بالمحادثات في قسم التواصل الاجتماعي',
              socialChatEnabled,
              setSocialChatEnabled
            )}
            {socialChatEnabled && (
              <>
                {renderSetting(
                  'التعليق على القصص',
                  'السماح للآخرين بالتعليق على قصصك',
                  storyComments,
                  setStoryComments
                )}
                {renderSetting(
                  'الرسائل الخاصة',
                  'السماح بإرسال رسائل خاصة من التواصل الاجتماعي',
                  privateMessages,
                  setPrivateMessages
                )}
              </>
            )}
            <View style={styles.privacyNote}>
              <MessageCircle size={14} color={Colors.primary} />
              <Text style={styles.privacyNoteText}>
                الرسائل محمية بتشفير من طرف إلى طرف
              </Text>
              <TouchableOpacity onPress={() => handlePrivacyInfo('expo_crypto')}>
                <Text style={styles.privacyNoteLink}>تفاصيل التشفير</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {renderSection(
          'متقدم',
          <SettingsIcon size={20} color={Colors.primary} />,
          <>
            <TouchableOpacity style={styles.actionItem}>
              <Text style={styles.actionTitle}>مسح التخزين المؤقت</Text>
              <Text style={styles.actionDescription}>حذف الملفات المؤقتة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Text style={styles.actionTitle}>إعادة تعيين الإعدادات</Text>
              <Text style={styles.actionDescription}>استعادة الإعدادات الافتراضية</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => setShowPrivacyExplainer(true)}
            >
              <Text style={styles.actionTitle}>سياسة الخصوصية الكاملة</Text>
              <Text style={styles.actionDescription}>عرض جميع الخدمات الخارجية المستخدمة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Text style={styles.actionTitle}>حول التطبيق</Text>
              <Text style={styles.actionDescription}>معلومات الإصدار والدعم</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ملخص الخصوصية */}
        <View style={styles.privacySummary}>
          <Text style={styles.privacySummaryTitle}>🔒 ملخص الخصوصية</Text>
          <View style={styles.privacyStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>9</Text>
              <Text style={styles.statLabel}>خدمات خارجية</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>قابلة للتعطيل</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>محلية فقط</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.fullPrivacyButton}
            onPress={() => setShowPrivacyExplainer(true)}
          >
            <Text style={styles.fullPrivacyButtonText}>عرض التفاصيل الكاملة</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Privacy Policy Explainer Modal */}
      <Modal
        visible={showPrivacyExplainer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PrivacyPolicyExplainer
          visible={showPrivacyExplainer}
          onClose={() => {
            setShowPrivacyExplainer(false);
            setSelectedPrivacyService(undefined);
          }}
          service={selectedPrivacyService}
        />
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.secondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 8,
    flex: 1,
  },
  infoButton: {
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.medium,
  },
  choiceItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  choiceOptions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  choiceOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    marginRight: 8,
  },
  choiceOptionActive: {
    backgroundColor: Colors.primary,
  },
  choiceOptionText: {
    fontSize: 14,
    color: Colors.medium,
  },
  choiceOptionTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  actionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionTitle: {
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.medium,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: Colors.light,
    borderRadius: 8,
    gap: 8,
  },
  privacyNoteText: {
    fontSize: 12,
    color: Colors.medium,
    flex: 1,
  },
  privacyNoteLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  privacySummary: {
    margin: 16,
    padding: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  privacySummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 16,
    textAlign: 'center',
  },
  privacyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.medium,
    textAlign: 'center',
  },
  fullPrivacyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullPrivacyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});