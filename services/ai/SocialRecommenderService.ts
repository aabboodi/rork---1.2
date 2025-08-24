import PersonalizationSignalsService, { SocialSignal, TrendData } from './PersonalizationSignalsService';
import PersonalizationSettingsService from './PersonalizationSettingsService';
import DataLayoutService from './DataLayoutService';
import SecurityGuardrailsService from './SecurityGuardrailsService';

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
  private dataLayoutService: DataLayoutService;
  private securityGuardrails: SecurityGuardrailsService;
  private banditState: BanditState;
  private modelWeights: number[] = [];
  private isInitialized = false;

  private constructor() {
    this.signalsService = PersonalizationSignalsService.getInstance();
    this.settingsService = PersonalizationSettingsService.getInstance();
    this.dataLayoutService = DataLayoutService.getInstance();
    this.securityGuardrails = SecurityGuardrailsService.getInstance();
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

      // Initialize security guardrails first
      await this.securityGuardrails.initialize();

      // Load bandit state
      await this.loadBanditState();
      
      // Initialize lightweight model weights (LogReg/MLP-int8 equivalent)
      await this.initializeModel();
      
      const initTime = Date.now() - startTime;
      
      // Enforce resource limits
      const resourceCheck = await this.securityGuardrails.enforceResourceLimits('initialization', {
        latencyMs: initTime,
        memoryMB: 15 // Estimated memory usage
      });
      
      if (!resourceCheck.allowed) {
        throw new Error(`Initialization failed: ${resourceCheck.reason}`);
      }
      
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

      // NO-WALLET RULE: Block any wallet-related recommendations
      if (slot.toLowerCase().includes('wallet') || slot.toLowerCase().includes('financial')) {
        const walletAllowed = await this.securityGuardrails.enforceNoWalletRule(`/recommendations/${slot}`, 'SocialRecommender');
        if (!walletAllowed) {
          return [];
        }
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
      
      // Enforce resource limits
      const resourceCheck = await this.securityGuardrails.enforceResourceLimits('recommendation_generation', {
        latencyMs: processingTime,
        memoryMB: 20 // Estimated memory usage
      });
      
      if (!resourceCheck.allowed) {
        console.warn(`Resource limits exceeded: ${resourceCheck.reason}`);
        return await this.getFallbackRecommendations(slot, limit);
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
    try {
      // Use DataLayoutService to fetch from server endpoint /social/prerank
      const serverResponse = await this.dataLayoutService.fetchSocialPrerank({
        slot: slot as 'post' | 'video' | 'voice' | 'game',
        limit: 100 // Request up to 100 items
      });
      
      // Convert server response to ContentItem format
      const contentItems: ContentItem[] = serverResponse.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        author: item.author,
        category: item.category,
        tags: item.tags,
        engagement: item.engagement,
        timestamp: item.timestamp,
        metadata: {
          views: Math.floor(Math.random() * 2000) + 100,
          likes: Math.floor(Math.random() * 200) + 10,
          shares: Math.floor(Math.random() * 50) + 1
        }
      }));
      
      console.log(`📥 Received ${contentItems.length} pre-ranked items from server for ${slot}`);
      return contentItems;
    } catch (error) {
      console.error('Failed to get server pre-ranked content:', error);
      // Fallback to mock data if server fails
      return this.getFallbackContent(slot);
    }
  }

  private getFallbackContent(slot: string): ContentItem[] {
    const mockContent: ContentItem[] = [
      {
        id: 'fallback_post_1',
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
        id: 'fallback_video_1',
        type: 'video',
        title: 'Quick cooking recipe',
        author: 'chef_master',
        category: 'cooking',
        tags: ['recipe', 'quick', 'cooking'],
        engagement: 0.72,
        timestamp: Date.now() - 7200000,
        metadata: { duration: 180, views: 890, likes: 67 }
      }
    ];

    return mockContent.slice(0, 50); // Return limited fallback content
  }

  private async extractFeatures(item: ContentItem): Promise<RecommendationFeatures> {
    try {
      const signals = await this.signalsService.getSocialSignals();
      const geoSignals = await this.signalsService.getGeoTemporalSignals();
      const trends = await this.dataLayoutService.fetchTrends({ region: 'MENA' });

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
    // Dynamic ε that decreases with confidence accumulation (ε ديناميكية ↘︎ مع تراكم إشارات الثقة)
    const confidenceSignals = this.banditState.totalCount;
    const dynamicEpsilon = Math.max(
      this.MIN_EPSILON,
      this.banditState.epsilon * Math.exp(-confidenceSignals / 1000)
    );
    
    // ε-greedy with Thompson Sampling elements
    if (Math.random() < dynamicEpsilon) {
      // Exploration: Thompson Sampling-inspired selection
      const explorationCount = Math.min(5, Math.floor(rankedContent.length * 0.2));
      const toExplore = rankedContent.slice(0, explorationCount);
      
      // Add uncertainty bonus to less-explored items
      const exploredItems = toExplore.map(item => {
        const itemCount = this.banditState.counts[item.id] || 0;
        const uncertaintyBonus = Math.sqrt(2 * Math.log(this.banditState.totalCount + 1) / (itemCount + 1));
        return {
          ...item,
          score: item.score + uncertaintyBonus * 0.1
        };
      }).sort((a, b) => b.score - a.score);
      
      return [...exploredItems, ...rankedContent.slice(explorationCount)];
    }
    
    // Exploitation: use current ranking
    return rankedContent;
  }

  private computeScore(features: RecommendationFeatures): number {
    // Implement the exact algorithm: score = w_f·F(item,user) + w_t·Trend(item,t) + w_g·Geo(item,loc) − w_r·RepeatPenalty
    const w_f = 0.4; // User feature weight
    const w_t = 0.25; // Trend weight
    const w_g = 0.15; // Geo-temporal weight
    const w_r = 0.3; // Repetition penalty weight
    
    // F(item,user) - User-item feature interaction
    const userItemFeature = this.computeUserItemFeature(features);
    
    // Trend(item,t) - Trend score at time t
    const trendScore = features.trendWeight;
    
    // Geo(item,loc) - Geographic relevance
    const geoScore = features.geoTemporal.reduce((sum, val) => sum + val, 0) / features.geoTemporal.length;
    
    // RepeatPenalty - Repetition penalty
    const repeatPenalty = features.repetitionPenalty;
    
    // Apply the exact formula
    const score = w_f * userItemFeature + w_t * trendScore + w_g * geoScore - w_r * repeatPenalty;
    
    return Math.max(0, Math.min(1, score)); // Normalize to [0, 1]
  }

  private computeUserItemFeature(features: RecommendationFeatures): number {
    // Combine user history, session context, topic similarity, and engagement
    const historyScore = features.userHistory.reduce((sum, val) => sum + val, 0) / features.userHistory.length;
    const sessionScore = features.sessionContext.reduce((sum, val) => sum + val, 0) / features.sessionContext.length;
    const topicScore = features.topicSimilarity;
    const engagementScore = features.engagementScore;
    const recencyScore = features.recencyScore;
    
    // Weighted combination
    return (historyScore * 0.3 + sessionScore * 0.2 + topicScore * 0.25 + engagementScore * 0.15 + recencyScore * 0.1);
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
    
    // Verify model integrity
    const modelData = JSON.stringify(this.modelWeights);
    const integrityValid = await this.securityGuardrails.verifyIntegrity('model', modelData);
    
    if (!integrityValid) {
      throw new Error('Model integrity verification failed');
    }
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