import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { Globe, Bell, Lock, Moon, Wifi, Shield, Info, Eye } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import LanguageSelector from '@/components/LanguageSelector';
import PrivacyPolicyExplainer from '@/components/PrivacyPolicyExplainer';
import PrivacySettingsPanel from '@/components/PrivacySettingsPanel';

export default function SettingsScreen() {
  const { language } = useAuthStore();
  const t = translations[language];
  const [showPrivacyExplainer, setShowPrivacyExplainer] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  
  return (
    <>
      <Stack.Screen
        options={{
          title: t.settings,
          headerTitleStyle: {
            color: Colors.dark,
            fontWeight: '600',
          },
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.language}</Text>
          </View>
          <LanguageSelector />
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.notifications}</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>إشعارات الرسائل</Text>
            <Switch
              value={true}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>إشعارات المنشورات</Text>
            <Switch
              value={true}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>إشعارات المعاملات</Text>
            <Switch
              value={true}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t.privacy}</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>إظهار آخر ظهور</Text>
            <Switch
              value={false}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>إظهار قراءة الرسائل</Text>
            <Switch
              value={true}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>السماح بالبحث عن طريق رقم الهاتف</Text>
            <Switch
              value={true}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>

          {/* إعدادات الخصوصية المتقدمة */}
          <TouchableOpacity 
            style={styles.privacyButton}
            onPress={() => setShowPrivacySettings(true)}
          >
            <View style={styles.privacyButtonContent}>
              <Eye size={20} color={Colors.primary} />
              <View style={styles.privacyButtonText}>
                <Text style={styles.privacyButtonTitle}>إعدادات الخصوصية المتقدمة</Text>
                <Text style={styles.privacyButtonDescription}>
                  تحكم في البيانات المشاركة مع الخدمات الخارجية
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Moon size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>المظهر</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>الوضع الداكن</Text>
            <Switch
              value={false}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wifi size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>البيانات والتخزين</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>تنزيل الوسائط عبر Wi-Fi فقط</Text>
            <Switch
              value={true}
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor="white"
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>جودة تحميل الصور</Text>
            <Text style={styles.settingValue}>عالية</Text>
          </View>
        </View>

        {/* قسم الشفافية والخصوصية */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>الشفافية والخصوصية</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.transparencyButton}
            onPress={() => setShowPrivacyExplainer(true)}
          >
            <View style={styles.transparencyContent}>
              <Info size={20} color={Colors.primary} />
              <View style={styles.transparencyText}>
                <Text style={styles.transparencyTitle}>سياسة الخصوصية التفصيلية</Text>
                <Text style={styles.transparencyDescription}>
                  اعرف بالتفصيل كيف نستخدم بياناتك وما هي الخدمات الخارجية المستخدمة
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.transparencyStats}>
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

          <View style={styles.privacyHighlights}>
            <Text style={styles.highlightsTitle}>🔒 نقاط مهمة:</Text>
            <Text style={styles.highlightItem}>• لا نبيع بياناتك الشخصية أبداً</Text>
            <Text style={styles.highlightItem}>• معظم البيانات تبقى على جهازك</Text>
            <Text style={styles.highlightItem}>• يمكنك تعطيل الخدمات غير الضرورية</Text>
            <Text style={styles.highlightItem}>• شفافية كاملة في استخدام البيانات</Text>
          </View>
        </View>
      </ScrollView>

      {/* مودال سياسة الخصوصية التفصيلية */}
      <Modal
        visible={showPrivacyExplainer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PrivacyPolicyExplainer
          visible={showPrivacyExplainer}
          onClose={() => setShowPrivacyExplainer(false)}
        />
      </Modal>

      {/* مودال إعدادات الخصوصية */}
      <Modal
        visible={showPrivacySettings}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PrivacySettingsPanel
          onClose={() => setShowPrivacySettings(false)}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.dark,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.primary,
  },
  privacyButton: {
    marginTop: 12,
    padding: 16,
    backgroundColor: Colors.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  privacyButtonDescription: {
    fontSize: 14,
    color: Colors.medium,
    lineHeight: 18,
  },
  transparencyButton: {
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  transparencyContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transparencyText: {
    marginLeft: 12,
    flex: 1,
  },
  transparencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  transparencyDescription: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 18,
  },
  transparencyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
  privacyHighlights: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  highlightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  highlightItem: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 4,
  },
});