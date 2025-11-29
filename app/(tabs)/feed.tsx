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

  // PLACEHOLDER_FOR_HANDLERS

  // PLACEHOLDER_FOR_RENDERERS

  // PLACEHOLDER_FOR_RETURN
}

// PLACEHOLDER_FOR_STYLES