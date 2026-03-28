import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { 
  Timer, 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  AlertTriangle,
  Fingerprint,
  Clock,
  Zap
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Message, SelfDestructMessage } from '@/types';
import SelfDestructService from '@/services/security/SelfDestructService';
import SelfDestructTimer from './SelfDestructTimer';
import BiometricAuthService from '@/services/security/BiometricAuthService';
import { MicroInteractions } from '@/utils/microInteractions';

interface SelfDestructMessageBubbleProps {
  message: Message & { selfDestruct?: SelfDestructMessage };
  isOwn: boolean;
  onExpired?: () => void;
  onViewed?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function SelfDestructMessageBubble({
  message,
  isOwn,
  onExpired,
  onViewed
}: SelfDestructMessageBubbleProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [viewCount, setViewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [securityLevel, setSecurityLevel] = useState<string>('standard');
  const [requiresBiometric, setRequiresBiometric] = useState(false);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);

  // Animation values
  const revealAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(10)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadMessageStatus();
    
    if (message.selfDestruct) {
      setRequiresBiometric(message.selfDestruct.expirationPolicy.requireBiometricToView || false);
      setSecurityLevel(message.selfDestruct.securityLevel);
    }
  }, [message.id]);

  useEffect(() => {
    if (isRevealed && !hasBeenViewed) {
      handleMessageViewed();
    }
  }, [isRevealed]);

  useEffect(() => {
    if (remainingTime <= 0 && !isExpired) {
      handleExpiration();
    } else if (remainingTime <= 60000 && remainingTime > 0) {
      startUrgentAnimation();
    }
  }, [remainingTime]);

  const loadMessageStatus = async () => {
    if (!message.selfDestruct) return;

    try {
      const status = await SelfDestructService.getMessageStatus(message.id);
      if (status) {
        setIsExpired(status.isExpired);
        setRemainingTime(status.remainingTime || 0);
        setViewCount(status.viewCount);
        setSecurityLevel(status.securityLevel);
      }
    } catch (error) {
      console.error('Failed to load message status:', error);
    }
  };

  const handleRevealMessage = async () => {
    if (isExpired || isRevealed) return;

    setIsLoading(true);
    MicroInteractions.triggerHapticFeedback('medium');

    try {
      // Check if message can be viewed
      const viewResult = await SelfDestructService.viewMessage(message.id, 'current_user');
      
      if (!viewResult.allowed) {
        Alert.alert('غير مسموح', viewResult.warning || 'لا يمكن عرض هذه الرسالة');
        setIsLoading(false);
        return;
      }

      // Biometric authentication if required
      if (requiresBiometric) {
        const biometricResult = await BiometricAuthService.authenticate('عرض الرسالة الحساسة');
        if (!biometricResult.success) {
          Alert.alert('فشل المصادقة', 'المصادقة البيومترية مطلوبة لعرض هذه الرسالة');
          setIsLoading(false);
          return;
        }
      }

      // Show warning if time is running out
      if (viewResult.remainingTime && viewResult.remainingTime < 60000) {
        Alert.alert(
          '⚠️ تحذير',
          `ستنتهي صلاحية هذه الرسالة خلال ${Math.floor(viewResult.remainingTime / 1000)} ثانية`,
          [
            { text: 'إلغاء', style: 'cancel', onPress: () => setIsLoading(false) },
            { text: 'عرض', onPress: () => revealMessage() }
          ]
        );
      } else {
        revealMessage();
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في عرض الرسالة');
      setIsLoading(false);
    }
  };

  const revealMessage = () => {
    setIsRevealed(true);
    setIsLoading(false);
    
    // Reveal animation
    Animated.parallel([
      Animated.timing(revealAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });

    MicroInteractions.triggerHapticFeedback('success');
  };

  const handleMessageViewed = async () => {
    if (hasBeenViewed) return;
    
    setHasBeenViewed(true);
    onViewed?.();
    
    // Update view count
    await loadMessageStatus();
  };

  const handleExpiration = () => {
    setIsExpired(true);
    setIsRevealed(false);
    
    // Destruction animation
    Animated.sequence([
      MicroInteractions.createShakeAnimation(shakeAnim),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    MicroInteractions.triggerHapticFeedback('heavy');
    onExpired?.();
  };

  const startUrgentAnimation = () => {
    // Urgent pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const getSecurityIcon = () => {
    switch (securityLevel) {
      case 'maximum':
        return <Shield size={16} color="#FF4444" />;
      case 'high':
        return <Shield size={16} color="#FF8800" />;
      default:
        return <Lock size={16} color={Colors.primary} />;
    }
  };

  const getSecurityColor = () => {
    switch (securityLevel) {
      case 'maximum':
        return '#FF4444';
      case 'high':
        return '#FF8800';
      default:
        return Colors.primary;
    }
  };

  const formatRemainingTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  };

  if (isExpired) {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.expiredContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.expiredContent}>
          <Zap size={20} color="#FF4444" />
          <Text style={styles.expiredText}>تم حذف الرسالة تلقائياً</Text>
          <Text style={styles.expiredSubtext}>انتهت مدة الصلاحية</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isOwn ? styles.ownMessage : styles.otherMessage,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
            { translateX: shakeAnim }
          ]
        }
      ]}
    >
      {/* Security Header */}
      <View style={[styles.securityHeader, { borderColor: getSecurityColor() }]}>
        <View style={styles.securityLeft}>
          {getSecurityIcon()}
          <Text style={[styles.securityText, { color: getSecurityColor() }]}>
            رسالة ذاتية التدمير
          </Text>
          {requiresBiometric && (
            <Fingerprint size={14} color={getSecurityColor()} />
          )}
        </View>
        
        <View style={styles.securityRight}>
          <Eye size={14} color={Colors.medium} />
          <Text style={styles.viewCountText}>{viewCount}</Text>
        </View>
      </View>

      {/* Message Content */}
      {!isRevealed ? (
        <TouchableOpacity
          style={styles.hiddenContent}
          onPress={handleRevealMessage}
          disabled={isLoading}
        >
          <View style={styles.hiddenContentInner}>
            <EyeOff size={24} color={Colors.medium} />
            <Text style={styles.hiddenText}>
              {isLoading ? 'جاري التحميل...' : 'اضغط للعرض'}
            </Text>
            <Text style={styles.hiddenSubtext}>
              {requiresBiometric ? '🔐 يتطلب مصادقة بيومترية' : '👆 اضغط لكشف المحتوى'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <Animated.View
          style={[
            styles.revealedContent,
            {
              opacity: revealAnim,
            }
          ]}
        >
          <Text style={styles.messageText}>{message.content}</Text>
          
          {/* Anti-screenshot overlay for high security */}
          {(securityLevel === 'high' || securityLevel === 'maximum') && (
            <View style={styles.antiScreenshotOverlay}>
              <Text style={styles.antiScreenshotText}>🚫 محمي من لقطات الشاشة</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Timer */}
      {message.selfDestruct && remainingTime > 0 && (
        <View style={styles.timerContainer}>
          <SelfDestructTimer
            messageId={message.id}
            onExpired={handleExpiration}
            onWarning={(seconds) => {
              if (seconds <= 10) {
                MicroInteractions.createShakeAnimation(shakeAnim).start();
              }
            }}
            compact={true}
          />
        </View>
      )}

      {/* Security Warnings */}
      {isRevealed && remainingTime <= 60000 && remainingTime > 0 && (
        <Animated.View
          style={[
            styles.urgentWarning,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0.7, 1],
              })
            }
          ]}
        >
          <AlertTriangle size={14} color="#FF4444" />
          <Text style={styles.urgentWarningText}>
            ستنتهي الصلاحية خلال {formatRemainingTime(remainingTime)}
          </Text>
        </Animated.View>
      )}

      {/* Metadata */}
      <View style={styles.metadata}>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        
        {message.selfDestruct && (
          <View style={styles.securityBadge}>
            <Timer size={10} color="white" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: screenWidth * 0.8,
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    marginRight: 16,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    marginLeft: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expiredContainer: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF4444',
    borderWidth: 2,
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  securityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 10,
    color: Colors.medium,
  },
  hiddenContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  hiddenContentInner: {
    alignItems: 'center',
    gap: 8,
  },
  hiddenText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.medium,
  },
  hiddenSubtext: {
    fontSize: 11,
    color: Colors.medium,
    textAlign: 'center',
  },
  revealedContent: {
    padding: 12,
    position: 'relative',
  },
  messageText: {
    fontSize: 16,
    color: Colors.dark,
    lineHeight: 22,
  },
  antiScreenshotOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  antiScreenshotText: {
    fontSize: 8,
    color: '#FF4444',
    fontWeight: '600',
  },
  timerContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  urgentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1,
    borderTopColor: '#FF4444',
  },
  urgentWarningText: {
    fontSize: 11,
    color: '#FF4444',
    fontWeight: '600',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  timestamp: {
    fontSize: 10,
    color: Colors.medium,
  },
  securityBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 8,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredContent: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
  expiredSubtext: {
    fontSize: 11,
    color: Colors.medium,
  },
});