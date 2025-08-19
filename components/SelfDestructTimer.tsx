import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Alert, Platform } from 'react-native';
import { Clock, Shield, AlertTriangle, Pause, Play, Plus, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import SelfDestructService from '@/services/security/SelfDestructService';
import { SelfDestructMessage, ExpirationPolicy } from '@/types';
import { MicroInteractions } from '@/utils/microInteractions';

interface SelfDestructTimerProps {
  messageId: string;
  onExpired?: () => void;
  onWarning?: (secondsRemaining: number) => void;
  showControls?: boolean;
  compact?: boolean;
}

export default function SelfDestructTimer({ 
  messageId, 
  onExpired, 
  onWarning, 
  showControls = false,
  compact = false 
}: SelfDestructTimerProps) {
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [securityLevel, setSecurityLevel] = useState<string>('standard');
  const [viewCount, setViewCount] = useState<number>(0);
  const [lastWarning, setLastWarning] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const warningAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMessageStatus();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [messageId]);

  useEffect(() => {
    if (remainingTime <= 0 && isActive) {
      handleExpiration();
    } else if (remainingTime <= 60 && remainingTime > 0) {
      startWarningAnimation();
      
      // Show warnings at specific intervals
      const secondsRemaining = Math.floor(remainingTime / 1000);
      if ([60, 30, 10, 5].includes(secondsRemaining) && secondsRemaining !== lastWarning) {
        setLastWarning(secondsRemaining);
        onWarning?.(secondsRemaining);
        showWarningAlert(secondsRemaining);
        MicroInteractions.triggerHapticFeedback('heavy');
      }
    }
  }, [remainingTime, isActive]);

  const loadMessageStatus = async () => {
    try {
      const status = await SelfDestructService.getMessageStatus(messageId);
      if (status) {
        setRemainingTime(status.remainingTime || 0);
        setIsActive(!status.isExpired && (status.remainingTime || 0) > 0);
        setSecurityLevel(status.securityLevel);
        setViewCount(status.viewCount);
      }
    } catch (error) {
      console.error('Failed to load message status:', error);
    }
  };

  const updateTimer = async () => {
    if (!isActive || isPaused) return;

    try {
      const status = await SelfDestructService.getMessageStatus(messageId);
      if (status && !status.isExpired) {
        const newRemainingTime = status.remainingTime || 0;
        setRemainingTime(newRemainingTime);
        
        // Update progress animation
        const totalDuration = 24 * 60 * 60 * 1000; // Assume 24 hours default
        const progress = newRemainingTime / totalDuration;
        Animated.timing(progressAnim, {
          toValue: progress,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      } else {
        setIsActive(false);
        setRemainingTime(0);
      }
    } catch (error) {
      console.error('Failed to update timer:', error);
    }
  };

  const handleExpiration = () => {
    setIsActive(false);
    setRemainingTime(0);
    
    // Explosion animation
    MicroInteractions.createShakeAnimation(shakeAnim).start();
    MicroInteractions.triggerHapticFeedback('heavy');
    
    onExpired?.();
    
    Alert.alert(
      '🔥 رسالة محذوفة',
      'تم حذف الرسالة تلقائياً لانتهاء مدة صلاحيتها',
      [{ text: 'موافق', style: 'default' }]
    );
  };

  const startWarningAnimation = () => {
    // Pulse animation for urgency
    Animated.loop(
      Animated.sequence([
        MicroInteractions.createScaleAnimation(pulseAnim, 1.1, 300),
        MicroInteractions.createScaleAnimation(pulseAnim, 1, 300)
      ])
    ).start();

    // Warning color animation
    Animated.loop(
      Animated.sequence([
        MicroInteractions.createOpacityAnimation(warningAnim, 1, 500),
        MicroInteractions.createOpacityAnimation(warningAnim, 0.3, 500)
      ])
    ).start();
  };

  const showWarningAlert = (seconds: number) => {
    const message = seconds === 60 ? 'ستنتهي صلاحية الرسالة خلال دقيقة واحدة' :
                   seconds === 30 ? 'ستنتهي صلاحية الرسالة خلال 30 ثانية' :
                   seconds === 10 ? 'ستنتهي صلاحية الرسالة خلال 10 ثوانٍ' :
                   seconds === 5 ? 'ستنتهي صلاحية الرسالة خلال 5 ثوانٍ' :
                   `ستنتهي صلاحية الرسالة خلال ${seconds} ثانية`;

    if (Platform.OS !== 'web') {
      Alert.alert('⚠️ تحذير', message, [{ text: 'موافق' }]);
    }
  };

  const handlePauseResume = async () => {
    try {
      MicroInteractions.triggerHapticFeedback('medium');
      
      if (isPaused) {
        await SelfDestructService.resumeTimer(messageId, 'user_request');
        setIsPaused(false);
      } else {
        await SelfDestructService.pauseTimer(messageId, 'user_request', 'current_user');
        setIsPaused(true);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تعديل المؤقت');
    }
  };

  const handleExtend = async () => {
    Alert.alert(
      'تمديد المؤقت',
      'كم دقيقة تريد إضافتها؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: '5 دقائق', onPress: () => extendTimer(5 * 60 * 1000) },
        { text: '15 دقيقة', onPress: () => extendTimer(15 * 60 * 1000) },
        { text: '30 دقيقة', onPress: () => extendTimer(30 * 60 * 1000) },
        { text: '1 ساعة', onPress: () => extendTimer(60 * 60 * 1000) }
      ]
    );
  };

  const extendTimer = async (duration: number) => {
    try {
      MicroInteractions.triggerHapticFeedback('success');
      const success = await SelfDestructService.extendTimer(
        messageId, 
        duration, 
        'User requested extension', 
        'current_user'
      );
      
      if (success) {
        await loadMessageStatus();
        Alert.alert('✅ تم التمديد', 'تم تمديد مدة الرسالة بنجاح');
      } else {
        Alert.alert('❌ فشل التمديد', 'لا يمكن تمديد هذه الرسالة');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تمديد المؤقت');
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    MicroInteractions.triggerHapticFeedback('light');
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
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

  const getTimerColor = (): string => {
    if (remainingTime <= 10000) return '#FF4444'; // Red - Critical
    if (remainingTime <= 60000) return '#FF8800'; // Orange - Warning
    if (remainingTime <= 300000) return '#FFA500'; // Yellow - Caution
    return Colors.primary; // Normal
  };

  const getSecurityIcon = () => {
    switch (securityLevel) {
      case 'maximum':
        return <Shield size={14} color="#FF4444" />;
      case 'high':
        return <Shield size={14} color="#FF8800" />;
      default:
        return <Shield size={14} color={Colors.primary} />;
    }
  };

  if (!isActive && remainingTime <= 0) {
    return (
      <View style={[styles.container, styles.expiredContainer]}>
        <AlertTriangle size={16} color="#FF4444" />
        <Text style={styles.expiredText}>انتهت صلاحية الرسالة</Text>
      </View>
    );
  }

  if (!isVisible && !compact) {
    return (
      <TouchableOpacity style={styles.hiddenContainer} onPress={toggleVisibility}>
        <EyeOff size={16} color={Colors.medium} />
        <Text style={styles.hiddenText}>مؤقت مخفي</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.compactContainer,
        {
          transform: [
            { scale: pulseAnim },
            { translateX: shakeAnim }
          ]
        }
      ]}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: getTimerColor()
            }
          ]}
        />
      </View>

      <View style={styles.content}>
        {/* Timer Display */}
        <View style={styles.timerSection}>
          <Clock size={compact ? 14 : 16} color={getTimerColor()} />
          <Animated.Text
            style={[
              styles.timeText,
              compact && styles.compactTimeText,
              {
                color: getTimerColor(),
                opacity: warningAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.6],
                })
              }
            ]}
          >
            {formatTime(remainingTime)}
          </Animated.Text>
          
          {isPaused && (
            <View style={styles.pausedIndicator}>
              <Text style={styles.pausedText}>⏸️</Text>
            </View>
          )}
        </View>

        {/* Security Level & View Count */}
        {!compact && (
          <View style={styles.infoSection}>
            <View style={styles.securityLevel}>
              {getSecurityIcon()}
              <Text style={styles.securityText}>
                {securityLevel === 'maximum' ? 'أقصى' : 
                 securityLevel === 'high' ? 'عالي' : 'عادي'}
              </Text>
            </View>
            
            <View style={styles.viewCount}>
              <Eye size={12} color={Colors.medium} />
              <Text style={styles.viewCountText}>{viewCount}</Text>
            </View>
          </View>
        )}

        {/* Controls */}
        {showControls && !compact && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={handlePauseResume}
            >
              {isPaused ? 
                <Play size={14} color="white" /> : 
                <Pause size={14} color="white" />
              }
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.extendButton]}
              onPress={handleExtend}
            >
              <Plus size={14} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.hideButton]}
              onPress={toggleVisibility}
            >
              <EyeOff size={14} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Warning Overlay */}
      {remainingTime <= 60000 && remainingTime > 0 && (
        <Animated.View
          style={[
            styles.warningOverlay,
            {
              opacity: warningAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.3],
              })
            }
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  compactContainer: {
    padding: 8,
    marginVertical: 2,
  },
  expiredContainer: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hiddenContainer: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    opacity: 0.7,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.border,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    marginTop: 4,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  compactTimeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pausedIndicator: {
    marginLeft: 4,
  },
  pausedText: {
    fontSize: 12,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  securityLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityText: {
    fontSize: 12,
    color: Colors.medium,
    fontWeight: '500',
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 12,
    color: Colors.medium,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  pauseButton: {
    backgroundColor: '#FF8800',
  },
  extendButton: {
    backgroundColor: Colors.primary,
  },
  hideButton: {
    backgroundColor: Colors.medium,
  },
  expiredText: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
  },
  hiddenText: {
    fontSize: 12,
    color: Colors.medium,
  },
  warningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    pointerEvents: 'none',
  },
});