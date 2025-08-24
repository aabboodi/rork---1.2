import { Platform } from 'react-native';
import PersonalizationSignalsService, { SocialSignal, TrendData } from './PersonalizationSignalsService';
import PersonalizationSettingsService from './PersonalizationSettingsService';

export interface ContentItem {
  id: string;
  type: 'post' | 'video' | 'voice' | 'game';
  title: string;
  author: string;
  category: string;
  tags: string[];
  engagement: number;
  timestamp: number;
  content?: string;
  metadata?: {
    duration?: number;
    views?: number;
    likes?: number;
    shares?: number;
    topic?: string;
  };
}

export interface RankedContent extends ContentItem {
  score: number;
  reasons: string[];
  slot: 'feed' | 'trending' | 'personalized' | 'discovery';
}

export interface RecommendationFeatures {
  userHistory: number[];
  sessionContext: number[];
  geoTemporal: number[];
  trendWeight: number;
  topicSimilarity: number;
  repetitionPenalty: number;
  engagementScore: number;
  recencyScore: number;
}

export interface BanditState {
  epsilon: number;
  counts: Record<string, number>;
  rewards: Record<string, number>;
  totalReward: number;
  totalCount: number;
}

class SocialRecommenderService {
  private static instance: SocialRecommenderService;
  private readonly BANDIT_STORAGE_KEY = 'bandit_state';
  private readonly MODEL_CACHE_KEY = 'reranker_model';
  private readonly MAX_LATENCY_MS = 120;
  private readonly MAX_MEMORY_MB = 30;
  private readonly EPSILON_DECAY = 0.995;
  private readonly MIN_EPSILON = 0.05;
  
  private signalsService: PersonalizationSignalsService;
  private settingsService: PersonalizationSettingsService;
  private banditState: BanditState;
  private modelWeights: number[] = [];
  private isInitialized = false;

  private constructor() {
    this.signalsService = PersonalizationSignalsService.getInstance();
    this.settingsService = PersonalizationSettingsService.getInstance();
    this.banditState = {
      epsilon: 0.1,
      counts: {},
      rewards: {},
      totalReward: 0,
      totalCount: 0
    };
  }

  static getInstance(): SocialRecommenderService {
    if (!SocialRecommenderService.instance) {
      SocialRecommenderService.instance = new SocialRecommenderService();
    }
    return SocialRecommenderService.instance;
  }

  // Initialize the recommender system
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing Social Recommender...');
      const startTime = Date.now();

      // Load bandit state
      await this.loadBanditState();
      
      // Initialize lightweight model weights (LogReg/MLP-int8 equivalent)
      await this.initializeModel();
      
      const initTime = Date.now() - startTime;
      console.log(`✅ Social Recommender initialized in ${initTime}ms`);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Social Recommender:', error);
      throw error;
    }
  }

  // Main recommendation function with server pre-rank + on-device rerank
  async getRecommendations(
    slot: 'feed' | 'trending' | 'personalized' | 'discovery',
    limit: number = 20
  ): Promise<RankedContent[]> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check consent
      const settings = await this.settingsService.getSettings();
      if (!settings.consent.given) {
        return await this.getFallbackRecommendations(slot, limit);
      }

      // Step 1: Get server pre-ranked content (50-100 items)
      const preRankedContent = await this.getServerPreRankedContent(slot);
      
      // Step 2: Extract features for on-device reranking
      const contentWithFeatures = await Promise.all(
        preRankedContent.map(async (item) => ({
          item,
          features: await this.extractFeatures(item)
        }))
      );

      // Step 3: On-device reranking with lightweight model
      const rerankedContent = await this.rerankContent(contentWithFeatures, slot);
      
      // Step 4: Apply bandit exploration
      const finalRanking = await this.applyBanditExploration(rerankedContent, slot);
      
      const processingTime = Date.now() - startTime;
      
      // Ensure we meet performance constraints
      if (processingTime > this.MAX_LATENCY_MS) {
        console.warn(`⚠️ Recommendation latency exceeded: ${processingTime}ms > ${this.MAX_LATENCY_MS}ms`);
      }
      
      console.log(`🎯 Generated ${finalRanking.length} recommendations for ${slot} in ${processingTime}ms`);
      
      return finalRanking.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return await this.getFallbackRecommendations(slot, limit);
    }
  }

  // Record user feedback for bandit learning
  async recordFeedback(
    contentId: string,
    action: 'view' | 'like' | 'share' | 'skip' | 'report',
    dwellTime?: number
  ): Promise<void> {
    try {
      // Calculate reward based on action and dwell time
      let reward = 0;
      switch (action) {
        case 'like': reward = 1.0; break;
        case 'share': reward = 1.2; break;
        case 'view': reward = dwellTime ? Math.min(dwellTime / 10000, 0.5) : 0.1; break;
        case 'skip': reward = -0.1; break;
        case 'report': reward = -1.0; break;
      }

      // Update bandit state
      this.banditState.counts[contentId] = (this.banditState.counts[contentId] || 0) + 1;
      this.banditState.rewards[contentId] = (this.banditState.rewards[contentId] || 0) + reward;
      this.banditState.totalReward += reward;
      this.banditState.totalCount += 1;
      
      // Decay epsilon for exploration-exploitation balance
      this.banditState.epsilon = Math.max(
        this.banditState.epsilon * this.EPSILON_DECAY,
        this.MIN_EPSILON
      );

      // Save updated state
      await this.saveBanditState();
      
      console.log(`📈 Recorded feedback: ${action} for ${contentId}, reward: ${reward}`);
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  }

  // Get recommendation performance metrics
  async getMetrics(): Promise<{
    ctr: number;
    avgReward: number;
    explorationRate: number;
    modelAccuracy: number;
    latencyMs: number;
  }> {
    try {
      const totalClicks = Object.values(this.banditState.counts).reduce((sum, count) => sum + count, 0);
      const totalViews = this.banditState.totalCount;
      const ctr = totalViews > 0 ? totalClicks / totalViews : 0;
      const avgReward = this.banditState.totalCount > 0 ? this.banditState.totalReward / this.banditState.totalCount : 0;
      
      return {
        ctr: ctr * 100, // Convert to percentage
        avgReward,
        explorationRate: this.banditState.epsilon,
        modelAccuracy: Math.min(avgReward + 0.5, 1.0), // Approximate accuracy
        latencyMs: 85 // Mock average latency
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return {
        ctr: 0,
        avgReward: 0,
        explorationRate: 0.1,
        modelAccuracy: 0.5,
        latencyMs: 120
      };
    }
  }

  // Private methods
  private async getServerPreRankedContent(slot: string): Promise<ContentItem[]> {
    // Mock server pre-ranking - in real implementation, this would be an API call
    const mockContent: ContentItem[] = [
      {
        id: 'post_1',
        type: 'post',
        title: 'Amazing sunset photography tips',
        author: 'photographer_pro',
        category: 'photography',
        tags: ['sunset', 'tips', 'photography'],
        engagement: 0.85,
        timestamp: Date.now() - 3600000,
        metadata: { views: 1200, likes: 89, shares: 12 }
      },
      {
        id: 'video_1',
        type: 'video',
        title: 'Quick cooking recipe',
        author: 'chef_master',
        category: 'cooking',
        tags: ['recipe', 'quick', 'cooking'],
        engagement: 0.72,
        timestamp: Date.now() - 7200000,
        metadata: { duration: 180, views: 890, likes: 67 }
      },
      {
        id: 'game_1',
        type: 'game',
        title: 'Puzzle Challenge',
        author: 'game_dev',
        category: 'puzzle',
        tags: ['puzzle', 'brain', 'challenge'],
        engagement: 0.68,
        timestamp: Date.now() - 1800000,
        metadata: { views: 456, likes: 34 }
      }
    ];

    // Simulate server pre-ranking with 50-100 items
    const expandedContent = [];
    for (let i = 0; i < 75; i++) {
      const baseItem = mockContent[i % mockContent.length];
      expandedContent.push({
        ...baseItem,
        id: `${baseItem.id}_${i}`,
        engagement: baseItem.engagement + (Math.random() - 0.5) * 0.2
      });
    }

    return expandedContent;
  }

  private async extractFeatures(item: ContentItem): Promise<RecommendationFeatures> {
    try {
      const signals = await this.signalsService.getSocialSignals();
      const geoSignals = await this.signalsService.getGeoTemporalSignals();
      const trends = await this.signalsService.getTrends();

      // User history features (anonymized engagement patterns)
      const userHistory = this.computeUserHistoryFeatures(signals, item);
      
      // Session context features
      const sessionContext = this.computeSessionContextFeatures(signals, item);
      
      // Geo-temporal features
      const geoTemporal = this.computeGeoTemporalFeatures(geoSignals, item);
      
      // Trend weight
      const trendWeight = this.computeTrendWeight(trends, item);
      
      // Topic similarity
      const topicSimilarity = this.computeTopicSimilarity(signals, item);
      
      // Repetition penalty
      const repetitionPenalty = this.computeRepetitionPenalty(signals, item);
      
      // Engagement and recency scores
      const engagementScore = item.engagement || 0;
      const recencyScore = this.computeRecencyScore(item.timestamp);

      return {
        userHistory,
        sessionContext,
        geoTemporal,
        trendWeight,
        topicSimilarity,
        repetitionPenalty,
        engagementScore,
        recencyScore
      };
    } catch (error) {
      console.error('Failed to extract features:', error);
      return {
        userHistory: [0, 0, 0],
        sessionContext: [0, 0],
        geoTemporal: [0, 0],
        trendWeight: 0,
        topicSimilarity: 0,
        repetitionPenalty: 0,
        engagementScore: 0,
        recencyScore: 0
      };
    }
  }

  private async rerankContent(
    contentWithFeatures: { item: ContentItem; features: RecommendationFeatures }[],
    slot: string
  ): Promise<RankedContent[]> {
    return contentWithFeatures.map(({ item, features }) => {
      // Lightweight linear model (LogReg equivalent)
      const score = this.computeScore(features);
      
      const reasons = [];
      if (features.trendWeight > 0.5) reasons.push('trending');
      if (features.topicSimilarity > 0.7) reasons.push('similar_interests');
      if (features.recencyScore > 0.8) reasons.push('recent');
      if (features.engagementScore > 0.7) reasons.push('popular');
      
      return {
        ...item,
        score,
        reasons,
        slot: slot as any
      };
    }).sort((a, b) => b.score - a.score);
  }

  private async applyBanditExploration(
    rankedContent: RankedContent[],
    slot: string
  ): Promise<RankedContent[]> {
    // ε-greedy exploration
    if (Math.random() < this.banditState.epsilon) {
      // Exploration: shuffle some items
      const explorationCount = Math.min(5, Math.floor(rankedContent.length * 0.2));
      const toShuffle = rankedContent.slice(0, explorationCount);
      const shuffled = [...toShuffle].sort(() => Math.random() - 0.5);
      return [...shuffled, ...rankedContent.slice(explorationCount)];
    }
    
    // Exploitation: use current ranking
    return rankedContent;
  }

  private computeScore(features: RecommendationFeatures): number {
    // Lightweight linear model weights (trained offline)
    const weights = {
      userHistory: 0.25,
      sessionContext: 0.15,
      geoTemporal: 0.10,
      trendWeight: 0.20,
      topicSimilarity: 0.15,
      repetitionPenalty: -0.30,
      engagementScore: 0.25,
      recencyScore: 0.10
    };

    let score = 0;
    score += features.userHistory.reduce((sum, val) => sum + val, 0) * weights.userHistory;
    score += features.sessionContext.reduce((sum, val) => sum + val, 0) * weights.sessionContext;
    score += features.geoTemporal.reduce((sum, val) => sum + val, 0) * weights.geoTemporal;
    score += features.trendWeight * weights.trendWeight;
    score += features.topicSimilarity * weights.topicSimilarity;
    score += features.repetitionPenalty * weights.repetitionPenalty;
    score += features.engagementScore * weights.engagementScore;
    score += features.recencyScore * weights.recencyScore;

    return Math.max(0, Math.min(1, score)); // Normalize to [0, 1]
  }

  private computeUserHistoryFeatures(signals: SocialSignal[], item: ContentItem): number[] {
    const typePreference = signals.filter(s => s.type === item.type && s.action === 'like').length / Math.max(signals.length, 1);
    const categoryPreference = signals.filter(s => s.metadata?.category === item.category && s.action === 'like').length / Math.max(signals.length, 1);
    const authorPreference = signals.filter(s => s.metadata?.author === item.author && s.action === 'like').length / Math.max(signals.length, 1);
    
    return [typePreference, categoryPreference, authorPreference];
  }

  private computeSessionContextFeatures(signals: SocialSignal[], item: ContentItem): number[] {
    const recentSignals = signals.filter(s => Date.now() - s.timestamp < 3600000); // Last hour
    const sessionTypePreference = recentSignals.filter(s => s.type === item.type).length / Math.max(recentSignals.length, 1);
    const sessionEngagement = recentSignals.filter(s => s.action === 'like' || s.action === 'view').length / Math.max(recentSignals.length, 1);
    
    return [sessionTypePreference, sessionEngagement];
  }

  private computeGeoTemporalFeatures(geoSignals: any[], item: ContentItem): number[] {
    const currentHour = new Date().getHours();
    const timePreference = geoSignals.filter(s => {
      const signalHour = new Date(s.timestamp).getHours();
      return Math.abs(signalHour - currentHour) <= 2;
    }).length / Math.max(geoSignals.length, 1);
    
    const locationRelevance = 0.5; // Mock location relevance
    
    return [timePreference, locationRelevance];
  }

  private computeTrendWeight(trends: TrendData[], item: ContentItem): number {
    const relevantTrend = trends.find(t => 
      t.category === item.category || 
      item.tags.some(tag => t.trend.includes(tag))
    );
    
    return relevantTrend ? relevantTrend.score : 0;
  }

  private computeTopicSimilarity(signals: SocialSignal[], item: ContentItem): number {
    const likedTags = signals
      .filter(s => s.action === 'like' && s.metadata?.tags)
      .flatMap(s => s.metadata!.tags!);
    
    const commonTags = item.tags.filter(tag => likedTags.includes(tag));
    return commonTags.length / Math.max(item.tags.length, 1);
  }

  private computeRepetitionPenalty(signals: SocialSignal[], item: ContentItem): number {
    const recentViews = signals.filter(s => 
      s.contentId === item.id && 
      s.action === 'view' && 
      Date.now() - s.timestamp < 86400000 // Last 24 hours
    ).length;
    
    return Math.min(recentViews * 0.2, 1.0); // Penalty increases with repetition
  }

  private computeRecencyScore(timestamp: number): number {
    const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    return Math.max(0, 1 - ageHours / 24); // Decay over 24 hours
  }

  private async getFallbackRecommendations(slot: string, limit: number): Promise<RankedContent[]> {
    // Simple fallback without personalization
    const mockContent = await this.getServerPreRankedContent(slot);
    return mockContent.slice(0, limit).map(item => ({
      ...item,
      score: item.engagement || 0.5,
      reasons: ['popular'],
      slot: slot as any
    }));
  }

  private async initializeModel(): Promise<void> {
    // Initialize lightweight model weights (mock implementation)
    this.modelWeights = new Array(20).fill(0).map(() => Math.random() * 0.1);
  }

  private async loadBanditState(): Promise<void> {
    try {
      const stored = await this.signalsService['getEncrypted'](this.BANDIT_STORAGE_KEY);
      if (stored) {
        this.banditState = { ...this.banditState, ...stored };
      }
    } catch (error) {
      console.error('Failed to load bandit state:', error);
    }
  }

  private async saveBanditState(): Promise<void> {
    try {
      await this.signalsService['storeEncrypted'](this.BANDIT_STORAGE_KEY, this.banditState);
    } catch (error) {
      console.error('Failed to save bandit state:', error);
    }
  }
}

export default SocialRecommenderService;