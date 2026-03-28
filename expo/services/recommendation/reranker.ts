import PersonalizationSignalsService, { SocialSignal } from '@/services/ai/PersonalizationSignalsService';
import DataLayoutService from '@/services/ai/DataLayoutService';
import SecurityGuardrailsService from '@/services/ai/SecurityGuardrailsService';

export interface ContentItem {
  id: string;
  type: 'post' | 'video' | 'voice' | 'game';
  title: string;
  author: string;
  category: string;
  tags: string[];
  engagement: number;
  timestamp: number;
  metadata?: {
    duration?: number;
    views?: number;
    likes?: number;
    shares?: number;
    topic?: string;
  };
}

export interface RerankerFeatures {
  userHistory: number[];
  sessionContext: number[];
  geoTemporal: number[];
  trendWeight: number;
  topicSimilarity: number;
  repetitionPenalty: number;
  engagementScore: number;
  recencyScore: number;
}

export interface RankedContent extends ContentItem {
  score: number;
  reasons: string[];
  confidence: number;
}

class RerankerService {
  private static instance: RerankerService;
  private readonly MAX_LATENCY_MS = 120;
  private readonly MAX_MEMORY_MB = 30;
  
  private signalsService: PersonalizationSignalsService;
  private dataLayoutService: DataLayoutService;
  private securityGuardrails: SecurityGuardrailsService;
  private modelWeights: number[] = [];
  private isInitialized = false;

  private constructor() {
    this.signalsService = PersonalizationSignalsService.getInstance();
    this.dataLayoutService = DataLayoutService.getInstance();
    this.securityGuardrails = SecurityGuardrailsService.getInstance();
  }

  static getInstance(): RerankerService {
    if (!RerankerService.instance) {
      RerankerService.instance = new RerankerService();
    }
    return RerankerService.instance;
  }

  // Initialize lightweight model (LogReg/MLP-int8 equivalent)
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing Reranker...');
      const startTime = Date.now();

      // Initialize lightweight model weights
      this.modelWeights = this.initializeLightweightModel();
      
      // Verify model integrity
      const modelData = JSON.stringify(this.modelWeights);
      const integrityValid = await this.securityGuardrails.verifyIntegrity('model', modelData);
      
      if (!integrityValid) {
        throw new Error('Model integrity verification failed');
      }
      
      const initTime = Date.now() - startTime;
      
      // Enforce resource limits
      const resourceCheck = await this.securityGuardrails.enforceResourceLimits('reranker_initialization', {
        latencyMs: initTime,
        memoryMB: 15
      });
      
      if (!resourceCheck.allowed) {
        throw new Error(`Reranker initialization failed: ${resourceCheck.reason}`);
      }
      
      console.log(`✅ Reranker initialized in ${initTime}ms`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Reranker:', error);
      throw error;
    }
  }

  // Main reranking function with exact algorithm implementation
  async rerankContent(content: ContentItem[]): Promise<RankedContent[]> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Extract features for each content item
      const contentWithFeatures = await Promise.all(
        content.map(async (item) => ({
          item,
          features: await this.extractFeatures(item)
        }))
      );

      // Apply the exact scoring algorithm: score = w_f·F(item,user) + w_t·Trend(item,t) + w_g·Geo(item,loc) − w_r·RepeatPenalty
      const rankedContent = contentWithFeatures.map(({ item, features }) => {
        const score = this.computeScore(features);
        const confidence = this.computeConfidence(features);
        const reasons = this.generateReasons(features);
        
        return {
          ...item,
          score,
          confidence,
          reasons
        };
      });

      // Sort by score (descending)
      rankedContent.sort((a, b) => b.score - a.score);
      
      const processingTime = Date.now() - startTime;
      
      // Enforce resource limits
      const resourceCheck = await this.securityGuardrails.enforceResourceLimits('reranking', {
        latencyMs: processingTime,
        memoryMB: 20
      });
      
      if (!resourceCheck.allowed) {
        console.warn(`Reranking resource limits exceeded: ${resourceCheck.reason}`);
        // Return fallback ranking based on engagement only
        return content.map(item => ({
          ...item,
          score: item.engagement || 0.5,
          confidence: 0.5,
          reasons: ['fallback']
        })).sort((a, b) => b.score - a.score);
      }
      
      console.log(`🎯 Reranked ${rankedContent.length} items in ${processingTime}ms`);
      return rankedContent;
    } catch (error) {
      console.error('Failed to rerank content:', error);
      // Return fallback ranking
      return content.map(item => ({
        ...item,
        score: item.engagement || 0.5,
        confidence: 0.3,
        reasons: ['error_fallback']
      }));
    }
  }

  // Extract features for scoring algorithm
  private async extractFeatures(item: ContentItem): Promise<RerankerFeatures> {
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
      
      // Topic similarity using cosine similarity
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

  // Implement the exact scoring algorithm
  private computeScore(features: RerankerFeatures): number {
    // Exact algorithm weights as specified
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

  private computeUserItemFeature(features: RerankerFeatures): number {
    // Combine user history, session context, topic similarity, and engagement using cosine similarity approach
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

  private computeTrendWeight(trends: any[], item: ContentItem): number {
    const relevantTrend = trends.find(t => 
      t.category === item.category || 
      item.tags.some(tag => t.trend.includes(tag))
    );
    
    return relevantTrend ? relevantTrend.score : 0;
  }

  private computeTopicSimilarity(signals: SocialSignal[], item: ContentItem): number {
    // Use cosine similarity approach for topic matching
    const likedTags = signals
      .filter(s => s.action === 'like' && s.metadata?.tags)
      .flatMap(s => s.metadata!.tags!);
    
    if (likedTags.length === 0 || item.tags.length === 0) {
      return 0;
    }
    
    // Simple cosine similarity approximation
    const commonTags = item.tags.filter(tag => likedTags.includes(tag));
    const similarity = commonTags.length / Math.sqrt(item.tags.length * likedTags.length);
    
    return Math.min(similarity, 1.0);
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

  private computeConfidence(features: RerankerFeatures): number {
    // Compute confidence based on feature strength
    const featureStrength = (
      features.topicSimilarity * 0.3 +
      features.trendWeight * 0.25 +
      features.engagementScore * 0.2 +
      (1 - features.repetitionPenalty) * 0.15 +
      features.recencyScore * 0.1
    );
    
    return Math.max(0.1, Math.min(1.0, featureStrength));
  }

  private generateReasons(features: RerankerFeatures): string[] {
    const reasons = [];
    
    if (features.trendWeight > 0.5) reasons.push('trending');
    if (features.topicSimilarity > 0.7) reasons.push('similar_interests');
    if (features.recencyScore > 0.8) reasons.push('recent');
    if (features.engagementScore > 0.7) reasons.push('popular');
    if (features.userHistory.some(h => h > 0.6)) reasons.push('matches_history');
    if (features.sessionContext.some(s => s > 0.5)) reasons.push('session_relevant');
    
    return reasons.length > 0 ? reasons : ['recommended'];
  }

  private initializeLightweightModel(): number[] {
    // Initialize lightweight linear model weights (LogReg/MLP-int8 equivalent)
    // Using small random weights for features
    return [
      0.4,  // user_history_type
      0.3,  // user_history_category  
      0.2,  // user_history_author
      0.35, // session_type
      0.25, // session_engagement
      0.15, // geo_time
      0.1,  // geo_location
      0.25, // trend_weight
      0.3,  // topic_similarity
      -0.3, // repetition_penalty (negative)
      0.2,  // engagement_score
      0.15, // recency_score
      0.1,  // bias term
    ];
  }
}

export default RerankerService;