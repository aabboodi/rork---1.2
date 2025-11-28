import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Pin, Archive, Check, CheckCheck, Mic, Camera, Video, File } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { formatTimeAgo } from '@/utils/dateUtils';

interface Chat {
  id: string;
  user: {
    id: string;
    name: string;
    picture: string;
    isOnline: boolean;
  };
  lastMessage: {
    content: string;
    senderId: string;
    timestamp: number;
    type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'money';
    status: 'sent' | 'delivered' | 'read';
    encrypted: boolean;
  };
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isGroup: boolean;
  groupName?: string;
  groupPicture?: string;
  participants?: number;
}

const mockChats: Chat[] = [
  {
    id: 'chat_1',
    user: {
      id: 'user_1',
      name: 'أحمد محمد',
      picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isOnline: true,
    },
    lastMessage: {
      content: 'مرحباً! كيف حالك؟',
      senderId: 'user_1',
      timestamp: Date.now() - 300000,
      type: 'text',
      status: 'read',
      encrypted: true,
    },
    unreadCount: 0,
    isPinned: true,
    isArchived: false,
    isMuted: false,
    isGroup: false,
  },
  {
    id: 'chat_2',
    user: {
      id: 'user_2',
      name: 'سارة علي',
      picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      isOnline: false,
    },
    lastMessage: {
      content: 'شكراً على المساعدة!',
      senderId: 'user_0',
      timestamp: Date.now() - 3600000,
      type: 'text',
      status: 'delivered',
      encrypted: true,
    },
    unreadCount: 3,
    isPinned: false,
    isArchived: false,
    isMuted: false,
    isGroup: false,
  },
  {
    id: 'chat_3',
    user: {
      id: 'group_1',
      name: 'فريق العمل',
      picture: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop',
      isOnline: false,
    },
    lastMessage: {
      content: 'محمد: اجتماع غداً الساعة 10',
      senderId: 'user_3',
      timestamp: Date.now() - 7200000,
      type: 'text',
      status: 'read',
      encrypted: true,
    },
    unreadCount: 0,
    isPinned: true,
    isArchived: false,
    isMuted: false,
    isGroup: true,
    groupName: 'فريق العمل',
    participants: 12,
  },
  {
    id: 'chat_4',
    user: {
      id: 'user_4',
      name: 'خالد السعيد',
      picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      isOnline: true,
    },
    lastMessage: {
      content: '📷 صورة',
      senderId: 'user_4',
      timestamp: Date.now() - 86400000,
      type: 'image',
      status: 'read',
      encrypted: true,
    },
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
    isMuted: true,
    isGroup: false,
  },
  {
    id: 'chat_5',
    user: {
      id: 'user_5',
      name: 'فاطمة أحمد',
      picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isOnline: false,
    },
    lastMessage: {
      content: '🎤 رسالة صوتية',
      senderId: 'user_5',
      timestamp: Date.now() - 172800000,
      type: 'voice',
      status: 'delivered',
      encrypted: true,
    },
    unreadCount: 1,
    isPinned: false,
    isArchived: false,
    isMuted: false,
    isGroup: false,
  },
];

export default function ChatListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);

  const handleChatPress = (chatId: string) => {
    if (selectedChats.length > 0) {
      // Selection mode
      toggleChatSelection(chatId);
    } else {
      // Normal mode - open chat
      router.push(`/chat/${chatId}`);
    }
  };

  const handleChatLongPress = (chatId: string) => {
    toggleChatSelection(chatId);
  };

  const toggleChatSelection = (chatId: string) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handlePinChat = (chatId: string) => {
    setChats(chats.map(chat =>
      chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
    ));
  };

  const handleArchiveChat = (chatId: string) => {
    setChats(chats.map(chat =>
      chat.id === chatId ? { ...chat, isArchived: !chat.isArchived } : chat
    ));
    Alert.alert('تم', 'تم أرشفة المحادثة');
  };

  const handleMuteChat = (chatId: string) => {
    setChats(chats.map(chat =>
      chat.id === chatId ? { ...chat, isMuted: !chat.isMuted } : chat
    ));
  };

  const handleDeleteChat = (chatId: string) => {
    Alert.alert(
      'حذف المحادثة',
      'هل تريد حذف هذه المحادثة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            setChats(chats.filter(chat => chat.id !== chatId));
          },
        },
      ]
    );
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Camera size={14} color={Colors.medium} />;
      case 'video':
        return <Video size={14} color={Colors.medium} />;
      case 'voice':
        return <Mic size={14} color={Colors.medium} />;
      case 'file':
        return <File size={14} color={Colors.medium} />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check size={16} color={Colors.medium} />;
      case 'delivered':
        return <CheckCheck size={16} color={Colors.medium} />;
      case 'read':
        return <CheckCheck size={16} color={Colors.primary} />;
      default:
        return null;
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const isSelected = selectedChats.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          item.isPinned && styles.pinnedChatItem,
          isSelected && styles.selectedChatItem,
        ]}
        onPress={() => handleChatPress(item.id)}
        onLongPress={() => handleChatLongPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.user.picture }}
            style={styles.avatar}
          />
          {item.user.isOnline && !item.isGroup && (
            <View style={styles.onlineBadge} />
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Chat Info */}
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <View style={styles.nameRow}>
              {item.isPinned && <Pin size={14} color={Colors.primary} style={styles.pinIcon} />}
              <Text style={styles.chatName} numberOfLines={1}>
                {item.isGroup ? item.groupName : item.user.name}
              </Text>
              {item.isGroup && (
                <Text style={styles.participantsCount}>({item.participants})</Text>
              )}
            </View>
            <Text style={styles.timestamp}>
              {formatTimeAgo(item.lastMessage.timestamp)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <View style={styles.messageContent}>
              {item.lastMessage.senderId === 'user_0' && getStatusIcon(item.lastMessage.status)}
              {getMessageIcon(item.lastMessage.type)}
              <Text
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.unreadMessage,
                ]}
                numberOfLines={1}
              >
                {item.lastMessage.content}
              </Text>
            </View>
            <View style={styles.badges}>
              {item.isMuted && (
                <View style={styles.mutedIcon}>
                  <Text style={styles.mutedText}>🔇</Text>
                </View>
              )}
              {item.lastMessage.encrypted && (
                <View style={styles.encryptedIcon}>
                  <Text style={styles.encryptedText}>🔒</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Sort chats: pinned first, then by timestamp
  const sortedChats = [...chats]
    .filter(chat => !chat.isArchived)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastMessage.timestamp - a.lastMessage.timestamp;
    });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المحادثات</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/chat/new')}
          >
            <MessageCircle size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={sortedChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MessageCircle size={48} color={Colors.medium} />
            <Text style={styles.emptyText}>لا توجد محادثات</Text>
            <Text style={styles.emptySubtext}>ابدأ محادثة جديدة</Text>
          </View>
        }
      />

      {/* Selection Actions */}
      {selectedChats.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {selectedChats.length} محددة
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => {
                selectedChats.forEach(handleArchiveChat);
                setSelectedChats([]);
              }}
            >
              <Archive size={20} color={Colors.dark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => {
                selectedChats.forEach(handleDeleteChat);
                setSelectedChats([]);
              }}
            >
              <Text style={styles.deleteText}>حذف</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pinnedChatItem: {
    backgroundColor: Colors.primary + '05',
  },
  selectedChatItem: {
    backgroundColor: Colors.primary + '15',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinIcon: {
    marginRight: 6,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    flex: 1,
  },
  participantsCount: {
    fontSize: 14,
    color: Colors.medium,
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.medium,
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.medium,
    marginLeft: 6,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: Colors.dark,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mutedIcon: {
    marginLeft: 4,
  },
  mutedText: {
    fontSize: 12,
  },
  encryptedIcon: {
    marginLeft: 4,
  },
  encryptedText: {
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  selectionActions: {
    flexDirection: 'row',
  },
  selectionButton: {
    marginLeft: 16,
    padding: 8,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
});