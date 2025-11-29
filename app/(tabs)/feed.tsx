import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, TextInput, Image, ScrollView, Alert, Dimensions, RefreshControl, Modal } from 'react-native';
import { Camera, Image as ImageIcon, Smile, Video, Bell, Users, UserPlus, User, Play, MapPin, Briefcase, Phone, Zap, Settings, TrendingUp, Sparkles, BarChart3, Target, MessageCircle as MessengerIcon, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { mockPosts } from '@/mocks/posts';
import { mockClips } from '@/mocks/clips';
import { mockProximitySuggestions, mockColleagueSuggestions, mockContactSuggestions, mockAlgorithmicSuggestions } from '@/mocks/suggestions';
import { mockUsers } from '@/mocks/users';
import { currentUser } from '@/mocks/users';
import { SocialTab, Post, Clip } from '@/types';
import { RecommendationResult } from '@/types/recommendation';
import Colors from '@/constants/colors';
import { translations } from '@/constants/i18n';
import { useAuthStore } from '@/store/authStore';
import { useRecommendationStore } from '@/store/recommendationStore';
import PostItem from '@/components/PostItem';
import ClipItem from '@/components/ClipItem';
import SocialSettings from '@/components/SocialSettings';

const { width } = Dimensions.get('window');

export default function SocialScreen() {
  const router = useRouter();
  const { language, userId } = useAuthStore();
  const {
    feedRecommendations,
    clipsRecommendations,
    socialRecommendations,
    isInitialized,
    isLoading,
    privacySettings,
    initializeRecommendations,
    generateFeedRecommendations,
    generateClipsRecommendations,
    refreshAllRecommendations,
    collectSignal,
    collectScrollVelocitySignal,
    getAnalytics,
    getSignalAnalytics,
    currentBatch,
    batchConsumptionTracker,
    feedbackLoopState,
    trackClipConsumption,
    completeBatch,
    abandonBatch,
    getNextBatch,
    getFeedbackLoopState,
    getBatchConsumptionStatus
  } = useRecommendationStore();

  const t = translations[language];

  const [activeTab, setActiveTab] = useState<SocialTab>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const [personalizedPosts, setPersonalizedPosts] = useState<Post[]>([]);
  const [personalizedClips, setPersonalizedClips] = useState<Clip[]>([]);
  const [showRecommendationInfo, setShowRecommendationInfo] = useState(false);
  const [showMicroBatchInfo, setShowMicroBatchInfo] = useState(false);
  const [postText, setPostText] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [scrollPosition, setScrollPosition] = useState(0);
  const [lastScrollTime, setLastScrollTime] = useState(Date.now());
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const scrollRef = useRef<FlatList>(null);
  const postInputRef = useRef<TextInput>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000
  }).current;

  const clipsViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 2000
  }).current;

  useEffect(() => {
    if (userId && !isInitialized) {
      initializeRecommendations(userId);
    }
  }, [userId, isInitialized]);

  useEffect(() => {
    updatePersonalizedContent();
  }, [feedRecommendations, clipsRecommendations]);

  useEffect(() => {
    if (activeTab === 'clips' && batchConsumptionTracker) {
      const { batchProgress, isCompleted } = batchConsumptionTracker;
      if (batchProgress >= 0.8 && !isCompleted) {
        handleBatchCompletion();
      }
    }
  }, [batchConsumptionTracker, activeTab]);

  const updatePersonalizedContent = useCallback(() => {
    const postsWithRecommendations = mockPosts.map(post => {
      const recommendation = feedRecommendations.find(rec =>
        rec.contentId.includes(post.id) || rec.contentId.includes('text')
      );
      return {
        ...post,
        recommendationScore: recommendation?.score || Math.random(),
        recommendationReasons: recommendation?.reasons.map(r => r.description) || [],
        personalizedRanking: recommendation ? feedRecommendations.indexOf(recommendation) : 999
      };
    });

    if (privacySettings.allowPersonalization && feedRecommendations.length > 0) {
      postsWithRecommendations.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
    }

    setPersonalizedPosts(postsWithRecommendations);

    let clipsToShow = mockClips;
    if (currentBatch && currentBatch.clipIds.length > 0) {
      clipsToShow = currentBatch.clipIds.map(clipId => {
        const clip = mockClips.find(c => c.id === clipId) || mockClips[0];
        return {
          ...clip,
          id: clipId,
          recommendationScore: 0.9,
          recommendationReasons: ['محتوى مخصص من خلال التعلم التكيفي'],
          personalizedRanking: currentBatch.clipIds.indexOf(clipId),
          batchId: currentBatch.batchId,
          batchPosition: currentBatch.clipIds.indexOf(clipId),
          feedbackLoopIteration: currentBatch.feedbackLoopIteration
        };
      });
    } else {
      clipsToShow = mockClips.map(clip => {
        const recommendation = clipsRecommendations.find(rec =>
          rec.contentId.includes(clip.id) || rec.contentId.includes('video')
        );
        return {
          ...clip,
          recommendationScore: recommendation?.score || Math.random(),
          recommendationReasons: recommendation?.reasons.map(r => r.description) || [],
          personalizedRanking: recommendation ? clipsRecommendations.indexOf(recommendation) : 999
        };
      });

      if (privacySettings.allowPersonalization && clipsRecommendations.length > 0) {
        clipsToShow.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
      }
    }

    setPersonalizedClips(clipsToShow);
  }, [feedRecommendations, clipsRecommendations, privacySettings.allowPersonalization, currentBatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllRecommendations();
    } catch (error) {
      console.error('Failed to refresh recommendations:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllRecommendations]);

  const handleTabChange = useCallback(async (tab: SocialTab) => {
    await collectSignal(
      `tab_${activeTab}`,
      'text',
      'click',
      {
        screenName: 'social',
        position: 0,
        timeSpent: Date.now() - (Date.now() - 1000),
        previousTab: activeTab,
        newTab: tab
      }
    );
    setActiveTab(tab);
  }, [activeTab, collectSignal]);

  const handlePostInteraction = useCallback(async (
    post: Post,
    action: 'like' | 'comment' | 'share' | 'view',
    position: number
  ) => {
  }, []);

  const handleClipInteraction = useCallback(async (
    clip: Clip,
    action: 'like' | 'comment' | 'share' | 'view' | 'pause' | 'replay',
    position: number
  ) => {
  }, []);

  const handleBatchCompletion = useCallback(async () => {
    try {
      await completeBatch();
      Alert.alert(
        'دفعة جديدة',
        'تم تحديث المحتوى بناءً على تفاعلك. ستجد مقاطع مخصصة أكثر!',
        [{ text: 'رائع!', style: 'default' }]
      );
    } catch (error) {
      console.error('Failed to complete batch:', error);
    }
  }, [completeBatch]);

  const handleBatchAbandonment = useCallback(async (reason: string) => {
    try {
      await abandonBatch(reason);
      console.log(`Batch abandoned: ${reason}`);
    } catch (error) {
      console.error('Failed to abandon batch:', error);
    }
  }, [abandonBatch]);

  const handleScroll = useCallback((event: any) => {
    const currentPosition = event.nativeEvent.contentOffset.y;
    const currentTime = Date.now();
    const timeDiff = currentTime - lastScrollTime;
    const positionDiff = Math.abs(currentPosition - scrollPosition);
    const velocity = timeDiff > 0 ? positionDiff / timeDiff : 0;

    setScrollPosition(currentPosition);
    setLastScrollTime(currentTime);
    setScrollVelocity(velocity);

    if (velocity > 2 && privacySettings.allowBehaviorTracking) {
      collectScrollVelocitySignal(
        `scroll_${activeTab}`,
        'text',
        velocity,
        {
          screenName: activeTab,
          position: Math.floor(currentPosition / 100),
          scrollDirection: currentPosition > scrollPosition ? 'down' : 'up'
        }
      );
    }
  }, [scrollPosition, lastScrollTime, activeTab, privacySettings.allowBehaviorTracking]);

  const handleCreatePost = () => {
    setShowCreatePost(true);
    setTimeout(() => {
      postInputRef.current?.focus();
    }, 100);
  };

  const handlePublishPost = () => {
    if (!postText.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة محتوى المنشور');
      return;
    }

    const newPost: Post = {
      id: Date.now().toString(),
      userId: userId || '0',
      user: {
        id: userId || '0',
        displayName: currentUser.displayName,
        username: currentUser.username,
        profilePicture: currentUser.profilePicture
      },
      content: postText,
      likes: 0,
      comments: 0,
      shares: 0,
      timestamp: Date.now(),
      type: 'text'
    };

    setPersonalizedPosts([newPost, ...personalizedPosts]);
    setPostText('');
    setShowCreatePost(false);
    Alert.alert('نجح', 'تم نشر المنشور بنجاح');
  };

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleSocialMessages = () => {
    router.push('/social/messages');
  };

  const handleLiveVideo = () => {
    Alert.alert(
      'بث مباشر',
      'ميزة البث المباشر ستكون متاحة قريباً. تتطلب هذه الميزة:\n\n• خادم وسائط متخصص\n• WebRTC للبث المباشر\n• إدارة المشاهدين\n\nهل تريد الاستعداد بفحص إعدادات الكاميرا؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'فحص الكاميرا',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status === 'granted') {
              Alert.alert('جاهز', 'الكاميرا جاهزة للاستخدام!');
            } else {
              Alert.alert('خطأ', 'يجب منح إذن الكاميرا للبث المباشر');
            }
          }
        }
      ]
    );
  };

  const handlePhotoVideo = async () => {
    Alert.alert('صورة/فيديو', 'اختر مصدر الوسائط', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'الكاميرا', onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('خطأ', 'يجب منح إذن الكاميرا لاستخدام هذه الميزة');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
              Alert.alert('تم التقاط الصورة', 'سيتم إرفاق الصورة بالمنشور');
              setShowCreatePost(true);
            }
          } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('خطأ', 'حدث خطأ أثناء فتح الكاميرا');
          }
        }
      },
      {
        text: 'المعرض', onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('خطأ', 'يجب منح إذن الوصول للصور لاستخدام هذه الميزة');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
              Alert.alert('تم اختيار الصورة', 'سيتم إرفاق الصورة بالمنشور');
              setShowCreatePost(true);
            }
          } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('خطأ', 'حدث خطأ أثناء فتح المعرض');
          }
        }
      }
    ]);
  };

  const handleFeeling = () => {
    const feelings = ['سعيد 😊', 'حزين 😢', 'متحمس 🤩', 'غاضب 😠', 'مرتاح 😌', 'متعب 😴'];
    const activities = ['يأكل 🍽️', 'يسافر ✈️', 'يعمل 💼', 'يدرس 📚', 'يلعب 🎮', 'يتسوق 🛍️'];

    Alert.alert('شعور/نشاط', 'اختر شعورك أو نشاطك الحالي', [
      { text: 'إلغاء', style: 'cancel' },
      ...feelings.map(feeling => ({
        text: feeling,
        onPress: () => {
          setPostText(prev => prev + ` ${feeling}`);
          if (showCreatePost) {
            postInputRef.current?.focus();
          }
        }
      })),
      ...activities.map(activity => ({
        text: activity,
        onPress: () => {
          setPostText(prev => prev + ` ${activity}`);
          if (showCreatePost) {
            postInputRef.current?.focus();
          }
        }
      }))
    ]);
  };

  const handleStoryPress = (story: any) => {
    setSelectedStory(story);
    setShowStoryModal(true);

    if (privacySettings.allowBehaviorTracking) {
      collectSignal(
        `story_${story.id}`,
        'image',
        'view',
        {
          screenName: 'social_stories',
          position: 0,
          timeSpent: 0,
          scrollDepth: 1.0,
          contentContext: {
            authorId: story.id,
            contentAge: Date.now() - (Date.now() - 3600000),
            contentPopularity: 0.8,
            contentCategory: 'story',
            contentTags: ['story'],
            isSponsored: false,
            isRecommended: false
          }
        }
      );
    }
  };

  const handleCreateStory = () => {
    Alert.alert('إنشاء قصة', 'اختر نوع القصة', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'صورة', onPress: () => {
          Alert.alert('صورة', 'سيتم فتح الكاميرا لالتقاط صورة للقصة');
        }
      },
      {
        text: 'فيديو', onPress: () => {
          Alert.alert('فيديو', 'سيتم فتح الكاميرا لتسجيل فيديو للقصة');
        }
      },
      {
        text: 'نص', onPress: () => {
          Alert.alert('نص', 'سيتم فتح محرر النصوص لإنشاء قصة نصية');
        }
      }
    ]);
  };

  const handleAddFriend = (userId: string, suggestionType?: string) => {
    Alert.alert('إضافة صديق', `تم إرسال طلب صداقة${suggestionType ? ` (${suggestionType})` : ''}`);
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleRecommendationSettings = () => {
    const analytics = getAnalytics();
    const signalAnalytics = getSignalAnalytics();

    Alert.alert(
      'إعدادات التوصيات المتقدمة',
      `التوصيات: ${analytics.totalRecommendations}
معدل التفاعل: ${(analytics.engagementRate * 100).toFixed(1)}%
متوسط النقاط: ${analytics.averageRecommendationScore.toFixed(2)}
الإشارات: ${analytics.totalSignals}
جودة الإشارات: ${((signalAnalytics?.signalQuality || 0) * 100).toFixed(1)}%
متوسط وقت المشاهدة: ${((signalAnalytics?.averageDwellTime || 0) / 1000).toFixed(1)}s

التعلم التكيفي:
الدفعات: ${analytics.feedbackLoopAnalytics?.totalBatches || 0}
التكرار الحالي: ${analytics.feedbackLoopAnalytics?.currentIteration || 0}
نقاط التقارب: ${((analytics.feedbackLoopAnalytics?.convergenceScore || 0) * 100).toFixed(1)}%
معدل الاستكشاف: ${((analytics.feedbackLoopAnalytics?.explorationRate || 0) * 100).toFixed(1)}%`
    );
  };

  const handleMicroBatchInfo = () => {
    const feedbackState = getFeedbackLoopState();
    const batchStatus = getBatchConsumptionStatus();

    if (!feedbackState || !batchStatus) {
      Alert.alert('معلومات التعلم التكيفي', 'لا توجد بيانات متاحة حالياً');
      return;
    }

    Alert.alert(
      'معلومات التعلم التكيفي',
      `الدفعة الحالية: ${currentBatch?.batchId.split('_').pop() || 'غير متاح'}
التكرار: ${feedbackState.currentIteration}/${feedbackState.totalIterations}
التقدم: ${(batchStatus.batchProgress * 100).toFixed(1)}%
المقاطع المشاهدة: ${batchStatus.currentClipIndex}/${batchStatus.totalClipsInBatch}
سرعة الاستهلاك: ${batchStatus.consumptionVelocity.toFixed(1)} مقطع/دقيقة
نقاط التقارب: ${(feedbackState.convergenceScore * 100).toFixed(1)}%
معدل الاستكشاف: ${(feedbackState.explorationRate * 100).toFixed(1)}%
التكيفات: ${feedbackState.adaptationHistory.length}`
    );
  };

  const renderFeedContent = () => (
    <FlatList
      ref={scrollRef}
      data={personalizedPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <PostItem
          post={item}
          onInteraction={(action) => handlePostInteraction(item, action, index)}
          showRecommendationInfo={showRecommendationInfo}
          position={index}
        />
      )}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={FeedHeader}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      onScroll={handleScroll}
      scrollEventThrottle={100}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
    />
  );

  const renderClipsContent = () => (
    <FlatList
      data={personalizedClips}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <ClipItem
          clip={item}
          onInteraction={(action) => handleClipInteraction(item, action, index)}
          showRecommendationInfo={showRecommendationInfo}
          position={index}
        />
      )}
      showsVerticalScrollIndicator={false}
      pagingEnabled
      snapToInterval={width}
      decelerationRate="fast"
      ListHeaderComponent={() => (
        <View style={styles.clipsHeader}>
          <View style={styles.clipsHeaderTop}>
            <Text style={styles.clipsTitle}>{t.shortClips}</Text>
            <View style={styles.clipsHeaderActions}>
              {privacySettings.allowPersonalization && (
                <TouchableOpacity
                  style={styles.recommendationIndicator}
                  onPress={() => setShowRecommendationInfo(!showRecommendationInfo)}
                >
                  <Sparkles size={16} color={Colors.primary} />
                  <Text style={styles.recommendationText}>مخصص</Text>
                </TouchableOpacity>
              )}
              {currentBatch && (
                <TouchableOpacity
                  style={styles.microBatchIndicator}
                  onPress={() => setShowMicroBatchInfo(!showMicroBatchInfo)}
                >
                  <Target size={16} color={Colors.success} />
                  <Text style={styles.microBatchText}>تكيفي</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Micro-Batch Info */}
          {showMicroBatchInfo && currentBatch && batchConsumptionTracker && (
            <View style={styles.microBatchInfo}>
              <View style={styles.microBatchInfoHeader}>
                <BarChart3 size={14} color={Colors.success} />
                <Text style={styles.microBatchInfoTitle}>التعلم التكيفي النشط</Text>
              </View>
              <View style={styles.microBatchStats}>
                <View style={styles.microBatchStat}>
                  <Text style={styles.microBatchStatLabel}>التكرار:</Text>
                  <Text style={styles.microBatchStatValue}>{currentBatch.feedbackLoopIteration}</Text>
                </View>
                <View style={styles.microBatchStat}>
                  <Text style={styles.microBatchStatLabel}>التقدم:</Text>
                  <Text style={styles.microBatchStatValue}>
                    {(batchConsumptionTracker.batchProgress * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.microBatchStat}>
                  <Text style={styles.microBatchStatLabel}>المقاطع:</Text>
                  <Text style={styles.microBatchStatValue}>
                    {batchConsumptionTracker.currentClipIndex}/{batchConsumptionTracker.totalClipsInBatch}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.microBatchInfoButton}
                onPress={handleMicroBatchInfo}
              >
                <Text style={styles.microBatchInfoButtonText}>تفاصيل أكثر</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.clipsFilters}>
            <TouchableOpacity style={[styles.clipFilter, styles.activeClipFilter]}>
              <Text style={[styles.clipFilterText, styles.activeClipFilterText]}>
                {currentBatch ? 'مخصص تكيفياً' : t.forYou}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clipFilter}>
              <Text style={styles.clipFilterText}>{t.trending}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clipFilter}>
              <Text style={styles.clipFilterText}>{t.recent}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      onScroll={handleScroll}
      scrollEventThrottle={100}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={clipsViewabilityConfig}
    />
  );

  const renderAddFriendsContent = () => (
    <ScrollView
      style={styles.friendsContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      onScroll={handleScroll}
      scrollEventThrottle={100}
    >
      {/* Proximity Suggestions */}
      <View style={styles.friendsSection}>
        <View style={styles.sectionHeader}>
          <MapPin size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{t.proximityFriends}</Text>
          {socialRecommendations.length > 0 && (
            <View style={styles.recommendationBadge}>
              <Sparkles size={12} color={Colors.background} />
            </View>
          )}
        </View>
        <Text style={styles.sectionSubtitle}>الأشخاص القريبون منك جغرافياً</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mockProximitySuggestions.map(suggestion => (
            <View key={suggestion.user.id} style={styles.friendCard}>
              <Image source={{ uri: suggestion.user.profilePicture }} style={styles.friendAvatar} />
              <Text style={styles.friendName} numberOfLines={1}>{suggestion.user.displayName}</Text>
              <Text style={styles.friendInfo} numberOfLines={1}>
                على بعد {suggestion.metadata.distance}م
              </Text>
              <Text style={styles.confidenceScore}>
                {Math.round(suggestion.confidence * 100)}% تطابق
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddFriend(suggestion.user.id, 'proximity')}
              >
                <Text style={styles.addButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Colleague Suggestions */}
      <View style={styles.friendsSection}>
        <View style={styles.sectionHeader}>
          <Briefcase size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{t.workColleagues}</Text>
        </View>
        <Text style={styles.sectionSubtitle}>زملاء العمل والدراسة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mockColleagueSuggestions.map(suggestion => (
            <View key={suggestion.user.id} style={styles.friendCard}>
              <Image source={{ uri: suggestion.user.profilePicture }} style={styles.friendAvatar} />
              <Text style={styles.friendName} numberOfLines={1}>{suggestion.user.displayName}</Text>
              <Text style={styles.friendInfo} numberOfLines={2}>
                {suggestion.metadata.sharedWorkplace || suggestion.metadata.sharedEducation || 'زميل عمل'}
              </Text>
              <Text style={styles.confidenceScore}>
                {Math.round(suggestion.confidence * 100)}% تطابق
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddFriend(suggestion.user.id, 'colleagues')}
              >
                <Text style={styles.addButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Contact Suggestions */}
      <View style={styles.friendsSection}>
        <View style={styles.sectionHeader}>
          <Phone size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{t.contactFriends}</Text>
        </View>
        <Text style={styles.sectionSubtitle}>من جهات الاتصال والعائلة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mockContactSuggestions.map(suggestion => (
            <View key={suggestion.user.id} style={styles.friendCard}>
              <Image source={{ uri: suggestion.user.profilePicture }} style={styles.friendAvatar} />
              <Text style={styles.friendName} numberOfLines={1}>{suggestion.user.displayName}</Text>
              <Text style={styles.friendInfo} numberOfLines={1}>
                {suggestion.metadata.familyConnection ? 'صلة عائلية' : 'جهة اتصال'}
              </Text>
              <Text style={styles.mutualFriends}>
                {suggestion.metadata.mutualFriends} أصدقاء مشتركون
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddFriend(suggestion.user.id, 'contacts')}
              >
                <Text style={styles.addButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Algorithmic Suggestions */}
      <View style={styles.friendsSection}>
        <View style={styles.sectionHeader}>
          <Zap size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{t.algorithmicSuggestions}</Text>
          <View style={styles.recommendationBadge}>
            <Sparkles size={12} color={Colors.background} />
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>مقترحات ذكية بناءً على اهتماماتك</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mockAlgorithmicSuggestions.map(suggestion => (
            <View key={suggestion.user.id} style={styles.friendCard}>
              <Image source={{ uri: suggestion.user.profilePicture }} style={styles.friendAvatar} />
              <Text style={styles.friendName} numberOfLines={1}>{suggestion.user.displayName}</Text>
              <Text style={styles.friendInfo} numberOfLines={2}>
                {suggestion.metadata.diversityScore > 0.7 ? 'اهتمامات متنوعة' : 'اهتمامات مشتركة'}
              </Text>
              <Text style={styles.mutualFriends}>
                {suggestion.metadata.mutualFriends} أصدقاء مشتركون
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddFriend(suggestion.user.id, 'algorithmic')}
              >
                <Text style={styles.addButtonText}>إضافة</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  const renderMyProfileContent = () => (
    <ScrollView
      style={styles.profileContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      onScroll={handleScroll}
      scrollEventThrottle={100}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: currentUser.profilePicture }} style={styles.profileAvatar} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{currentUser.displayName}</Text>
          <Text style={styles.profileUsername}>@{currentUser.username}</Text>
          <Text style={styles.profileBio}>{currentUser.bio}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>تعديل</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Stats */}
      <View style={styles.profileStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>125</Text>
          <Text style={styles.statLabel}>منشور</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>1.2K</Text>
          <Text style={styles.statLabel}>متابع</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>890</Text>
          <Text style={styles.statLabel}>متابَع</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>45K</Text>
          <Text style={styles.statLabel}>مشاهدة</Text>
        </View>
      </View>

      {/* Enhanced Recommendation Analytics */}
      {privacySettings.allowPersonalization && (
        <View style={styles.recommendationStats}>
          <View style={styles.recommendationStatsHeader}>
            <TrendingUp size={18} color={Colors.primary} />
            <Text style={styles.recommendationStatsTitle}>إحصائيات التخصيص المتقدمة</Text>
          </View>
          <View style={styles.recommendationStatsContent}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{getAnalytics().totalRecommendations}</Text>
              <Text style={styles.statLabel}>توصية</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{(getAnalytics().engagementRate * 100).toFixed(0)}%</Text>
              <Text style={styles.statLabel}>تفاعل</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{getAnalytics().averageRecommendationScore.toFixed(1)}</Text>
              <Text style={styles.statLabel}>دقة</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{getAnalytics().totalSignals}</Text>
              <Text style={styles.statLabel}>إشارة</Text>
            </View>
          </View>

          {/* Micro-Batch Feedback Loop Analytics */}
          {getAnalytics().feedbackLoopAnalytics && (
            <View style={styles.feedbackLoopStats}>
              <Text style={styles.feedbackLoopStatsTitle}>التعلم التكيفي</Text>
              <View style={styles.feedbackLoopStatsRow}>
                <Text style={styles.feedbackLoopStatLabel}>الدفعات المكتملة:</Text>
                <Text style={styles.feedbackLoopStatValue}>
                  {getAnalytics().feedbackLoopAnalytics.totalBatches}
                </Text>
              </View>
              <View style={styles.feedbackLoopStatsRow}>
                <Text style={styles.feedbackLoopStatLabel}>التكرار الحالي:</Text>
                <Text style={styles.feedbackLoopStatValue}>
                  {getAnalytics().feedbackLoopAnalytics.currentIteration}
                </Text>
              </View>
              <View style={styles.feedbackLoopStatsRow}>
                <Text style={styles.feedbackLoopStatLabel}>نقاط التقارب:</Text>
                <Text style={styles.feedbackLoopStatValue}>
                  {(getAnalytics().feedbackLoopAnalytics.convergenceScore * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.feedbackLoopStatsRow}>
                <Text style={styles.feedbackLoopStatLabel}>متوسط الرضا:</Text>
                <Text style={styles.feedbackLoopStatValue}>
                  {(getAnalytics().feedbackLoopAnalytics.averageBatchSatisfaction * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          )}

          {/* Signal Quality Metrics */}
          {getSignalAnalytics() && (
            <View style={styles.signalMetrics}>
              <Text style={styles.signalMetricsTitle}>جودة الإشارات</Text>
              <View style={styles.signalMetricsRow}>
                <Text style={styles.signalMetricLabel}>جودة الإشارات:</Text>
                <Text style={styles.signalMetricValue}>
                  {((getSignalAnalytics()?.signalQuality || 0) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.signalMetricsRow}>
                <Text style={styles.signalMetricLabel}>متوسط وقت المشاهدة:</Text>
                <Text style={styles.signalMetricValue}>
                  {((getSignalAnalytics()?.averageDwellTime || 0) / 1000).toFixed(1)}s
                </Text>
              </View>
              <View style={styles.signalMetricsRow}>
                <Text style={styles.signalMetricLabel}>سرعة التمرير:</Text>
                <Text style={styles.signalMetricValue}>
                  {(getSignalAnalytics()?.averageScrollVelocity || 0).toFixed(1)} px/ms
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Profile Content Tabs */}
      <View style={styles.profileContentTabs}>
        <TouchableOpacity style={[styles.profileTab, styles.activeProfileTab]}>
          <ImageIcon size={18} color={Colors.primary} />
          <Text style={[styles.profileTabText, styles.activeProfileTabText]}>المنشورات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileTab}>
          <Play size={18} color={Colors.medium} />
          <Text style={styles.profileTabText}>المقاطع</Text>
        </TouchableOpacity>
      </View>

      {/* My Posts */}
      <View style={styles.myPostsSection}>
        {personalizedPosts.slice(0, 3).map((post, index) => (
          <PostItem
            key={post.id}
            post={post}
            onInteraction={(action) => handlePostInteraction(post, action, index)}
            showRecommendationInfo={showRecommendationInfo}
            position={index}
          />
        ))}
      </View>
    </ScrollView>
  );

  const FeedHeader = () => (
    <View>
      {/* Social Header */}
      <View style={styles.feedHeader}>
        <View style={styles.feedHeaderLeft}>
          <Text style={styles.feedTitle}>ConnectApp</Text>
          {privacySettings.allowPersonalization && (
            <View style={styles.personalizationIndicator}>
              <Sparkles size={14} color={Colors.primary} />
              <Text style={styles.personalizationText}>مخصص لك</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
            <Settings size={22} color={Colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSocialMessages}>
            <MessengerIcon size={22} color={Colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleNotifications}>
            <Bell size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories Section */}
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Add Story */}
          <TouchableOpacity style={styles.addStoryContainer} onPress={handleCreateStory}>
            <Image source={{ uri: currentUser.profilePicture }} style={styles.storyAvatar} />
            <View style={styles.addStoryButton}>
              <Camera size={16} color="white" />
            </View>
            <Text style={styles.storyText}>قصتك</Text>
          </TouchableOpacity>

          {/* Friends Stories */}
          {mockUsers.slice(0, 8).map(user => (
            <TouchableOpacity
              key={user.id}
              style={styles.storyContainer}
              onPress={() => handleStoryPress(user)}
            >
              <View style={styles.storyRing}>
                <Image source={{ uri: user.profilePicture }} style={styles.storyAvatar} />
              </View>
              <Text style={styles.storyText} numberOfLines={1}>
                {user.displayName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Create Post */}
      <View style={styles.createPostContainer}>
        <Image source={{ uri: currentUser.profilePicture }} style={styles.userAvatar} />
        <TouchableOpacity style={styles.postInputContainer} onPress={handleCreatePost}>
          <Text style={styles.postInputPlaceholder}>{t.whatsOnYourMind}</Text>
        </TouchableOpacity>
      </View>

      {/* Post Actions */}
      <View style={styles.postActionsContainer}>
        <TouchableOpacity style={styles.postAction} onPress={handleLiveVideo}>
          <Video size={20} color={Colors.error} />
          <Text style={styles.postActionText}>مباشر</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.postAction} onPress={handlePhotoVideo}>
          <ImageIcon size={20} color={Colors.success} />
          <Text style={styles.postActionText}>صورة/فيديو</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.postAction} onPress={handleFeeling}>
          <Smile size={20} color={Colors.warning} />
          <Text style={styles.postActionText}>شعور/نشاط</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Main Tabs */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'feed' && styles.activeMainTab]}
          onPress={() => handleTabChange('feed')}
        >
          <ImageIcon size={18} color={activeTab === 'feed' ? Colors.primary : Colors.medium} />
          <Text style={[styles.mainTabText, activeTab === 'feed' && styles.activeMainTabText]}>
            {t.feed}
          </Text>
          {privacySettings.allowPersonalization && activeTab === 'feed' && (
            <View style={styles.tabRecommendationDot} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'clips' && styles.activeMainTab]}
          onPress={() => handleTabChange('clips')}
        >
          <Play size={18} color={activeTab === 'clips' ? Colors.primary : Colors.medium} />
          <Text style={[styles.mainTabText, activeTab === 'clips' && styles.activeMainTabText]}>
            {t.clips}
          </Text>
          {privacySettings.allowPersonalization && activeTab === 'clips' && (
            <View style={styles.tabRecommendationDot} />
          )}
          {currentBatch && activeTab === 'clips' && (
            <View style={styles.tabMicroBatchDot} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'addFriends' && styles.activeMainTab]}
          onPress={() => handleTabChange('addFriends')}
        >
          <UserPlus size={18} color={activeTab === 'addFriends' ? Colors.primary : Colors.medium} />
          <Text style={[styles.mainTabText, activeTab === 'addFriends' && styles.activeMainTabText]}>
            {t.addFriends}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'myProfile' && styles.activeMainTab]}
          onPress={() => handleTabChange('myProfile')}
        >
          <User size={18} color={activeTab === 'myProfile' ? Colors.primary : Colors.medium} />
          <Text style={[styles.mainTabText, activeTab === 'myProfile' && styles.activeMainTabText]}>
            {t.myProfile}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحديث التوصيات المتقدمة مع التعلم التكيفي...</Text>
        </View>
      )}

      {/* Content */}
      {activeTab === 'feed' && renderFeedContent()}
      {activeTab === 'clips' && renderClipsContent()}
      {activeTab === 'addFriends' && renderAddFriendsContent()}
      {activeTab === 'myProfile' && renderMyProfileContent()}

      {/* Create Post Modal */}
      <Modal
        visible={showCreatePost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreatePost(false)}
      >
        <View style={styles.createPostModal}>
          <View style={styles.createPostHeader}>
            <TouchableOpacity onPress={() => setShowCreatePost(false)}>
              <Text style={styles.cancelButton}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.createPostTitle}>إنشاء منشور</Text>
            <TouchableOpacity onPress={handlePublishPost}>
              <Text style={styles.publishButton}>نشر</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createPostContent}>
            <View style={styles.createPostUserInfo}>
              <Image source={{ uri: currentUser.profilePicture }} style={styles.createPostAvatar} />
              <Text style={styles.createPostUserName}>{currentUser.displayName}</Text>
            </View>

            <TextInput
              ref={postInputRef}
              style={styles.createPostInput}
              value={postText}
              onChangeText={setPostText}
              placeholder="بماذا تفكر؟"
              placeholderTextColor={Colors.medium}
              multiline
              autoFocus
            />

            <View style={styles.createPostActions}>
              <TouchableOpacity style={styles.createPostAction} onPress={handlePhotoVideo}>
                <ImageIcon size={24} color={Colors.success} />
                <Text style={styles.createPostActionText}>صورة/فيديو</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.createPostAction} onPress={handleFeeling}>
                <Smile size={24} color={Colors.warning} />
                <Text style={styles.createPostActionText}>شعور/نشاط</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Story Modal */}
      <Modal
        visible={showStoryModal}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowStoryModal(false)}
      >
        <View style={styles.storyModal}>
          <TouchableOpacity
            style={styles.storyCloseButton}
            onPress={() => setShowStoryModal(false)}
          >
            <Text style={styles.storyCloseText}>×</Text>
          </TouchableOpacity>

          {selectedStory && (
            <View style={styles.storyContent}>
              <Image
                source={{ uri: selectedStory.profilePicture }}
                style={styles.storyImage}
                resizeMode="cover"
              />

              <View style={styles.storyOverlay}>
                <View style={styles.storyHeader}>
                  <Image source={{ uri: selectedStory.profilePicture }} style={styles.storyUserAvatar} />
                  <Text style={styles.storyUserName}>{selectedStory.displayName}</Text>
                  <Text style={styles.storyTime}>منذ 2 ساعة</Text>
                </View>

                <View style={styles.storyFooter}>
                  <TextInput
                    style={styles.storyCommentInput}
                    placeholder="اكتب تعليقاً..."
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    onSubmitEditing={(event) => {
                      const comment = event.nativeEvent.text;
                      if (comment.trim()) {
                        Alert.alert('تم إرسال التعليق', `تعليقك: "${comment}" تم إرساله بنجاح`);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.storySendButton}
                    onPress={() => {
                      Alert.alert('تم الإرسال', 'تم إرسال تعليقك على القصة بنجاح');
                      setShowStoryModal(false);
                    }}
                  >
                    <Text style={styles.storySendText}>إرسال</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <SocialSettings onClose={() => setShowSettings(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  activeMainTab: {
    backgroundColor: Colors.primary + '15',
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.medium,
  },
  activeMainTabText: {
    color: Colors.primary,
  },
  tabRecommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 4,
    right: 10,
  },
  tabMicroBatchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    position: 'absolute',
    top: 4,
    right: 20,
  },
  loadingContainer: {
    padding: 10,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: Colors.primary,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  feedHeaderLeft: {
    flexDirection: 'column',
  },
  feedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  personalizationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personalizationText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  storiesContainer: {
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addStoryContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 4,
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 20,
    right: 0,
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  storyText: {
    fontSize: 12,
    color: Colors.text,
  },
  storyContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 4,
  },
  storyRing: {
    padding: 2,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  createPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 8,
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postInputContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 20,
  },
  postInputPlaceholder: {
    color: Colors.medium,
  },
  postActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 8,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postActionText: {
    color: Colors.medium,
    fontWeight: '500',
  },
  clipsHeader: {
    padding: 16,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  clipsHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  clipsHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  recommendationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  microBatchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  microBatchText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  microBatchInfo: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  microBatchInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  microBatchInfoTitle: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 12,
  },
  microBatchStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  microBatchStat: {
    alignItems: 'center',
  },
  microBatchStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  microBatchStatValue: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  microBatchInfoButton: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  microBatchInfoButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  clipsFilters: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  clipFilter: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  activeClipFilter: {
    borderBottomWidth: 2,
    borderBottomColor: 'white',
  },
  clipFilterText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: 16,
  },
  activeClipFilterText: {
    color: 'white',
  },
  friendsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  friendsSection: {
    backgroundColor: Colors.surface,
    marginBottom: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  recommendationBadge: {
    backgroundColor: Colors.primary,
    padding: 2,
    borderRadius: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.medium,
    marginBottom: 16,
  },
  friendCard: {
    width: 140,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  friendInfo: {
    fontSize: 12,
    color: Colors.medium,
    marginBottom: 4,
    textAlign: 'center',
  },
  confidenceScore: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mutualFriends: {
    fontSize: 10,
    color: Colors.medium,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: Colors.primary + '15',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  profileContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    backgroundColor: Colors.surface,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  profileUsername: {
    fontSize: 14,
    color: Colors.medium,
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  editButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.medium,
  },
  recommendationStats: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  recommendationStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  recommendationStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  recommendationStatsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  feedbackLoopStats: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  feedbackLoopStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  feedbackLoopStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feedbackLoopStatLabel: {
    fontSize: 12,
    color: Colors.medium,
  },
  feedbackLoopStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  signalMetrics: {
    gap: 4,
  },
  signalMetricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  signalMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signalMetricLabel: {
    fontSize: 12,
    color: Colors.medium,
  },
  signalMetricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  profileContentTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeProfileTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  profileTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.medium,
  },
  activeProfileTabText: {
    color: Colors.primary,
  },
  myPostsSection: {
    backgroundColor: Colors.surface,
  },
  createPostModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  createPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.text,
  },
  createPostTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  publishButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  createPostContent: {
    flex: 1,
    padding: 16,
  },
  createPostUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  createPostUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  createPostInput: {
    fontSize: 18,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  createPostActions: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    gap: 16,
  },
  createPostAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createPostActionText: {
    fontSize: 16,
    color: Colors.text,
  },
  storyModal: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 20,
    padding: 8,
  },
  storyCloseText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  storyImage: {
    width: width,
    height: height,
    position: 'absolute',
  },
  storyOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storyUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  storyUserName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storyTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storyCommentInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  storySendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  storySendText: {
    color: 'white',
    fontWeight: 'bold',
  },
});