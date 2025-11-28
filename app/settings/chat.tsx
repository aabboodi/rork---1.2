import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Shield, Bell, Download, Archive, Trash2, Eye, EyeOff, Clock, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function ChatSettingsScreen() {
    const router = useRouter();

    // E2EE Settings
    const [e2eeEnabled, setE2eeEnabled] = useState(true);
    const [autoKeyRotation, setAutoKeyRotation] = useState(true);
    const [verifyContacts, setVerifyContacts] = useState(true);

    // DLP Settings
    const [dlpEnabled, setDlpEnabled] = useState(true);
    const [dlpStrictMode, setDlpStrictMode] = useState(false);
    const [scanMediaContent, setScanMediaContent] = useState(true);

    // Privacy Settings
    const [readReceipts, setReadReceipts] = useState(true);
    const [typingIndicators, setTypingIndicators] = useState(true);
    const [lastSeen, setLastSeen] = useState(true);

    // Notification Settings
    const [messageNotifications, setMessageNotifications] = useState(true);
    const [groupNotifications, setGroupNotifications] = useState(true);
    const [channelNotifications, setChannelNotifications] = useState(false);

    // Media Settings
    const [autoDownloadPhotos, setAutoDownloadPhotos] = useState(true);
    const [autoDownloadVideos, setAutoDownloadVideos] = useState(false);
    const [autoDownloadDocuments, setAutoDownloadDocuments] = useState(false);

    // Message Settings
    const [messageExpiration, setMessageExpiration] = useState(false);
    const [expirationDays, setExpirationDays] = useState(30);

    const handleResetSettings = () => {
        Alert.alert(
            'إعادة تعيين الإعدادات',
            'هل أنت متأكد من إعادة تعيين جميع إعدادات الدردشة إلى الوضع الافتراضي؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'إعادة تعيين',
                    style: 'destructive',
                    onPress: () => {
                        // Reset all settings to defaults
                        setE2eeEnabled(true);
                        setAutoKeyRotation(true);
                        setVerifyContacts(true);
                        setDlpEnabled(true);
                        setDlpStrictMode(false);
                        setScanMediaContent(true);
                        setReadReceipts(true);
                        setTypingIndicators(true);
                        setLastSeen(true);
                        setMessageNotifications(true);
                        setGroupNotifications(true);
                        setChannelNotifications(false);
                        setAutoDownloadPhotos(true);
                        setAutoDownloadVideos(false);
                        setAutoDownloadDocuments(false);
                        setMessageExpiration(false);
                        Alert.alert('تم', 'تم إعادة تعيين الإعدادات بنجاح');
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

    const renderSection = (title: string, children: React.ReactNode) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <MessageCircle size={32} color={Colors.primary} />
                <Text style={styles.headerTitle}>إعدادات الدردشة</Text>
                <Text style={styles.headerSubtitle}>إدارة تفضيلات المحادثات والأمان</Text>
            </View>

            {/* E2EE Settings */}
            {renderSection(
                'التشفير من طرف إلى طرف (E2EE)',
                <>
                    {renderSettingItem(
                        <Shield size={20} color={Colors.primary} />,
                        'تفعيل E2EE',
                        'تشفير جميع الرسائل بشكل تلقائي',
                        e2eeEnabled,
                        setE2eeEnabled
                    )}
                    {renderSettingItem(
                        <Clock size={20} color={Colors.primary} />,
                        'تدوير المفاتيح التلقائي',
                        'تحديث مفاتيح التشفير بشكل دوري',
                        autoKeyRotation,
                        setAutoKeyRotation
                    )}
                    {renderSettingItem(
                        <Check size={20} color={Colors.primary} />,
                        'التحقق من جهات الاتصال',
                        'طلب التحقق من المفاتيح للمحادثات الجديدة',
                        verifyContacts,
                        setVerifyContacts
                    )}
                </>
            )}

            {/* DLP Settings */}
            {renderSection(
                'منع فقدان البيانات (DLP)',
                <>
                    {renderSettingItem(
                        <Shield size={20} color={Colors.warning} />,
                        'تفعيل DLP',
                        'فحص المحتوى الحساس قبل الإرسال',
                        dlpEnabled,
                        setDlpEnabled,
                        Colors.warning
                    )}
                    {renderSettingItem(
                        <Shield size={20} color={Colors.error} />,
                        'الوضع الصارم',
                        'حظر إرسال المحتوى الحساس بالكامل',
                        dlpStrictMode,
                        setDlpStrictMode,
                        Colors.error
                    )}
                    {renderSettingItem(
                        <Eye size={20} color={Colors.warning} />,
                        'فحص محتوى الميديا',
                        'فحص الصور والفيديوهات باستخدام OCR',
                        scanMediaContent,
                        setScanMediaContent,
                        Colors.warning
                    )}
                </>
            )}

            {/* Privacy Settings */}
            {renderSection(
                'الخصوصية',
                <>
                    {renderSettingItem(
                        <Check size={20} color={Colors.success} />,
                        'إيصالات القراءة',
                        'إظهار للآخرين متى قرأت رسائلهم',
                        readReceipts,
                        setReadReceipts,
                        Colors.success
                    )}
                    {renderSettingItem(
                        <MessageCircle size={20} color={Colors.success} />,
                        'مؤشر الكتابة',
                        'إظهار عندما تكتب رسالة',
                        typingIndicators,
                        setTypingIndicators,
                        Colors.success
                    )}
                    {renderSettingItem(
                        <Clock size={20} color={Colors.success} />,
                        'آخر ظهور',
                        'إظهار آخر مرة كنت متصلاً',
                        lastSeen,
                        setLastSeen,
                        Colors.success
                    )}
                </>
            )}

            {/* Notification Settings */}
            {renderSection(
                'الإشعارات',
                <>
                    {renderSettingItem(
                        <Bell size={20} color={Colors.primary} />,
                        'إشعارات الرسائل',
                        'تلقي إشعارات للرسائل الجديدة',
                        messageNotifications,
                        setMessageNotifications
                    )}
                    {renderSettingItem(
                        <Bell size={20} color={Colors.primary} />,
                        'إشعارات المجموعات',
                        'تلقي إشعارات لرسائل المجموعات',
                        groupNotifications,
                        setGroupNotifications
                    )}
                    {renderSettingItem(
                        <Bell size={20} color={Colors.primary} />,
                        'إشعارات القنوات',
                        'تلقي إشعارات لمنشورات القنوات',
                        channelNotifications,
                        setChannelNotifications
                    )}
                </>
            )}

            {/* Media Download Settings */}
            {renderSection(
                'التنزيل التلقائي',
                <>
                    {renderSettingItem(
                        <Download size={20} color={Colors.accent} />,
                        'الصور',
                        'تنزيل الصور تلقائياً',
                        autoDownloadPhotos,
                        setAutoDownloadPhotos,
                        Colors.accent
                    )}
                    {renderSettingItem(
                        <Download size={20} color={Colors.accent} />,
                        'الفيديوهات',
                        'تنزيل الفيديوهات تلقائياً',
                        autoDownloadVideos,
                        setAutoDownloadVideos,
                        Colors.accent
                    )}
                    {renderSettingItem(
                        <Download size={20} color={Colors.accent} />,
                        'المستندات',
                        'تنزيل المستندات تلقائياً',
                        autoDownloadDocuments,
                        setAutoDownloadDocuments,
                        Colors.accent
                    )}
                </>
            )}

            {/* Message Management */}
            {renderSection(
                'إدارة الرسائل',
                <>
                    {renderSettingItem(
                        <Clock size={20} color={Colors.medium} />,
                        'انتهاء صلاحية الرسائل',
                        `حذف الرسائل بعد ${expirationDays} يوم`,
                        messageExpiration,
                        setMessageExpiration,
                        Colors.medium
                    )}
                </>
            )}

            {/* Reset Button */}
            <TouchableOpacity style={styles.resetButton} onPress={handleResetSettings}>
                <Trash2 size={20} color={Colors.error} />
                <Text style={styles.resetButtonText}>إعادة تعيين جميع الإعدادات</Text>
            </TouchableOpacity>

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
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.error + '15',
        paddingVertical: 14,
        borderRadius: 12,
        marginHorizontal: 20,
        marginTop: 32,
    },
    resetButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.error,
        marginLeft: 8,
    },
    footer: {
        height: 40,
    },
});
