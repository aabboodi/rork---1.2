import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { Shield, Lock, Send, MoreVertical, Clock, CheckCheck } from 'lucide-react-native';
import { MessageSecurityService, SecureMessage, ChatSession } from '@/services/security/MessageSecurityService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

interface E2EEChatInterfaceProps {
  chatId: string;
  currentUserId: string;
  contactId: string;
  contactName: string;
  onBack?: () => void;
}

export const E2EEChatInterface: React.FC<E2EEChatInterfaceProps> = ({
  chatId,
  currentUserId,
  contactId,
  contactName,
  onBack
}) => {
  const [messages, setMessages] = useState<SecureMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [e2eeStatus, setE2eeStatus] = useState<'enabled' | 'disabled' | 'initializing'>('initializing');
  
  const messageSecurityService = MessageSecurityService.getInstance();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeChat();
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      
      // Initialize message security
      await messageSecurityService.initializeMessageSecurity(currentUserId);
      
      // Get or create chat session
      let session = messageSecurityService.getChatSession(chatId);
      
      if (!session) {
        session = await messageSecurityService.createSecureChatSession(
          chatId,
          [currentUserId, contactId],
          false, // Not a group chat
          false, // Disappearing messages disabled by default
          24 * 60 * 60 * 1000 // 24 hours
        );
      }
      
      setChatSession(session);
      setE2eeStatus(session.e2eeEnabled ? 'enabled' : 'disabled');
      
      // Load existing messages
      const existingMessages = await messageSecurityService.getChatMessages(chatId);
      setMessages(existingMessages.reverse()); // Reverse to show oldest first
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      Alert.alert('Error', 'Failed to initialize secure chat');
      setE2eeStatus('disabled');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !chatSession) return;

    try {
      setIsSending(true);
      
      const secureMessage = await messageSecurityService.sendSecureMessage(
        chatId,
        currentUserId,
        newMessage.trim(),
        'text'
      );

      // Add message to local state immediately for better UX
      setMessages(prev => [...prev, {
        ...secureMessage,
        content: newMessage.trim() // Show original content locally
      }]);
      
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send secure message');
    } finally {
      setIsSending(false);
    }
  };

  const toggleDisappearingMessages = async () => {
    if (!chatSession) return;

    try {
      const newState = !chatSession.disappearingMessagesEnabled;
      await messageSecurityService.setDisappearingMessages(
        chatId,
        newState,
        24 * 60 * 60 * 1000 // 24 hours
      );
      
      setChatSession(prev => prev ? {
        ...prev,
        disappearingMessagesEnabled: newState
      } : null);
      
      Alert.alert(
        'Disappearing Messages',
        newState ? 'Messages will now disappear after 24 hours' : 'Disappearing messages disabled'
      );
    } catch (error) {
      console.error('Failed to toggle disappearing messages:', error);
      Alert.alert('Error', 'Failed to update disappearing messages setting');
    }
  };

  const rotateKeys = async () => {
    if (!chatSession) return;

    Alert.alert(
      'Rotate Encryption Keys',
      'This will generate new encryption keys for enhanced security. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate Keys',
          style: 'destructive',
          onPress: async () => {
            try {
              await messageSecurityService.rotateSessionKeys(chatId);
              Alert.alert('Success', 'Encryption keys have been rotated');
            } catch (error) {
              console.error('Failed to rotate keys:', error);
              Alert.alert('Error', 'Failed to rotate encryption keys');
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: SecureMessage }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const isExpiring = item.expiresAt && item.expiresAt > Date.now();
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
          isExpiring && styles.expiringMessage
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {formatRelativeTime(item.timestamp)}
            </Text>
            
            {isOwnMessage && (
              <View style={styles.messageStatus}>
                {item.deliveryStatus === 'read' && (
                  <CheckCheck size={12} color="#4CAF50" />
                )}
                {item.deliveryStatus === 'delivered' && (
                  <CheckCheck size={12} color="#9E9E9E" />
                )}
                {item.deliveryStatus === 'sent' && (
                  <CheckCheck size={12} color="#9E9E9E" />
                )}
              </View>
            )}
            
            {isExpiring && (
              <Clock size={12} color="#FF9800" style={styles.expiringIcon} />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.contactName}>{contactName}</Text>
          <View style={styles.securityStatus}>
            <Shield 
              size={12} 
              color={e2eeStatus === 'enabled' ? '#4CAF50' : '#FF5722'} 
            />
            <Text style={[
              styles.securityStatusText,
              { color: e2eeStatus === 'enabled' ? '#4CAF50' : '#FF5722' }
            ]}>
              {e2eeStatus === 'enabled' ? 'End-to-end encrypted' : 
               e2eeStatus === 'initializing' ? 'Initializing...' : 'Not encrypted'}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity onPress={() => showSecurityOptions()} style={styles.menuButton}>
        <MoreVertical size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const showSecurityOptions = () => {
    Alert.alert(
      'Security Options',
      'Choose a security action',
      [
        {
          text: 'Disappearing Messages',
          onPress: toggleDisappearingMessages
        },
        {
          text: 'Rotate Keys',
          onPress: rotateKeys
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Shield size={48} color="#2196F3" />
          <Text style={styles.loadingText}>Initializing secure chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderHeader()}
        
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a secure message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {e2eeStatus === 'enabled' ? (
              <Lock size={20} color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        
        {chatSession?.disappearingMessagesEnabled && (
          <View style={styles.disappearingNotice}>
            <Clock size={14} color="#FF9800" />
            <Text style={styles.disappearingNoticeText}>
              Messages disappear after 24 hours
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backButton: {
    padding: 4
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196F3'
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  securityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  securityStatusText: {
    fontSize: 12,
    fontWeight: '500'
  },
  menuButton: {
    padding: 8
  },
  messagesList: {
    flex: 1
  },
  messagesContainer: {
    paddingVertical: 16
  },
  messageContainer: {
    paddingHorizontal: 16,
    marginVertical: 2
  },
  ownMessage: {
    alignItems: 'flex-end'
  },
  otherMessage: {
    alignItems: 'flex-start'
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18
  },
  ownBubble: {
    backgroundColor: '#2196F3'
  },
  otherBubble: {
    backgroundColor: '#fff'
  },
  expiringMessage: {
    borderWidth: 1,
    borderColor: '#FF9800'
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20
  },
  ownMessageText: {
    color: '#fff'
  },
  otherMessageText: {
    color: '#333'
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  messageTime: {
    fontSize: 11
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)'
  },
  otherMessageTime: {
    color: '#999'
  },
  messageStatus: {
    marginLeft: 4
  },
  expiringIcon: {
    marginLeft: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f9f9f9'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc'
  },
  disappearingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#FFF3E0'
  },
  disappearingNoticeText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500'
  }
});

export default E2EEChatInterface;