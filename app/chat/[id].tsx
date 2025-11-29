import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert, ActionSheetIOS } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Send, Paperclip, Mic, Image as ImageIcon, Wallet, Phone, Video, MoreVertical, ArrowLeft, Camera, Users, Radio, Share2, Copy, Info, Shield, Lock, Key, AlertTriangle, CheckCircle, Eye, EyeOff, Check, CheckCheck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { MessageSecurityService } from '@/services/security/MessageSecurityService';
import { E2EEService } from '@/services/security/E2EEService';
import E2EEChatInterface from '@/components/E2EEChatInterface';
import { mockChats, mockMessages } from '@/mocks/chats';
import { Message, KeyExchangeSession, KeyVerificationResult } from '@/types';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { formatTime } from '@/utils/dateUtils';
import { translations } from '@/constants/i18n';
import SecurityManager from '@/services/security/SecurityManager';
import KeyManager from '@/services/security/KeyManager';
import BiometricAuthService from '@/services/security/BiometricAuthService';
import DLPService from '@/services/security/DLPService';
import type { DLPScanResult } from '@/services/security/DLPService';
import SocialEngineeringProtectionService from '@/services/security/SocialEngineeringProtectionService';
import LinkPreview from '@/components/LinkPreview';
import FileAttachment from '@/components/FileAttachment';
import SocialEngineeringWarning from '@/components/SocialEngineeringWarning';

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { userId, language } = useAuthStore();
  const { balances, addTransaction, updateBalance } = useWalletStore();
  const t = translations[language];

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chat, setChat] = useState(mockChats.find(c => c.id === id));
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Enhanced E2EE state
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [e2eeStatus, setE2eeStatus] = useState<'disabled' | 'pending' | 'established' | 'verified' | 'warning'>('pending');
  const [keyExchangeSession, setKeyExchangeSession] = useState<KeyExchangeSession | null>(null);
  const [keyFingerprint, setKeyFingerprint] = useState<string>('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [securityLevel, setSecurityLevel] = useState<'standard' | 'high' | 'maximum'>('high');

  // DLP state
  const [dlpEnabled, setDlpEnabled] = useState(true);
  const [dlpWarning, setDlpWarning] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [dlpScanResult, setDlpScanResult] = useState<DLPScanResult | null>(null);
  const [showSensitiveContent, setShowSensitiveContent] = useState(false);

  const [securityManager] = useState(() => SecurityManager.getInstance());
  const [keyManager] = useState(() => KeyManager.getInstance());
  const [biometricAuth] = useState(() => BiometricAuthService.getInstance());
  const [dlpService] = useState(() => DLPService.getInstance());
  const [messageSecurityService] = useState(() => MessageSecurityService.getInstance());
  const [e2eeService] = useState(() => E2EEService.getInstance());
  const [socialEngineeringService] = useState(() => SocialEngineeringProtectionService.getInstance());
  const [useE2EEInterface, setUseE2EEInterface] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    initializeChat();
    initializeDLP();
  }, [id, userId]);

  useEffect(() => {
    if (chat && !chat.isGroup && !chat.isChannel && encryptionEnabled) {
      initiateE2EESetup();
    }
  }, [chat, encryptionEnabled]);

  // CRITICAL: Initialize chat with Signal Protocol E2EE setup and DLP
  const initializeChat = async () => {
    try {
      // Load messages for this chat
      const chatMessages = mockMessages.filter(m => m.chatId === id);

      // Decrypt messages if they are encrypted using Signal Protocol
      const decryptedMessages = await Promise.all(
        chatMessages.map(async (message) => {
          if (message.encrypted && message.e2eeMessage && userId) {
            try {
              const sessionKey = keyManager.getSessionKey(id as string);
              if (sessionKey) {
                const cryptoService = securityManager.getCryptoService();

                // Get Double Ratchet state for Signal Protocol decryption
                const doubleRatchetState = await getDoubleRatchetState(id as string);

                const decryptedContent = await cryptoService.decryptE2EEMessage(
                  message.e2eeMessage,
                  sessionKey.key,
                  doubleRatchetState
                );
                return {
                  ...message,
                  content: decryptedContent,
                  verificationStatus: 'verified' as const,
                  protocolVersion: message.e2eeMessage.protocolVersion || 3
                };
              }
            } catch (error) {
              console.error('Signal Protocol message decryption failed:', error);
              return {
                ...message,
                content: '[Signal Protocol Encrypted Message - Decryption Failed]',
                verificationStatus: 'warning' as const
              };
            }
          }
          return message;
        })
      );

      setMessages(decryptedMessages.sort((a, b) => a.timestamp - b.timestamp));
    } catch (error) {
      console.error('Failed to initialize Signal Protocol chat:', error);
    }
  };

  // Initialize DLP service
  const initializeDLP = async () => {
    try {
      await dlpService.initialize();
      const dlpStatus = dlpService.getDLPStatus();
      setDlpEnabled(dlpStatus.enabled);
    } catch (error) {
      console.error('Failed to initialize DLP service:', error);
    }
  };

  // Get Double Ratchet state for Signal Protocol
  const getDoubleRatchetState = async (chatId: string): Promise<any> => {
    try {
      const secureStorage = securityManager.getSecureStorageService();
      return await secureStorage.getObject(`double_ratchet_${chatId}`);
    } catch (error) {
      console.error('Failed to get Double Ratchet state:', error);
      return null;
    }
  };

  // CRITICAL: Initiate Signal Protocol E2EE setup for new conversation
  const initiateE2EESetup = async () => {
    try {
      if (!chat || chat.isGroup || chat.isChannel || !userId) {
        return;
      }

      const participantId = chat.participants[0]?.id;
      if (!participantId) {
        console.error('No participant found for Signal Protocol E2EE setup');
        return;
      }

      setE2eeStatus('pending');

      // Check if Signal Protocol key exchange session already exists
      let session = keyManager.getKeyExchangeStatus(id as string);

      if (!session || session.status === 'failed') {
        // Initiate new Signal Protocol key exchange
        session = await keyManager.initiateKeyExchange(id as string, participantId);
        setKeyExchangeSession(session);

        if (session.status === 'key_exchange') {
          setKeyFingerprint(session.keyFingerprint || '');
          setVerificationPending(true);
          setE2eeStatus('pending');

          // Show Signal Protocol key verification prompt
          showKeyVerificationPrompt(session.keyFingerprint || '');
        }
      } else if (session.status === 'established') {
        setE2eeStatus('verified');
        setKeyFingerprint(session.keyFingerprint || '');
        setKeyExchangeSession(session);
      } else if (session.status === 'verified') {
        setE2eeStatus('verified');
        setKeyFingerprint(session.keyFingerprint || '');
        setKeyExchangeSession(session);
      }
    } catch (error) {
      console.error('Signal Protocol E2EE setup failed:', error);
      setE2eeStatus('warning');
      Alert.alert(
        'Signal Protocol Encryption Setup Failed',
        'Unable to establish Signal Protocol secure encryption. Messages may not be fully protected.',
        [{ text: 'OK' }]
      );
    }
  };

  // CRITICAL: Show Signal Protocol key verification prompt with biometric option
  const showKeyVerificationPrompt = (fingerprint: string) => {
    const formattedFingerprint = fingerprint.substring(0, 32).replace(/(.{4})/g, '$1 ').trim();

    Alert.alert(
      'Verify Signal Protocol Encryption Key',
      `To ensure secure Signal Protocol communication, please verify the encryption key fingerprint:

${formattedFingerprint}

This should match the fingerprint shown on ${getDisplayName()}'s device. Signal Protocol uses end-to-end encryption with Perfect Forward Secrecy.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setE2eeStatus('warning');
            setVerificationPending(false);
          }
        },
        {
          text: 'Verify with Biometric',
          onPress: () => verifyKeyWithBiometric(fingerprint)
        },
        {
          text: 'Manual Verify',
          onPress: () => verifyKeyManually(fingerprint)
        }
      ]
    );
  };

  // CRITICAL: Verify key with biometric authentication
  const verifyKeyWithBiometric = async (fingerprint: string) => {
    try {
      setVerificationPending(true);

      const verificationResult = await keyManager.verifyKeyFingerprint(
        id as string,
        fingerprint,
        'fingerprint'
      );

      if (verificationResult.verified) {
        // Establish secure session
        const sessionEstablished = await keyManager.establishSecureSession(id as string);

        if (sessionEstablished) {
          setE2eeStatus('verified');
          setVerificationPending(false);

          Alert.alert(
            'Encryption Verified',
            'End-to-end encryption has been successfully established. Your messages are now fully protected.',
            [{ text: 'OK' }]
          );
        } else {
          throw new Error('Failed to establish secure session');
        }
      } else {
        setE2eeStatus('warning');
        setVerificationPending(false);

        Alert.alert(
          'Verification Failed',
          verificationResult.error || 'Key verification failed. Please try again or verify manually.',
          [
            { text: 'Retry', onPress: () => verifyKeyWithBiometric(fingerprint) },
            { text: 'Manual Verify', onPress: () => verifyKeyManually(fingerprint) }
          ]
        );
      }
    } catch (error) {
      console.error('Biometric key verification failed:', error);
      setE2eeStatus('warning');
      setVerificationPending(false);

      Alert.alert(
        'Verification Error',
        'Biometric verification failed. Please try manual verification.',
        [
          { text: 'Manual Verify', onPress: () => verifyKeyManually(fingerprint) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  // CRITICAL: Manual key verification
  const verifyKeyManually = async (fingerprint: string) => {
    try {
      const formattedFingerprint = fingerprint.substring(0, 32).replace(/(.{4})/g, '$1 ').trim();

      Alert.alert(
        'Manual Key Verification',
        `Please confirm that this fingerprint matches exactly with ${getDisplayName()}'s device:

${formattedFingerprint}

Only confirm if the fingerprints match exactly.`,
        [
          {
            text: 'They Don\'t Match',
            style: 'destructive',
            onPress: () => {
              setE2eeStatus('warning');
              setVerificationPending(false);
              Alert.alert(
                'Security Warning',
                'Key verification failed. This could indicate a security issue. Please contact the other party through a different channel to verify.',
                [{ text: 'OK' }]
              );
            }
          },
          {
            text: 'They Match',
            onPress: async () => {
              const verificationResult = await keyManager.verifyKeyFingerprint(
                id as string,
                fingerprint,
                'manual'
              );

              if (verificationResult.verified) {
                const sessionEstablished = await keyManager.establishSecureSession(id as string);

                if (sessionEstablished) {
                  setE2eeStatus('verified');
                  setVerificationPending(false);

                  Alert.alert(
                    'Encryption Verified',
                    'End-to-end encryption has been successfully established.',
                    [{ text: 'OK' }]
                  );
                }
              } else {
                setE2eeStatus('warning');
                setVerificationPending(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Manual key verification failed:', error);
      setE2eeStatus('warning');
      setVerificationPending(false);
    }
  };

  // CRITICAL: DLP content scanning before sending
  const scanMessageContent = async (content: string): Promise<DLPScanResult> => {
    if (!dlpEnabled || !dlpService.isEnabled()) {
      return {
        allowed: true,
        violations: [],
        warnings: [],
        requiresUserConfirmation: false,
        suggestedAction: 'proceed'
      };
    }

    try {
      const scanResult = await dlpService.scanContent(content, {
        userId: userId || '0',
        chatId: id as string,
        messageType: 'text'
      });

      return scanResult;
    } catch (error) {
      console.error('DLP scanning failed:', error);
      return {
        allowed: true,
        violations: [],
        warnings: ['DLP scanning failed - message allowed'],
        requiresUserConfirmation: false,
        suggestedAction: 'proceed'
      };
    }
  };

  // Handle DLP scan result
  const handleDLPScanResult = (scanResult: DLPScanResult, originalContent: string) => {
    if (!scanResult.allowed) {
      setDlpWarning('Message blocked by DLP policy');
      setDlpScanResult(scanResult);
      return false;
    }

    if (scanResult.violations.length > 0) {
      setDlpScanResult(scanResult);
      setPendingMessage(originalContent);

      if (scanResult.requiresUserConfirmation) {
        showDLPConfirmationDialog(scanResult, originalContent);
        return false;
      } else {
        // Auto-apply suggested action
        if (scanResult.suggestedAction === 'redact' && scanResult.sanitizedContent) {
          setInputText(scanResult.sanitizedContent);
          setDlpWarning('Message content has been automatically redacted');
        } else if (scanResult.suggestedAction === 'encrypt') {
          setDlpWarning('Sensitive content detected - message will be encrypted');
        }
      }
    }

    return true;
  };

  // Show DLP confirmation dialog
  const showDLPConfirmationDialog = (scanResult: DLPScanResult, originalContent: string) => {
    const violationSummary = scanResult.violations.map(v =>
      `• ${v.category.toUpperCase()}: ${v.matches.length} match(es)`
    ).join('\n');

    Alert.alert(
      'Sensitive Content Detected',
      `The following sensitive information was detected in your message:

${violationSummary}

What would you like to do?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setDlpScanResult(null);
            setPendingMessage(null);
            setDlpWarning(null);
          }
        },
        {
          text: 'Send Redacted',
          onPress: () => {
            if (scanResult.sanitizedContent) {
              setInputText(scanResult.sanitizedContent);
              proceedWithMessage(scanResult.sanitizedContent);
            }
          }
        },
        {
          text: 'Send Encrypted',
          onPress: () => {
            proceedWithMessage(originalContent, true);
          }
        },
        {
          text: 'Send Anyway',
          style: 'destructive',
          onPress: () => {
            proceedWithMessage(originalContent);
          }
        }
      ]
    );
  };

  // Proceed with sending message after DLP handling
  const proceedWithMessage = async (content: string, forceEncrypt: boolean = false) => {
    setDlpScanResult(null);
    setPendingMessage(null);
    setDlpWarning(null);

    await sendMessageInternal(content, forceEncrypt);
  };

  // CRITICAL: Send Signal Protocol encrypted message with DLP scanning
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      // First, scan content with DLP
      const scanResult = await scanMessageContent(inputText.trim());

      // Handle DLP result
      const canProceed = handleDLPScanResult(scanResult, inputText.trim());
      if (!canProceed) {
        return; // DLP blocked or requires user confirmation
      }

      // Proceed with sending
      await sendMessageInternal(inputText.trim());

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // Internal message sending logic
  const sendMessageInternal = async (content: string, forceEncrypt: boolean = false) => {
    try {
      let messageContent = content;
      let encrypted = false;
      let e2eeMessage = undefined;
      let verificationStatus: 'verified' | 'unverified' | 'warning' = 'unverified';

      // Encrypt message if Signal Protocol E2EE is enabled and established or forced
      if ((encryptionEnabled && e2eeStatus === 'verified' && !chat?.isGroup && !chat?.isChannel) || forceEncrypt) {
        const sessionKey = keyManager.getSessionKey(id as string);

        if (sessionKey && userId) {
          const cryptoService = securityManager.getCryptoService();

          // Get Double Ratchet state for Signal Protocol encryption
          const doubleRatchetState = await getDoubleRatchetState(id as string);

          e2eeMessage = await cryptoService.encryptE2EEMessage(
            content,
            sessionKey.key,
            id as string,
            keyFingerprint,
            doubleRatchetState
          );

          messageContent = '[Signal Protocol Encrypted Message]'; // Display placeholder
          encrypted = true;
          verificationStatus = 'verified';

          // Update Double Ratchet state after encryption
          if (doubleRatchetState) {
            await updateDoubleRatchetState(id as string, doubleRatchetState);
          }
        }
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        chatId: id as string,
        senderId: userId || '0',
        content: messageContent,
        timestamp: Date.now(),
        status: 'sent',
        type: 'text',
        encrypted,
        e2eeMessage,
        keyFingerprint: encrypted ? keyFingerprint : undefined,
        verificationStatus,
        forwardSecrecyLevel: encrypted ? 10 : 0, // Higher level for Signal Protocol
        forwardSecrecyLevel: encrypted ? 10 : 0, // Higher level for Signal Protocol
      };

      setMessages([...messages, newMessage]);
      setInputText('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send Signal Protocol message:', error);
      Alert.alert('Error', 'Failed to send Signal Protocol message securely');
    }
  };

  // Update Double Ratchet state after encryption/decryption
  const updateDoubleRatchetState = async (chatId: string, ratchetState: any): Promise<void> => {
    try {
      const secureStorage = securityManager.getSecureStorageService();
      await secureStorage.setObject(`double_ratchet_${chatId}`, ratchetState, {
        useSecureEnclave: true,
        requireBiometric: false
      });
    } catch (error) {
      console.error('Failed to update Double Ratchet state:', error);
    }
  };

  // Show Signal Protocol E2EE information
  const showE2EEInfo = () => {
    const statusText = {
      disabled: 'Signal Protocol end-to-end encryption is disabled',
      pending: 'Setting up Signal Protocol end-to-end encryption...',
      established: 'Signal Protocol end-to-end encryption is active',
      verified: 'Signal Protocol end-to-end encryption is verified and active',
      warning: 'Signal Protocol encryption warning - messages may not be fully protected'
    };

    const statusIcon = {
      disabled: '🔓',
      pending: '⏳',
      established: '🔒',
      verified: '✅',
      warning: '⚠️'
    };

    const protocolInfo = e2eeStatus === 'verified' ?
      '\n\nProtocol: Signal Protocol v3\nFeatures: Perfect Forward Secrecy, Double Ratchet, X3DH Key Agreement' : '';

    Alert.alert(
      'Signal Protocol End-to-End Encryption',
      `${statusIcon[e2eeStatus]} ${statusText[e2eeStatus]}

${keyFingerprint ? `Key Fingerprint: ${keyFingerprint.substring(0, 16)}...` : ''}

${e2eeStatus === 'verified' ? 'Your messages are protected with Signal Protocol end-to-end encryption. Only you and the recipient can read them.' : ''}${protocolInfo}`,
      [
        { text: 'OK' },
        ...(keyFingerprint ? [{
          text: 'Show Full Fingerprint',
          onPress: () => showFullFingerprint()
        }] : []),
        ...(e2eeStatus === 'pending' || e2eeStatus === 'warning' ? [{
          text: 'Retry Signal Protocol Setup',
          onPress: () => initiateE2EESetup()
        }] : [])
      ]
    );
  };

  // Show DLP information
  const showDLPInfo = () => {
    const dlpStatus = dlpService.getDLPStatus();

    Alert.alert(
      'Data Loss Prevention (DLP)',
      `Status: ${dlpEnabled ? 'Enabled' : 'Disabled'}
Policies: ${dlpStatus.policiesCount}
Recent Violations: ${dlpStatus.recentViolations}

DLP protects against accidental sharing of sensitive information like:
• National ID numbers
• Credit card numbers
• Phone numbers
• Email addresses
• Passwords and tokens
• Bank account numbers (IBAN)

Messages are scanned in real-time before sending.`,
      [
        { text: 'OK' },
        {
          text: dlpEnabled ? 'Disable DLP' : 'Enable DLP',
          onPress: () => toggleDLP()
        }
      ]
    );
  };

  // Toggle DLP
  const toggleDLP = async () => {
    try {
      if (dlpEnabled) {
        await dlpService.disableDLP();
        setDlpEnabled(false);
        Alert.alert('DLP Disabled', 'Data Loss Prevention has been disabled for this session.');
      } else {
        await dlpService.enableDLP();
        setDlpEnabled(true);
        Alert.alert('DLP Enabled', 'Data Loss Prevention has been enabled.');
      }
    } catch (error) {
      console.error('Failed to toggle DLP:', error);
      Alert.alert('Error', 'Failed to toggle DLP settings');
    }
  };

  // Show full key fingerprint
  const showFullFingerprint = () => {
    const formattedFingerprint = keyFingerprint.replace(/(.{4})/g, '$1 ').trim();

    Alert.alert(
      'Encryption Key Fingerprint',
      `${formattedFingerprint}

This fingerprint should match exactly with the one shown on ${getDisplayName()}'s device. If they don't match, do not continue the conversation.`,
      [
        { text: 'OK' },
        {
          text: 'Copy', onPress: () => {
            // In a real app, copy to clipboard
            Alert.alert('Copied', 'Fingerprint copied to clipboard');
          }
        }
      ]
    );
  };

  const handleVoiceCall = () => {
    Alert.alert(
      t.voiceCall,
      `${t.voiceCall} ${getDisplayName()}`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.voiceCall, onPress: () => {
            Alert.alert(t.success, 'جاري الاتصال...');
          }
        }
      ]
    );
  };

  const handleVideoCall = () => {
    Alert.alert(
      t.videoCall,
      `${t.videoCall} ${getDisplayName()}`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.videoCall, onPress: () => {
            Alert.alert(t.success, 'جاري الاتصال بالفيديو...');
          }
        }
      ]
    );
  };

  const handleProfileView = () => {
    if (chat?.isChannel) {
      Alert.alert(
        t.channelInfo,
        `${chat.groupName}
${chat.groupDescription || ''}
المشتركون: ${chat.channelSubscribers || 0}`,
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.shareChannel, onPress: handleShareChannel },
          { text: chat.channelOwner === userId ? t.channelInfo : t.subscribe, onPress: handleChannelAction }
        ]
      );
    } else if (chat?.isGroup) {
      Alert.alert(
        t.groupInfo,
        `${chat.groupName}
${chat.groupDescription || ''}
الأعضاء: ${chat.participants.length}`,
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.groupMembers, onPress: handleGroupMembers },
          { text: t.groupInfo, onPress: handleGroupSettings }
        ]
      );
    } else {
      const user = chat?.participants[0];
      if (user) {
        Alert.alert(
          t.viewProfile,
          `${user.displayName}
${user.bio || ''}
${user.workPlace || ''}`,
          [
            { text: t.cancel, style: 'cancel' },
            {
              text: t.viewProfile, onPress: () => {
                router.push(`/profile/${user.id}`);
              }
            }
          ]
        );
      }
    }
  };

  const handleMoreOptions = () => {
    const options = chat?.isChannel
      ? [t.channelInfo, t.shareChannel, t.muteChat, t.reportUser, t.cancel]
      : chat?.isGroup
        ? [t.groupInfo, t.groupMembers, t.muteChat, t.leaveGroup, t.cancel]
        : [t.viewProfile, 'Encryption Info', 'DLP Settings', t.muteChat, t.clearChat, t.blockUser, t.reportUser, t.cancel];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: chat?.isGroup ? 3 : 5,
        },
        (buttonIndex) => {
          handleOptionSelect(buttonIndex);
        }
      );
    } else {
      Alert.alert(
        'خيارات',
        'اختر إجراء',
        options.slice(0, -1).map((option, index) => ({
          text: option,
          onPress: () => handleOptionSelect(index)
        })).concat([{ text: t.cancel, style: 'cancel' }])
      );
    }
  };

  const handleOptionSelect = (index: number) => {
    if (chat?.isChannel) {
      switch (index) {
        case 0: handleChannelInfo(); break;
        case 1: handleShareChannel(); break;
        case 2: handleMuteChat(); break;
        case 3: handleReportUser(); break;
      }
    } else if (chat?.isGroup) {
      switch (index) {
        case 0: handleGroupSettings(); break;
        case 1: handleGroupMembers(); break;
        case 2: handleMuteChat(); break;
        case 3: handleLeaveGroup(); break;
      }
    } else {
      switch (index) {
        case 0: handleProfileView(); break;
        case 1: showE2EEInfo(); break;
        case 2: showDLPInfo(); break;
        case 3: handleMuteChat(); break;
        case 4: handleClearChat(); break;
        case 5: handleBlockUser(); break;
        case 6: handleReportUser(); break;
      }
    }
  };

  const handleChannelInfo = () => {
    Alert.alert(t.channelInfo, `معلومات القناة: ${chat?.groupName}`);
  };

  const handleShareChannel = () => {
    Alert.alert(t.shareChannel, 'تم نسخ رابط القناة');
  };

  const handleChannelAction = () => {
    if (chat?.channelOwner === userId) {
      Alert.alert(t.channelInfo, 'إعدادات القناة');
    } else {
      Alert.alert(t.subscribe, 'تم الاشتراك في القناة');
    }
  };

  const handleGroupMembers = () => {
    const membersList = chat?.participants.map(p => p.displayName).join('\n') || '';
    Alert.alert(t.groupMembers, membersList);
  };

  const handleGroupSettings = () => {
    Alert.alert(t.groupInfo, 'إعدادات المجموعة');
  };

  const handleMuteChat = () => {
    Alert.alert(t.success, 'تم كتم المحادثة');
  };

  const handleClearChat = () => {
    Alert.alert(
      t.clearChat,
      'هل تريد مسح جميع الرسائل؟',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.clearChat, style: 'destructive', onPress: () => {
            setMessages([]);
            Alert.alert(t.success, 'تم مسح المحادثة');
          }
        }
      ]
    );
  };

  const handleBlockUser = () => {
    Alert.alert(t.success, 'تم حظر المستخدم');
  };

  const handleReportUser = () => {
    Alert.alert(t.success, 'تم الإبلاغ عن المستخدم');
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      t.leaveGroup,
      'هل تريد مغادرة المجموعة؟',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.leaveGroup, style: 'destructive', onPress: () => {
            Alert.alert(t.success, 'تم مغادرة المجموعة');
            router.back();
          }
        }
      ]
    );
  };

  const handleAttachment = () => {
    const options = [t.camera, t.gallery, t.document, t.location, t.contact, t.cancel];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          handleAttachmentSelect(buttonIndex);
        }
      );
    } else {
      Alert.alert(
        'إرسال',
        'اختر نوع الملف',
        options.slice(0, -1).map((option, index) => ({
          text: option,
          onPress: () => handleAttachmentSelect(index)
        })).concat([{ text: t.cancel, style: 'cancel' }])
      );
    }
  };

  const handleAttachmentSelect = (index: number) => {
    const types = ['camera', 'gallery', 'document', 'location', 'contact'];
    const type = types[index];

    if (type) {
      const newMessage: Message = {
        id: Date.now().toString(),
        chatId: id as string,
        senderId: userId || '0',
        content: `تم إرسال ${type}`,
        timestamp: Date.now(),
        status: 'sent',
        type: type as any,
      };

      setMessages([...messages, newMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const newMessage: Message = {
        id: Date.now().toString(),
        chatId: id as string,
        senderId: userId || '0',
        content: 'رسالة صوتية',
        timestamp: Date.now(),
        status: 'sent',
        type: 'voice',
        duration: 5,
      };

      setMessages([...messages, newMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      setIsRecording(true);
      Alert.alert('تسجيل صوتي', 'بدء التسجيل...');
    }
  };

  const sendMoney = () => {
    Alert.alert(
      'إرسال أموال',
      'اختر المبلغ والعملة',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: '100 ريال',
          onPress: () => handleMoneySend(100, 'SAR')
        },
        {
          text: '50 درهم',
          onPress: () => handleMoneySend(50, 'AED')
        },
      ]
    );
  };

  const handleMoneySend = (amount: number, currency: string) => {
    const balance = balances.find(b => b.currency === currency);
    if (!balance || balance.amount < amount) {
      Alert.alert('خطأ', 'رصيد غير كافٍ');
      return;
    }

    const moneyMessage: Message = {
      id: Date.now().toString(),
      chatId: id as string,
      senderId: userId || '0',
      content: `تم إرسال ${amount} ${currency}`,
      timestamp: Date.now(),
      status: 'sent',
      type: 'money',
    };

    setMessages([...messages, moneyMessage]);
    updateBalance(currency, -amount);

    Alert.alert('نجاح', 'تم إرسال الأموال بنجاح');
  };

  // Get encryption status icon
  const getEncryptionIcon = () => {
    switch (e2eeStatus) {
      case 'verified':
        return <CheckCircle size={14} color={Colors.success} />;
      case 'established':
        return <Lock size={14} color={Colors.primary} />;
      case 'pending':
        return <Key size={14} color={Colors.warning} />;
      case 'warning':
        return <AlertTriangle size={14} color={Colors.error} />;
      default:
        return null;
    }
  };

  // Get DLP status icon
  const getDLPIcon = () => {
    if (!dlpEnabled) return null;

    if (dlpWarning) {
      return <AlertTriangle size={14} color={Colors.error} />;
    }

    return <Shield size={14} color={Colors.success} />;
  };

  // Get verification status color
  const getVerificationColor = (status?: 'verified' | 'unverified' | 'warning') => {
    switch (status) {
      case 'verified':
        return Colors.success;
      case 'warning':
        return Colors.error;
      default:
        return Colors.medium;
    }
  };

  // Render message content with social engineering protection
  const renderMessageContent = (item: Message, isCurrentUser: boolean) => {
    const hasLinks = item.content && (item.content.includes('http') || item.content.includes('www.'));
    const senderId = isCurrentUser ? userId || '0' : (chat?.participants[0]?.id || 'unknown');
    const senderName = isCurrentUser ? 'You' : (chat?.participants[0]?.displayName || 'Unknown');

    if (item.type === 'file') {
      return (
        <FileAttachment
          fileName={item.fileName || 'unknown.file'}
          fileSize={item.fileSize || 0}
          fileType={item.fileType || 'unknown'}
          senderId={senderId}
          senderName={senderName}
          onDownload={() => {
            Alert.alert('Download', 'File download started');
          }}
        />
      );
    }

    if (hasLinks) {
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      const links = item.content.match(urlRegex) || [];

      return (
        <View>
          <Text
            style={[
              styles.messageText,
              !isCurrentUser && styles.otherUserText,
              item.type === 'money' && styles.moneyText,
            ]}
          >
            {item.content}
          </Text>
          {links.map((link, index) => {
            const fullUrl = link.startsWith('http') ? link : `https://${link}`;
            return (
              <LinkPreview
                key={index}
                url={fullUrl}
                senderId={senderId}
                senderName={senderName}
                showPreview={!isCurrentUser} // Only show preview for received messages
              />
            );
            ```
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          handleAttachmentSelect(buttonIndex);
        }
      );
    } else {
      Alert.alert(
        'إرسال',
        'اختر نوع الملف',
        options.slice(0, -1).map((option, index) => ({
          text: option,
          onPress: () => handleAttachmentSelect(index)
      const newMessage: Message = {
        id: Date.now().toString(),
        chatId: id as string,
        senderId: userId || '0',
        content: 'رسالة صوتية',
        timestamp: Date.now(),
        status: 'sent',
        type: 'voice',
        duration: 5,
      };

      setMessages([...messages, newMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      setIsRecording(true);
      Alert.alert('تسجيل صوتي', 'بدء التسجيل...');
    }
  };

  const sendMoney = () => {
    Alert.alert(
      'إرسال أموال',
      'اختر المبلغ والعملة',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: '100 ريال',
          onPress: () => handleMoneySend(100, 'SAR')
        },
        {
          text: '50 درهم',
          onPress: () => handleMoneySend(50, 'AED')
        },
      ]
    );
  };

  const handleMoneySend = (amount: number, currency: string) => {
    const balance = balances.find(b => b.currency === currency);
    if (!balance || balance.amount < amount) {
      Alert.alert('خطأ', 'رصيد غير كافٍ');
      return;
    }

    const moneyMessage: Message = {
      id: Date.now().toString(),
      chatId: id as string,
      senderId: userId || '0',
      content: `تم إرسال ${ amount } ${ currency } `,
      timestamp: Date.now(),
      status: 'sent',
      type: 'money',
    };

    setMessages([...messages, moneyMessage]);
    updateBalance(currency, -amount);

    Alert.alert('نجاح', 'تم إرسال الأموال بنجاح');
  };

  // Get encryption status icon
  const getEncryptionIcon = () => {
    switch (e2eeStatus) {
      case 'verified':
        return <CheckCircle size={14} color={Colors.success} />;
      case 'established':
        return <Lock size={14} color={Colors.primary} />;
      case 'pending':
        return <Key size={14} color={Colors.warning} />;
      case 'warning':
        return <AlertTriangle size={14} color={Colors.error} />;
      default:
        return null;
    }
  };

  // Get DLP status icon
  const getDLPIcon = () => {
    if (!dlpEnabled) return null;

    if (dlpWarning) {
      return <AlertTriangle size={14} color={Colors.error} />;
    }

    return <Shield size={14} color={Colors.success} />;
  };

  // Get verification status color
  const getVerificationColor = (status?: 'verified' | 'unverified' | 'warning') => {
    switch (status) {
      case 'verified':
        return Colors.success;
      case 'warning':
        return Colors.error;
      default:
        return Colors.medium;
    }
  };

  // Render message content with social engineering protection
  const renderMessageContent = (item: Message, isCurrentUser: boolean) => {
    const hasLinks = item.content && (item.content.includes('http') || item.content.includes('www.'));
    const senderId = isCurrentUser ? userId || '0' : (chat?.participants[0]?.id || 'unknown');
    const senderName = isCurrentUser ? 'You' : (chat?.participants[0]?.displayName || 'Unknown');

    if (item.type === 'file') {
      return (
        <FileAttachment
          fileName={item.fileName || 'unknown.file'}
          fileSize={item.fileSize || 0}
          fileType={item.fileType || 'unknown'}
          senderId={senderId}
          senderName={senderName}
          onDownload={() => {
            Alert.alert('Download', 'File download started');
          }}
        />
      );
    }

    if (hasLinks) {
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      const links = item.content.match(urlRegex) || [];

      return (
        <View>
          <Text
            style={[
              styles.messageText,
              !isCurrentUser && styles.otherUserText,
              item.type === 'money' && styles.moneyText,
            ]}
          >
            {item.content}
          </Text>
          {links.map((link, index) => {
            const fullUrl = link.startsWith('http') ? link : `https://${link}`;
            return (
              <LinkPreview
                key={index}
                url={fullUrl}
                senderId={senderId}
                senderName={senderName}
                showPreview={!isCurrentUser} // Only show preview for received messages
              />
            );
          })}
        </View>
      );
    }

    return (
      <Text
        style={[
          styles.messageText,
          !isCurrentUser && styles.otherUserText,
          item.type === 'money' && styles.moneyText,
        ]}
      >
        {item.content}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === userId;
    <View
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          item.type === 'money' && styles.moneyBubble,
          item.type === 'voice' && styles.voiceBubble,
        ]}
      >
        {/* Encryption and DLP indicators */}
        <View style={styles.messageHeader}>
          {item.encrypted && (
            <View style={styles.encryptionIndicator}>
              <Lock size={12} color={getVerificationColor(item.verificationStatus)} />
            </View>
          )}
          {item.verificationStatus && (
            <View style={[styles.verificationIndicator, { backgroundColor: getVerificationColor(item.verificationStatus) }]} />
          )}
        </View>

        {item.type === 'money' && (
          <View style={styles.messageIcon}>
            <Wallet size={16} color="white" />
          </View>
        )}
        {item.type === 'voice' && (
          <View style={styles.messageIcon}>
            <Mic size={16} color={isCurrentUser ? Colors.dark : 'white'} />
          </View>
        )}
        {item.type === 'image' && (
          <View style={styles.messageIcon}>
            <ImageIcon size={16} color={isCurrentUser ? Colors.dark : 'white'} />
          </View>
        )}

        {renderMessageContent(item, isCurrentUser)}

        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isCurrentUser ? styles.currentUserTime : styles.otherUserTime]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isCurrentUser && (
            <View style={styles.statusContainer}>
              {item.status === 'sent' && <Check size={12} color={Colors.medium} />}
              {item.status === 'delivered' && <CheckCheck size={12} color={Colors.medium} />}
              {item.status === 'read' && <CheckCheck size={12} color={Colors.primary} />}
            </View>
          )}
        </View>
      </View>
    </View>
    );
};

return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
  >
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color={Colors.dark} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerContent} onPress={handleProfileView}>
        <Image
          source={{ uri: chat?.participants[0]?.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' }}
          style={styles.headerAvatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{getDisplayName()}</Text>
          <Text style={styles.headerStatus}>
            {chat?.isGroup ? 'مجموعة' : chat?.isChannel ? 'قناة' : 'متصل الآن'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        <TouchableOpacity onPress={handleVideoCall} style={styles.headerAction}>
          <Video size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleVoiceCall} style={styles.headerAction}>
          <Phone size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMoreOptions} style={styles.headerAction}>
          <MoreVertical size={24} color={Colors.dark} />
        </TouchableOpacity>
      </View>
    </View>

    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.messagesList}
      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
    />

    {/* Input Area */}
    <View style={styles.inputContainer}>
      <TouchableOpacity onPress={handleAttachment} style={styles.attachButton}>
        <Paperclip size={24} color={Colors.medium} />
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 2000);
          }}
          placeholder="اكتب رسالة..."
          placeholderTextColor={Colors.medium}
          multiline
        />
        <TouchableOpacity onPress={sendMoney} style={styles.inputAction}>
          <Wallet size={20} color={Colors.medium} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.inputAction}>
          <Camera size={20} color={Colors.medium} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={inputText.trim() ? sendMessage : handleVoiceRecording}
        style={styles.sendButton}
      >
        {inputText.trim() ? (
          <Send size={20} color="white" />
        ) : (
          <Mic size={24} color="white" />
        )}
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    color: Colors.dark,
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    marginLeft: 20,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  currentUserBubble: {
    backgroundColor: Colors.whatsappLight,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  moneyBubble: {
    backgroundColor: Colors.primary,
  },
  voiceBubble: {
    backgroundColor: Colors.secondary,
  },
  messageText: {
    fontSize: 16,
    color: Colors.dark,
    lineHeight: 22,
  },
  otherUserText: {
    color: Colors.dark,
  },
  moneyText: {
    color: 'white',
    fontWeight: 'bold',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  encryptionIndicator: {
    marginRight: 4,
  },
  verificationIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  messageIcon: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.medium,
    marginRight: 4,
  },
  currentUserTime: {
    color: Colors.medium,
  },
  otherUserTime: {
    color: Colors.medium,
  },
  statusContainer: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attachButton: {
    padding: 10,
    marginRight: 4,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light,
    borderRadius: 24,
    paddingHorizontal: 12,
    marginRight: 8,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
    maxHeight: 100,
    paddingVertical: 8,
    textAlign: 'right',
  },
  inputAction: {
    padding: 8,
    marginLeft: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  recordingButton: {
    backgroundColor: Colors.error,
  },
});