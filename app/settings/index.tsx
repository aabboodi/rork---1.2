import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, MessageCircle, Wallet, Users, Shield, Globe, Moon, Sun, Languages, Database, Info, HelpCircle, LogOut } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';

export default function GlobalSettingsScreen() {
    const router = useRouter();
    const { language, setLanguage } = useAuthStore();
    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');

    const handleLanguageChange = () => {
        Alert.alert(
            'اختر اللغة',
            '',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'العربية',
                    onPress: () => {
                        setLanguage('ar');
                        Alert.alert('تم', 'تم تغيير اللغة إلى العربية');
                    },
                },
                {
                    text: 'English',
                    onPress: () => {
                        setLanguage('en');
                        Alert.alert('Done', 'Language changed to English');
                    },
                },
            ]
        );
    };

    const handleThemeChange = () => {
        Alert.alert(
            'اختر المظهر',
            '',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'فاتح',
                    onPress: () => {
                        setTheme('light');
                        Alert.alert('تم', 'تم تغيير المظهر إلى الفاتح');
                    },
                },
                {
                    text: 'داكن',
                    onPress: () => {
                        setTheme('dark');
                        Alert.alert('تم', 'تم تغيير المظهر إلى الداكن');
                    },
                },
                {
                    text: 'تلقائي',
                    onPress: () => {
                        setTheme('auto');
                        Alert.alert('تم', 'سيتغير المظهر حسب إعدادات النظام');
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'تسجيل الخروج',
            'هل أنت متأكد من تسجيل الخروج؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'تسجيل الخروج',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('تم', 'تم تسجيل الخروج بنجاح');
                        // In production: clear auth state and navigate to login
                    },
                },
            ]
        );
    };

    const renderSettingCategory = (
        icon: React.ReactNode,
        title: string,
        description: string,
        onPress: () => void,
        color = Colors.primary,
        badge?: string
    ) => (
        <TouchableOpacity style={styles.categoryItem} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{title}</Text>
                <Text style={styles.categoryDescription}>{description}</Text>
            </View>
            {badge && (
                <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderActionItem = (
        icon: React.ReactNode,
        title: string,
        value: string,
        onPress: () => void,
        color = Colors.primary
    ) => (
        <TouchableOpacity style={styles.actionItem} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{title}</Text>
                <Text style={styles.actionValue}>{value}</Text>
            </View>
        </TouchableOpacity>
    );

    const getThemeLabel = (): string => {
        if (theme === 'light') return 'فاتح';
        if (theme === 'dark') return 'داكن';
        return 'تلقائي';
    };

    const getLanguageLabel = (): string => {
        return language === 'ar' ? 'العربية' : 'English';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Settings size={32} color={Colors.primary} />
                <Text style={styles.headerTitle}>الإعدادات</Text>
                <Text style={styles.headerSubtitle}>إدارة جميع إعدادات التطبيق</Text>
            </View>

            {/* Main Settings Categories */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>فئات الإعدادات</Text>

                {renderSettingCategory(
                    <MessageCircle size={24} color={Colors.primary} />,
                    'إعدادات الدردشة',
                    'E2EE، DLP، الإشعارات، والخصوصية',
                    () => router.push('/settings/chat'),
                    Colors.primary
                )}

                {renderSettingCategory(
                    <Wallet size={24} color={Colors.accent} />,
                    'إعدادات المحفظة',
                    'الأمان، التوقيع المتعدد، وحدود المعاملات',
                    () => router.push('/settings/wallet'),
                    Colors.accent
                )}

                {renderSettingCategory(
                    <Users size={24} color={Colors.success} />,
                    'إعدادات الشبكة الاجتماعية',
                    'خوارزمية الخلاصة، التفاعلات، والفيديو',
                    () => router.push('/settings/social'),
                    Colors.success
                )}

                {renderSettingCategory(
                    <Shield size={24} color={Colors.warning} />,
                    'إعدادات الخصوصية',
                    'ABAC، جمع البيانات، ومشاركة الجهات الخارجية',
                    () => router.push('/settings/privacy'),
                    Colors.warning,
                    'مهم'
                )}
            </View>

            {/* Appearance */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>المظهر واللغة</Text>

                {renderActionItem(
                    theme === 'dark' ? <Moon size={24} color={Colors.primary} /> : <Sun size={24} color={Colors.primary} />,
                    'المظهر',
                    getThemeLabel(),
                    handleThemeChange
                )}

                {renderActionItem(
                    <Languages size={24} color={Colors.accent} />,
                    'اللغة',
                    getLanguageLabel(),
                    handleLanguageChange,
                    Colors.accent
                )}
            </View>

            {/* Data & Storage */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>البيانات والتخزين</Text>

                {renderSettingCategory(
                    <Database size={24} color={Colors.medium} />,
                    'إدارة البيانات',
                    'مسح الذاكرة المؤقتة والبيانات المخزنة',
                    () => {
                        Alert.alert(
                            'مسح البيانات',
                            'اختر ما تريد مسحه:',
                            [
                                { text: 'إلغاء', style: 'cancel' },
                                {
                                    text: 'مسح الذاكرة المؤقتة',
                                    onPress: () => Alert.alert('تم', 'تم مسح الذاكرة المؤقتة'),
                                },
                                {
                                    text: 'مسح جميع البيانات',
                                    style: 'destructive',
                                    onPress: () => Alert.alert('تحذير', 'سيتم مسح جميع البيانات المخزنة'),
                                },
                            ]
                        );
                    },
                    Colors.medium
                )}

                {renderSettingCategory(
                    <Globe size={24} color={Colors.primary} />,
                    'استخدام الشبكة',
                    'توفير البيانات وإعدادات التنزيل',
                    () => Alert.alert('قريباً', 'هذه الميزة قيد التطوير'),
                    Colors.primary
                )}
            </View>

            {/* About & Help */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>حول التطبيق والمساعدة</Text>

                {renderSettingCategory(
                    <Info size={24} color={Colors.success} />,
                    'حول التطبيق',
                    'الإصدار 1.2.0 • بناء رقم 100',
                    () => {
                        Alert.alert(
                            'Mada Super App',
                            'الإصدار 1.2.0\nبناء رقم: 100\n\n' +
                            '© 2025 Mada Technologies\n' +
                            'جميع الحقوق محفوظة\n\n' +
                            'تطبيق فائق متكامل مع أمان عسكري\n' +
                            'E2EE • Multi-Sig • Offline-First'
                        );
                    },
                    Colors.success
                )}

                {renderSettingCategory(
                    <HelpCircle size={24} color={Colors.accent} />,
                    'المساعدة والدعم',
                    'الأسئلة الشائعة والتواصل مع الدعم',
                    () => Alert.alert('المساعدة', 'سيتم فتح مركز المساعدة قريباً'),
                    Colors.accent
                )}
            </View>

            {/* Account Actions */}
            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <LogOut size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>تسجيل الخروج</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Built with ❤️ in Saudi Arabia
                </Text>
                <Text style={styles.footerVersion}>v1.2.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: Colors.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.dark,
        marginTop: 12,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.medium,
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.medium,
        textTransform: 'uppercase',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryContent: {
        flex: 1,
    },
    actionContent: {
        flex: 1,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.dark,
        marginBottom: 4,
    },
    categoryDescription: {
        fontSize: 13,
        color: Colors.medium,
        lineHeight: 18,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.dark,
        marginBottom: 4,
    },
    actionValue: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: 'white',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.error + '15',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.error + '30',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.error,
        marginLeft: 8,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    footerText: {
        fontSize: 14,
        color: Colors.medium,
        marginBottom: 4,
    },
    footerVersion: {
        fontSize: 12,
        color: Colors.medium,
    },
});
