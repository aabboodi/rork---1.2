import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, Search, Trash2, Edit, Share2, Copy, Pin, Archive, Calendar, File, Image as ImageIcon, Video, Mic } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { formatTimeAgo } from '@/utils/dateUtils';

interface SavedMessage {
    id: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'link';
    mediaUrl?: string;
    fileType?: string;
    fileName?: string;
    timestamp: number;
    isPinned?: boolean;
    tags?: string[];
    originalChat?: {
        chatId: string;
        chatName: string;
        senderId: string;
        senderName: string;
    };
}

const mockSavedMessages: SavedMessage[] = [
    {
        id: 'saved_1',
        content: 'أفكار لمشروع جديد:\n- تطبيق للتعلم عن بعد\n- منصة للتجارة الإلكترونية\n- نظام إدارة المهام',
        type: 'text',
        timestamp: Date.now() - 3600000,
        isPinned: true,
        tags: ['أفكار', 'مشاريع'],
    },
    {
        id: 'saved_2',
        content: 'اجتماع مهم يوم الأحد الساعة 10 صباحاً',
        type: 'text',
        timestamp: Date.now() - 7200000,
        tags: ['اجتماعات'],
        originalChat: {
            chatId: 'chat_1',
            chatName: 'فريق العمل',
            senderId: 'user_1',
            senderName: 'أحمد محمد',
        },
    },
    {
        id: 'saved_3',
        content: 'رابط مهم: https://example.com/article',
        type: 'link',
        timestamp: Date.now() - 86400000,
        tags: ['روابط', 'مقالات'],
    },
    {
        id: 'saved_4',
        content: 'ملف العرض التقديمي',
        type: 'file',
        fileName: 'presentation.pdf',
        fileType: 'pdf',
        timestamp: Date.now() - 172800000,
        tags: ['ملفات', 'عروض'],
    },
];

export default function SavedMessagesScreen() {
    const router = useRouter();
    const { language, userId } = useAuthStore();
    const t = translations[language];

    const [savedMessages, setSavedMessages] = useState<SavedMessage[]>(mockSavedMessages);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'text' | 'image' | 'video' | 'file' | 'link'>('all');

    const filteredMessages = savedMessages.filter(msg => {
        const matchesSearch = msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = selectedFilter === 'all' || msg.type === selectedFilter;
        return matchesSearch && matchesFilter;
    });

    const handleSaveMessage = () => {
        Alert.alert('حفظ رسالة', 'أرسل رسالة إلى نفسك لحفظها هنا');
    };

    const handlePinMessage = (messageId: string) => {
        setSavedMessages(savedMessages.map(msg =>
            msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
        ));
    };

    const handleDeleteMessage = (messageId: string) => {
        Alert.alert(
            'حذف الرسالة',
            'هل أنت متأكد من حذف هذه الرسالة المحفوظة؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () => {
                        setSavedMessages(savedMessages.filter(msg => msg.id !== messageId));
                        Alert.alert('تم', 'تم حذف الرسالة');
                    },
                },
            ]
        );
    };

    const handleCopyMessage = (content: string) => {
        // في التطبيق الحقيقي، سيتم نسخ المحتوى إلى الحافظة
        Alert.alert('تم النسخ', 'تم نسخ الرسالة إلى الحافظة');
    };

    const handleShareMessage = (message: SavedMessage) => {
        Alert.alert('مشاركة', 'مشاركة الرسالة إلى...');
    };

    const handleMessageOptions = (message: SavedMessage) => {
        Alert.alert(
            'خيارات الرسالة',
            '',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: message.isPinned ? 'إلغاء التثبيت' : 'تثبيت',
                    onPress: () => handlePinMessage(message.id),
                },
                {
                    text: 'نسخ',
                    onPress: () => handleCopyMessage(message.content),
                },
                {
                    text: 'مشاركة',
                    onPress: () => handleShareMessage(message),
                },
                {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () => handleDeleteMessage(message.id),
                },
            ]
        );
    };

    const getMessageIcon = (type: string) => {
        switch (type) {
            case 'image':
                return <ImageIcon size={20} color={Colors.primary} />;
            case 'video':
                return <Video size={20} color={Colors.primary} />;
            case 'voice':
                return <Mic size={20} color={Colors.primary} />;
            case 'file':
                return <File size={20} color={Colors.primary} />;
            case 'link':
                return <Share2 size={20} color={Colors.primary} />;
            default:
                return <Edit size={20} color={Colors.primary} />;
        }
    };

    const renderMessageItem = ({ item }: { item: SavedMessage }) => (
        <TouchableOpacity
            style={[styles.messageCard, item.isPinned && styles.pinnedMessage]}
            onLongPress={() => handleMessageOptions(item)}
        >
            {item.isPinned && (
                <View style={styles.pinnedBadge}>
                    <Pin size={12} color={Colors.primary} />
                    <Text style={styles.pinnedText}>مثبتة</Text>
                </View>
            )}

            <View style={styles.messageHeader}>
                <View style={styles.messageTypeIcon}>
                    {getMessageIcon(item.type)}
                </View>
                <Text style={styles.messageTime}>{formatTimeAgo(item.timestamp)}</Text>
            </View>

            <Text style={styles.messageContent} numberOfLines={item.type === 'text' ? 5 : 2}>
                {item.content}
            </Text>

            {item.fileName && (
                <View style={styles.fileInfo}>
                    <File size={16} color={Colors.medium} />
                    <Text style={styles.fileName} numberOfLines={1}>
                        {item.fileName}
                    </Text>
                </View>
            )}

            {item.originalChat && (
                <View style={styles.forwardedInfo}>
                    <Text style={styles.forwardedText}>
                        من: {item.originalChat.chatName} • {item.originalChat.senderName}
                    </Text>
                </View>
            )}

            {item.tags && item.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {item.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.messageActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handlePinMessage(item.id)}
                >
                    <Pin size={16} color={item.isPinned ? Colors.primary : Colors.medium} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCopyMessage(item.content)}
                >
                    <Copy size={16} color={Colors.medium} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleShareMessage(item)}
                >
                    <Share2 size={16} color={Colors.medium} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteMessage(item.id)}
                >
                    <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderFilterButton = (filter: typeof selectedFilter, label: string, icon: React.ReactNode) => (
        <TouchableOpacity
            style={[styles.filterButton, selectedFilter === filter && styles.filterButtonActive]}
            onPress={() => setSelectedFilter(filter)}
        >
            {icon}
            <Text style={[styles.filterButtonText, selectedFilter === filter && styles.filterButtonTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Bookmark size={28} color={Colors.primary} />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>الرسائل المحفوظة</Text>
                        <Text style={styles.headerSubtitle}>احفظ الرسائل المهمة لك</Text>
                    </View>
                </View>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                    💡 نصيحة: أرسل رسالة لنفسك في أي محادثة لحفظها هنا
                </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Search size={20} color={Colors.medium} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="البحث في الرسائل المحفوظة..."
                    placeholderTextColor={Colors.medium}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                {renderFilterButton('all', 'الكل', <File size={16} color={selectedFilter === 'all' ? Colors.primary : Colors.medium} />)}
                {renderFilterButton('text', 'نصوص', <Edit size={16} color={selectedFilter === 'text' ? Colors.primary : Colors.medium} />)}
                {renderFilterButton('image', 'صور', <ImageIcon size={16} color={selectedFilter === 'image' ? Colors.primary : Colors.medium} />)}
                {renderFilterButton('video', 'فيديو', <Video size={16} color={selectedFilter === 'video' ? Colors.primary : Colors.medium} />)}
                {renderFilterButton('file', 'ملفات', <File size={16} color={selectedFilter === 'file' ? Colors.primary : Colors.medium} />)}
            </View>

            {/* Messages List */}
            <FlatList
                data={filteredMessages.sort((a, b) => {
                    // Pinned messages first
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    // Then by timestamp
                    return b.timestamp - a.timestamp;
                })}
                renderItem={renderMessageItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Bookmark size={48} color={Colors.medium} />
                        <Text style={styles.emptyText}>لا توجد رسائل محفوظة</Text>
                        <Text style={styles.emptySubtext}>
                            ابدأ بحفظ الرسائل المهمة من أي محادثة
                        </Text>
                    </View>
                }
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.dark,
    },
    headerSubtitle: {
        fontSize: 13,
        color: Colors.medium,
        marginTop: 2,
    },
    infoBanner: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 13,
        color: Colors.primary,
        textAlign: 'center',
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
    filtersContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.secondary,
        marginRight: 8,
    },
    filterButtonActive: {
        backgroundColor: Colors.primary + '20',
    },
    filterButtonText: {
        fontSize: 13,
        color: Colors.medium,
        marginLeft: 6,
    },
    filterButtonTextActive: {
        color: Colors.primary,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    messageCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    pinnedMessage: {
        borderColor: Colors.primary,
        borderWidth: 2,
    },
    pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    pinnedText: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '600',
        marginLeft: 4,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    messageTypeIcon: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    messageTime: {
        fontSize: 12,
        color: Colors.medium,
    },
    messageContent: {
        fontSize: 15,
        color: Colors.dark,
        lineHeight: 22,
        marginBottom: 12,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    fileName: {
        fontSize: 13,
        color: Colors.dark,
        marginLeft: 8,
        flex: 1,
    },
    forwardedInfo: {
        backgroundColor: Colors.secondary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 12,
    },
    forwardedText: {
        fontSize: 12,
        color: Colors.medium,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    tag: {
        backgroundColor: Colors.accent + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 11,
        color: Colors.accent,
        fontWeight: '600',
    },
    messageActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    actionButton: {
        marginLeft: 16,
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
        textAlign: 'center',
    },
});
