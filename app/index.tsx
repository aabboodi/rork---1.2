import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { translations } from '@/constants/i18n';
import { Phone, Shield, Key } from 'lucide-react-native';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, language } = useAuthStore();
  const { colors } = useThemeStore();
  const t = translations[language];

  useEffect(() => {
    // If user is already authenticated, redirect to main app
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    router.push('/auth/otp');
  };

  const handleSecurityInfo = () => {
    Alert.alert(
      'Security Features',
      'مدى يوفر أعلى مستويات الأمان:\n\n🔐 تشفير من طرف إلى طرف\n🛡️ حماية البيانات الحساسة\n🔑 إدارة المفاتيح المتقدمة\n📱 حماية الجهاز والجلسة\n🚨 كشف التهديدات الأمنية',
      [{ text: 'موافق' }]
    );
  };

  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>مرحباً بك في مدى</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            تطبيق التواصل والمحفظة الرقمية الآمن
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Shield size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>أمان متقدم</Text>
          </View>
          <View style={styles.feature}>
            <Key size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>تشفير قوي</Text>
          </View>
          <View style={styles.feature}>
            <Phone size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>سهولة الاستخدام</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: colors.primary }]} 
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.securityButton, { borderColor: colors.border }]} 
            onPress={handleSecurityInfo}
          >
            <Shield size={20} color={colors.primary} />
            <Text style={[styles.securityButtonText, { color: colors.primary }]}>معلومات الأمان</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    marginBottom: 48,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  actions: {
    gap: 16,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  securityButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});