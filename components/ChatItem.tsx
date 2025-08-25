import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Check, CheckCheck, Mic, Camera, FileText, Users, Radio, Wallet, Pin, Shield, Lock, AlertTriangle, ExternalLink, Ban, Timer } from 'lucide-react-native';
import { Chat } from '@/types';
import { useSafeThemeColors } from '@/store/themeStore';
import { formatTimeAgo } from '@/utils/dateUtils';
import ContentModerationService, { MessageContext } from '@/services/security/ContentModerationService';
import ForensicsService from '@/services/security/ForensicsService';
import { MicroInteractions } from '@/utils/microInteractions';


interface ChatItemProps {
  chat: Chat;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  isLoading?: boolean;
}

// Skeleton/Placeholder component for loading states
const ChatItemSkeleton = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    
    return () => pulse.stop();
  }, [pulseAnim]);
  
  const skeletonContainerStyle = {
    flexDirection: 'row' as const,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  };
  
  return (
    <View style={skeletonContainerStyle}>
      <Animated.View style={[styles.skeletonAvatar, { opacity: pulseAnim }]} />
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Animated.View style={[styles.skeletonName, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonTime, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.messageContainer}>
          <Animated.View style={[styles.skeletonMessage, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonBadge, { opacity: pulseAnim }]} />
        </View>
      </View>
    </View>
  );
};

export default function ChatItem({ 
  chat, 
  isSelected = false, 
  isSelectionMode = false, 
  onPress, 
  onLongPress,
  isLoading = false
}: ChatItemProps) {
  const colors = useSafeThemeColors();
  const [isMessageSafe, setIsMessageSafe] = useState(true);
  
  // Create styles with current theme colors
  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      borderRadius: 8,
      marginHorizontal: 4,
      marginVertical: 2,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    selectedContainer: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary + '40',
      borderWidth: 1,
      elevation: 3,
      shadowOpacity: 0.1,
    },
    pressedContainer: {
      backgroundColor: colors.secondary,
      elevation: 0,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkedBox: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    channelIndicator: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.background,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    channelBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 6,
    },
    time: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 4,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
      marginLeft: 4,
    },
    unreadMessage: {
      fontWeight: '600',
      color: colors.text,
    },
    encryptedMessage: {
      fontStyle: 'italic',
      color: colors.success,
    },
    newMessageIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    unreadBadge: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
  });
  const [violationType, setViolationType] = useState<string | null>(null);
  const [violationConfidence, setViolationConfidence] = useState(0);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);
  
  const checkMessageSafety = React.useCallback(async () => {
    if (!chat.lastMessage?.content || chat.lastMessage.content.trim() === '') {
      setIsMessageSafe(true);
      return;
    }

    try {
      const context: MessageContext = {
        senderId: chat.lastMessage.senderId,
        recipientId: 'current_user',
        timestamp: new Date(chat.lastMessage.timestamp).getTime(),
        messageType: 'text',
        senderReputation: 0.5
      };

      const result = await ContentModerationService.analyzeContent(chat.lastMessage.content, context);
      
      if (result.isViolation) {
        setIsMessageSafe(false);
        setViolationType(result.violationType);
        setViolationConfidence(result.confidence);
        
        // Log forensic event for violations
        await ForensicsService.logForensicEvent({
          eventType: 'message_violation',
          severity: result.confidence > 0.7 ? 'high' : result.confidence > 0.4 ? 'medium' : 'low',
          userId: chat.lastMessage.senderId,
          description: `انتهاك في الرسالة: ${result.violationType} - ${result.explanation}`,
          evidence: {
            content: chat.lastMessage.content,
            metadata: {
              violationType: result.violationType,
              confidence: result.confidence,
              suggestedAction: result.suggestedAction,
              detectedPatterns: result.detectedPatterns
            },
            deviceInfo: {
              platform: 'mobile',
              timestamp: new Date().toISOString()
            }
          },
          status: 'pending',
          tags: ['content_moderation', result.violationType]
        });
      } else {
        setIsMessageSafe(true);
        setViolationType(null);
        setViolationConfidence(0);
      }
    } catch (error) {
      console.error('Failed to check message safety:', error);
      setIsMessageSafe(true);
    }
  }, [chat.lastMessage]);

  useEffect(() => {
    if (!isLoading) {
      checkMessageSafety();
      
      // Entrance animation
      MicroInteractions.createEntranceAnimation(scaleAnim, opacityAnim, Math.random() * 100).start();
      
      // Pulse animation for unread messages
      if (chat.unreadCount > 0) {
        MicroInteractions.createPulseAnimation(pulseAnim, 0.98, 1.02).start();
      }
    }
  }, [isLoading, checkMessageSafety, scaleAnim, opacityAnim, pulseAnim, chat.unreadCount]);
  
  useEffect(() => {
    if (!isLoading) {
      // Stop pulse animation when message is read
      if (chat.unreadCount === 0) {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
      }
    }
  }, [isLoading, chat.unreadCount, pulseAnim]);
  
  useEffect(() => {
    if (!isLoading) {
      // Shake animation for unsafe messages
      if (!isMessageSafe && violationConfidence > 0.7) {
        MicroInteractions.createShakeAnimation(shakeAnim).start();
      }
    }
  }, [isLoading, isMessageSafe, violationConfidence, shakeAnim]);
  
  // Show skeleton while loading
  if (isLoading) {
    return <ChatItemSkeleton />;
  }



  const getViolationIcon = () => {
    if (isMessageSafe) return null;
    
    switch (violationType) {
      case 'violence':
        return <AlertTriangle size={14} color="#FF4444" />;
      case 'fraud':
        return <Shield size={14} color="#FF8800" />;
      case 'harassment':
        return <Ban size={14} color="#FF6B6B" />;
      case 'spam':
        return <AlertTriangle size={14} color="#FFA500" />;
      case 'hate_speech':
        return <AlertTriangle size={14} color="#DC143C" />;
      case 'adult_content':
        return <AlertTriangle size={14} color="#8B0000" />;
      default:
        return <AlertTriangle size={14} color="#FF9800" />;
    }
  };

  const getViolationText = () => {
    if (isMessageSafe) return chat.lastMessage.content;
    
    switch (violationType) {
      case 'violence':
        return 'تم اكتشاف محتوى عنيف';
      case 'fraud':
        return 'تم اكتشاف محتوى احتيالي محتمل';
      case 'harassment':
        return 'تم اكتشاف محتوى تحرش';
      case 'spam':
        return 'تم اكتشاف محتوى سبام';
      case 'hate_speech':
        return 'تم اكتشاف خطاب كراهية';
      case 'adult_content':
        return 'تم اكتشاف محتوى للبالغين';
      default:
        return 'تم اكتشاف محتوى مشبوه';
    }
  };

  const handlePressIn = () => {
    setIsPressed(true);
    MicroInteractions.triggerHapticFeedback('light');
    
    Animated.parallel([
      MicroInteractions.createScaleAnimation(scaleAnim, 0.98),
      MicroInteractions.createOpacityAnimation(opacityAnim, 0.8, 100)
    ]).start();
  };
  
  const handlePressOut = () => {
    setIsPressed(false);
    
    Animated.parallel([
      MicroInteractions.createScaleAnimation(scaleAnim, 1),
      MicroInteractions.createOpacityAnimation(opacityAnim, 1, 150)
    ]).start();
  };
  
  const handleChatPress = () => {
    // Success animation
    MicroInteractions.createBounceAnimation(scaleAnim).start();
    
    if (!isMessageSafe && violationConfidence > 0.5) {
      // Error shake animation
      MicroInteractions.createShakeAnimation(shakeAnim).start();
      MicroInteractions.triggerHapticFeedback('heavy');
      
      Alert.alert(
        'تحذير أمني',
        `تم اكتشاف محتوى مشبوه في هذه المحادثة (${Math.round(violationConfidence * 100)}% ثقة). هل تريد المتابعة؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'متابعة', onPress: () => {
            MicroInteractions.triggerHapticFeedback('medium');
            onPress?.();
          }}
        ]
      );
    } else {
      MicroInteractions.triggerHapticFeedback('medium');
      onPress?.();
    }
  };
  
  const handleLongPress = () => {
    MicroInteractions.triggerHapticFeedback('heavy');
    
    // Long press animation
    Animated.sequence([
      MicroInteractions.createScaleAnimation(scaleAnim, 1.05, 200),
      MicroInteractions.createScaleAnimation(scaleAnim, 0.95, 100),
      MicroInteractions.createScaleAnimation(scaleAnim, 1, 100)
    ]).start();
    
    onLongPress?.();
  };
  
  const getDisplayName = () => {
    if (chat.isGroup || chat.isChannel) {
      return chat.groupName || '';
    }
    return chat.participants[0]?.displayName || '';
  };
  
  const getAvatar = () => {
    if (chat.isGroup || chat.isChannel) {
      return chat.groupPicture || '';
    }
    return chat.participants[0]?.profilePicture || '';
  };
  
  const getChatIcon = () => {
    if (chat.chatType === 'group') {
      return <Users size={16} color={colors.textSecondary} style={styles.chatTypeIcon} />;
    }
    if (chat.chatType === 'channel') {
      return <Radio size={16} color={colors.textSecondary} style={styles.chatTypeIcon} />;
    }
    return null;
  };
  
  const getMessageIcon = () => {
    const messageType = chat.lastMessage.type;
    
    // Show violation icon if message is unsafe
    if (!isMessageSafe) {
      return getViolationIcon();
    }
    
    // Check for suspicious content
    const hasSuspiciousLink = chat.lastMessage.content && 
      (chat.lastMessage.content.includes('http') || chat.lastMessage.content.includes('www.'));
    
    switch (messageType) {
      case 'voice':
        return <Mic size={16} color={colors.textSecondary} />;
      case 'image':
        return <Camera size={16} color={colors.textSecondary} />;
      case 'video':
        return <Camera size={16} color={colors.textSecondary} />;
      case 'file':
        return <FileText size={16} color={colors.textSecondary} />;
      case 'money':
        return <Wallet size={16} color={colors.primary} />;
      default:
        if (hasSuspiciousLink) {
          return <ExternalLink size={16} color={colors.warning || '#ea580c'} />;
        }
        return null;
    }
  };
  
  const getStatusIcon = () => {
    if (chat.lastMessage.senderId === '0') { // Current user's message
      switch (chat.lastMessage.status) {
        case 'sent':
          return <Check size={16} color={colors.textSecondary} />;
        case 'delivered':
          return <CheckCheck size={16} color={colors.textSecondary} />;
        case 'read':
          return <CheckCheck size={16} color={colors.primary} />;
        default:
          return null;
      }
    }
    return null;
  };

  // Get security indicators
  const getSecurityIndicators = () => {
    const indicators = [];
    
    // Self-destruct indicator
    if (chat.lastMessage.isExpiring) {
      const timeLeft = (chat.lastMessage.expiresAt || 0) - Date.now();
      const color = timeLeft <= 60000 ? '#FF4444' : 
                   timeLeft <= 300000 ? '#FF8800' : '#FFA500';
      indicators.push(
        <View key="self-destruct" style={[styles.securityIndicator, { backgroundColor: color + '20' }]}>
          <Timer size={10} color={color} />
        </View>
      );
    }
    
    // E2EE indicator
    if (chat.encryptionEnabled || chat.e2eeStatus === 'verified') {
      const color = chat.e2eeStatus === 'verified' ? colors.success : 
                   chat.e2eeStatus === 'warning' ? colors.error : colors.primary;
      indicators.push(
        <View key="e2ee" style={[styles.securityIndicator, { backgroundColor: color + '20' }]}>
          <Lock size={10} color={color} />
        </View>
      );
    }
    
    // DLP indicator (for direct conversations)
    if (!chat.isGroup && !chat.isChannel) {
      indicators.push(
        <View key="dlp" style={[styles.securityIndicator, { backgroundColor: colors.primary + '20' }]}>
          <Shield size={10} color={colors.primary} />
        </View>
      );
    }
    
    // Content moderation indicator
    if (!isMessageSafe) {
      const color = violationConfidence > 0.7 ? '#FF4444' : 
                   violationConfidence > 0.4 ? '#FF8800' : '#FFA500';
      indicators.push(
        <View key="content-mod" style={[styles.securityIndicator, { backgroundColor: color + '20' }]}>
          <AlertTriangle size={10} color={color} />
        </View>
      );
    }
    
    // Social engineering protection indicator
    const hasSuspiciousContent = chat.lastMessage.content && 
      (chat.lastMessage.content.includes('http') || 
       chat.lastMessage.content.includes('www.') ||
       chat.lastMessage.type === 'file');
    
    if (hasSuspiciousContent && isMessageSafe) {
      indicators.push(
        <View key="social-eng" style={[styles.securityIndicator, { backgroundColor: '#ea580c20' }]}>
          <AlertTriangle size={10} color="#ea580c" />
        </View>
      );
    }
    
    return indicators;
  };
  
  const getMessagePreview = () => {
    const messageType = chat.lastMessage.type;
    
    // Check if message is self-destructing
    if (chat.lastMessage.isExpiring) {
      const timeLeft = (chat.lastMessage.expiresAt || 0) - Date.now();
      if (timeLeft <= 0) {
        return '💥 رسالة محذوفة';
      } else if (timeLeft <= 60000) {
        return '⏰ رسالة ذاتية التدمير (تنتهي قريباً)';
      } else {
        return '⏱️ رسالة ذاتية التدمير';
      }
    }
    
    // Check if message is encrypted
    if (chat.lastMessage.encrypted) {
      return '🔒 Encrypted message';
    }
    
    // If message has violation, show violation text
    if (!isMessageSafe) {
      return getViolationText();
    }
    
    // Check for suspicious content indicators
    const hasSuspiciousLink = chat.lastMessage.content && 
      (chat.lastMessage.content.includes('http') || chat.lastMessage.content.includes('www.'));
    
    switch (messageType) {
      case 'voice':
        return 'رسالة صوتية';
      case 'image':
        return 'صورة';
      case 'video':
        return 'فيديو';
      case 'file':
        return 'ملف';
      case 'money':
        return '💰 تحويل مالي';
      default:
        if (hasSuspiciousLink) {
          return '🔗 رابط - تحقق من الأمان';
        }
        return chat.lastMessage.content;
    }
  };
  
  const getChannelIndicator = () => {
    if (chat.isChannel) {
      return (
        <View style={dynamicStyles.channelIndicator}>
          <Radio size={12} color="white" />
        </View>
      );
    }
    return null;
  };
  
  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
            { translateX: shakeAnim }
          ],
          opacity: opacityAnim
        }
      ]}
    >
      <TouchableOpacity 
        style={[
          dynamicStyles.container,
          isSelected && dynamicStyles.selectedContainer,
          isSelectionMode && styles.selectionModeContainer,
          !isMessageSafe && styles.unsafeContainer,
          isPressed && dynamicStyles.pressedContainer
        ]} 
        onPress={handleChatPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        activeOpacity={1}
        // Enhanced Accessibility
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`محادثة مع ${getDisplayName()}. ${chat.unreadCount > 0 ? `${chat.unreadCount} رسائل غير مقروءة. ` : ''}آخر رسالة: ${getMessagePreview()}. ${formatTimeAgo(chat.lastMessage.timestamp)}`}
        accessibilityHint={isSelectionMode ? "اضغط للتحديد أو إلغاء التحديد" : "اضغط لفتح المحادثة، اضغط مطولاً للخيارات"}
        accessibilityState={{
          selected: isSelected,
          disabled: !isMessageSafe && violationConfidence > 0.8
        }}
        accessibilityActions={[
          { name: 'activate', label: 'فتح المحادثة' },
          { name: 'longpress', label: 'خيارات المحادثة' }
        ]}
      >
      {/* Selection Indicator */}
      {isSelectionMode && (
        <View style={styles.selectionIndicator}>
          <View style={[dynamicStyles.checkbox, isSelected && dynamicStyles.checkedBox]}>
            {isSelected && <Check size={16} color="white" />}
          </View>
        </View>
      )}
      
      <View style={styles.avatarContainer}>
        <Image source={{ uri: getAvatar() }} style={styles.avatar} />
        {getChannelIndicator()}
        {chat.participants[0]?.isOnline && !chat.isGroup && !chat.isChannel && (
          <View style={dynamicStyles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.nameContainer}>
            {getChatIcon()}
            <Text style={dynamicStyles.name} numberOfLines={1}>
              {getDisplayName()}
            </Text>
            {chat.isPinned && (
              <Pin size={14} color={colors.textSecondary} style={styles.pinIcon} />
            )}
            {chat.isChannel && (
              <View style={dynamicStyles.channelBadge}>
                <Text style={styles.channelBadgeText}>قناة</Text>
              </View>
            )}
            {/* Security indicators */}
            <View style={styles.securityIndicators}>
              {getSecurityIndicators()}
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Text style={dynamicStyles.time}>
              {formatTimeAgo(chat.lastMessage.timestamp)}
            </Text>
            {getStatusIcon()}
          </View>
        </View>
        
        <View style={styles.messageContainer}>
          <View style={styles.messageContent}>
            {getMessageIcon()}
            <Text 
              style={[
                dynamicStyles.message,
                chat.unreadCount > 0 && dynamicStyles.unreadMessage,
                chat.lastMessage.encrypted && dynamicStyles.encryptedMessage,
                !isMessageSafe && styles.unsafeMessage
              ]} 
              numberOfLines={1}
            >
              {getMessagePreview()}
            </Text>
          </View>
          
          <View style={styles.badgeContainer}>
            {chat.isMuted && (
              <View style={styles.mutedBadge}>
                <Text style={styles.mutedText}>🔇</Text>
              </View>
            )}
            {chat.unreadCount > 0 && (
              <View style={dynamicStyles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      </TouchableOpacity>
      
      {/* Animated notification indicator for new messages */}
      {chat.unreadCount > 0 && (
        <Animated.View
          style={[
            dynamicStyles.newMessageIndicator,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0.98, 1.02],
                outputRange: [0.6, 1],
              })
            }
          ]}
        />
      )}
      
      {/* Security warning overlay */}
      {!isMessageSafe && violationConfidence > 0.8 && (
        <Animated.View
          style={[
            styles.securityWarningOverlay,
            {
              opacity: opacityAnim.interpolate({
                inputRange: [0.8, 1],
                outputRange: [0.3, 0.1],
              })
            }
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  selectionModeContainer: {
    paddingLeft: 8,
  },
  selectionIndicator: {
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatTypeIcon: {
    marginRight: 6,
  },

  pinIcon: {
    marginLeft: 4,
  },

  channelBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  securityIndicators: {
    flexDirection: 'row',
    marginLeft: 6,
    gap: 4,
  },
  securityIndicator: {
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  unsafeMessage: {
    color: '#FF4444',
    fontWeight: '600',
    fontStyle: 'italic'
  },
  unsafeContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
    backgroundColor: '#FFF5F5',
    elevation: 2,
    shadowColor: '#FF4444',
    shadowOpacity: 0.1,
  },

  securityWarningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    pointerEvents: 'none',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mutedBadge: {
    marginRight: 4,
  },
  mutedText: {
    fontSize: 12,
  },

  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
  },
  // Skeleton styles
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E1E9EE',
    marginRight: 12,
  },
  skeletonName: {
    width: 120,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 8,
  },
  skeletonTime: {
    width: 40,
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 6,
  },
  skeletonMessage: {
    width: 180,
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 7,
    flex: 1,
  },
  skeletonBadge: {
    width: 24,
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
    marginLeft: 8,
  },
});