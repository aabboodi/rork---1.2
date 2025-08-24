import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Bot, 
  MessageSquare, 
  Send,
  Settings,
  Users,
  Zap,
  CheckCircle
} from 'lucide-react-native';

import { useThemeStore } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';
import useChatAutoReply from '@/hooks/useChatAutoReply';
import ChatAutoReplyDashboard from '@/components/ChatAutoReplyDashboard';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other' | 'ai';
  timestamp: number;
  isAutoReply?: boolean;
}

export default function Phase3ChatAutoReplyDemo() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const {
    threadPersona,
    createThreadPersona,
    generateSuggestions,
    replySuggestions,
    updateThreadPreferences,
    loading,
    error
  } = useChatAutoReply('demo-chat-123');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey! How are you doing today?',
      sender: 'other',
      timestamp: Date.now() - 60000
    },
    {
      id: '2', 
      text: 'I\'m doing great, thanks for asking! Just working on some exciting new features.',
      sender: 'user',
      timestamp: Date.now() - 30000
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [demoMode, setDemoMode] = useState<'suggest' | 'auto'>('suggest');

  useEffect(() => {
    initializeDemo();
  }, []);

  const initializeDemo = async () => {
    try {
      // Create thread persona for demo
      await createThreadPersona('demo-chat-123', false, messages);
      console.log('✅ Demo thread persona created');
    } catch (err) {
      console.error('Failed to initialize demo:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simulate other person's response after a delay
    setTimeout(() => {
      const responses = [
        'That sounds interesting! Tell me more.',
        'Cool! What kind of features are you working on?',
        'Nice! I\'d love to hear about your progress.',
        'Awesome! How\'s the development going?'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const otherMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: 'other',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, otherMessage]);
      
      // Generate AI suggestions for the response
      generateSuggestions('demo-chat-123', randomResponse, { isGroup: false });
    }, 2000);
  };

  const handleUseSuggestion = (suggestion: string) => {
    const aiMessage: Message = {
      id: Date.now().toString(),
      text: suggestion,
      sender: 'ai',
      timestamp: Date.now(),
      isAutoReply: true
    };

    setMessages(prev => [...prev, aiMessage]);
    Alert.alert('AI Reply Sent', 'The suggested reply has been sent automatically.');
  };

  const toggleAutoMode = async () => {
    try {
      const newMode = demoMode === 'suggest' ? 'auto' : 'suggest';
      setDemoMode(newMode);
      
      await updateThreadPreferences('demo-chat-123', {
        autoMode: newMode === 'auto',
        suggestMode: newMode === 'suggest'
      });
      
      Alert.alert(
        'Mode Changed', 
        `Switched to ${newMode === 'auto' ? 'Auto-Reply' : 'Suggest'} mode`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to update mode');
    }
  };

  if (showDashboard) {
    return <ChatAutoReplyDashboard />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AccessibleButton
          title=""
          onPress={() => router.back()}
          variant="ghost"
          size="small"
          icon={<ArrowLeft size={24} color={colors.text} />}
          accessibilityLabel="Go back"
        />
        <AccessibleText variant="heading2" weight="bold">
          Phase 3: Chat Auto-Reply
        </AccessibleText>
        <AccessibleButton
          title=""
          onPress={() => setShowDashboard(true)}
          variant="ghost"
          size="small"
          icon={<Settings size={24} color={colors.text} />}
          accessibilityLabel="Settings"
        />
      </View>

      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statusLeft}>
          <Bot size={16} color={colors.primary} />
          <AccessibleText variant="caption" color="primary" style={styles.statusText}>
            {threadPersona ? 'AI Persona Active' : 'Initializing...'}
          </AccessibleText>
        </View>
        
        <View style={styles.statusRight}>
          <AccessibleButton
            title={demoMode === 'suggest' ? 'Suggest Mode' : 'Auto Mode'}
            onPress={toggleAutoMode}
            variant={demoMode === 'auto' ? 'primary' : 'ghost'}
            size="small"
            icon={demoMode === 'auto' ? <Zap size={16} color={colors.textInverse} /> : <MessageSquare size={16} color={colors.text} />}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Thread Persona Info */}
        {threadPersona && (
          <AccessibleCard variant="elevated" padding="medium" style={styles.personaCard}>
            <View style={styles.personaHeader}>
              <Users size={20} color={colors.primary} />
              <AccessibleText variant="body" weight="semibold" style={styles.personaTitle}>
                Thread Persona
              </AccessibleText>
            </View>
            
            <View style={styles.personaDetails}>
              <View style={styles.personaDetail}>
                <AccessibleText variant="caption" color="secondary">Tone:</AccessibleText>
                <AccessibleText variant="body" weight="medium">{threadPersona.style.tone}</AccessibleText>
              </View>
              <View style={styles.personaDetail}>
                <AccessibleText variant="caption" color="secondary">Length:</AccessibleText>
                <AccessibleText variant="body" weight="medium">{threadPersona.style.length}</AccessibleText>
              </View>
              <View style={styles.personaDetail}>
                <AccessibleText variant="caption" color="secondary">Mode:</AccessibleText>
                <AccessibleText variant="body" weight="medium">
                  {threadPersona.preferences.autoMode ? 'Auto' : 'Suggest'}
                </AccessibleText>
              </View>
            </View>
          </AccessibleCard>
        )}

        {/* Messages */}
        <AccessibleCard variant="elevated" padding="large" style={styles.messagesCard}>
          <View style={styles.messagesHeader}>
            <MessageSquare size={20} color={colors.primary} />
            <AccessibleText variant="heading3" weight="semibold" style={styles.messagesTitle}>
              Demo Conversation
            </AccessibleText>
          </View>

          <View style={styles.messagesList}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageItem,
                  message.sender === 'user' ? styles.userMessage : 
                  message.sender === 'ai' ? styles.aiMessage : styles.otherMessage,
                  { 
                    backgroundColor: message.sender === 'user' ? colors.primary + '20' : 
                                   message.sender === 'ai' ? colors.success + '20' : colors.surface 
                  }
                ]}
              >
                <View style={styles.messageHeader}>
                  <AccessibleText variant="caption" color="secondary">
                    {message.sender === 'user' ? 'You' : 
                     message.sender === 'ai' ? 'AI Assistant' : 'Demo User'}
                  </AccessibleText>
                  {message.isAutoReply && (
                    <View style={[styles.autoReplyBadge, { backgroundColor: colors.success }]}>
                      <CheckCircle size={12} color={colors.textInverse} />
                      <AccessibleText variant="caption" color="textInverse" style={styles.badgeText}>
                        Auto
                      </AccessibleText>
                    </View>
                  )}
                </View>
                <AccessibleText variant="body" style={styles.messageText}>
                  {message.text}
                </AccessibleText>
                <AccessibleText variant="caption" color="secondary" style={styles.messageTime}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </AccessibleText>
              </View>
            ))}
          </View>

          {/* Message Input */}
          <View style={styles.messageInput}>
            <TextInput
              style={[styles.textInput, { 
                color: colors.text, 
                borderColor: colors.border,
                backgroundColor: colors.surface
              }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <AccessibleButton
              title=""
              onPress={handleSendMessage}
              variant="primary"
              size="small"
              icon={<Send size={20} color={colors.textInverse} />}
              disabled={!newMessage.trim()}
              style={styles.sendButton}
            />
          </View>
        </AccessibleCard>

        {/* Reply Suggestions */}
        {replySuggestions.length > 0 && (
          <AccessibleCard variant="elevated" padding="large" style={styles.suggestionsCard}>
            <View style={styles.suggestionsHeader}>
              <Bot size={20} color={colors.primary} />
              <AccessibleText variant="heading3" weight="semibold" style={styles.suggestionsTitle}>
                AI Reply Suggestions
              </AccessibleText>
            </View>

            {replySuggestions.map((suggestion, index) => (
              <View key={suggestion.id} style={[styles.suggestionItem, { borderColor: colors.border }]}>
                <View style={styles.suggestionContent}>
                  <AccessibleText variant="body" style={styles.suggestionText}>
                    {suggestion.text}
                  </AccessibleText>
                  <View style={styles.suggestionMeta}>
                    <AccessibleText variant="caption" color="secondary">
                      Confidence: {Math.round(suggestion.confidence * 100)}%
                    </AccessibleText>
                    <AccessibleText variant="caption" color="secondary">
                      Style: {suggestion.style.tone}
                    </AccessibleText>
                  </View>
                </View>
                <AccessibleButton
                  title="Use"
                  onPress={() => handleUseSuggestion(suggestion.text)}
                  variant="primary"
                  size="small"
                  style={styles.useButton}
                />
              </View>
            ))}
          </AccessibleCard>
        )}

        {/* Demo Instructions */}
        <AccessibleCard variant="outlined" padding="large" style={styles.instructionsCard}>
          <AccessibleText variant="heading3" weight="semibold" style={styles.instructionsTitle}>
            Demo Instructions
          </AccessibleText>
          <AccessibleText variant="body" color="secondary" style={styles.instructionsText}>
            1. Type and send messages to simulate a conversation{'\n'}
            2. The demo will automatically respond and generate AI suggestions{'\n'}
            3. Toggle between Suggest and Auto modes{'\n'}
            4. Use the Settings button to access the full dashboard{'\n'}
            5. Try different writing styles to see how the AI adapts
          </AccessibleText>
        </AccessibleCard>

        {error && (
          <AccessibleCard variant="outlined" padding="large" style={[styles.errorCard, { borderColor: colors.error }]}>
            <AccessibleText variant="body" color="error">
              Error: {error}
            </AccessibleText>
          </AccessibleCard>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  personaCard: {
    marginBottom: 20,
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  personaTitle: {
    marginLeft: 8,
  },
  personaDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  personaDetail: {
    alignItems: 'center',
  },
  messagesCard: {
    marginBottom: 20,
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  messagesTitle: {
    marginLeft: 8,
  },
  messagesList: {
    marginBottom: 16,
  },
  messageItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  aiMessage: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  autoReplyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 10,
  },
  messageText: {
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  messageInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
  },
  suggestionsCard: {
    marginBottom: 20,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionsTitle: {
    marginLeft: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionContent: {
    flex: 1,
    marginRight: 12,
  },
  suggestionText: {
    marginBottom: 4,
  },
  suggestionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  useButton: {
    minWidth: 60,
  },
  instructionsCard: {
    marginBottom: 20,
  },
  instructionsTitle: {
    marginBottom: 12,
  },
  instructionsText: {
    lineHeight: 20,
  },
  errorCard: {
    marginBottom: 20,
    borderWidth: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});