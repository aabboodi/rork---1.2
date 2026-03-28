import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  Zap, 
  Clock, 
  Users,
  ThumbsUp,
  Eye,
  Share,
  AlertTriangle,
  RefreshCw,
  Settings
} from 'lucide-react-native';

import { useThemeStore } from '@/store/themeStore';
import { AccessibleText } from '@/components/accessibility/AccessibleText';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleCard } from '@/components/accessibility/AccessibleCard';
import { useSocialRecommender, useRecommenderMetrics } from '@/hooks/useSocialRecommender';
import { RankedContent } from '@/services/ai/SocialRecommenderService';

interface RecommendationCardProps {
  item: RankedContent;
  onFeedback: (action: 'like' | 'share' | 'skip' | 'report') => void;
}

function RecommendationCard({ item, onFeedback }: RecommendationCardProps) {
  const { colors } = useThemeStore();

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'trending': return colors.warning;
      case 'similar_interests': return colors.primary;
      case 'recent': return colors.success;
      case 'popular': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'trending': return 'Trending';
      case 'similar_interests': return 'For You';
      case 'recent': return 'Recent';
      case 'popular': return 'Popular';
      default: return reason;
    }
  };

  return (
    <AccessibleCard variant='elevated' padding='medium' style={styles.recommendationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <AccessibleText variant='body' weight='semibold' numberOfLines={2}>
            {item.title}
          </AccessibleText>
          <AccessibleText variant='caption' color='secondary'>
            by {item.author} • {item.type}
          </AccessibleText>
        </View>
        <View style={styles.scoreContainer}>
          <AccessibleText variant='caption' color='primary' weight='bold'>
            {Math.round(item.score * 100)}%
          </AccessibleText>
        </View>
      </View>

      {item.reasons.length > 0 && (
        <View style={styles.reasonsContainer}>
          {item.reasons.slice(0, 2).map((reason, index) => (
            <View 
              key={index} 
              style={[styles.reasonTag, { backgroundColor: getReasonColor(reason) + '20' }]}
            >
              <AccessibleText 
                variant='caption' 
                style={{ color: getReasonColor(reason) }}
                weight='medium'
              >
                {getReasonLabel(reason)}
              </AccessibleText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardActions}>
        <AccessibleButton
          title=''
          onPress={() => onFeedback('like')}
          variant='ghost'
          size='small'
          icon={<ThumbsUp size={16} color={colors.success} />}
          accessibilityLabel='Like'
        />
        <AccessibleButton
          title=''
          onPress={() => onFeedback('share')}
          variant='ghost'
          size='small'
          icon={<Share size={16} color={colors.primary} />}
          accessibilityLabel='Share'
        />
        <AccessibleButton
          title=''
          onPress={() => onFeedback('skip')}
          variant='ghost'
          size='small'
          icon={<Eye size={16} color={colors.textSecondary} />}
          accessibilityLabel='Skip'
        />
        <AccessibleButton
          title=''
          onPress={() => onFeedback('report')}
          variant='ghost'
          size='small'
          icon={<AlertTriangle size={16} color={colors.error} />}
          accessibilityLabel='Report'
        />
      </View>
    </AccessibleCard>
  );
}

interface MetricsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

function MetricsCard({ title, value, subtitle, icon, color, trend }: MetricsCardProps) {
  const { colors } = useThemeStore();

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={12} color={colors.success} />;
    if (trend === 'down') return <TrendingUp size={12} color={colors.error} style={{ transform: [{ rotate: '180deg' }] }} />;
    return null;
  };

  return (
    <AccessibleCard variant='elevated' padding='medium' style={styles.metricsCard}>
      <View style={styles.metricsHeader}>
        <View style={[styles.metricsIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        {getTrendIcon()}
      </View>
      <AccessibleText variant='heading3' weight='bold' style={styles.metricsValue}>
        {value}
      </AccessibleText>
      <AccessibleText variant='caption' color='secondary'>
        {title}
      </AccessibleText>
      <AccessibleText variant='caption' color='secondary' style={styles.metricsSubtitle}>
        {subtitle}
      </AccessibleText>
    </AccessibleCard>
  );
}

export default function SocialRecommenderDashboard() {
  const { colors } = useThemeStore();
  const [selectedSlot, setSelectedSlot] = useState<'feed' | 'trending' | 'personalized' | 'discovery'>('feed');
  const [refreshing, setRefreshing] = useState(false);

  const { 
    recommendations, 
    loading, 
    error, 
    isPersonalized,
    recordFeedback,
    refreshRecommendations 
  } = useSocialRecommender({ 
    slot: selectedSlot, 
    limit: 10,
    autoRefresh: true 
  });

  const { metrics, loading: metricsLoading } = useRecommenderMetrics();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRecommendations();
    setRefreshing(false);
  };

  const handleFeedback = async (contentId: string, action: 'like' | 'share' | 'skip' | 'report') => {
    try {
      await recordFeedback(contentId, action);
      
      if (action === 'like') {
        Alert.alert('👍', 'Thanks for the feedback! We will show you more content like this.');
      } else if (action === 'report') {
        Alert.alert('🚨', 'Content reported. We will review it and improve our recommendations.');
      }
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  };

  const slots = [
    { key: 'feed', label: 'Feed', icon: Users },
    { key: 'trending', label: 'Trending', icon: TrendingUp },
    { key: 'personalized', label: 'For You', icon: Target },
    { key: 'discovery', label: 'Discover', icon: Zap }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.text === '#FFFFFF' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <AccessibleText variant='heading2' weight='bold'>
              Social Recommender
            </AccessibleText>
            <AccessibleText variant='caption' color='secondary'>
              Phase 1: Server Pre-rank + On-device Rerank
            </AccessibleText>
          </View>
          <AccessibleButton
            title=''
            onPress={handleRefresh}
            variant='ghost'
            size='small'
            icon={<RefreshCw size={20} color={colors.primary} />}
            accessibilityLabel='Refresh'
          />
        </View>

        {/* Personalization Status */}
        <View style={[styles.statusBanner, { 
          backgroundColor: isPersonalized ? colors.success + '20' : colors.warning + '20',
          borderColor: isPersonalized ? colors.success : colors.warning
        }]}>
          <Settings size={16} color={isPersonalized ? colors.success : colors.warning} />
          <AccessibleText 
            variant='caption' 
            color={isPersonalized ? 'success' : 'warning'}
            style={styles.statusText}
          >
            {isPersonalized ? 'Personalization Active' : 'Using Fallback Recommendations'}
          </AccessibleText>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Performance Metrics */}
        {metrics && !metricsLoading && (
          <View style={styles.section}>
            <AccessibleText variant='heading3' weight='semibold' style={styles.sectionTitle}>
              Performance Metrics
            </AccessibleText>
            
            <View style={styles.metricsGrid}>
              <MetricsCard
                title='Click-Through Rate'
                value={`${metrics.ctr.toFixed(1)}%`}
                subtitle='+5-8% target'
                icon={<Target size={20} color={colors.primary} />}
                color={colors.primary}
                trend={metrics.ctr > 5 ? 'up' : 'stable'}
              />
              <MetricsCard
                title='Avg Reward'
                value={metrics.avgReward.toFixed(2)}
                subtitle='User satisfaction'
                icon={<ThumbsUp size={20} color={colors.success} />}
                color={colors.success}
                trend={metrics.avgReward > 0.5 ? 'up' : 'stable'}
              />
              <MetricsCard
                title='Latency'
                value={`${metrics.latencyMs}ms`}
                subtitle='≤120ms target'
                icon={<Clock size={20} color={metrics.latencyMs <= 120 ? colors.success : colors.warning} />}
                color={metrics.latencyMs <= 120 ? colors.success : colors.warning}
                trend={metrics.latencyMs <= 120 ? 'up' : 'down'}
              />
              <MetricsCard
                title='Exploration'
                value={`${(metrics.explorationRate * 100).toFixed(1)}%`}
                subtitle='ε-greedy rate'
                icon={<BarChart3 size={20} color={colors.info} />}
                color={colors.info}
                trend='stable'
              />
            </View>
          </View>
        )}

        {/* Slot Selection */}
        <View style={styles.section}>
          <AccessibleText variant='heading3' weight='semibold' style={styles.sectionTitle}>
            Content Slots
          </AccessibleText>
          
          <View style={styles.slotSelector}>
            {slots.map(({ key, label, icon: Icon }) => (
              <AccessibleButton
                key={key}
                title={label}
                onPress={() => setSelectedSlot(key as any)}
                variant={selectedSlot === key ? 'primary' : 'ghost'}
                size='medium'
                style={styles.slotButton}
                icon={<Icon size={18} color={selectedSlot === key ? colors.textInverse : colors.text} />}
              />
            ))}
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AccessibleText variant='heading3' weight='semibold'>
              Recommendations ({selectedSlot})
            </AccessibleText>
            <AccessibleText variant='caption' color='secondary'>
              {recommendations.length} items • Reranked on-device
            </AccessibleText>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <AccessibleText variant='body' color='secondary'>
                Loading recommendations...
              </AccessibleText>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={24} color={colors.error} />
              <AccessibleText variant='body' color='error' style={styles.errorText}>
                {error}
              </AccessibleText>
              <AccessibleButton
                title='Retry'
                onPress={refreshRecommendations}
                variant='primary'
                size='small'
              />
            </View>
          ) : (
            <View style={styles.recommendationsList}>
              {recommendations.map((item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  onFeedback={(action) => handleFeedback(item.id, action)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Technical Details */}
        <View style={styles.section}>
          <AccessibleText variant='heading3' weight='semibold' style={styles.sectionTitle}>
            Technical Implementation
          </AccessibleText>
          
          <AccessibleCard variant='elevated' padding='large'>
            <View style={styles.techDetail}>
              <AccessibleText variant='body' weight='medium'>
                🔄 Server Pre-ranking
              </AccessibleText>
              <AccessibleText variant='caption' color='secondary'>
                50-100 items pre-ranked by server based on global trends and basic user segments
              </AccessibleText>
            </View>
            
            <View style={styles.techDetail}>
              <AccessibleText variant='body' weight='medium'>
                🧠 On-device Reranking
              </AccessibleText>
              <AccessibleText variant='caption' color='secondary'>
                Lightweight LogReg/MLP-int8 model with user history, session context, geo-temporal features
              </AccessibleText>
            </View>
            
            <View style={styles.techDetail}>
              <AccessibleText variant='body' weight='medium'>
                🎯 Bandit Exploration
              </AccessibleText>
              <AccessibleText variant='caption' color='secondary'>
                ε-greedy strategy with Thompson sampling for exploration-exploitation balance
              </AccessibleText>
            </View>
            
            <View style={styles.techDetail}>
              <AccessibleText variant='body' weight='medium'>
                ⚡ Performance Constraints
              </AccessibleText>
              <AccessibleText variant='caption' color='secondary'>
                ≤120ms latency, ≤30MB memory, no additional network calls
              </AccessibleText>
            </View>
          </AccessibleCard>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricsCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsValue: {
    marginBottom: 4,
  },
  metricsSubtitle: {
    marginTop: 2,
  },
  slotSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  slotButton: {
    marginHorizontal: 4,
    marginBottom: 8,
    minWidth: 80,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    marginVertical: 12,
    textAlign: 'center',
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  scoreContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  reasonTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  techDetail: {
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});