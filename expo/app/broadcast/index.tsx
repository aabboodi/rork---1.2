import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, Send, Users, Edit, Trash2, UserPlus, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';

interface BroadcastList {
    id: string;
    name: string;
    recipients: {
        id: string;
        name: string;
        picture: string;
    }[];
    lastMessage?: {
        content: string;
        timestamp: number;
    };
    createdAt: number;
}

const mockBroadcastLists: BroadcastList[] = [
    {
        id: 'broadcast_1',
        name: 'الفريق التقني',
        recipients: [
            { id: 'user_1', name: 'أحمد محمد', picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
            { id: 'user_2', name: 'سارة علي', picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face' },
            { id: 'user_3', name: 'محمد خالد', picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
        ],
        lastMessage: {
            content: 'اجتماع الفريق غداً الساعة 10 صباحاً',
            timestamp: Date.now() - 3600000,
        },
        createdAt: Date.now() - 86400000 * 7,
    },
    {
        id: 'broadcast_2',
        name: 'العملاء المميزون',
        recipients: [
            { id: 'user_4', name: 'عبدالله سعيد', picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
            { id: 'user_5', name: 'فاطمة أحمد', picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
        ],
        lastMessage: {
            content: 'عرض خاص: خصم 20% لفترة محدودة',
            timestamp: Date.now() - 86400000,
        },
        createdAt: Date.now() - 86400000 * 14,
    },
];

export default function BroadcastListsScreen() {
    const router = useRouter();
    const { language } = useAuthStore();
    const t = translations[language];

    const [broadcastLists, setBroadcastLists] = useState<BroadcastList[]>(mockBroadcastLists);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

    const mockContacts = [
        { id: 'user_1', name: 'أحمد محمد', picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
        { id: 'user_2', name: 'سارة علي', picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face' },
        { id: 'user_3', name: 'محمد خالد', picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
        { id: 'user_4', name: 'عبدالله سعيد', picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
        { id: 'user_5', name: 'فاطمة أحمد', picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
    ];

    const filteredLists = broadcastLists.filter(list =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateList = () => {
        if (!newListName.trim()) {
            Alert.alert('خطأ', 'يرجى إدخال اسم القائمة');
            return;
        }

        if (selectedRecipients.length === 0) {
            Alert.alert('خطأ', 'يرجى اختيار مستلم واحد على الأقل');
            return;
        }

        const newList: BroadcastList = {
            id: `broadcast_${Date.now()}`,
            name: newListName,
            recipients: mockContacts.filter(c => selectedRecipients.includes(c.id)),
            createdAt: Date.now(),
        };

        setBroadcastLists([newList, ...broadcastLists]);
        setNewListName('');
        setSelectedRecipients([]);
        setShowCreateModal(false);

        Alert.alert('نجاح', 'تم إنشاء قائمة البث بنجاح');
    };

    const handleSendBroadcast = (listId: string) => {
        router.push(`/broadcast/${listId}/compose`);
    };

    const handleEditList = (list: BroadcastList) => {
        Alert.alert('تعديل القائمة', `تعديل: ${list.name}`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'تعديل الاسم', onPress: () => Alert.alert('قريباً', 'ستتمكن من تعديل الاسم قريباً') },
            { text: 'إدارة المستلمين', onPress: () => Alert.alert('قريباً', 'ستتمكن من إدارة المستلمين قريباً') },
        ]);
    };

    const handleDeleteList = (listId: string) => {
        Alert.alert(
            'حذف قائمة البث',
            'هل أنت متأكد من حذف هذه القائمة؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () => {
                        setBroadcastLists(broadcastLists.filter(list => list.id !== listId));
                        Alert.alert('تم', 'تم حذف قائمة البث');
                    },
                },
            ]
        );
    };

    const toggleRecipient = (userId: string) => {
        if (selectedRecipients.includes(userId)) {
            setSelectedRecipients(selectedRecipients.filter(id => id !== userId));
        } else {
            setSelectedRecipients([...selectedRecipients, userId]);
        }
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

    const renderBroadcastListItem = ({ item }: { item: BroadcastList }) => (
        <TouchableOpacity
            style={styles.listCard}
            onPress={() => handleSendBroadcast(item.id)}
            onLongPress={() => handleEditList(item)}
        >
            <View style={styles.listIcon}>
                <Users size={24} color={Colors.primary} />
            </View>

            <View style={styles.listContent}>
                <View style={styles.listHeader}>
                    <Text style={styles.listName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.listActions}>
                        <TouchableOpacity
                            onPress={() => handleEditList(item)}
                            style={styles.iconButton}
                        >
                            <Edit size={18} color={Colors.medium} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleDeleteList(item.id)}
                            style={styles.iconButton}
                        >
                            <Trash2 size={18} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.recipientsCount}>
                    {item.recipients.length} مستلم
                </Text>

                {item.lastMessage && (
                    <View style={styles.lastMessageContainer}>
                        <Text style={styles.lastMessageText} numberOfLines={2}>
                            {item.lastMessage.content}
                        </Text>
                        <Text style={styles.lastMessageTime}>
                            {formatTimeAgo(item.lastMessage.timestamp)}
                        </Text>
                    </View>
                )}

                <View style={styles.recipientsPreview}>
                    {item.recipients.slice(0, 4).map((recipient, index) => (
                        <Image
                            key={recipient.id}
                            source={{ uri: recipient.picture }}
                            style={[styles.recipientAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                        />
                    ))}
                    {item.recipients.length > 4 && (
                        <View style={[styles.recipientAvatar, styles.moreRecipients, { marginLeft: -8 }]}>
                            <Text style={styles.moreRecipientsText}>+{item.recipients.length - 4}</Text>
                        </View>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={styles.sendButton}
                onPress={() => handleSendBroadcast(item.id)}
            >
                <Send size={20} color="white" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>قوائم البث</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Plus size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                    أرسل رسائل إلى عدة جهات اتصال دفعة واحدة. سيتلقون الرسالة كرسالة مباشرة.
                </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Search size={20} color={Colors.medium} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="البحث في قوائم البث..."
                    placeholderTextColor={Colors.medium}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Lists */}
            <FlatList
                data={filteredLists}
                renderItem={renderBroadcastListItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Users size={48} color={Colors.medium} />
                        <Text style={styles.emptyText}>لا توجد قوائم بث</Text>
                        <Text style={styles.emptySubtext}>أنشئ قائمة لإرسال رسائل جماعية</Text>
                    </View>
                }
            />

            {/* Create List Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>قائمة بث جديدة</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>اسم القائمة *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="مثال: فريق العمل"
                                placeholderTextColor={Colors.medium}
                                value={newListName}
                                onChangeText={setNewListName}
                            />

                            <Text style={styles.inputLabel}>اختر المستلمين ({selectedRecipients.length})</Text>
                            <FlatList
                                data={mockContacts}
                                keyExtractor={item => item.id}
                                style={styles.contactsList}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.contactItem}
                                        onPress={() => toggleRecipient(item.id)}
                                    >
                                        <Image source={{ uri: item.picture }} style={styles.contactAvatar} />
                                        <Text style={styles.contactName}>{item.name}</Text>
                                        <View style={[
                                            styles.checkbox,
                                            selectedRecipients.includes(item.id) && styles.checkboxSelected,
                                        ]}>
                                            {selectedRecipients.includes(item.id) && (
                                                <Check size={16} color="white" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.createListButton,
                                    selectedRecipients.length === 0 && styles.createListButtonDisabled,
                                ]}
                                onPress={handleCreateList}
                                disabled={selectedRecipients.length === 0}
                            >
                                <Text style={styles.createListButtonText}>إنشاء القائمة</Text>
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
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listCard: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'flex-start',
    },
    listIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    listContent: {
        flex: 1,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    listName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.dark,
        flex: 1,
    },
    listActions: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 12,
    },
    recipientsCount: {
        fontSize: 13,
        color: Colors.medium,
        marginBottom: 8,
    },
    lastMessageContainer: {
        backgroundColor: Colors.secondary,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    lastMessageText: {
        fontSize: 13,
        color: Colors.dark,
        marginBottom: 4,
    },
    lastMessageTime: {
        fontSize: 11,
        color: Colors.medium,
    },
    recipientsPreview: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recipientAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: Colors.background,
    },
    moreRecipients: {
        backgroundColor: Colors.medium,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreRecipientsText: {
        fontSize: 10,
        color: 'white',
        fontWeight: '600',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
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
        maxHeight: '85%',
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
        paddingVertical: 16,
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.dark,
        marginBottom: 8,
        marginTop: 8,
    },
    input: {
        backgroundColor: Colors.secondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.dark,
        marginBottom: 16,
    },
    contactsList: {
        flex: 1,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    contactName: {
        flex: 1,
        fontSize: 16,
        color: Colors.dark,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.medium,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
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
    createListButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        marginLeft: 8,
        alignItems: 'center',
    },
    createListButtonDisabled: {
        backgroundColor: Colors.medium,
    },
    createListButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
