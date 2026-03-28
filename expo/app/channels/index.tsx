import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, Users, Lock, Globe, Bell, BellOff, Pin, Archive, Trash2, Settings, Share2, UserPlus, Crown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';

interface Channel {
    id: string;
    name: string;
    description: string;
    picture: string;
    owner: string;
    subscribersCount: number;
    isPublic: boolean;
    verified: boolean;
    lastPost: {
        content: string;
        timestamp: number;
    };
    isPinned?: boolean;
    isMuted?: boolean;
}

const mockChannels: Channel[] = [
    {
        id: 'channel_1',
        name: 'أخبار التقنية',
        description: 'آخر أخبار التكنولوجيا والابتكار',
        picture: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop',
        owner: 'user_1',
        subscribersCount: 15420,
        isPublic: true,
        verified: true,
        lastPost: {
            content: 'إطلاق تقنية جديدة في مجال الذكاء الاصطناعي',
            timestamp: Date.now() - 3600000,
        },
        isPinned: true,
    },
    {
        id: 'channel_2',
        name: 'البرمجة بالعربي',
        description: 'محتوى تعليمي في البرمجة باللغة العربية',
        picture: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&h=150&fit=crop',
        owner: 'user_2',
        subscribersCount: 8932,
        isPublic: true,
        verified: true,
        lastPost: {
            content: 'درس جديد: مقدمة في React Native',
            timestamp: Date.now() - 7200000,
        },
    },
    {
        id: 'channel_3',
        name: 'ريادة الأعمال',
        description: 'نصائح وتجارب رواد الأعمال',
        picture: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=150&h=150&fit=crop',
        owner: 'user_3',
        subscribersCount: 12150,
        isPublic: true,
        verified: false,
        lastPost: {
            content: 'كيف تبدأ مشروعك الناشئ بميزانية محدودة',
            timestamp: Date.now() - 86400000,
        },
    },
];

export default function ChannelsScreen() {
    const router = useRouter();
    const { language, userId } = useAuthStore();
    const t = translations[language];

    const [channels, setChannels] = useState<Channel[]>(mockChannels);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelDesc, setNewChannelDesc] = useState('');
    const [newChannelPublic, setNewChannelPublic] = useState(true);

    const filteredChannels = channels.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleChannelPress = (channel: Channel) => {
        router.push(`/channels/${channel.id}`);
    };

    const handleCreateChannel = () => {
        if (!newChannelName.trim()) {
            Alert.alert('خطأ', 'يرجى إدخال اسم القناة');
            return;
        }

        const newChannel: Channel = {
            id: `channel_${Date.now()}`,
            name: newChannelName,
            description: newChannelDesc,
            picture: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=150&h=150&fit=crop',
            owner: userId || '0',
            subscribersCount: 0,
            isPublic: newChannelPublic,
            verified: false,
            lastPost: {
                content: 'مرحباً بكم في القناة الجديدة!',
                timestamp: Date.now(),
            },
        };

        setChannels([newChannel, ...channels]);
        setNewChannelName('');
        setNewChannelDesc('');
        setNewChannelPublic(true);
        setShowCreateModal(false);

        Alert.alert('نجاح', 'تم إنشاء القناة بنجاح');
    };

    const handleSubscribe = (channelId: string) => {
        setChannels(channels.map(ch =>
            ch.id === channelId
                ? { ...ch, subscribersCount: ch.subscribersCount + 1 }
                : ch
        ));
        Alert.alert('تم الاشتراك', 'تم الاشتراك في القناة بنجاح');
    };

    const handleUnsubscribe = (channelId: string) => {
        setChannels(channels.map(ch =>
            ch.id === channelId
                ? { ...ch, subscribersCount: Math.max(0, ch.subscribersCount - 1) }
                : ch
        ));
        Alert.alert('تم إلغاء الاشتراك', 'تم إلغاء الاشتراك من القناة');
    };

    const handlePinChannel = (channelId: string) => {
        setChannels(channels.map(ch =>
            ch.id === channelId ? { ...ch, isPinned: !ch.isPinned } : ch
        ));
    };

    const handleMuteChannel = (channelId: string) => {
        setChannels(channels.map(ch =>
            ch.id === channelId ? { ...ch, isMuted: !ch.isMuted } : ch
        ));
        Alert.alert('تم', channels.find(ch => ch.id === channelId)?.isMuted ? 'تم إلغاء كتم القناة' : 'تم كتم القناة');
    };

    const handleShareChannel = (channel: Channel) => {
        Alert.alert('مشاركة القناة', `مشاركة رابط القناة: ${channel.name}`);
    };

    const handleChannelOptions = (channel: Channel) => {
        const isOwner = channel.owner === userId;

        Alert.alert(
            'خيارات القناة',
            channel.name,
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: channel.isPinned ? 'إلغاء التثبيت' : 'تثبيت',
                    onPress: () => handlePinChannel(channel.id),
                },
                {
                    text: channel.isMuted ? 'إلغاء الكتم' : 'كتم الإشعارات',
                    onPress: () => handleMuteChannel(channel.id),
                },
                {
                    text: 'مشاركة',
                    onPress: () => handleShareChannel(channel),
                },
                ...(isOwner ? [
                    {
                        text: 'إدارة القناة',
                        onPress: () => Alert.alert('إدارة القناة', 'قريباً'),
                    },
                ] : [
                    {
                        text: 'إلغاء الاشتراك',
                        onPress: () => handleUnsubscribe(channel.id),
                        style: 'destructive' as const,
                    },
                ]),
            ]
        );
    };

    const formatSubscribers = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    const formatTimeAgo = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 24) {
            return `${hours}س`;
        } else {
            return `${days}ي`;
        }
    };

    const renderChannelItem = ({ item }: { item: Channel }) => (
        <TouchableOpacity
            style={styles.channelCard}
            onPress={() => handleChannelPress(item)}
            onLongPress={() => handleChannelOptions(item)}
        >
            <View style={styles.channelHeader}>
                <Image source={{ uri: item.picture }} style={styles.channelPicture} />
                <View style={styles.channelInfo}>
                    <View style={styles.channelNameRow}>
                        <Text style={styles.channelName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {item.verified && (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>✓</Text>
                            </View>
                        )}
                        {item.isPinned && (
                            <Pin size={14} color={Colors.primary} style={styles.pinnedIcon} />
                        )}
                        {item.isMuted && (
                            <BellOff size={14} color={Colors.medium} style={styles.mutedIcon} />
                        )}
                    </View>
                    <Text style={styles.channelDescription} numberOfLines={1}>
                        {item.description}
                    </Text>
                    <View style={styles.channelStats}>
                        <Users size={12} color={Colors.medium} />
                        <Text style={styles.subscribersText}>
                            {formatSubscribers(item.subscribersCount)} مشترك
                        </Text>
                        {item.isPublic ? (
                            <Globe size={12} color={Colors.success} style={styles.publicIcon} />
                        ) : (
                            <Lock size={12} color={Colors.warning} style={styles.privateIcon} />
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.lastPostContainer}>
                <Text style={styles.lastPostText} numberOfLines={2}>
                    {item.lastPost.content}
                </Text>
                <Text style={styles.lastPostTime}>
                    {formatTimeAgo(item.lastPost.timestamp)}
                </Text>
            </View>

            {item.owner !== userId && (
                <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={() => handleSubscribe(item.id)}
                >
                    <UserPlus size={16} color="white" />
                    <Text style={styles.subscribeButtonText}>اشترك</Text>
                </TouchableOpacity>
            )}
            {item.owner === userId && (
                <View style={styles.ownerBadge}>
                    <Crown size={14} color={Colors.warning} />
                    <Text style={styles.ownerText}>مالك القناة</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>القنوات</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Plus size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Search size={20} color={Colors.medium} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="البحث عن قنوات..."
                    placeholderTextColor={Colors.medium}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Channels List */}
            <FlatList
                data={filteredChannels}
                renderItem={renderChannelItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Users size={48} color={Colors.medium} />
                        <Text style={styles.emptyText}>لا توجد قنوات</Text>
                        <Text style={styles.emptySubtext}>ابحث عن قنوات أو أنشئ قناتك الخاصة</Text>
                    </View>
                }
            />

            {/* Create Channel Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>إنشاء قناة جديدة</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.inputLabel}>اسم القناة *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="أدخل اسم القناة"
                                placeholderTextColor={Colors.medium}
                                value={newChannelName}
                                onChangeText={setNewChannelName}
                            />

                            <Text style={styles.inputLabel}>الوصف</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="وصف مختصر للقناة"
                                placeholderTextColor={Colors.medium}
                                value={newChannelDesc}
                                onChangeText={setNewChannelDesc}
                                multiline
                                numberOfLines={3}
                            />

                            <View style={styles.visibilityContainer}>
                                <Text style={styles.inputLabel}>الخصوصية</Text>
                                <View style={styles.visibilityOptions}>
                                    <TouchableOpacity
                                        style={[
                                            styles.visibilityOption,
                                            newChannelPublic && styles.visibilityOptionSelected,
                                        ]}
                                        onPress={() => setNewChannelPublic(true)}
                                    >
                                        <Globe size={20} color={newChannelPublic ? Colors.primary : Colors.medium} />
                                        <View style={styles.visibilityTextContainer}>
                                            <Text style={[
                                                styles.visibilityOptionTitle,
                                                newChannelPublic && styles.visibilityOptionTitleSelected,
                                            ]}>
                                                عامة
                                            </Text>
                                            <Text style={styles.visibilityOptionDesc}>
                                                يمكن لأي شخص العثور عليها والاشتراك
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.visibilityOption,
                                            !newChannelPublic && styles.visibilityOptionSelected,
                                        ]}
                                        onPress={() => setNewChannelPublic(false)}
                                    >
                                        <Lock size={20} color={!newChannelPublic ? Colors.primary : Colors.medium} />
                                        <View style={styles.visibilityTextContainer}>
                                            <Text style={[
                                                styles.visibilityOptionTitle,
                                                !newChannelPublic && styles.visibilityOptionTitleSelected,
                                            ]}>
                                                خاصة
                                            </Text>
                                            <Text style={styles.visibilityOptionDesc}>
                                                الاشتراك بالدعوة فقط
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.createChannelButton}
                                onPress={handleCreateChannel}
                            >
                                <Text style={styles.createChannelButtonText}>إنشاء القناة</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.dark,
    },
    createButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        marginHorizontal: 20,
        marginVertical: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: Colors.dark,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    channelCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    channelHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    channelPicture: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    channelInfo: {
        flex: 1,
    },
    channelNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    channelName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.dark,
        flex: 1,
    },
    verifiedBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    verifiedText: {
        fontSize: 10,
        color: 'white',
        fontWeight: 'bold',
    },
    pinnedIcon: {
        marginLeft: 6,
    },
    mutedIcon: {
        marginLeft: 6,
    },
    channelDescription: {
        fontSize: 14,
        color: Colors.medium,
        marginBottom: 6,
    },
    channelStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subscribersText: {
        fontSize: 12,
        color: Colors.medium,
        marginLeft: 6,
    },
    publicIcon: {
        marginLeft: 12,
    },
    privateIcon: {
        marginLeft: 12,
    },
    lastPostContainer: {
        backgroundColor: Colors.secondary,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    lastPostText: {
        fontSize: 14,
        color: Colors.dark,
        marginBottom: 6,
    },
    lastPostTime: {
        fontSize: 12,
        color: Colors.medium,
    },
    subscribeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    subscribeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
        marginLeft: 6,
    },
    ownerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.warning + '20',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    ownerText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.warning,
        marginLeft: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.dark,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.medium,
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.dark,
    },
    closeButton: {
        fontSize: 24,
        color: Colors.medium,
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.dark,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: Colors.secondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.dark,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    visibilityContainer: {
        marginTop: 8,
    },
    visibilityOptions: {
        marginTop: 8,
    },
    visibilityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    visibilityOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    visibilityTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    visibilityOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.dark,
        marginBottom: 4,
    },
    visibilityOptionTitleSelected: {
        color: Colors.primary,
    },
    visibilityOptionDesc: {
        fontSize: 12,
        color: Colors.medium,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.secondary,
        marginRight: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.dark,
    },
    createChannelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        marginLeft: 8,
        alignItems: 'center',
    },
    createChannelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
