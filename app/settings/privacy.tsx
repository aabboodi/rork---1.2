import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Shield, Eye, Lock, Users, Database, Globe, FileText, AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function PrivacySettingsScreen() {
    // ABAC (Attribute-Based Access Control) Settings
    const [abacEnabled, setAbacEnabled] = useState(true);
    const [requireLocationForSensitive, setRequireLocationForSensitive] = useState(false);
    const [requireDeviceVerification, setRequireDeviceVerification] = useState(true);
    const [requireTimeBasedAccess, setRequireTimeBasedAccess] = useState(false);

    // Data Collection Settings
    const [allowBehaviorTracking, setAllowBehaviorTracking] = useState(true);
    const [allowLocationTracking, setAllowLocationTracking] = useState(false);
    const [allowUsageAnalytics, setAllowUsageAnalytics] = useState(true);
    const [allowCrashReports, setAllowCrashReports] = useState(true);

    // Third-Party Sharing
    const [shareWithAnalytics, setShareWithAnalytics] = useState(true);
    const [shareWithAdvertisers, setShareWithAdvertisers] = useState(false);
    const [shareWithPartners, setShareWithPartners] = useState(false);

    // Account Privacy
    const [privateAccount, setPrivateAccount] = useState(false);
    const [hidePhoneNumber, setHidePhoneNumber] = useState(true);
    const [hideEmail, setHideEmail] = useState(true);
    const [hideOnlineStatus, setHideOnlineStatus] = useState(false);

    // Personal Data Access
    const [whoCanSeeProfile, setWhoCanSeeProfile] = useState('everyone'); // everyone, friends, nobody
    const [whoCanSendMessages, setWhoCanSendMessages] = useState('everyone');
    const [whoCanSeePosts, setWhoCanSeePosts] = useState('everyone');

    const handleExportData = () => {
        Alert.alert(
            'تصدير البيانات',
            'سيتم إرسال نسخة من جميع بياناتك إلى بريدك الإلكتروني خلال 24 ساعة.',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'تصدير',
                    onPress: () => {
                        Alert.alert('تم', 'سيتم إرسال البيانات قريباً');
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'حذف الحساب',
            'تحذير: هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك بشكل دائم.',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'حذف الحساب',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('تأكيد', 'هل أنت متأكد تماماً؟', [
                            { text: 'إلغاء', style: 'cancel' },
                            {
                                text: 'نعم، احذف حسابي',
                                style: 'destructive',
                                onPress: () => {
                                    Alert.alert('قريباً', 'سيتم تفعيل هذه الميزة قريباً');
                                },
                            },
                        ]);
                    },
                },
            ]
        );
    };

    const renderSettingItem = (
        icon: React.ReactNode,
        title: string,
        description: string,
        value: boolean,
        onValueChange: (value: boolean) => void,
        color = Colors.primary
    ) => (
        <View style={styles.settingItem}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: Colors.border, true: color + '50' }}
                thumbColor={value ? color : Colors.medium}
            />
        </View>
    );

    const renderChoiceItem = (
        icon: React.ReactNode,
        title: string,
        description: string,
        currentChoice: string,
        onPress: () => void,
        color = Colors.primary
    ) => (
        <TouchableOpacity style={styles.choiceItem} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.choiceContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingDescription}>{description}</Text>
                <Text style={styles.currentChoice}>{currentChoice}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderSection = (title: string, children: React.ReactNode) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );

    const handleChoiceChange = (setting: string) => {
        Alert.alert(
            'اختر من يمكنه',
            '',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'الجميع',
                    onPress: () => {
                        if (setting === 'profile') setWhoCanSeeProfile('everyone');
                        else if (setting === 'messages') setWhoCanSendMessages('everyone');
                        else if (setting === 'posts') setWhoCanSeePosts('everyone');
                    },
                },
                {
                    text: 'الأصدقاء فقط',
                    onPress: () => {
                        if (setting === 'profile') setWhoCanSeeProfile('friends');
                        else if (setting === 'messages') setWhoCanSendMessages('friends');
                        else if (setting === 'posts') setWhoCanSeePosts('friends');
                    },
                },
                {
                    text: 'لا أحد',
                    onPress: () => {
                        if (setting === 'profile') setWhoCanSeeProfile('nobody');
                        else if (setting === 'messages') setWhoCanSendMessages('nobody');
                        else if (setting === 'posts') setWhoCanSeePosts('nobody');
                    },
                },
            ]
        );
    };

    const getChoiceLabel = (choice: string): string => {
        if (choice === 'everyone') return 'الجميع';
        if (choice === 'friends') return 'الأصدقاء فقط';
        if (choice === 'nobody') return 'لا أحد';
        return choice;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Shield size={32} color={Colors.primary} />
                <Text style={styles.headerTitle}>إعدادات الخصوصية</Text>
                <Text style={styles.headerSubtitle}>التحكم في بياناتك ومن يمكنه الوصول للمحتوى</Text>
            </View>

            {/* ABAC Settings */}
            {renderSection(
                'التحكم في الوصول (ABAC)',
                <>
                    {renderSettingItem(
                        <Shield size={20} color={Colors.primary} />,
                        'تفعيل ABAC',
                        'التحكم الديناميكي في الوصول حسب السياق',
                        abacEnabled,
                        setAbacEnabled
                    )}
                    {renderSettingItem(
                        <Globe size={20} color={Colors.warning} />,
                        'التحقق من الموقع',
                        'طلب موقع محدد للوصول للمحتوى الحساس',
                        requireLocationForSensitive,
                        setRequireLocationForSensitive,
                        Colors.warning
                    )}
                    {renderSettingItem(
                        <Lock size={20} color={Colors.error} />,
                        'التحقق من الجهاز',
                        'السماح فقط للأجهزة الموثوقة',
                        requireDeviceVerification,
                        setRequireDeviceVerification,
                        Colors.error
                    )}
                    {renderSettingItem(
                        <AlertTriangle size={20} color={Colors.warning} />,
                        'الوصول الزمني',
                        'تقييد الوصول حسب الوقت',
                        requireTimeBasedAccess,
                        setRequireTimeBasedAccess,
                        Colors.warning
                    )}
                </>
            )}

            {/* Data Collection */}
            {renderSection(
                'جمع البيانات',
                <>
                    {renderSettingItem(
                        <Database size={20} color={Colors.accent} />,
                        'تتبع السلوك',
                        'تحسين التوصيات بناءً على استخدامك',
                        allowBehaviorTracking,
                        setAllowBehaviorTracking,
                        Colors.accent
                    )}
                    {renderSettingItem(
                        <Globe size={20} color={Colors.warning} />,
                        'تتبع الموقع',
                        'استخدام موقعك لتحسين التجربة',
                        allowLocationTracking,
                        setAllowLocationTracking,
                        Colors.warning
                    )}
                    {renderSettingItem(
                        <Database size={20} color={Colors.success} />,
                        'تحليلات الاستخدام',
                        'جمع بيانات مجهولة عن استخدام التطبيق',
                        allowUsageAnalytics,
                        setAllowUsageAnalytics,
                        Colors.success
                    )}
                    {renderSettingItem(
                        <AlertTriangle size={20} color={Colors.medium} />,
                        'تقارير الأعطال',
                        'إرسال تقارير تلقائية عند حدوث خطأ',
                        allowCrashReports,
                        setAllowCrashReports,
                        Colors.medium
                    )}
                </>
            )}

            {/* Third-Party Sharing */}
            {renderSection(
                'المشاركة مع جهات خارجية',
                <>
                    {renderSettingItem(
                        <Database size={20} color={Colors.primary} />,
                        'خدمات التحليلات',
                        'مشاركة بيانات مجهولة مع Google Analytics',
                        shareWithAnalytics,
                        setShareWithAnalytics
                    )}
                    {renderSettingItem(
                        <Users size={20} color={Colors.error} />,
                        'المعلنين',
                        'مشاركة البيانات لإعلانات مخصصة',
                        shareWithAdvertisers,
                        setShareWithAdvertisers,
                        Colors.error
                    )}
                    {renderSettingItem(
                        <Globe size={20} color={Colors.warning} />,
                        'الشركاء',
                        'مشاركة البيانات مع شركاء موثوقين',
                        shareWithPartners,
                        setShareWithPartners,
                        Colors.warning
                    )}
                </>
            )}

            {/* Account Privacy */}
            {renderSection(
                'خصوصية الحساب',
                <>
                    {renderSettingItem(
                        <Lock size={20} color={Colors.primary} />,
                        'حساب خاص',
                        'طلب الموافقة على طلبات المتابعة',
                        privateAccount,
                        setPrivateAccount
                    )}
                    {renderSettingItem(
                        <Eye size={20} color={Colors.medium} />,
                        'إخفاء رقم الهاتف',
                        'عدم إظهار رقم هاتفك للآخرين',
                        hidePhoneNumber,
                        setHidePhoneNumber,
                        Colors.medium
                    )}
                    {renderSettingItem(
                        <Eye size={20} color={Colors.medium} />,
                        'إخفاء البريد الإلكتروني',
                        'عدم إظهار بريدك للآخرين',
                        hideEmail,
                        setHideEmail,
                        Colors.medium
                    )}
                    {renderSettingItem(
                        <Eye size={20} color={Colors.success} />,
                        'إخفاء حالة الاتصال',
                        'عدم إظهار متى كنت متصلاً',
                        hideOnlineStatus,
                        setHideOnlineStatus,
                        Colors.success
                    )}
                </>
            )}

            {/* Personal Data Access */}
            {renderSection(
                'من يمكنه الوصول',
                <>
                    {renderChoiceItem(
                        <Eye size={20} color={Colors.primary} />,
                        'عرض الملف الشخصي',
                        'من يمكنه رؤية ملفك الشخصي',
                        getChoiceLabel(whoCanSeeProfile),
                        () => handleChoiceChange('profile')
                    )}
                    {renderChoiceItem(
                        <Users size={20} color={Colors.accent} />,
                        'إرسال الرسائل',
                        'من يمكنه إرسال رسائل لك',
                        getChoiceLabel(whoCanSendMessages),
                        () => handleChoiceChange('messages'),
                        Colors.accent
                    )}
                    {renderChoiceItem(
                        <FileText size={20} color={Colors.success} />,
                        'رؤية المنشورات',
                        'من يمكنه رؤية منشوراتك',
                        getChoiceLabel(whoCanSeePosts),
                        () => handleChoiceChange('posts'),
                        Colors.success
                    )}
                </>
            )}

            {/* Data Management */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>إدارة البيانات</Text>

                <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
                    <Database size={20} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>تصدير جميع بياناتي</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={handleDeleteAccount}
                >
                    <AlertTriangle size={20} color={Colors.error} />
                    <Text style={[styles.actionButtonText, styles.dangerText]}>حذف الحساب نهائياً</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer} />
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
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    choiceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    choiceContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.dark,
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        color: Colors.medium,
        lineHeight: 18,
    },
    currentChoice: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
        marginTop: 6,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.dark,
        marginLeft: 12,
    },
    dangerButton: {
        backgroundColor: Colors.error + '10',
        borderWidth: 1,
        borderColor: Colors.error + '30',
    },
    dangerText: {
        color: Colors.error,
    },
    footer: {
        height: 40,
    },
});
