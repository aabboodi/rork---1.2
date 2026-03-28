import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Modal, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Mic, MicOff, Users, Hand, Crown, Volume2, VolumeX, Plus, X, Gift, Settings, UserPlus, Lock, Globe } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';

interface AudioRoom {
    id: string;
    title: string;
    description: string;
    host: {
        id: string;
        name: string;
        picture: string;
    };
    speakers: {
        id: string;
        name: string;
        picture: string;
        isMuted: boolean;
    }[];
    listeners: number;
    isPublic: boolean;
    createdAt: number;
    category: string;
}

interface Participant {
    id: string;
    name: string;
    picture: string;
    isMuted: boolean;
    isSpeaking: boolean;
    raisedHand: boolean;
}

const mockRooms: AudioRoom[] = [
    {
        id: 'room_1',
        title: 'نقاش حول الذكاء الاصطناعي',
        description: 'مستقبل الذكاء الاصطناعي في العالم العربي',
        host: {
            id: 'host_1',
            name: 'د. أحمد محمود',
            picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        },
        speakers: [
            { id: 'speaker_1', name: 'سارة علي', picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', isMuted: false },
            { id: 'speaker_2', name: 'محمد خالد', picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', isMuted: false },
        ],
        listeners: 234,
        isPublic: true,
        createdAt: Date.now() - 3600000,
        category: 'تقنية',
    },
    {
        id: 'room_2',
        title: 'تعلم البرمجة',
        description: 'نصائح للمبتدئين في عالم البرمجة',
        host: {
            id: 'host_2',
            name: 'خالد السعيد',
            picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        },
        speakers: [
            { id: 'speaker_3', name: 'فاطمة أحمد', picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', isMuted: false },
        ],
        listeners: 156,
        isPublic: true,
        createdAt: Date.now() - 7200000,
        category: 'تعليم',
    },
];

export default function AudioRoomsScreen() {
    const router = useRouter();
    const { language, userId } = useAuthStore();
    const { balances, updateBalance, addTransaction } = useWalletStore();
    const t = translations[language];

    const [rooms, setRooms] = useState<AudioRoom[]>(mockRooms);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomTitle, setNewRoomTitle] = useState('');
    const [newRoomDesc, setNewRoomDesc] = useState('');
    const [newRoomPublic, setNewRoomPublic] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('عام');

    const categories = ['عام', 'تقنية', 'تعليم', 'أعمال', 'ترفيه', 'رياضة', 'صحة'];

    const handleJoinRoom = (roomId: string) => {
        router.push(`/audio/${roomId}`);
    };

    const handleCreateRoom = () => {
        if (!newRoomTitle.trim()) {
            Alert.alert('خطأ', 'يرجى إدخال عنوان الغرفة');
            return;
        }

        const newRoom: AudioRoom = {
            id: `room_${Date.now()}`,
            title: newRoomTitle,
            description: newRoomDesc,
            host: {
                id: userId || '0',
                name: 'أنت',
                picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            },
            speakers: [],
            listeners: 0,
            isPublic: newRoomPublic,
            createdAt: Date.now(),
            category: selectedCategory,
        };

        setRooms([newRoom, ...rooms]);
        setNewRoomTitle('');
        setNewRoomDesc('');
        setNewRoomPublic(true);
        setSelectedCategory('عام');
        setShowCreateModal(false);

        Alert.alert('نجاح', 'تم إنشاء الغرفة الصوتية', [
            { text: 'موافق', onPress: () => handleJoinRoom(newRoom.id) },
        ]);
    };

    const formatTimeAgo = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 1) {
            return 'بدأت للتو';
        } else if (hours < 24) {
            return `منذ ${hours}س`;
        } else {
            return `منذ ${days}ي`;
        }
    };

    const renderRoomItem = ({ item }: { item: AudioRoom }) => (
        <TouchableOpacity
            style={styles.roomCard}
            onPress={() => handleJoinRoom(item.id)}
        >
            <View style={styles.roomHeader}>
                <View style={styles.hostInfo}>
                    <Image source={{ uri: item.host.picture }} style={styles.hostAvatar} />
                    <View style={styles.hostDetails}>
                        <Text style={styles.roomTitle} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <View style={styles.hostMetaRow}>
                            <Crown size={14} color={Colors.warning} />
                            <Text style={styles.hostName}>{item.host.name}</Text>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryText}>{item.category}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={styles.roomStatus}>
                    {item.isPublic ? (
                        <Globe size={16} color={Colors.success} />
                    ) : (
                        <Lock size={16} color={Colors.warning} />
                    )}
                </View>
            </View>

            {item.description && (
                <Text style={styles.roomDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            )}

            <View style={styles.speakersContainer}>
                <Text style={styles.speakersLabel}>المتحدثون ({item.speakers.length})</Text>
                <View style={styles.speakersList}>
                    {item.speakers.slice(0, 6).map((speaker, index) => (
                        <View
                            key={speaker.id}
                            style={[
                                styles.speakerAvatar,
                                { marginLeft: index > 0 ? -12 : 0 },
                            ]}
                        >
                            <Image source={{ uri: speaker.picture }} style={styles.speakerImage} />
                            {speaker.isMuted && (
                                <View style={styles.mutedBadge}>
                                    <MicOff size={10} color="white" />
                                </View>
                            )}
                        </View>
                    ))}
                    {item.speakers.length > 6 && (
                        <View style={[styles.speakerAvatar, styles.moreSpeakers, { marginLeft: -12 }]}>
                            <Text style={styles.moreSpeakersText}>+{item.speakers.length - 6}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.roomFooter}>
                <View style={styles.listenersCount}>
                    <Users size={16} color={Colors.medium} />
                    <Text style={styles.listenersText}>
                        {item.listeners > 999 ? `${(item.listeners / 1000).toFixed(1)}K` : item.listeners} مستمع
                    </Text>
                </View>
                <Text style={styles.roomTime}>{formatTimeAgo(item.createdAt)}</Text>
            </View>

            <View style={styles.joinButton}>
                <Mic size={18} color="white" />
                <Text style={styles.joinButtonText}>انضم الآن</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Mic size={28} color={Colors.primary} />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>غرف الصوت</Text>
                        <Text style={styles.headerSubtitle}>محادثات صوتية مباشرة</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                    💡 انضم لمحادثات صوتية مباشرة أو أنشئ غرفتك الخاصة
                </Text>
            </View>

            {/* Rooms List */}
            <FlatList
                data={rooms}
                renderItem={renderRoomItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Mic size={48} color={Colors.medium} />
                        <Text style={styles.emptyText}>لا توجد غرف صوتية نشطة</Text>
                        <Text style={styles.emptySubtext}>أنشئ غرفة جديدة للبدء</Text>
                    </View>
                }
            />

            {/* Create Room Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>إنشاء غرفة صوتية</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <X size={24} color={Colors.dark} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.inputLabel}>عنوان الغرفة *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="مثال: نقاش حول البرمجة"
                                placeholderTextColor={Colors.medium}
                                value={newRoomTitle}
                                onChangeText={setNewRoomTitle}
                            />

                            <Text style={styles.inputLabel}>الوصف</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="وصف مختصر للموضوع"
                                placeholderTextColor={Colors.medium}
                                value={newRoomDesc}
                                onChangeText={setNewRoomDesc}
                                multiline
                                numberOfLines={3}
                            />

                            <Text style={styles.inputLabel}>الفئة</Text>
                            <View style={styles.categoriesContainer}>
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.categoryChip,
                                            selectedCategory === category && styles.categoryChipSelected,
                                        ]}
                                        onPress={() => setSelectedCategory(category)}
                                    >
                                        <Text style={[
                                            styles.categoryChipText,
                                            selectedCategory === category && styles.categoryChipTextSelected,
                                        ]}>
                                            {category}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>الخصوصية</Text>
                            <View style={styles.visibilityOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.visibilityOption,
                                        newRoomPublic && styles.visibilityOptionSelected,
                                    ]}
                                    onPress={() => setNewRoomPublic(true)}
                                >
                                    <Globe size={20} color={newRoomPublic ? Colors.primary : Colors.medium} />
                                    <View style={styles.visibilityTextContainer}>
                                        <Text style={[
                                            styles.visibilityOptionTitle,
                                            newRoomPublic && styles.visibilityOptionTitleSelected,
                                        ]}>
                                            عامة
                                        </Text>
                                        <Text style={styles.visibilityOptionDesc}>
                                            يمكن لأي شخص الانضمام
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.visibilityOption,
                                        !newRoomPublic && styles.visibilityOptionSelected,
                                    ]}
                                    onPress={() => setNewRoomPublic(false)}
                                >
                                    <Lock size={20} color={!newRoomPublic ? Colors.primary : Colors.medium} />
                                    <View style={styles.visibilityTextContainer}>
                                        <Text style={[
                                            styles.visibilityOptionTitle,
                                            !newRoomPublic && styles.visibilityOptionTitleSelected,
                                        ]}>
                                            خاصة
                                        </Text>
                                        <Text style={styles.visibilityOptionDesc}>
                                            بالدعوة فقط
                                        </Text>
                                    </View>
                                </TouchableOpacity>
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
                                style={styles.createRoomButton}
                                onPress={handleCreateRoom}
                            >
                                <Text style={styles.createRoomButtonText}>إنشاء الغرفة</Text>
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
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTextContainer: {
        marginLeft: 12,
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
    createButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
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
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    roomCard: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    hostInfo: {
        flexDirection: 'row',
        flex: 1,
    },
    hostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    hostDetails: {
        flex: 1,
    },
    roomTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.dark,
        marginBottom: 4,
    },
    hostMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostName: {
        fontSize: 13,
        color: Colors.medium,
        marginLeft: 6,
        marginRight: 8,
    },
    categoryBadge: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    categoryText: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '600',
    },
    roomStatus: {
        marginLeft: 8,
    },
    roomDescription: {
        fontSize: 14,
        color: Colors.dark,
        lineHeight: 20,
        marginBottom: 12,
    },
    speakersContainer: {
        marginBottom: 12,
    },
    speakersLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.medium,
        marginBottom: 8,
    },
    speakersList: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    speakerAvatar: {
        position: 'relative',
    },
    speakerImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.background,
    },
    mutedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    moreSpeakers: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.medium,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    moreSpeakersText: {
        fontSize: 10,
        color: 'white',
        fontWeight: '600',
    },
    roomFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    listenersCount: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listenersText: {
        fontSize: 13,
        color: Colors.medium,
        marginLeft: 6,
    },
    roomTime: {
        fontSize: 12,
        color: Colors.medium,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
    },
    joinButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
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
    modalBody: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.dark,
        marginBottom: 8,
        marginTop: 12,
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
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: Colors.secondary,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryChipSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '15',
    },
    categoryChipText: {
        fontSize: 13,
        color: Colors.dark,
    },
    categoryChipTextSelected: {
        color: Colors.primary,
        fontWeight: '600',
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
    createRoomButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        marginLeft: 8,
        alignItems: 'center',
    },
    createRoomButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});
