import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Dimensions, Modal, TextInput, ScrollView } from 'react-native';
import { Heart, MessageCircle, Share, Bookmark, Play, Pause, Volume2, VolumeX, Sparkles, TrendingUp, User, Users, Zap, Wallet, Send, X } from 'lucide-react-native';
import { Clip } from '@/types';
import Colors from '@/constants/colors';
import { formatTime } from '@/utils/dateUtils';
import { useRecommendationStore } from '@/store/recommendationStore';
import { useWalletStore } from '@/store/walletStore';
import { useAuthStore } from '@/store/authStore';

const { width, height } = Dimensions.get('window');

interface ClipItemProps {
  clip: Clip;
  onInteraction?: (action: 'like' | 'comment' | 'share' | 'view' | 'pause' | 'replay') => void;
  showRecommendationInfo?: boolean;
  position?: number;
}

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to format time ago
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}د`;
  } else if (hours < 24) {
    return `${hours}س`;
  } else {
    return `${days}ي`;
  }
};

export default function ClipItem({ clip, onInteraction, showRecommendationInfo = false, position = 0 }: ClipItemProps) {
  const [isLiked, setIsLiked] = useState(clip.isLiked || false);
  const [isSaved, setIsSaved] = useState(clip.isSaved || false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [likesCount, setLikesCount] = useState(clip.likes);
  const [commentsCount, setCommentsCount] = useState(clip.comments);
  const [sharesCount, setSharesCount] = useState(clip.shares);
  const [viewsCount, setViewsCount] = useState(clip.views);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [viewStartTime] = useState(Date.now());
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  
  const { 
    collectSignal, 
    collectVideoWatchSignal, 
    collectProfileClickSignal,
    trackClipConsumption,
    privacySettings,
    currentBatch,
    batchConsumptionTracker
  } = useRecommendationStore();

  const { balances, updateBalance, addTransaction } = useWalletStore();
  const { userId } = useAuthStore();

  // Track video watch progress
  useEffect(() => {
    if (isPlaying && playStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - playStartTime;
        const percentage = Math.min(elapsed / (clip.duration * 1000), 1);
        setWatchPercentage(percentage);
        
        // Collect watch signal at key milestones
        if (percentage >= 0.25 && percentage < 0.3) {
          collectVideoWatchSignal(clip.id, 0.25, loopCount, {
            screenName: 'clips',
            position,
            dwellTime: elapsed,
            batchId: currentBatch?.batchId,
            batchPosition: currentBatch?.clipIds.indexOf(clip.id),
            feedbackLoopIteration: currentBatch?.feedbackLoopIteration
          });
        } else if (percentage >= 0.5 && percentage < 0.55) {
          collectVideoWatchSignal(clip.id, 0.5, loopCount, {
            screenName: 'clips',
            position,
            dwellTime: elapsed,
            batchId: currentBatch?.batchId,
            batchPosition: currentBatch?.clipIds.indexOf(clip.id),
            feedbackLoopIteration: currentBatch?.feedbackLoopIteration
          });
        } else if (percentage >= 0.75 && percentage < 0.8) {
          collectVideoWatchSignal(clip.id, 0.75, loopCount, {
            screenName: 'clips',
            position,
            dwellTime: elapsed,
            batchId: currentBatch?.batchId,
            batchPosition: currentBatch?.clipIds.indexOf(clip.id),
            feedbackLoopIteration: currentBatch?.feedbackLoopIteration
          });
        } else if (percentage >= 0.95) {
          collectVideoWatchSignal(clip.id, 1.0, loopCount, {
            screenName: 'clips',
            position,
            dwellTime: elapsed,
            batchId: currentBatch?.batchId,
            batchPosition: currentBatch?.clipIds.indexOf(clip.id),
            feedbackLoopIteration: currentBatch?.feedbackLoopIteration
          });
          
          // Video completed, increment loop count
          setLoopCount(prev => prev + 1);
          setPlayStartTime(Date.now()); // Reset for potential loop
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, playStartTime, clip.duration, clip.id, position, loopCount]);

  // Track view when component mounts
  useEffect(() => {
    if (privacySettings.allowBehaviorTracking) {
      collectSignal(clip.id, 'video', 'view', {
        screenName: 'clips',
        position,
        timeSpent: 0,
        scrollDepth: 0,
        batchId: currentBatch?.batchId,
        batchPosition: currentBatch?.clipIds.indexOf(clip.id),
        feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
        contentContext: {
          authorId: clip.userId,
          contentAge: Date.now() - clip.timestamp,
          contentPopularity: clip.views / 10000, // Normalize popularity
          contentCategory: 'short_video',
          contentTags: clip.hashtags || [],
          isSponsored: false,
          isRecommended: !!clip.recommendationScore
        }
      });
    }
  }, []);

  // Track consumption when component unmounts or clip changes
  useEffect(() => {
    return () => {
      if (privacySettings.allowBehaviorTracking && currentBatch && watchPercentage > 0) {
        const dwellTime = Date.now() - viewStartTime;
        const skipSignal = dwellTime < 2000; // Skip if less than 2 seconds
        
        // Track consumption in micro-batch feedback loop
        trackClipConsumption(
          clip.id,
          watchPercentage,
          loopCount,
          dwellTime,
          skipSignal,
          []
        );
      }
    };
  }, [clip.id, watchPercentage, loopCount]);

  const handleLike = async () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    
    // Collect explicit engagement signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        clip.id, 
        'video', 
        'like', 
        {
          screenName: 'clips',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          batchId: currentBatch?.batchId,
          batchPosition: currentBatch?.clipIds.indexOf(clip.id),
          feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
          contentContext: {
            authorId: clip.userId,
            contentAge: Date.now() - clip.timestamp,
            contentPopularity: clip.views / 10000,
            contentCategory: 'short_video',
            contentTags: clip.hashtags || [],
            isSponsored: false,
            isRecommended: !!clip.recommendationScore
          }
        },
        {
          reactionType: 'like'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          watchPercentage,
          loopCount,
          scrollVelocity: 0,
          engagementDepth: 0.8,
          attentionScore: 0.9,
          exitMethod: 'interaction'
        }
      );
      
      // Track consumption with engagement action
      const dwellTime = Date.now() - viewStartTime;
      const skipSignal = dwellTime < 2000;
      
      await trackClipConsumption(
        clip.id,
        watchPercentage,
        loopCount,
        dwellTime,
        skipSignal,
        ['like']
      );
    }
    
    onInteraction?.('like');
  };

  const handleComment = async () => {
    setShowComments(true);
    
    // Collect engagement signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        clip.id, 
        'video', 
        'comment', 
        {
          screenName: 'clips',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          batchId: currentBatch?.batchId,
          batchPosition: currentBatch?.clipIds.indexOf(clip.id),
          feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
          contentContext: {
            authorId: clip.userId,
            contentAge: Date.now() - clip.timestamp,
            contentPopularity: clip.views / 10000,
            contentCategory: 'short_video',
            contentTags: clip.hashtags || [],
            isSponsored: false,
            isRecommended: !!clip.recommendationScore
          }
        },
        {
          commentText: 'User opened comment interface'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          watchPercentage,
          loopCount,
          scrollVelocity: 0,
          engagementDepth: 0.9,
          attentionScore: 0.95,
          exitMethod: 'interaction'
        }
      );
      
      // Track consumption with engagement action
      const dwellTime = Date.now() - viewStartTime;
      const skipSignal = dwellTime < 2000;
      
      await trackClipConsumption(
        clip.id,
        watchPercentage,
        loopCount,
        dwellTime,
        skipSignal,
        ['comment']
      );
    }
    
    onInteraction?.('comment');
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      userId: userId || '0',
      user: {
        id: userId || '0',
        displayName: 'أنت',
        profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      content: commentText,
      timestamp: Date.now(),
      likes: 0
    };
    
    setComments([...comments, newComment]);
    setCommentsCount(prev => prev + 1);
    setCommentText('');
    Alert.alert('تم إرسال التعليق', 'تم إضافة تعليقك بنجاح');
  };

  const handleShare = async () => {
    setShowShareOptions(true);
    
    // Collect high-value engagement signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        clip.id, 
        'video', 
        'share', 
        {
          screenName: 'clips',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          batchId: currentBatch?.batchId,
          batchPosition: currentBatch?.clipIds.indexOf(clip.id),
          feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
          contentContext: {
            authorId: clip.userId,
            contentAge: Date.now() - clip.timestamp,
            contentPopularity: clip.views / 10000,
            contentCategory: 'short_video',
            contentTags: clip.hashtags || [],
            isSponsored: false,
            isRecommended: !!clip.recommendationScore
          }
        },
        {
          shareDestination: 'external'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          watchPercentage,
          loopCount,
          scrollVelocity: 0,
          engagementDepth: 1.0,
          attentionScore: 1.0,
          exitMethod: 'interaction'
        }
      );
      
      // Track consumption with engagement action
      const dwellTime = Date.now() - viewStartTime;
      const skipSignal = dwellTime < 2000;
      
      await trackClipConsumption(
        clip.id,
        watchPercentage,
        loopCount,
        dwellTime,
        skipSignal,
        ['share']
      );
    }
    
    onInteraction?.('share');
  };

  const handleShareOption = (option: string) => {
    setShowShareOptions(false);
    setSharesCount(prev => prev + 1);
    
    switch (option) {
      case 'copy':
        Alert.alert('تم النسخ', 'تم نسخ رابط المقطع');
        break;
      case 'whatsapp':
        Alert.alert('واتساب', 'سيتم فتح واتساب لمشاركة المقطع');
        break;
      case 'telegram':
        Alert.alert('تيليجرام', 'سيتم فتح تيليجرام لمشاركة المقطع');
        break;
      case 'twitter':
        Alert.alert('تويتر', 'سيتم فتح تويتر لمشاركة المقطع');
        break;
      case 'facebook':
        Alert.alert('فيسبوك', 'سيتم فتح فيسبوك لمشاركة المقطع');
        break;
      case 'instagram':
        Alert.alert('إنستجرام', 'سيتم فتح إنستجرام لمشاركة المقطع');
        break;
      default:
        Alert.alert('مشاركة', 'تم مشاركة المقطع');
    }
  };

  const handleSave = async () => {
    setIsSaved(!isSaved);
    
    // Collect save signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        clip.id, 
        'video', 
        'save', 
        {
          screenName: 'clips',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          batchId: currentBatch?.batchId,
          batchPosition: currentBatch?.clipIds.indexOf(clip.id),
          feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
          contentContext: {
            authorId: clip.userId,
            contentAge: Date.now() - clip.timestamp,
            contentPopularity: clip.views / 10000,
            contentCategory: 'short_video',
            contentTags: clip.hashtags || [],
            isSponsored: false,
            isRecommended: !!clip.recommendationScore
          }
        },
        {
          saveCategory: 'videos'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          watchPercentage,
          loopCount,
          scrollVelocity: 0,
          engagementDepth: 0.7,
          attentionScore: 0.8,
          exitMethod: 'interaction'
        }
      );
      
      // Track consumption with engagement action
      const dwellTime = Date.now() - viewStartTime;
      const skipSignal = dwellTime < 2000;
      
      await trackClipConsumption(
        clip.id,
        watchPercentage,
        loopCount,
        dwellTime,
        skipSignal,
        ['save']
      );
    }
    
    Alert.alert(isSaved ? 'إلغاء الحفظ' : 'حفظ', isSaved ? 'تم إلغاء حفظ المقطع' : 'تم حفظ المقطع');
  };

  const handleDonate = () => {
    Alert.alert(
      'تبرع للمقطع',
      'اختر المبلغ الذي تريد التبرع به',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: '5 ريال', onPress: () => processDonation(5, 'SAR') },
        { text: '10 ريال', onPress: () => processDonation(10, 'SAR') },
        { text: '25 ريال', onPress: () => processDonation(25, 'SAR') },
        { text: '50 ريال', onPress: () => processDonation(50, 'SAR') },
      ]
    );
  };

  const processDonation = async (amount: number, currency: string) => {
    try {
      const balance = balances.find(b => b.currency === currency);
      if (!balance || balance.amount < amount) {
        Alert.alert('خطأ', 'رصيد غير كافٍ');
        return;
      }

      // Deduct money from user's balance
      await updateBalance(currency, -amount);

      // Add transaction record
      await addTransaction({
        id: Date.now().toString(),
        senderId: userId || '0',
        receiverId: clip.userId,
        amount,
        currency,
        timestamp: Date.now(),
        status: 'completed',
        type: 'donation',
        note: `تبرع للمقطع: ${clip.caption?.substring(0, 50) || 'مقطع فيديو'}...`,
      });

      // Collect donation signal
      if (privacySettings.allowBehaviorTracking) {
        await collectSignal(
          clip.id, 
          'video', 
          'donate', 
          {
            screenName: 'clips',
            position,
            timeSpent: Date.now() - viewStartTime,
            scrollDepth: 1.0,
            batchId: currentBatch?.batchId,
            batchPosition: currentBatch?.clipIds.indexOf(clip.id),
            feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
            contentContext: {
              authorId: clip.userId,
              contentAge: Date.now() - clip.timestamp,
              contentPopularity: clip.views / 10000,
              contentCategory: 'short_video',
              contentTags: clip.hashtags || [],
              isSponsored: false,
              isRecommended: !!clip.recommendationScore
            }
          },
          {
            donationAmount: amount,
            donationCurrency: currency
          },
          {
            dwellTime: Date.now() - viewStartTime,
            watchPercentage,
            loopCount,
            scrollVelocity: 0,
            engagementDepth: 1.0,
            attentionScore: 1.0,
            exitMethod: 'interaction'
          }
        );

        // Track consumption with engagement action
        const dwellTime = Date.now() - viewStartTime;
        const skipSignal = dwellTime < 2000;
        
        await trackClipConsumption(
          clip.id,
          watchPercentage,
          loopCount,
          dwellTime,
          skipSignal,
          ['donate']
        );
      }

      // Send notification to the recipient
      Alert.alert(
        'شكراً لك!', 
        `تم التبرع بمبلغ ${amount} ${currency} بنجاح

سيتم إرسال إشعار للمستخدم ${clip.user.displayName} بأنه تلقى تبرعاً منك.`
      );

      // Simulate sending notification to recipient
      setTimeout(() => {
        // This would normally be sent through a notification service
        console.log(`Notification sent to ${clip.user.displayName}: You received a donation of ${amount} ${currency} from a user. Thank you!`);
      }, 1000);

    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال التبرع');
    }
  };

  const handlePlayPause = async () => {
    const wasPlaying = isPlaying;
    setIsPlaying(!isPlaying);
    
    if (!wasPlaying) {
      // Starting to play
      setPlayStartTime(Date.now());
      setViewsCount(prev => prev + 1);
      onInteraction?.('view');
    } else {
      // Pausing
      if (privacySettings.allowBehaviorTracking) {
        await collectSignal(
          clip.id, 
          'video', 
          'video_pause', 
          {
            screenName: 'clips',
            position,
            timeSpent: Date.now() - viewStartTime,
            scrollDepth: 1.0,
            batchId: currentBatch?.batchId,
            batchPosition: currentBatch?.clipIds.indexOf(clip.id),
            feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
            contentContext: {
              authorId: clip.userId,
              contentAge: Date.now() - clip.timestamp,
              contentPopularity: clip.views / 10000,
              contentCategory: 'short_video',
              contentTags: clip.hashtags || [],
              isSponsored: false,
              isRecommended: !!clip.recommendationScore
            }
          },
          undefined,
          {
            dwellTime: Date.now() - viewStartTime,
            watchPercentage,
            loopCount,
            scrollVelocity: 0,
            engagementDepth: watchPercentage,
            attentionScore: watchPercentage,
            exitMethod: 'pause'
          }
        );
      }
      onInteraction?.('pause');
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleUserProfile = async () => {
    // Collect profile click signal
    if (privacySettings.allowBehaviorTracking) {
      await collectProfileClickSignal(
        clip.id,
        clip.userId,
        {
          screenName: 'clips',
          position,
          timeSpent: Date.now() - viewStartTime,
          contentType: 'video',
          batchId: currentBatch?.batchId,
          batchPosition: currentBatch?.clipIds.indexOf(clip.id),
          feedbackLoopIteration: currentBatch?.feedbackLoopIteration,
          contentContext: {
            authorId: clip.userId,
            contentAge: Date.now() - clip.timestamp,
            contentPopularity: clip.views / 10000,
            contentCategory: 'short_video',
            contentTags: clip.hashtags || [],
            isSponsored: false,
            isRecommended: !!clip.recommendationScore
          }
        }
      );
    }
    
    Alert.alert('الملف الشخصي', `عرض ملف ${clip.user.displayName}`);
  };

  const renderRecommendationInfo = () => {
    if (!showRecommendationInfo || !clip.recommendationScore) return null;

    return (
      <View style={styles.recommendationInfo}>
        <Sparkles size={12} color={Colors.primary} />
        <Text style={styles.recommendationText}>
          مخصص لك • {(clip.recommendationScore * 100).toFixed(0)}% تطابق
        </Text>
        {currentBatch && (
          <Text style={styles.batchInfo}>
            • دفعة {currentBatch.feedbackLoopIteration}
          </Text>
        )}
      </View>
    );
  };

  const renderBatchProgress = () => {
    if (!currentBatch || !batchConsumptionTracker) return null;

    const progress = batchConsumptionTracker.batchProgress * 100;
    const currentIndex = batchConsumptionTracker.currentClipIndex;
    const totalClips = batchConsumptionTracker.totalClipsInBatch;

    return (
      <View style={styles.batchProgress}>
        <View style={styles.batchProgressBar}>
          <View style={[styles.batchProgressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.batchProgressText}>
          {currentIndex}/{totalClips} • {progress.toFixed(0)}%
        </Text>
      </View>
    );
  };

  const renderHashtags = () => {
    if (!clip.hashtags || clip.hashtags.length === 0) return null;

    return (
      <View style={styles.hashtagsContainer}>
        {clip.hashtags.slice(0, 3).map((hashtag, index) => (
          <Text key={index} style={styles.hashtag}>
            {hashtag}
          </Text>
        ))}
        {clip.hashtags.length > 3 && (
          <Text style={styles.moreHashtags}>+{clip.hashtags.length - 3}</Text>
        )}
      </View>
    );
  };

  const renderMusicInfo = () => {
    if (!clip.music) return null;

    return (
      <View style={styles.musicInfo}>
        <Text style={styles.musicText}>
          🎵 {clip.music.title} - {clip.music.artist}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Video Background */}
      <View style={styles.videoContainer}>
        <Image 
          source={{ uri: clip.thumbnailUrl || clip.user.profilePicture }} 
          style={styles.videoBackground}
          resizeMode="cover"
        />
        
        {/* Play/Pause Overlay */}
        <TouchableOpacity 
          style={styles.playOverlay} 
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          {!isPlaying && (
            <View style={styles.playButton}>
              <Play size={40} color="white" fill="white" />
            </View>
          )}
        </TouchableOpacity>

        {/* Video Controls */}
        <View style={styles.videoControls}>
          <TouchableOpacity onPress={handleMuteToggle} style={styles.muteButton}>
            {isMuted ? (
              <VolumeX size={20} color="white" />
            ) : (
              <Volume2 size={20} color="white" />
            )}
          </TouchableOpacity>
          
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(clip.duration)}</Text>
          </View>
          
          {/* Watch Progress Indicator */}
          {watchPercentage > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${watchPercentage * 100}%` }]} />
            </View>
          )}
        </View>

        {/* Recommendation Info Overlay */}
        {renderRecommendationInfo()}

        {/* Batch Progress Overlay */}
        {renderBatchProgress()}
      </View>

      {/* Right Side Actions */}
      <View style={styles.rightActions}>
        {/* User Profile */}
        <TouchableOpacity onPress={handleUserProfile} style={styles.userProfileContainer}>
          <Image source={{ uri: clip.user.profilePicture }} style={styles.userAvatar} />
          {clip.personalizedRanking !== undefined && clip.personalizedRanking < 3 && (
            <View style={styles.trendingBadge}>
              <TrendingUp size={12} color="white" />
            </View>
          )}
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
          <Heart 
            size={28} 
            color={isLiked ? Colors.error : "white"}
            fill={isLiked ? Colors.error : 'transparent'}
          />
          <Text style={styles.actionCount}>{formatCount(likesCount)}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
          <MessageCircle size={28} color="white" />
          <Text style={styles.actionCount}>{formatCount(commentsCount)}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
          <Share size={28} color="white" />
          <Text style={styles.actionCount}>{formatCount(sharesCount)}</Text>
        </TouchableOpacity>

        {/* Donate Button */}
        <TouchableOpacity onPress={handleDonate} style={styles.donateActionButton}>
          <Wallet size={24} color="white" />
          <Text style={styles.donateActionText}>تبرع</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
          <Bookmark 
            size={28} 
            color={isSaved ? Colors.primary : "white"}
            fill={isSaved ? Colors.primary : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>@{clip.user.username}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(clip.timestamp)}</Text>
        </View>

        {/* Caption */}
        {clip.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {clip.caption}
          </Text>
        )}

        {/* Description */}
        {clip.description && (
          <Text style={styles.description} numberOfLines={1}>
            {clip.description}
          </Text>
        )}

        {/* Hashtags */}
        {renderHashtags()}

        {/* Music Info */}
        {renderMusicInfo()}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {formatCount(viewsCount)} مشاهدة
          </Text>
          {loopCount > 0 && (
            <Text style={styles.loopCount}>
              • {loopCount} إعادة
            </Text>
          )}
          {clip.recommendationScore && showRecommendationInfo && (
            <Text style={styles.recommendationScore}>
              • نقاط التوصية: {(clip.recommendationScore * 100).toFixed(0)}
            </Text>
          )}
          {watchPercentage > 0 && (
            <Text style={styles.watchPercentage}>
              • مشاهدة: {(watchPercentage * 100).toFixed(0)}%
            </Text>
          )}
        </View>
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.commentsModal}>
          <View style={styles.commentsHeader}>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <X size={24} color={Colors.dark} />
            </TouchableOpacity>
            <Text style={styles.commentsTitle}>التعليقات ({commentsCount})</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.commentsList}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image source={{ uri: comment.user.profilePicture }} style={styles.commentAvatar} />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUserName}>{comment.user.displayName}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <Text style={styles.commentTime}>{formatTimeAgo(comment.timestamp)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentTextInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="اكتب تعليقاً..."
              placeholderTextColor={Colors.medium}
              multiline
            />
            <TouchableOpacity onPress={handleAddComment} style={styles.commentSendButton}>
              <Send size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Options Modal */}
      <Modal
        visible={showShareOptions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShareOptions(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModal}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>مشاركة المقطع</Text>
              <TouchableOpacity onPress={() => setShowShareOptions(false)}>
                <X size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.shareOptions}>
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('copy')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>🔗</Text>
                </View>
                <Text style={styles.shareOptionText}>نسخ الرابط</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('whatsapp')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>📱</Text>
                </View>
                <Text style={styles.shareOptionText}>واتساب</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('telegram')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>✈️</Text>
                </View>
                <Text style={styles.shareOptionText}>تيليجرام</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('twitter')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>🐦</Text>
                </View>
                <Text style={styles.shareOptionText}>تويتر</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('facebook')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>📘</Text>
                </View>
                <Text style={styles.shareOptionText}>فيسبوك</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareOption} onPress={() => handleShareOption('instagram')}>
                <View style={styles.shareOptionIcon}>
                  <Text style={styles.shareOptionEmoji}>📷</Text>
                </View>
                <Text style={styles.shareOptionText}>إنستجرام</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper function to format large numbers
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height - 100, // Account for tab bar
    backgroundColor: Colors.dark,
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  videoBackground: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    padding: 20,
  },
  videoControls: {
    position: 'absolute',
    top: 50,
    right: 16,
    alignItems: 'flex-end',
  },
  muteButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 8,
  },
  durationBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    width: 100,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  recommendationInfo: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recommendationText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  batchInfo: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  batchProgress: {
    position: 'absolute',
    top: 90,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 8,
  },
  batchProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  batchProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  batchProgressText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
  },
  userProfileContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  trendingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 2,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  donateActionButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  donateActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 80, // Leave space for right actions
    padding: 16,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  displayName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  caption: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 8,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  hashtag: {
    color: Colors.primary,
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  moreHashtags: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  musicInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  musicText: {
    color: 'white',
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  loopCount: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  recommendationScore: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  watchPercentage: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  // Comments Modal Styles
  commentsModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.medium,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
    color: Colors.dark,
  },
  commentSendButton: {
    padding: 8,
  },
  // Share Modal Styles
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  shareOption: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  shareOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shareOptionEmoji: {
    fontSize: 24,
  },
  shareOptionText: {
    fontSize: 12,
    color: Colors.dark,
    textAlign: 'center',
  },
});