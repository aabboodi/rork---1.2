import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Heart, Star, Bookmark, Share as ShareIcon, Zap, MessageCircle, Shield, CheckCircle, AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MicroInteractions } from '@/utils/microInteractions';
import AnimatedFAB from './AnimatedFAB';
import AnimatedNotificationBanner from './AnimatedNotificationBanner';

interface NotificationState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export default function MicroInteractionsShowcase() {
  console.log('[MicroInteractionsShowcase] render');
  const [notification, setNotification] = useState<NotificationState>({ visible: false, type: 'info', title: '', message: '' });
  const [likeCount, setLikeCount] = useState<number>(42);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isStarred, setIsStarred] = useState<boolean>(false);

  const heartAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const starAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const bookmarkAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const shareAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const shakeAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const bounceAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const rotateAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  const handleLike = () => {
    console.log('[MicroInteractionsShowcase] handleLike');
    MicroInteractions.triggerHapticFeedback('medium');

    if (!isLiked) {
      Animated.parallel([
        MicroInteractions.createBounceAnimation(heartAnim),
        MicroInteractions.createPulseAnimation(pulseAnim, 1, 1.3)
      ]).start();

      setTimeout(() => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
      }, 1000);

      setLikeCount(prev => prev + 1);
    } else {
      MicroInteractions.createScaleAnimation(heartAnim, 0.8, 100).start(() => {
        MicroInteractions.createScaleAnimation(heartAnim, 1, 100).start();
      });

      setLikeCount(prev => prev - 1);
    }

    setIsLiked(prev => !prev);
  };

  const handleStar = () => {
    console.log('[MicroInteractionsShowcase] handleStar');
    MicroInteractions.triggerHapticFeedback('light');

    if (!isStarred) {
      MicroInteractions.createElasticAnimation(starAnim, 1.2).start(() => {
        MicroInteractions.createElasticAnimation(starAnim, 1).start();
      });
    } else {
      MicroInteractions.createScaleAnimation(starAnim, 0.9, 100).start(() => {
        MicroInteractions.createScaleAnimation(starAnim, 1, 100).start();
      });
    }

    setIsStarred(prev => !prev);
  };

  const handleBookmark = () => {
    console.log('[MicroInteractionsShowcase] handleBookmark');
    MicroInteractions.triggerHapticFeedback('light');

    if (!isBookmarked) {
      MicroInteractions.createBounceAnimation(bookmarkAnim).start();
    } else {
      MicroInteractions.createScaleAnimation(bookmarkAnim, 0.8, 100).start(() => {
        MicroInteractions.createScaleAnimation(bookmarkAnim, 1, 100).start();
      });
    }

    setIsBookmarked(prev => !prev);
  };

  const handleShare = () => {
    console.log('[MicroInteractionsShowcase] handleShare');
    MicroInteractions.triggerHapticFeedback('medium');
    MicroInteractions.createBounceAnimation(shareAnim).start();

    setNotification({
      visible: true,
      type: 'success',
      title: 'تم المشاركة',
      message: 'تم مشاركة المحتوى بنجاح'
    });
  };

  const handlePulse = () => {
    console.log('[MicroInteractionsShowcase] handlePulse');
    MicroInteractions.createPulseAnimation(pulseAnim, 0.8, 1.2).start();
    setTimeout(() => {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }, 2000);
  };

  const handleShake = () => {
    console.log('[MicroInteractionsShowcase] handleShake');
    MicroInteractions.triggerHapticFeedback('heavy');
    MicroInteractions.createShakeAnimation(shakeAnim).start();

    setNotification({
      visible: true,
      type: 'error',
      title: 'خطأ',
      message: 'حدث خطأ في العملية'
    });
  };

  const handleBounce = () => {
    console.log('[MicroInteractionsShowcase] handleBounce');
    MicroInteractions.triggerHapticFeedback('medium');
    MicroInteractions.createBounceAnimation(bounceAnim).start();
  };

  const handleRotate = () => {
    console.log('[MicroInteractionsShowcase] handleRotate');
    MicroInteractions.createRotationAnimation(rotateAnim).start();
    setTimeout(() => {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }, 2000);
  };

  const handleFABPress = () => {
    console.log('[MicroInteractionsShowcase] handleFABPress');
    setNotification({
      visible: true,
      type: 'info',
      title: 'إجراء جديد',
      message: 'تم الضغط على الزر العائم'
    });
  };

  return (
    <View style={styles.container} testID="microInteractionsShowcase">
      <AnimatedNotificationBanner
        visible={notification.visible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onDismiss={() => setNotification(prev => ({ ...prev, visible: false }))}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Micro Interactions</Text>

        <View style={styles.row}>
          <TouchableOpacity testID="likeButton" style={styles.card} onPress={handleLike} activeOpacity={0.9}>
            <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
              <Heart size={28} color={isLiked ? Colors.error : Colors.text} fill={isLiked ? Colors.error : 'none'} />
            </Animated.View>
            <Text style={styles.label}>Like • {likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="starButton" style={styles.card} onPress={handleStar} activeOpacity={0.9}>
            <Animated.View style={{ transform: [{ scale: starAnim }] }}>
              <Star size={28} color={isStarred ? (Colors.warning) : Colors.text} fill={isStarred ? Colors.warning : 'none'} />
            </Animated.View>
            <Text style={styles.label}>Star</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="bookmarkButton" style={styles.card} onPress={handleBookmark} activeOpacity={0.9}>
            <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
              <Bookmark size={28} color={isBookmarked ? Colors.primary : Colors.text} fill={isBookmarked ? Colors.primary : 'none'} />
            </Animated.View>
            <Text style={styles.label}>Bookmark</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity testID="shareButton" style={styles.card} onPress={handleShare} activeOpacity={0.9}>
            <Animated.View style={{ transform: [{ scale: shareAnim }] }}>
              <ShareIcon size={28} color={Colors.text} />
            </Animated.View>
            <Text style={styles.label}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="pulseButton" style={styles.card} onPress={handlePulse} activeOpacity={0.9}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Zap size={28} color={Colors.accent} />
            </Animated.View>
            <Text style={styles.label}>Pulse</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="shakeButton" style={styles.card} onPress={handleShake} activeOpacity={0.9}>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <AlertTriangle size={28} color={Colors.error} />
            </Animated.View>
            <Text style={styles.label}>Shake</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity testID="bounceButton" style={styles.card} onPress={handleBounce} activeOpacity={0.9}>
            <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
              <MessageCircle size={28} color={Colors.text} />
            </Animated.View>
            <Text style={styles.label}>Bounce</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="rotateButton" style={styles.card} onPress={handleRotate} activeOpacity={0.9}>
            <Animated.View style={{
              transform: [{
                rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
              }]
            }}>
              <Shield size={28} color={Colors.text} />
            </Animated.View>
            <Text style={styles.label}>Rotate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.fabContainer} pointerEvents="box-none">
        <AnimatedFAB
          icon={<CheckCircle size={24} color="#fff" />}
          onPress={handleFABPress}
          showPulse
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
});