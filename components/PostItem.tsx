import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Dimensions, Modal, TextInput, ScrollView, Animated, Platform, AlertButton } from 'react-native';
import { ThumbsUp, MessageCircle, Share, Bookmark, MoreHorizontal, Sparkles, TrendingUp, User, Users, Zap, Wallet, Send, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Post } from '@/types';
import Colors from '@/constants/colors';
import { formatTimeAgo } from '@/utils/dateUtils';
import { useRecommendationStore } from '@/store/recommendationStore';
import { useWalletStore } from '@/store/walletStore';
import { useAuthStore } from '@/store/authStore';
import { MicroInteractions } from '@/utils/microInteractions';

const { width } = Dimensions.get('window');

interface PostItemProps {
  post: Post;
  onInteraction?: (action: 'like' | 'comment' | 'share' | 'view') => void;
  showRecommendationInfo?: boolean;
  position?: number;
}

export default function PostItem({ post, onInteraction, showRecommendationInfo = false, position = 0 }: PostItemProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [sharesCount, setSharesCount] = useState(post.shares);
  const [viewStartTime] = useState(Date.now());
  const [isVisible, setIsVisible] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const saveScaleAnim = useRef(new Animated.Value(1)).current;
  const shareScaleAnim = useRef(new Animated.Value(1)).current;
  const commentScaleAnim = useRef(new Animated.Value(1)).current;
  const donateScaleAnim = useRef(new Animated.Value(1)).current;
  const heartPulseAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;

  const {
    collectSignal,
    collectDwellTimeSignal,
    collectProfileClickSignal,
    privacySettings,
    getRecommendationForContent,
    getFeedRankingMetrics,
    getLastRankingFactors
  } = useRecommendationStore();

  const { balances, updateBalance, addTransaction } = useWalletStore();
  const { userId } = useAuthStore();

  const viewRef = useRef<View>(null);

  // Track view time when component unmounts or becomes invisible
  useEffect(() => {
    return () => {
      if (isVisible && privacySettings.allowBehaviorTracking) {
        const dwellTime = Date.now() - viewStartTime;
        collectDwellTimeSignal(post.id, 'text', dwellTime, {
          screenName: 'feed',
          position,
          scrollDepth: 1.0
        });
      }
    };
  }, [isVisible, viewStartTime, post.id, position, privacySettings.allowBehaviorTracking]);

  // Track when post becomes visible
  useEffect(() => {
    setIsVisible(true);

    // Entrance animation with stagger
    const delay = position * 50; // Stagger based on position
    MicroInteractions.createEntranceAnimation(scaleAnim, opacityAnim, delay).start();

    // Slide up animation for content
    MicroInteractions.createSlideAnimation(slideUpAnim, 20, 0, 400).start();

    // Collect view signal
    if (privacySettings.allowBehaviorTracking) {
      collectSignal(post.id, 'text', 'view', {
        screenName: 'feed',
        position,
        timeSpent: 0,
        scrollDepth: 0,
        contentContext: {
          authorId: post.userId,
          contentAge: Date.now() - post.timestamp,
          contentPopularity: post.likes / 1000, // Normalize popularity
          contentCategory: 'social_post',
          contentTags: [],
          isSponsored: post.type === 'sponsored',
          isRecommended: !!post.recommendationScore
        }
      });
    }
  }, []);

  const handleLike = async () => {
    const wasLiked = isLiked;

    // Immediate haptic feedback
    MicroInteractions.triggerHapticFeedback('medium');

    // Heart animation
    if (!isLiked) {
      // Like animation - bounce and pulse
      Animated.parallel([
        MicroInteractions.createBounceAnimation(likeScaleAnim),
        MicroInteractions.createPulseAnimation(heartPulseAnim, 1, 1.3)
      ]).start();

      // Stop pulse after 1 second
      setTimeout(() => {
        heartPulseAnim.stopAnimation();
        heartPulseAnim.setValue(1);
      }, 1000);
    } else {
      // Unlike animation - simple scale down
      MicroInteractions.createScaleAnimation(likeScaleAnim, 0.8, 100).start(() => {
        MicroInteractions.createScaleAnimation(likeScaleAnim, 1, 100).start();
      });
    }

    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    // Collect explicit engagement signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        post.id,
        'text',
        'like',
        {
          screenName: 'feed',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          contentContext: {
            authorId: post.userId,
            contentAge: Date.now() - post.timestamp,
            contentPopularity: post.likes / 1000,
            contentCategory: 'social_post',
            contentTags: [],
            isSponsored: post.type === 'sponsored',
            isRecommended: !!post.recommendationScore
          }
        },
        {
          reactionType: 'like'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          scrollVelocity: 0,
          engagementDepth: 0.8,
          attentionScore: 0.9,
          exitMethod: 'interaction'
        }
      );
    }

    onInteraction?.('like');
  };

  const handleComment = async () => {
    // Comment button animation
    MicroInteractions.triggerHapticFeedback('light');
    MicroInteractions.createBounceAnimation(commentScaleAnim).start();

    setShowComments(true);

    // Collect engagement signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        post.id,
        'text',
        'comment',
        {
          screenName: 'feed',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          contentContext: {
            authorId: post.userId,
            contentAge: Date.now() - post.timestamp,
            contentPopularity: post.likes / 1000,
            contentCategory: 'social_post',
            contentTags: [],
            isSponsored: post.type === 'sponsored',
            isRecommended: !!post.recommendationScore
          }
        },
        {
          commentText: 'User opened comment interface'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          scrollVelocity: 0,
          engagementDepth: 0.9,
          attentionScore: 0.95,
          exitMethod: 'interaction'
        }
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
    // Share button animation
    MicroInteractions.triggerHapticFeedback('light');
    MicroInteractions.createBounceAnimation(shareScaleAnim).start();

    setShowShareOptions(true);

    // Collect high-value engagement signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        post.id,
        'text',
        'share',
        {
          screenName: 'feed',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          contentContext: {
            authorId: post.userId,
            contentAge: Date.now() - post.timestamp,
            contentPopularity: post.likes / 1000,
            contentCategory: 'social_post',
            contentTags: [],
            isSponsored: post.type === 'sponsored',
            isRecommended: !!post.recommendationScore
          }
        },
        {
          shareDestination: 'external'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          scrollVelocity: 0,
          engagementDepth: 1.0,
          attentionScore: 1.0,
          exitMethod: 'interaction'
        }
      );
    }

    onInteraction?.('share');
  };

  const handleShareOption = (option: string) => {
    setShowShareOptions(false);
    setSharesCount(prev => prev + 1);

    switch (option) {
      case 'copy':
        Alert.alert('تم النسخ', 'تم نسخ رابط المنشور');
        break;
      case 'whatsapp':
        Alert.alert('واتساب', 'سيتم فتح واتساب لمشاركة المنشور');
        break;
      case 'telegram':
        Alert.alert('تيليجرام', 'سيتم فتح تيليجرام لمشاركة المنشور');
        break;
      case 'twitter':
        Alert.alert('تويتر', 'سيتم فتح تويتر لمشاركة المنشور');
        break;
      case 'facebook':
        Alert.alert('فيسبوك', 'سيتم فتح فيسبوك لمشاركة المنشور');
        break;
      case 'instagram':
        Alert.alert('إنستجرام', 'سيتم فتح إنستجرام لمشاركة المنشور');
        break;
      default:
        Alert.alert('مشاركة', 'تم مشاركة المنشور');
    }
  };

  const handleSave = async () => {
    // Save button animation
    MicroInteractions.triggerHapticFeedback('light');

    if (!isSaved) {
      // Save animation - elastic bounce
      MicroInteractions.createElasticAnimation(saveScaleAnim, 1.2).start(() => {
        MicroInteractions.createElasticAnimation(saveScaleAnim, 1).start();
      });
    } else {
      // Unsave animation - simple scale
      MicroInteractions.createScaleAnimation(saveScaleAnim, 0.9, 100).start(() => {
        MicroInteractions.createScaleAnimation(saveScaleAnim, 1, 100).start();
      });
    }

    setIsSaved(!isSaved);

    // Collect save signal
    if (privacySettings.allowBehaviorTracking) {
      await collectSignal(
        post.id,
        'text',
        'save',
        {
          screenName: 'feed',
          position,
          timeSpent: Date.now() - viewStartTime,
          scrollDepth: 1.0,
          contentContext: {
            authorId: post.userId,
            contentAge: Date.now() - post.timestamp,
            contentPopularity: post.likes / 1000,
            contentCategory: 'social_post',
            contentTags: [],
            isSponsored: post.type === 'sponsored',
            isRecommended: !!post.recommendationScore
          }
        },
        {
          saveCategory: 'general'
        },
        {
          dwellTime: Date.now() - viewStartTime,
          scrollVelocity: 0,
          engagementDepth: 0.7,
          attentionScore: 0.8,
          exitMethod: 'interaction'
        }
      );
    }

    Alert.alert(isSaved ? 'إلغاء الحفظ' : 'حفظ', isSaved ? 'تم إلغاء حفظ المنشور' : 'تم حفظ المنشور');
  };

  const handleDonate = () => {
    // Donate button animation
    MicroInteractions.triggerHapticFeedback('medium');
    MicroInteractions.createBounceAnimation(donateScaleAnim).start();

    Alert.alert(
      'تبرع للمنشور',
      `تبرع لـ ${post.user?.displayName || 'مستخدم'}
اختر المبلغ الذي تريد التبرع به`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: '5 ريال', onPress: () => processDonation(5, 'SAR') },
        { text: '10 ريال', onPress: () => processDonation(10, 'SAR') },
        { text: '25 ريال', onPress: () => processDonation(25, 'SAR') },
        { text: '50 ريال', onPress: () => processDonation(50, 'SAR') },
        { text: '100 ريال', onPress: () => processDonation(100, 'SAR') },
        { text: 'مبلغ مخصص', onPress: () => handleCustomDonation() },
      ]
    );
  };

  const handleCustomDonation = () => {
    Alert.prompt(
      'مبلغ مخصص',
      'أدخل المبلغ الذي تريد التبرع به (بالريال)',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تبرع', onPress: (amount?: string) => {
            const numAmount = parseFloat(amount || '0');
            if (numAmount > 0 && numAmount <= 1000) {
              processDonation(numAmount, 'SAR');
            } else {
              Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح (من 1 إلى 1000 ريال)');
            }
          }
        }
      ],
      'plain-text',
      '',
      'numeric'
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
        receiverId: post.userId,
        amount,
        currency,
        timestamp: Date.now(),
        status: 'completed',
        type: 'donation',
        note: `تبرع للمنشور: ${post.content.substring(0, 50)}...`,
      });

      // Collect donation signal
      if (privacySettings.allowBehaviorTracking) {
        await collectSignal(
          post.id,
          'text',
          'donate',
          {
            screenName: 'feed',
            position,
            timeSpent: Date.now() - viewStartTime,
            scrollDepth: 1.0,
            contentContext: {
              authorId: post.userId,
              contentAge: Date.now() - post.timestamp,
              contentPopularity: post.likes / 1000,
              contentCategory: 'social_post',
              contentTags: [],
              isSponsored: post.type === 'sponsored',
              isRecommended: !!post.recommendationScore
            }
          },
          {
            donationAmount: amount,
            donationCurrency: currency
          },
          {
            dwellTime: Date.now() - viewStartTime,
            scrollVelocity: 0,
            engagementDepth: 1.0,
            attentionScore: 1.0,
            exitMethod: 'interaction'
          }
        );
      }

      // Send notification to the recipient
      Alert.alert(
        'شكراً لك!',
        `تم التبرع بمبلغ ${amount} ${currency} بنجاح

سيتم إرسال إشعار للمستخدم ${post.user?.displayName || 'المستخدم'} بأنه تلقى تبرعاً منك.`
      );

      // Simulate sending notification to recipient
      setTimeout(() => {
        // This would normally be sent through a notification service
        console.log(`Notification sent to ${post.user?.displayName}: You received a donation of ${amount} ${currency} from a user. Thank you!`);
      }, 1000);

    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال التبرع');
    }
  };

  const handleMore = () => {
    const isMyPost = post.userId === userId;

    const options: AlertButton[] = [
      { text: 'إلغاء', style: 'cancel' as const },
    ];

    if (isMyPost) {
      options.push(
        { text: 'تعديل المنشور', onPress: () => handleEditPost() },
        { text: 'حذف المنشور', style: 'destructive' as const, onPress: () => handleDeletePost() },
        { text: 'إعدادات الخصوصية', onPress: () => handlePostPrivacy() }
      );
    } else {
      options.push(
        { text: 'نسخ رابط المنشور', onPress: () => handleCopyLink() },
        { text: 'إخفاء المنشور', onPress: () => handleHidePost() },
        { text: 'إلغاء متابعة ' + (post.user?.displayName || 'المستخدم'), onPress: () => handleUnfollow() },
        { text: 'الإبلاغ عن المنشور', onPress: () => handleReportPost() },
        { text: 'حظر ' + (post.user?.displayName || 'المستخدم'), style: 'destructive' as const, onPress: () => handleBlockUser() }
      );
    }

    Alert.alert('خيارات المنشور', 'اختر إجراء', options);
  };

  const handleEditPost = () => {
    Alert.alert('تعديل المنشور', 'سيتم فتح محرر المنشور قريباً');
  };

  const handleDeletePost = () => {
    Alert.alert(
      'حذف المنشور',
      'هل أنت متأكد من حذف هذا المنشور؟ لن يمكن استرجاعه.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive', onPress: () => {
            Alert.alert('تم الحذف', 'تم حذف المنشور بنجاح');
          }
        }
      ]
    );
  };

  const handlePostPrivacy = () => {
    Alert.alert('إعدادات الخصوصية', 'اختر من يمكنه رؤية هذا المنشور', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'عام', onPress: () => Alert.alert('تم', 'المنشور مرئي للجميع') },
      { text: 'الأصدقاء فقط', onPress: () => Alert.alert('تم', 'المنشور مرئي للأصدقاء فقط') },
      { text: 'أنا فقط', onPress: () => Alert.alert('تم', 'المنشور مرئي لك فقط') }
    ]);
  };

  const handleCopyLink = () => {
    Alert.alert('تم النسخ', 'تم نسخ رابط المنشور إلى الحافظة');
  };

  const handleHidePost = () => {
    Alert.alert('إخفاء المنشور', 'لن ترى هذا المنشور في الخلاصة بعد الآن', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إخفاء', onPress: () => Alert.alert('تم', 'تم إخفاء المنشور') }
    ]);
  };

  const handleUnfollow = () => {
    Alert.alert(
      'إلغاء المتابعة',
      `هل تريد إلغاء متابعة ${post.user?.displayName || 'هذا المستخدم'}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إلغاء المتابعة', onPress: () => {
            Alert.alert('تم', `تم إلغاء متابعة ${post.user?.displayName || 'المستخدم'}`);
          }
        }
      ]
    );
  };

  const handleReportPost = () => {
    Alert.alert('الإبلاغ عن المنشور', 'لماذا تريد الإبلاغ عن هذا المنشور؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'محتوى مضلل', onPress: () => handleReportSubmit('محتوى مضلل') },
      { text: 'عنف أو تهديد', onPress: () => handleReportSubmit('عنف أو تهديد') },
      { text: 'محتوى غير لائق', onPress: () => handleReportSubmit('محتوى غير لائق') },
      { text: 'سبام أو إعلانات', onPress: () => handleReportSubmit('سبام أو إعلانات') },
      { text: 'أخرى', onPress: () => handleReportSubmit('أخرى') }
    ]);
  };

  const handleReportSubmit = (reason: string) => {
    Alert.alert('تم الإبلاغ', `تم إرسال بلاغك بنجاح. السبب: ${reason}
سيتم مراجعة المنشور في أقرب وقت.`);
  };

  const handleBlockUser = () => {
    Alert.alert(
      'حظر المستخدم',
      `هل تريد حظر ${post.user?.displayName || 'هذا المستخدم'}؟ 

لن ترى منشوراته أو رسائله بعد الآن.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حظر', style: 'destructive', onPress: () => {
            Alert.alert('تم الحظر', `تم حظر ${post.user?.displayName || 'المستخدم'} بنجاح`);
          }
        }
      ]
    );
  };

  const handleProfileClick = async () => {
    // Collect profile click signal
    if (privacySettings.allowBehaviorTracking) {
      await collectProfileClickSignal(
        post.id,
        post.userId,
        {
          screenName: 'feed',
          position,
          timeSpent: Date.now() - viewStartTime,
          contentType: 'text',
          contentContext: {
            authorId: post.userId,
            contentAge: Date.now() - post.timestamp,
            contentPopularity: post.likes / 1000,
            contentCategory: 'social_post',
            contentTags: [],
            isSponsored: post.type === 'sponsored',
            isRecommended: !!post.recommendationScore
          }
        }
      );
    }

    router.push(`/profile/${post.userId}`);
  };

  const renderRecommendationInfo = () => {
    if (!showRecommendationInfo || !post.recommendationScore) return null;

    const recommendation = getRecommendationForContent(post.id);
    const rankingFactors = getLastRankingFactors();

    return (
      <View style={styles.recommendationInfo}>
        <View style={styles.recommendationHeader}>
          <Sparkles size={12} color={Colors.primary} />
          <Text style={styles.recommendationText}>
            مخصص لك • {(post.recommendationScore * 100).toFixed(0)}% تطابق
          </Text>
          {recommendation?.metadata && (
            <View style={styles.rankingBadge}>
              <TrendingUp size={10} color={Colors.background} />
            </View>
          )}
        </View>

        {/* Enhanced ranking factors display */}
        {recommendation?.rankingFactors && recommendation.rankingFactors.length > 0 && (
          <View style={styles.rankingFactors}>
            {recommendation.rankingFactors.slice(0, 3).map((factor, index) => (
              <View key={factor.factor} style={styles.rankingFactor}>
                {factor.factor === 'author_affinity' && <User size={8} color={Colors.primary} />}
                {factor.factor === 'social_proof' && <Users size={8} color={Colors.primary} />}
                {factor.factor === 'engagement' && <Zap size={8} color={Colors.primary} />}
                <Text style={styles.rankingFactorText}>
                  {factor.explanation}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Social context display */}
        {recommendation?.socialContext && recommendation.socialContext.friendsWhoEngaged.length > 0 && (
          <View style={styles.socialContext}>
            <Users size={10} color={Colors.success} />
            <Text style={styles.socialContextText}>
              {recommendation.socialContext.friendsWhoEngaged.length} من أصدقائك تفاعلوا مع هذا
            </Text>
          </View>
        )}

        {post.recommendationReasons && post.recommendationReasons.length > 0 && (
          <Text style={styles.recommendationReasons}>
            {post.recommendationReasons.slice(0, 2).join(' • ')}
          </Text>
        )}
      </View>
    );
  };

  const renderMediaContent = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

    if (post.mediaUrls.length === 1) {
      return (
        <Image
          source={{ uri: post.mediaUrls[0] }}
          style={styles.singleImage}
          resizeMode="cover"
        />
      );
    }

    if (post.mediaUrls.length === 2) {
      return (
        <View style={styles.doubleImageContainer}>
          {post.mediaUrls.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.doubleImage}
              resizeMode="cover"
            />
          ))}
        </View>
      );
    }

    // Multiple images (3+)
    return (
      <View style={styles.multipleImageContainer}>
        <Image
          source={{ uri: post.mediaUrls[0] }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        <View style={styles.sideImagesContainer}>
          <Image
            source={{ uri: post.mediaUrls[1] }}
            style={styles.sideImage}
            resizeMode="cover"
          />
          {post.mediaUrls.length > 2 && (
            <View style={styles.moreImagesOverlay}>
              <Image
                source={{ uri: post.mediaUrls[2] }}
                style={styles.sideImage}
                resizeMode="cover"
              />
              {post.mediaUrls.length > 3 && (
                <View style={styles.moreImagesCount}>
                  <Text style={styles.moreImagesText}>+{post.mediaUrls.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      ref={viewRef}
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: slideUpAnim }
          ],
          opacity: opacityAnim
        }
      ]}
    >
      {/* Enhanced Recommendation Info */}
      {renderRecommendationInfo()}

      {/* Post Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleProfileClick}>
          <Image source={{ uri: post.user?.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' }} style={styles.avatar} />
          <View style={styles.userDetails}>
            <View style={styles.userNameContainer}>
              <Text style={styles.displayName}>{post.user?.displayName || 'مستخدم'}</Text>
              {post.personalizedRanking !== undefined && post.personalizedRanking < 5 && (
                <TrendingUp size={14} color={Colors.primary} style={styles.trendingIcon} />
              )}
              {post.socialContext?.friendsWhoLiked && post.socialContext.friendsWhoLiked.length > 0 && (
                <Users size={12} color={Colors.success} style={styles.socialIcon} />
              )}
            </View>
            <Text style={styles.username}>@{post.user?.username || 'user'}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(post.timestamp)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMore} style={styles.moreButton}>
          <MoreHorizontal size={20} color={Colors.medium} />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <View style={styles.content}>
        <Text style={styles.postText}>{post.content}</Text>
        {renderMediaContent()}
      </View>

      {/* Enhanced Post Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <Animated.View style={{ transform: [{ scale: Animated.multiply(likeScaleAnim, heartPulseAnim) }] }}>
            <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
              <ThumbsUp
                size={20}
                color={isLiked ? Colors.facebookBlue : Colors.medium}
                fill={isLiked ? Colors.facebookBlue : 'transparent'}
              />
              <Text style={[styles.actionText, isLiked && { color: Colors.facebookBlue }]}>
                {likesCount}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: commentScaleAnim }] }}>
            <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
              <MessageCircle size={20} color={Colors.medium} />
              <Text style={styles.actionText}>{commentsCount}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: shareScaleAnim }] }}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
              <Share size={20} color={Colors.medium} />
              <Text style={styles.actionText}>{sharesCount}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Donation Button */}
          <Animated.View style={{ transform: [{ scale: donateScaleAnim }] }}>
            <TouchableOpacity onPress={handleDonate} style={styles.donateButton}>
              <Wallet size={20} color={Colors.primary} />
              <Text style={styles.donateText}>تبرع</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View style={{ transform: [{ scale: saveScaleAnim }] }}>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Bookmark
              size={20}
              color={isSaved ? Colors.primary : Colors.medium}
              fill={isSaved ? Colors.primary : 'transparent'}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Enhanced engagement metrics display */}
      {showRecommendationInfo && post.engagementMetrics && (
        <View style={styles.engagementMetrics}>
          <Text style={styles.engagementMetricsText}>
            معدل التفاعل: {(post.engagementMetrics?.engagementRate * 100).toFixed(1)}%
          </Text>
          {post.engagementMetrics?.qualityEngagementScore > 0.7 && (
            <View style={styles.qualityBadge}>
              <Text style={styles.qualityBadgeText}>جودة عالية</Text>
            </View>
          )}
        </View>
      )}

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
              <Text style={styles.shareTitle}>مشاركة المنشور</Text>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 8,
    borderBottomColor: Colors.secondary,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  recommendationInfo: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  rankingBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 2,
  },
  rankingFactors: {
    marginTop: 4,
    marginBottom: 4,
  },
  rankingFactor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  rankingFactorText: {
    fontSize: 9,
    color: Colors.medium,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  socialContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  socialContextText: {
    fontSize: 9,
    color: Colors.success,
    marginLeft: 4,
    fontWeight: '500',
  },
  recommendationReasons: {
    fontSize: 10,
    color: Colors.medium,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  trendingIcon: {
    marginLeft: 4,
  },
  socialIcon: {
    marginLeft: 4,
  },
  username: {
    fontSize: 14,
    color: Colors.medium,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 16,
  },
  postText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark,
    marginBottom: 12,
  },
  singleImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  doubleImageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 4,
  },
  doubleImage: {
    flex: 1,
    height: 200,
    borderRadius: 8,
  },
  multipleImageContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 12,
    gap: 4,
  },
  mainImage: {
    flex: 2,
    height: '100%',
    borderRadius: 8,
  },
  sideImagesContainer: {
    flex: 1,
    gap: 4,
  },
  sideImage: {
    flex: 1,
    borderRadius: 8,
  },
  moreImagesOverlay: {
    flex: 1,
    position: 'relative',
  },
  moreImagesCount: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    color: Colors.medium,
    marginLeft: 6,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  donateText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  saveButton: {
    padding: 4,
  },
  engagementMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -4,
  },
  engagementMetricsText: {
    fontSize: 11,
    color: Colors.medium,
    marginRight: 8,
  },
  qualityBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  commentsModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 4,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    textAlign: 'right',
  },
  commentSendButton: {
    padding: 8,
  },
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
    padding: 16,
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