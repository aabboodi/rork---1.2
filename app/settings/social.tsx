import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Slider } from 'react-native';
import { Heart, Eye, Users, Sparkles, TrendingUp, Filter, Music, Video } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function SocialSettingsScreen() {
    // Feed Algorithm Settings
    const [aiRecommendations, setAiRecommendations] = useState(true);
    const [chronologicalFeed, setChronologicalFeed] = useState(false);
    const [diversityBoost, setDiversityBoost] = useState(true);
    const [viralContentBoost, setViralContentBoost] = useState(true);

    // Content Preferences
    const [showSponsoredPosts, setShowSponsoredPosts] = useState(true);
    const [showReposts, setShowReposts] = useState(true);
    const [showSuggestedUsers, setShowSuggestedUsers] = useState(true);

    // Reaction Settings
    const [enableMultipleReactions, setEnableMultipleReactions] = useState(true);
    const [showReactionCounts, setShowReactionCounts] = useState(true);
    const [allowAnonymousReactions, setAllowAnonymousReactions] = useState(false);

    // Video Settings
    const [autoPlayVideos, setAutoPlayVideos] = useState(true);
    const [autoPlayOnWifiOnly, setAutoPlayOnWifiOnly] = useState(false);
    const [loopVideos, setLoopVideos] = useState(true);
    const [muteByDefault, setMuteByDefault] = useState(true);

    // Audio Rooms Settings
    const [autoJoinRooms, setAutoJoinRooms] = useState(false);
    const [roomNotifications, setRoomNotifications] = useState(true);
    const [speakerRequestNotify, setSpeakerRequestNotify] = useState(true);

    // Algorithm Sensitivity (0-1)
    const [engagementWeight, setEngagementWeight] = useState(0.7);
    const [freshnessWeight, setFreshnessWeight] = useState(0.5);
    const [diversityWeight, setDiversityWeight] = useState(0.6);

    const handleResetAlgorithm = () => {
        Alert.alert(
            'إعادة تعيين الخوارزمية',
            'هل تريد إعادة تعيين توصيات المحتوى إلى الوضع الافتراضي؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'إعادة تعيين',
                    style: 'destructive',
                    onPress: () => {
                        setEngagementWeight(0.7);
                        setFreshnessWeight(0.5);
                        setDiversityWeight(0.6);
                        Alert.alert('تم', 'تم إعادة تعيين خوارزمية التوصيات');
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

    const renderSliderItem = (
        icon: React.ReactNode,
        title: string,
        description: string,
        value: number,
        onValueChange: (value: number) => void,
        color = Colors.primary
    ) => (
        <View style={styles.sliderItem}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.sliderContent}>
                <View style={styles.sliderHeader}>
                    <Text style={styles.settingTitle}>{title}</Text>
                    <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
                </View>
                <Text style={styles.settingDescription}>{description}</Text>
                <Slider
                    style={styles.slider}
                    value={value}
                    onValueChange={onValueChange}
                    minimumValue={0}
                    maximumValue={1}
                    minimumTrackTintColor={color}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={color}
                />
            </View>
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
                <Users size={32} color={Colors.primary} />
                <Text style={styles.headerTitle}>إعدادات الشبكة الاجتماعية</Text>
                <Text style={styles.headerSubtitle}>تخصيص تجربة المحتوى والتفاعل</Text>
            </View>

            {/* Feed Algorithm */}
            {renderSection(
                'خوارزمية الخلاصة',
                <>
                    {renderSettingItem(
                        <Sparkles size={20} color={Colors.primary} />,
                        'التوصيات بالذكاء الاصطناعي',
                        'استخدام الذكاء الاصطناعي لتخصيص المحتوى',
                        aiRecommendations,
                        setAiRecommendations
                    )}
                    {renderSettingItem(
                        <TrendingUp size={20} color={Colors.primary} />,
                        'الخلاصة الزمنية',
                        'عرض المنشورات بالترتيب الزمني بدلاً من التوصيات',
                        chronologicalFeed,
                        setChronologicalFeed
                    )}
                    {renderSettingItem(
                        <Filter size={20} color={Colors.accent} />,
                        'تعزيز التنوع',
                        'إظهار محتوى متنوع من مصادر مختلفة',
                        diversityBoost,
                        setDiversityBoost,
                        Colors.accent
                    )}
                    {renderSettingItem(
                        <TrendingUp size={20} color={Colors.success} />,
                        'تعزيز المحتوى الرائج',
                        'إظهار المنشورات الشائعة بشكل أكبر',
                        viralContentBoost,
                        setViralContentBoost,
                        Colors.success
                    )}
                </>
            )}

            {/* Algorithm Sensitivity */}
            {renderSection(
                'حساسية الخوارزمية',
                <>
                    {renderSliderItem(
                        <Heart size={20} color={Colors.error} />,
                        'وزن التفاعل',
                        'مدى تأثير الإعجابات والتعليقات على التوصيات',
                        engagementWeight,
                        setEngagementWeight,
                        Colors.error
                    )}
                    {renderSliderItem(
                        <TrendingUp size={20} color={Colors.success} />,
                        'وزن الحداثة',
                        'أهمية المنشورات الحديثة في الخلاصة',
                        freshnessWeight,
                        setFreshnessWeight,
                        Colors.success
                    )}
                    {renderSliderItem(
                        <Filter size={20} color={Colors.accent} />,
                        'وزن التنوع',
                        'تنوع المحتوى والمصادر في الخلاصة',
                        diversityWeight,
                        setDiversityWeight,
                        Colors.accent
                    )}
                    <TouchableOpacity style={styles.resetAlgorithmButton} onPress={handleResetAlgorithm}>
                        <Sparkles size={18} color={Colors.primary} />
                        <Text style={styles.resetAlgorithmText}>إعادة تعيين الخوارزمية</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* Content Preferences */}
            {renderSection(
                'تفضيلات المحتوى',
                <>
                    {renderSettingItem(
                        <Eye size={20} color={Colors.warning} />,
                        'إظهار المنشورات الممولة',
                        'عرض المحتوى المدعوم في الخلاصة',
                        showSponsoredPosts,
                        setShowSponsoredPosts,
                        Colors.warning
                    )}
                    {renderSettingItem(
                        <TrendingUp size={20} color={Colors.medium} />,
                        'إظهار المشاركات المعاد نشرها',
                        'عرض المنشورات التي أعاد نشرها الأصدقاء',
                        showReposts,
                        setShowReposts,
                        Colors.medium
                    )}
                    {renderSettingItem(
                        <Users size={20} color={Colors.primary} />,
                        'اقتراحات المستخدمين',
                        'إظهار اقتراحات متابعة مستخدمين جدد',
                        showSuggestedUsers,
                        setShowSuggestedUsers
                    )}
                </>
            )}

            {/* Reaction Settings */}
            {renderSection(
                'إعدادات التفاعلات',
                <>
                    {renderSettingItem(
                        <Heart size={20} color={Colors.error} />,
                        'تفعيل التفاعلات المتعددة',
                        'استخدام 5 أنواع تفاعل بدلاً من الإعجاب فقط',
                        enableMultipleReactions,
                        setEnableMultipleReactions,
                        Colors.error
                    )}
                    {renderSettingItem(
                        <Eye size={20} color={Colors.medium} />,
                        'إظهار عدد التفاعلات',
                        'عرض عدد كل نوع تفاعل',
                        showReactionCounts,
                        setShowReactionCounts,
                        Colors.medium
                    )}
                    {renderSettingItem(
                        <Users size={20} color={Colors.warning} />,
                        'التفاعلات المجهولة',
                        'السماح بالتفاعل دون إظهار الاسم',
                        allowAnonymousReactions,
                        setAllowAnonymousReactions,
                        Colors.warning
                    )}
                </>
            )}

            {/* Video Settings */}
            {renderSection(
                'إعدادات الفيديو',
                <>
                    {renderSettingItem(
                        <Video size={20} color={Colors.primary} />,
                        'تشغيل تلقائي للفيديو',
                        'تشغيل الفيديوهات عند ظهورها في الخلاصة',
                        autoPlayVideos,
                        setAutoPlayVideos
                    )}
                    {renderSettingItem(
                        <Video size={20} color={Colors.success} />,
                        'تشغيل تلقائي على Wi-Fi فقط',
                        'توفير البيانات بتشغيل الفيديو على Wi-Fi فقط',
                        autoPlayOnWifiOnly,
                        setAutoPlayOnWifiOnly,
                        Colors.success
                    )}
                    {renderSettingItem(
                        <Video size={20} color={Colors.accent} />,
                        'تكرار الفيديوهات',
                        'إعادة تشغيل الفيديو تلقائياً عند انتهائه',
                        loopVideos,
                        setLoopVideos,
                        Colors.accent
                    )}
                    {renderSettingItem(
                        <Video size={20} color={Colors.medium} />,
                        'كتم الصوت افتراضياً',
                        'تشغيل الفيديوهات بدون صوت',
                        muteByDefault,
                        setMuteByDefault,
                        Colors.medium
                    )}
                </>
            )}

            {/* Audio Rooms */}
            {renderSection(
                'إعدادات غرف الصوت',
                <>
                    {renderSettingItem(
                        <Music size={20} color={Colors.primary} />,
                        'الانضمام التلقائي',
                        'الانضمام تلقائياً للغرف المقترحة',
                        autoJoinRooms,
                        setAutoJoinRooms
                    )}
                    {renderSettingItem(
                        <Music size={20} color={Colors.success} />,
                        'إشعارات الغرف',
                        'تلقي إشعارات عند بدء غرف جديدة',
                        roomNotifications,
                        setRoomNotifications,
                        Colors.success
                    )}
                    {renderSettingItem(
                        <Users size={20} color={Colors.warning} />,
                        'طلبات التحدث',
                        'إشعار عند طلب شخص للتحدث في غرفتك',
                        speakerRequestNotify,
                        setSpeakerRequestNotify,
                        Colors.warning
                    )}
                </>
            )}

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
    sliderItem: {
        flexDirection: 'row',
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
    sliderContent: {
        flex: 1,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
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
    sliderValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    slider: {
        marginTop: 8,
    },
    resetAlgorithmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '15',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    resetAlgorithmText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
        marginLeft: 8,
    },
    footer: {
        height: 40,
    },
});
