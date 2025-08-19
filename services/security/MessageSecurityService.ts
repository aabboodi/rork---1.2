import AsyncStorage from '@react-native-async-storage/async-storage';
import { E2EEService, E2EEMessage } from './E2EEService';
import * as Crypto from 'expo-crypto';

export interface SecureMessage {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  messageType: 'text' | 'image' | 'file' | 'voice';
  isEncrypted: boolean;
  sessionId?: string;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  expiresAt?: number; // For disappearing messages
  forwardSecrecy: boolean;
  integrityHash: string;
}

export interface ChatSession {
  chatId: string;
  participants: string[];
  sessionId: string;
  isGroupChat: boolean;
  e2eeEnabled: boolean;
  createdAt: number;
  lastActivity: number;
  disappearingMessagesEnabled: boolean;
  disappearingMessagesDuration: number; // in milliseconds
}

export class MessageSecurityService {
  private static instance: MessageSecurityService;
  private e2eeService: E2EEService;
  private chatSessions: Map<string, ChatSession> = new Map();
  private messageQueue: Map<string, SecureMessage[]> = new Map();
  private deliveryCallbacks: Map<string, (message: SecureMessage) => void> = new Map();

  private constructor() {
    this.e2eeService = E2EEService.getInstance();
  }

  static getInstance(): MessageSecurityService {
    if (!MessageSecurityService.instance) {
      MessageSecurityService.instance = new MessageSecurityService();
    }
    return MessageSecurityService.instance;
  }

  // Initialize message security for user
  async initializeMessageSecurity(userId: string): Promise<void> {
    try {
      await this.e2eeService.initializeE2EE(userId);
      await this.loadChatSessions(userId);
      await this.startMessageCleanupScheduler();
      
      console.log('Message security initialized for user:', userId);
    } catch (error) {
      console.error('Failed to initialize message security:', error);
      throw new Error('Message security initialization failed');
    }
  }

  // Create secure chat session
  async createSecureChatSession(
    chatId: string,
    participants: string[],
    isGroupChat: boolean = false,
    enableDisappearingMessages: boolean = false,
    disappearingDuration: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): Promise<ChatSession> {
    try {
      // For group chats, we need to establish sessions with each participant
      let sessionId: string;
      
      if (isGroupChat) {
        // Create group session (simplified - in production use group key agreement)
        sessionId = `group_${chatId}_${Date.now()}`;
      } else {
        // Create pairwise session
        const contactId = participants.find(p => p !== participants[0]); // Get the other participant
        if (!contactId) {
          throw new Error('Invalid participants for chat session');
        }
        
        // Get contact's public key bundle (this would come from server)
        const contactPublicKey = await this.getContactPublicKey(contactId);
        const contactPreKey = await this.getContactPreKey(contactId);
        
        sessionId = await this.e2eeService.createSession(contactId, contactPublicKey, contactPreKey);
      }

      const chatSession: ChatSession = {
        chatId,
        participants,
        sessionId,
        isGroupChat,
        e2eeEnabled: true,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        disappearingMessagesEnabled: enableDisappearingMessages,
        disappearingMessagesDuration: disappearingDuration
      };

      this.chatSessions.set(chatId, chatSession);
      await this.saveChatSessions();

      return chatSession;
    } catch (error) {
      console.error('Failed to create secure chat session:', error);
      throw new Error('Secure chat session creation failed');
    }
  }

  // Send secure message
  async sendSecureMessage(
    chatId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'voice' = 'text'
  ): Promise<SecureMessage> {
    const chatSession = this.chatSessions.get(chatId);
    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    try {
      let encryptedContent: string;
      let sessionId: string | undefined;

      if (chatSession.e2eeEnabled) {
        // Encrypt message using E2EE
        const e2eeMessage = await this.e2eeService.encryptMessage(chatSession.sessionId, content);
        encryptedContent = JSON.stringify(e2eeMessage);
        sessionId = chatSession.sessionId;
      } else {
        // Fallback to basic encryption
        encryptedContent = await this.basicEncrypt(content);
      }

      // Calculate integrity hash
      const integrityHash = await this.calculateIntegrityHash(content, senderId, Date.now());

      const secureMessage: SecureMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId,
        senderId,
        receiverId: chatSession.participants.find(p => p !== senderId) || '',
        content: encryptedContent,
        timestamp: Date.now(),
        messageType,
        isEncrypted: true,
        sessionId,
        deliveryStatus: 'sent',
        forwardSecrecy: chatSession.e2eeEnabled,
        integrityHash,
        expiresAt: chatSession.disappearingMessagesEnabled 
          ? Date.now() + chatSession.disappearingMessagesDuration 
          : undefined
      };

      // Store message temporarily for delivery confirmation
      await this.storeMessage(secureMessage);

      // Update chat session activity
      chatSession.lastActivity = Date.now();
      this.chatSessions.set(chatId, chatSession);

      return secureMessage;
    } catch (error) {
      console.error('Failed to send secure message:', error);
      throw new Error('Secure message sending failed');
    }
  }

  // Receive and decrypt secure message
  async receiveSecureMessage(encryptedMessage: any): Promise<SecureMessage> {
    try {
      const chatSession = this.chatSessions.get(encryptedMessage.chatId);
      if (!chatSession) {
        throw new Error('Chat session not found for received message');
      }

      let decryptedContent: string;

      if (chatSession.e2eeEnabled && encryptedMessage.sessionId) {
        // Decrypt using E2EE
        const e2eeMessage: E2EEMessage = JSON.parse(encryptedMessage.content);
        decryptedContent = await this.e2eeService.decryptMessage(e2eeMessage);
      } else {
        // Fallback decryption
        decryptedContent = await this.basicDecrypt(encryptedMessage.content);
      }

      // Verify message integrity
      const isIntegrityValid = await this.verifyIntegrityHash(
        decryptedContent,
        encryptedMessage.senderId,
        encryptedMessage.timestamp,
        encryptedMessage.integrityHash
      );

      if (!isIntegrityValid) {
        throw new Error('Message integrity verification failed');
      }

      const secureMessage: SecureMessage = {
        ...encryptedMessage,
        content: decryptedContent,
        deliveryStatus: 'delivered'
      };

      // Store decrypted message
      await this.storeMessage(secureMessage);

      // Update chat session activity
      chatSession.lastActivity = Date.now();
      this.chatSessions.set(encryptedMessage.chatId, chatSession);

      return secureMessage;
    } catch (error) {
      console.error('Failed to receive secure message:', error);
      throw new Error('Secure message receiving failed');
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const message = await this.getMessage(messageId);
      if (message) {
        message.deliveryStatus = 'read';
        await this.storeMessage(message);
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  // Get chat messages
  async getChatMessages(chatId: string, limit: number = 50): Promise<SecureMessage[]> {
    try {
      const storageKey = `secure_messages_${chatId}`;
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (!stored) return [];

      const messages: SecureMessage[] = JSON.parse(stored);
      
      // Filter out expired messages
      const now = Date.now();
      const validMessages = messages.filter(msg => !msg.expiresAt || msg.expiresAt > now);
      
      // Save filtered messages back
      if (validMessages.length !== messages.length) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(validMessages));
      }

      return validMessages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      return [];
    }
  }

  // Enable/disable disappearing messages
  async setDisappearingMessages(
    chatId: string,
    enabled: boolean,
    duration: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    const chatSession = this.chatSessions.get(chatId);
    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    chatSession.disappearingMessagesEnabled = enabled;
    chatSession.disappearingMessagesDuration = duration;
    
    this.chatSessions.set(chatId, chatSession);
    await this.saveChatSessions();
  }

  // Rotate session keys (forward secrecy)
  async rotateSessionKeys(chatId: string): Promise<void> {
    const chatSession = this.chatSessions.get(chatId);
    if (!chatSession || !chatSession.e2eeEnabled) {
      return;
    }

    try {
      // Reset the current session
      await this.e2eeService.resetSession(chatSession.sessionId);

      // Create new session
      if (!chatSession.isGroupChat) {
        const contactId = chatSession.participants.find(p => p !== chatSession.participants[0]);
        if (contactId) {
          const contactPublicKey = await this.getContactPublicKey(contactId);
          const contactPreKey = await this.getContactPreKey(contactId);
          
          const newSessionId = await this.e2eeService.createSession(contactId, contactPublicKey, contactPreKey);
          chatSession.sessionId = newSessionId;
          
          this.chatSessions.set(chatId, chatSession);
          await this.saveChatSessions();
        }
      }

      console.log('Session keys rotated for chat:', chatId);
    } catch (error) {
      console.error('Failed to rotate session keys:', error);
      throw new Error('Session key rotation failed');
    }
  }

  // Verify message sender
  async verifyMessageSender(message: SecureMessage, expectedSenderId: string): Promise<boolean> {
    try {
      if (!message.sessionId) return false;

      const chatSession = this.chatSessions.get(message.chatId);
      if (!chatSession || !chatSession.e2eeEnabled) return false;

      // Get sender's public key
      const senderPublicKey = await this.getContactPublicKey(expectedSenderId);
      
      // Parse E2EE message
      const e2eeMessage: E2EEMessage = JSON.parse(message.content);
      
      // Verify message using E2EE service
      return await this.e2eeService.verifyMessage(e2eeMessage, senderPublicKey);
    } catch (error) {
      console.error('Failed to verify message sender:', error);
      return false;
    }
  }

  // Get chat session info
  getChatSession(chatId: string): ChatSession | null {
    return this.chatSessions.get(chatId) || null;
  }

  // Delete chat and all messages
  async deleteChat(chatId: string): Promise<void> {
    try {
      // Delete chat session
      this.chatSessions.delete(chatId);
      await this.saveChatSessions();

      // Delete all messages
      const storageKey = `secure_messages_${chatId}`;
      await AsyncStorage.removeItem(storageKey);

      console.log('Chat deleted:', chatId);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw new Error('Chat deletion failed');
    }
  }

  // Private helper methods
  private async loadChatSessions(userId: string): Promise<void> {
    try {
      const storageKey = `chat_sessions_${userId}`;
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const sessionsData = JSON.parse(stored);
        this.chatSessions = new Map(Object.entries(sessionsData));
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }

  private async saveChatSessions(): Promise<void> {
    try {
      const userId = 'current_user'; // This should come from auth context
      const storageKey = `chat_sessions_${userId}`;
      const sessionsData = Object.fromEntries(this.chatSessions);
      await AsyncStorage.setItem(storageKey, JSON.stringify(sessionsData));
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  }

  private async storeMessage(message: SecureMessage): Promise<void> {
    try {
      const storageKey = `secure_messages_${message.chatId}`;
      const stored = await AsyncStorage.getItem(storageKey);
      
      let messages: SecureMessage[] = stored ? JSON.parse(stored) : [];
      
      // Update existing message or add new one
      const existingIndex = messages.findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.push(message);
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to store message:', error);
    }
  }

  private async getMessage(messageId: string): Promise<SecureMessage | null> {
    try {
      // This is a simplified implementation - in production, you'd have an index
      for (const [chatId] of this.chatSessions) {
        const messages = await this.getChatMessages(chatId);
        const message = messages.find(m => m.id === messageId);
        if (message) return message;
      }
      return null;
    } catch (error) {
      console.error('Failed to get message:', error);
      return null;
    }
  }

  private async basicEncrypt(content: string): Promise<string> {
    // Simple encryption for fallback (use proper encryption in production)
    const key = 'fallback_key_' + Date.now();
    return btoa(content + '|' + key);
  }

  private async basicDecrypt(encryptedContent: string): Promise<string> {
    // Simple decryption for fallback
    const decoded = atob(encryptedContent);
    return decoded.split('|')[0];
  }

  private async calculateIntegrityHash(content: string, senderId: string, timestamp: number): Promise<string> {
    const data = `${content}|${senderId}|${timestamp}`;
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }

  private async verifyIntegrityHash(
    content: string,
    senderId: string,
    timestamp: number,
    expectedHash: string
  ): Promise<boolean> {
    const calculatedHash = await this.calculateIntegrityHash(content, senderId, timestamp);
    return calculatedHash === expectedHash;
  }

  private async getContactPublicKey(contactId: string): Promise<string> {
    // This would fetch from server or local storage
    // For demo purposes, return a mock key
    return `public_key_${contactId}`;
  }

  private async getContactPreKey(contactId: string): Promise<string> {
    // This would fetch from server or local storage
    // For demo purposes, return a mock key
    return `pre_key_${contactId}`;
  }

  private async startMessageCleanupScheduler(): Promise<void> {
    // Clean up expired messages every hour
    setInterval(async () => {
      await this.cleanupExpiredMessages();
    }, 60 * 60 * 1000);
  }

  private async cleanupExpiredMessages(): Promise<void> {
    try {
      const now = Date.now();
      
      for (const [chatId] of this.chatSessions) {
        const messages = await this.getChatMessages(chatId, 1000); // Get more messages for cleanup
        const validMessages = messages.filter(msg => !msg.expiresAt || msg.expiresAt > now);
        
        if (validMessages.length !== messages.length) {
          const storageKey = `secure_messages_${chatId}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(validMessages));
          console.log(`Cleaned up ${messages.length - validMessages.length} expired messages from chat ${chatId}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired messages:', error);
    }
  }
}

export default MessageSecurityService;