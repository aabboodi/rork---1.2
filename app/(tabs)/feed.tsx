import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, TextInput, Image, ScrollView, Alert, Dimensions, RefreshControl, Modal } from 'react-native';
import { Camera, Image as ImageIcon, Smile, Video, Bell, Users, UserPlus, User, Play, MapPin, Briefcase, Phone, Zap, Settings, TrendingUp, Sparkles, BarChart3, Target, MessageCircle as MessengerIcon, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
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
    // Micro-batch feedback loop
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

  // Enhanced scroll tracking
  const [scrollPosition, setScrollPosition] = useState(0);
  const [lastScrollTime, setLastScrollTime] = useState(Date.now());
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const scrollRef = useRef<FlatList>(null);
  const postInputRef = useRef<TextInput>(null);

  // Stable callback for onViewableItemsChanged to prevent FlatList error
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    // Track viewed items - handled by individual components
  }).current;

  // Stable viewability config
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000
  }).current;

  const clipsViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 2000
  }).current;

  // Initialize recommendation system
  useEffect(() => {
    if (userId && !isInitialized) {
      initializeRecommendations(userId);
    }
  }, [userId, isInitialized]);

  // Update personalized content when recommendations change
  useEffect(() => {
    updatePersonalizedContent();
  }, [feedRecommendations, clipsRecommendations]);

  // Monitor batch completion for clips tab
  useEffect(() => {
    if (activeTab === 'clips' && batchConsumptionTracker) {
      const { batchProgress, isCompleted } = batchConsumptionTracker;

      // Auto-complete batch when 80% progress is reached
      if (batchProgress >= 0.8 && !isCompleted) {
        handleBatchCompletion();
      }
    }
  }, [batchConsumptionTracker, activeTab]);

  const updatePersonalizedContent = useCallback(() => {
    // Merge posts with recommendation data
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

    // Sort by recommendation score if personalization is enabled
    if (privacySettings.allowPersonalization && feedRecommendations.length > 0) {
      postsWithRecommendations.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
    }

    setPersonalizedPosts(postsWithRecommendations);

    // For clips, use micro-batch if available, otherwise use recommendations
    let clipsToShow = mockClips;

    if (currentBatch && currentBatch.clipIds.length > 0) {
      // Use clips from current batch
      clipsToShow = currentBatch.clipIds.map(clipId => {
        const clip = mockClips.find(c => c.id === clipId) || mockClips[0];
        return {
          ...clip,
          id: clipId,
          recommendationScore: 0.9, // High score for batch clips
          recommendationReasons: ['محتوى مخصص من خلال التعلم التكيفي'],
          personalizedRanking: currentBatch.clipIds.indexOf(clipId),
          batchId: currentBatch.batchId,
          batchPosition: currentBatch.clipIds.indexOf(clipId),
          feedbackLoopIteration: currentBatch.feedbackLoopIteration
        };
      });
    } else {
      // Fallback to regular recommendations
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

      // Sort by recommendation score if personalization is enabled
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
    // Collect navigation signal
    await collectSignal(
      `tab_${activeTab}`,
      'text',
      'click',
      {
        screenName: 'social',
        position: 0,
        timeSpent: Date.now() - (Date.now() - 1000), // Mock time spent
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
    // The PostItem component handles signal collection internally
    // This is just for backward compatibility
  }, []);

  const handleClipInteraction = useCallback(async (
    clip: Clip,
    action: 'like' | 'comment' | 'share' | 'view' | 'pause' | 'replay',
    position: number
  ) => {
    // The ClipItem component handles signal collection internally
    // This is just for backward compatibility
  }, []);

  // Handle batch completion
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

  // Handle batch abandonment
  const handleBatchAbandonment = useCallback(async (reason: string) => {
    try {
      await abandonBatch(reason);
      console.log(`Batch abandoned: ${reason}`);
    } catch (error) {
      console.error('Failed to abandon batch:', error);
    }
  }, [abandonBatch]);

  // Enhanced scroll handling with velocity tracking
  const handleScroll = useCallback((event: any) => {
    const currentPosition = event.nativeEvent.contentOffset.y;
    const currentTime = Date.now();

    // Calculate scroll velocity
    const timeDiff = currentTime - lastScrollTime;
    const positionDiff = Math.abs(currentPosition - scrollPosition);
    const velocity = timeDiff > 0 ? positionDiff / timeDiff : 0;

    setScrollPosition(currentPosition);
    setLastScrollTime(currentTime);
    setScrollVelocity(velocity);

    // Collect scroll velocity signal for fast scrolling (indicating low engagement)
    if (velocity > 2 && privacySettings.allowBehaviorTracking) {
      collectScrollVelocitySignal(
        `scroll_${activeTab}`,
        'text',
        velocity,
        {
          screenName: activeTab,
          position: Math.floor(currentPosition / 100), // Approximate item position
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

    // Collect story view signal
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
            contentAge: Date.now() - (Date.now() - 3600000), // Mock 1 hour ago
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
  },
  activeMainTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.medium,
    marginLeft: 6,
  },
  activeMainTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabRecommendationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  tabMicroBatchDot: {
    position: 'absolute',
    top: 8,
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: Colors.secondary,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.medium,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  feedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 8,
  },
  personalizationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  personalizationText: {
    fontSize: 10,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
  },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 8,
    borderBottomColor: Colors.secondary,
  },
  addStoryContainer: {
    alignItems: 'center',
    marginLeft: 12,
    width: 70,
  },
  storyContainer: {
    alignItems: 'center',
    marginLeft: 12,
    width: 70,
  },
  storyRing: {
    padding: 3,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  storyText: {
    fontSize: 12,
    color: Colors.dark,
    marginTop: 4,
    textAlign: 'center',
  },
  createPostContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postInputContainer: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postInputPlaceholder: {
    fontSize: 16,
    color: Colors.medium,
  },
  postActionsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 8,
    borderBottomColor: Colors.secondary,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  postAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  postActionText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.medium,
    fontWeight: '500',
  },
  // Create Post Modal Styles
  createPostModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  createPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.medium,
  },
  createPostTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  publishButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  createPostContent: {
    flex: 1,
    padding: 16,
  },
  createPostUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  createPostUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  createPostInput: {
    fontSize: 18,
    color: Colors.dark,
    textAlignVertical: 'top',
    minHeight: 200,
    marginBottom: 20,
  },
  createPostActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  createPostAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
  },
  createPostActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  // Story Modal Styles
  storyModal: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCloseText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  storyContent: {
    flex: 1,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  storyUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  storyUserName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  storyTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  storyCommentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    marginRight: 12,
  },
  storySendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storySendText: {
    color: 'white',
    fontWeight: '600',
  },
  // Clips Styles
  clipsHeader: {
    padding: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  clipsHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  clipsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  recommendationText: {
    fontSize: 10,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  microBatchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  microBatchText: {
    fontSize: 10,
    color: Colors.success,
    marginLeft: 4,
    fontWeight: '600',
  },
  microBatchInfo: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  microBatchInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  microBatchInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 6,
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
    fontSize: 11,
    color: Colors.medium,
  },
  microBatchStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
  },
  microBatchInfoButton: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  microBatchInfoButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  clipsFilters: {
    flexDirection: 'row',
  },
  clipFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: Colors.secondary,
  },
  activeClipFilter: {
    backgroundColor: Colors.primary,
  },
  clipFilterText: {
    fontSize: 14,
    color: Colors.medium,
    fontWeight: '500',
  },
  activeClipFilterText: {
    color: Colors.background,
  },
  // Add Friends Styles
  friendsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  friendsSection: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: Colors.secondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 8,
    flex: 1,
  },
  recommendationBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.medium,
    marginBottom: 12,
  },
  friendCard: {
    width: 160,
    backgroundColor: Colors.card,
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
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  friendInfo: {
    fontSize: 12,
    color: Colors.medium,
    textAlign: 'center',
    marginBottom: 4,
  },
  confidenceScore: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  mutualFriends: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  // My Profile Styles
  profileContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: Colors.medium,
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    color: Colors.dark,
  },
  editButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  profileStats: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.medium,
    marginTop: 2,
  },
  recommendationStats: {
    padding: 16,
    backgroundColor: Colors.secondary,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  recommendationStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 8,
  },
  recommendationStatsContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  feedbackLoopStats: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginBottom: 12,
  },
  feedbackLoopStatsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
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
    color: Colors.success,
    fontWeight: '600',
  },
  signalMetrics: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  signalMetricsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  signalMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  signalMetricLabel: {
    fontSize: 12,
    color: Colors.medium,
  },
  signalMetricValue: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  profileContentTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeProfileTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  profileTabText: {
    fontSize: 14,
    color: Colors.medium,
    marginLeft: 6,
    fontWeight: '500',
  },
  activeProfileTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  myPostsSection: {
    padding: 16,
  },
});