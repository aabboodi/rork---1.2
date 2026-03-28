import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Camera, Smile, MoreVertical } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { mockUsers } from '@/mocks/users';
import { currentUser } from '@/mocks/users';

interface SocialMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'story_comment';
  storyId?: string;
}

interface SocialChat {
  id: string;
  participants: string[];
  lastMessage?: SocialMessage;
  unreadCount: number;
  isStoryChat: boolean;
  storyId?: string;
}

export default function SocialMessagesScreen() {
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [socialChats] = useState<SocialChat[]>([
    {
      id: '1',
      participants: [currentUser.id, '1'],
      lastMessage: {
        id: '1',
        senderId: '1',
        receiverId: currentUser.id,
        content: 'أحببت قصتك الأخيرة! 😍',
        timestamp: Date.now() - 300000,
        type: 'story_comment',
        storyId: 'story_1'
      },
      unreadCount: 1,
      isStoryChat: true,
      storyId: 'story_1'
    },
    {
      id: '2',
      participants: [currentUser.id, '2'],
      lastMessage: {
        id: '2',
        senderId: '2',
        receiverId: currentUser.id,
        content: 'مرحباً! كيف حالك؟',
        timestamp: Date.now() - 600000,
        type: 'text'
      },
      unreadCount: 0,
      isStoryChat: false
    },
    {
      id: '3',
      participants: [currentUser.id, '3'],
      lastMessage: {
        id: '3',
        senderId: currentUser.id,
        receiverId: '3',
        content: 'شكراً لك على المشاركة',
        timestamp: Date.now() - 1200000,
        type: 'text'
      },
      unreadCount: 0,
      isStoryChat: false
    }
  ]);

  const [messages, setMessages] = useState<SocialMessage[]>([
    {
      id: '1',
      senderId: '1',
      receiverId: currentUser.id,
      content: 'أحببت قصتك الأخيرة! 😍',
      timestamp: Date.now() - 300000,
      type: 'story_comment',
      storyId: 'story_1'
    },
    {
      id: '2',
      senderId: currentUser.id,
      receiverId: '1',
      content: 'شكراً لك! سعيد أنها أعجبتك',
      timestamp: Date.now() - 240000,
      type: 'text'
    },
    {
      id: '3',
      senderId: '1',
      receiverId: currentUser.id,
      content: 'هل يمكنك مشاركة المزيد من هذا النوع؟',
      timestamp: Date.now() - 180000,
      type: 'text'
    }
  ]);

  const textInputRef = useRef<TextInput>(null);

  const getOtherParticipant = (chat: SocialChat) => {
    const otherUserId = chat.participants.find(id => id !== currentUser.id);
    return mockUsers.find(user => user.id === otherUserId);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'الآن';
    } else if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `منذ ${hours} ساعة`;
    } else {
      return date.toLocaleDateString('ar-SA');
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;

    const newMessage: SocialMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: selectedChat,
      content: messageText.trim(),
      timestamp: Date.now(),
      type: 'text'
    };

    setMessages([...messages, newMessage]);
    setMessageText('');
  };

  const handleChatPress = (chat: SocialChat) => {
    setSelectedChat(chat.id);
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
  };

  const handleCameraPress = () => {
    Alert.alert('كاميرا', 'سيتم فتح الكاميرا لالتقاط صورة');
  };

  const handleEmojiPress = () => {
    Alert.alert('الرموز التعبيرية', 'سيتم فتح لوحة الرموز التعبيرية');
  };

  const handleMorePress = () => {
    Alert.alert('المزيد', 'خيارات إضافية للمحادثة');
  };

  const renderChatItem = ({ item }: { item: SocialChat }) => {
    const otherUser = getOtherParticipant(item);
    if (!otherUser) return null;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <Image source={{ uri: otherUser.profilePicture }} style={styles.chatAvatar} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{otherUser.displayName}</Text>
            {item.isStoryChat && (
              <View style={styles.storyBadge}>
                <Text style={styles.storyBadgeText}>قصة</Text>
              </View>
            )}
            <Text style={styles.chatTime}>
              {item.lastMessage ? formatTime(item.lastMessage.timestamp) : ''}
            </Text>
          </View>
          <View style={styles.chatLastMessage}>
            <Text style={styles.lastMessageText} numberOfLines={1}>
              {item.lastMessage?.content || 'لا توجد رسائل'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageItem = ({ item }: { item: SocialMessage }) => {
    const isMyMessage = item.senderId === currentUser.id;
    const sender = mockUsers.find(user => user.id === item.senderId) || currentUser;

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        {!isMyMessage && (
          <Image source={{ uri: sender.profilePicture }} style={styles.messageAvatar} />
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          {item.type === 'story_comment' && (
            <View style={styles.storyReference}>
              <Text style={styles.storyReferenceText}>تعليق على القصة</Text>
            </View>
          )}
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (selectedChat) {
    const chat = socialChats.find(c => c.id === selectedChat);
    const otherUser = chat ? getOtherParticipant(chat) : null;
    const chatMessages = messages.filter(m => 
      (m.senderId === currentUser.id && m.receiverId === selectedChat) ||
      (m.senderId === selectedChat && m.receiverId === currentUser.id)
    );

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleBackToChats} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark} />
            </TouchableOpacity>
            {otherUser && (
              <>
                <Image source={{ uri: otherUser.profilePicture }} style={styles.headerAvatar} />
                <View style={styles.headerInfo}>
                  <Text style={styles.headerName}>{otherUser.displayName}</Text>
                  <Text style={styles.headerStatus}>نشط الآن</Text>
                </View>
              </>
            )}
            <TouchableOpacity onPress={handleMorePress} style={styles.moreButton}>
              <MoreVertical size={24} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            data={chatMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
          />

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={handleCameraPress} style={styles.inputButton}>
              <Camera size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="اكتب رسالة..."
              placeholderTextColor={Colors.medium}
              multiline
            />
            <TouchableOpacity onPress={handleEmojiPress} style={styles.inputButton}>
              <Smile size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
              <Send size={20} color={Colors.background} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المحادثات الاجتماعية</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Chat List */}
      <FlatList
        data={socialChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        style={styles.chatsList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  chatsList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    flex: 1,
  },
  storyBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  storyBadgeText: {
    fontSize: 10,
    color: Colors.background,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 12,
    color: Colors.medium,
  },
  chatLastMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessageText: {
    fontSize: 14,
    color: Colors.medium,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: 'bold',
  },
  // Chat Screen Styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.success,
  },
  moreButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    marginLeft: 'auto',
  },
  otherMessageBubble: {
    backgroundColor: Colors.background,
  },
  storyReference: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  storyReferenceText: {
    fontSize: 11,
    color: Colors.background,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.background,
  },
  otherMessageText: {
    color: Colors.dark,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: Colors.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
    fontSize: 14,
    color: Colors.dark,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});