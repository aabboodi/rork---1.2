import { Platform } from 'react-native';
import { 
  UserFeatureVector, 
  UserSignal, 
  RecommendationResult, 
  FeedRankingPipeline,
  CandidateStrategy,
  FeedScoringModel,
  RecommendationAnalytics,
  ABTestConfig,
  PrivacyAuditLog,
  ConsentRecord,
  InterestVector,
  ContentPreferences,
  BehaviorPatterns,
  SignalContext,
  UserAction,
  ContentType,
  SignalBatch,
  SignalBatchConfig,
  SignalProcessingResult,
  ExplicitSignalData,
  ImplicitSignalData,
  ContentSignalData,
  SignalType,
  RealTimeSignalProcessor,
  ProcessingStatus,
  FeatureUpdate,
  SignalSummary,
  PostUserFeatureVector,
  AuthorAffinityMetrics,
  EngagementMetrics,
  ContentMatchMetrics,
  RecencyMetrics,
  RankingFactor,
  SocialRankingContext,
  FeedRankingMetrics,
  UserInteractionHistory,
  AuthorInteractionMetrics,
  SocialGraphAffinity,
  ConnectionStrength,
  SocialGraphCandidateStrategy,
  SignalContribution,
  // Micro-batch feedback loop types
  ClipsBatch,
  BatchConsumptionTracker,
  ClipConsumptionStatus,
  FeedbackLoopState,
  AdaptiveRankingFactors,
  TikTokScoringWeights,
  BatchMetrics,
  MicroBatchConfig,
  AdaptationEvent,
  AdaptiveUpdate,
  FeedbackLoopMetrics,
  // ML Logging types
  InteractionLog,
  InteractionContext,
  ModelPrediction,
  UserInteractionData,
  FeatureVector,
  InteractionType
} from '@/types/recommendation';
import { Post, Clip, User } from '@/types';
import SecurityManager from '@/services/security/SecurityManager';
import MLLoggingService from './MLLoggingService';
import SecureStorage from '@/services/security/SecureStorage';
import { 
  exponentialDecay, 
  calculateTimeDecayedEngagement, 
  calculateRecencyScore,
  calculateFreshnessScore 
} from '@/utils/dateUtils';

interface RecommendationConfig {
  enablePersonalization: boolean;
  enableRealTimeUpdates: boolean;
  enableABTesting: boolean;
  enablePrivacyMode: boolean;
  maxRecommendations: number;
  refreshIntervalMs: number;
  cacheExpiryMs: number;
  signalBatchConfig: SignalBatchConfig;
  // Enhanced for feed ranking
  enableFeedRanking: boolean;
  socialGraphDepth: number;
  candidatePoolSize: number;
  featureCacheEnabled: boolean;
  featureCacheTTL: number;
  // TikTok-inspired clips configuration
  enableClipsRanking: boolean;
  clipsExplorationRate: number; // Percentage of random clips for exploration
  clipsTrendingWindow: number; // Time window for trending clips (ms)
  clipsCollaborativeFilteringDepth: number; // How many similar users to consider
  clipsViralityThreshold: number; // Threshold for viral clips
  clipsSerendipityWeight: number; // Weight for serendipitous content
  // TikTok-inspired scoring weights
  clipsWatchPercentageWeight: number; // w1
  clipsLoopCountWeight: number; // w2
  clipsShareCountWeight: number; // w3
  clipsSkipSignalWeight: number; // w4
  clipsSkipThreshold: number; // Threshold for skip signal (ms)
  // Micro-batch feedback loop configuration
  enableMicroBatchFeedbackLoop: boolean;
  microBatchConfig: MicroBatchConfig;
  // ML Logging configuration
  enableMLLogging: boolean;
  mlLoggingConfig: {
    logAllInteractions: boolean;
    logImpressions: boolean;
    logModelPredictions: boolean;
    logFeatureVectors: boolean;
    logABTestData: boolean;
    samplingRate: number;
  };
}

// Enhanced Social Graph Data Structures
interface SocialGraphData {
  users: Map<string, User>;
  posts: Map<string, Post>;
  clips: Map<string, Clip>; // Added clips support
  userConnections: Map<string, Set<string>>; // userId -> connected userIds
  userGroups: Map<string, Set<string>>; // userId -> groupIds
  groupMembers: Map<string, Set<string>>; // groupId -> userIds
  postEngagements: Map<string, PostEngagement>; // postId -> engagement data
  clipEngagements: Map<string, ClipEngagement>; // clipId -> engagement data
  userPostInteractions: Map<string, Map<string, UserPostInteraction>>; // userId -> postId -> interaction
  userClipInteractions: Map<string, Map<string, UserClipInteraction>>; // userId -> clipId -> interaction
  // TikTok-inspired data structures
  clipTrendingScores: Map<string, TrendingScore>; // clipId -> trending score
  userSimilarityMatrix: Map<string, Map<string, number>>; // userId -> userId -> similarity score
  clipViralityMetrics: Map<string, ViralityMetrics>; // clipId -> virality metrics
}

interface PostEngagement {
  postId: string;
  authorId: string;
  likes: Set<string>; // userIds who liked
  comments: Set<string>; // userIds who commented
  shares: Set<string>; // userIds who shared
  views: Set<string>; // userIds who viewed
  timestamp: number;
  groupId?: string;
}

interface ClipEngagement {
  clipId: string;
  authorId: string;
  likes: Set<string>;
  comments: Set<string>;
  shares: Set<string>;
  views: Set<string>;
  completions: Set<string>; // userIds who watched to completion
  loops: Map<string, number>; // userId -> loop count
  timestamp: number;
  // TikTok-inspired metrics
  watchTime: Map<string, number>; // userId -> total watch time
  engagementVelocity: number; // Engagements per hour
  viralityScore: number; // How viral this clip is
  trendingScore: number; // Current trending score
  // Enhanced for TikTok-inspired scoring
  watchPercentages: Map<string, number>; // userId -> watch percentage
  skipSignals: Map<string, boolean>; // userId -> skip signal
  dwellTimes: Map<string, number>; // userId -> dwell time
}

interface UserPostInteraction {
  userId: string;
  postId: string;
  interactionType: 'like' | 'comment' | 'share' | 'view';
  timestamp: number;
  engagementScore: number; // 0-1 based on interaction type and dwell time
}

interface UserClipInteraction {
  userId: string;
  clipId: string;
  interactionType: 'like' | 'comment' | 'share' | 'view' | 'completion' | 'loop' | 'skip';
  timestamp: number;
  engagementScore: number;
  watchPercentage: number; // Percentage of clip watched
  loopCount: number; // Number of times looped
  dwellTime: number; // Time spent on clip
  skipSignal: boolean; // Whether this was a skip (dwellTime < threshold)
}

// TikTok-Inspired Data Structures
interface TrendingScore {
  clipId: string;
  score: number; // 0-1 trending score
  velocity: number; // Rate of engagement increase
  peakTime: number; // When it peaked
  currentMomentum: number; // Current trending momentum
  lastUpdated: number;
}

interface ViralityMetrics {
  clipId: string;
  viralityScore: number; // 0-1 virality score
  shareVelocity: number; // Shares per hour
  crossPlatformShares: number; // Shares outside the app
  influencerEngagement: number; // Engagement from influencers
  geographicSpread: number; // How widely spread geographically
  demographicSpread: number; // Spread across demographics
  lastUpdated: number;
}

interface ClipsCandidateStrategy {
  name: 'trending_clips' | 'similar_users_clips' | 'collaborative_filtering' | 'exploration_clips' | 'viral_clips' | 'fresh_content' | 'personalized_clips';
  weight: number;
  enabled: boolean;
  maxCandidates: number;
  timeWindow: number;
  config: {
    trendingThreshold?: number;
    similarityThreshold?: number;
    explorationRate?: number;
    viralityThreshold?: number;
    freshnessBonus?: number;
    diversityBonus?: number;
  };
}

// TikTok-Inspired Scoring Metrics
interface TikTokScoringMetrics {
  clipId: string;
  userId: string;
  watchPercentage: number; // 0-1
  loopCount: number;
  shareCount: number;
  skipSignal: number; // 0 or 1
  dwellTime: number; // milliseconds
  rawScore: number; // Before normalization
  finalScore: number; // After normalization
  scoringTimestamp: number;
}

class RecommendationEngine implements RealTimeSignalProcessor {
  private static instance: RecommendationEngine;
  private userFeatures: Map<string, UserFeatureVector> = new Map();
  private userSignals: UserSignal[] = [];
  private signalQueue: UserSignal[] = [];
  private pendingBatches: Map<string, SignalBatch> = new Map();
  private config: RecommendationConfig;
  private feedRankingPipeline: FeedRankingPipeline;
  private abTests: Map<string, ABTestConfig> = new Map();
  private privacyAuditLogs: PrivacyAuditLog[] = [];
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private sessionId: string;
  private isInitialized: boolean = false;
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Initialize processingStats in constructor
  private processingStats: ProcessingStatus = {
    queueSize: 0,
    processingRate: 0,
    averageLatency: 0,
    errorRate: 0,
    lastProcessedTimestamp: Date.now(),
    activeFeedbackLoops: 0,
    averageAdaptationTime: 0,
    feedbackLoopEfficiency: 0
  };
  
  // Enhanced caches for feed ranking
  private authorAffinityCache: Map<string, AuthorAffinityMetrics> = new Map();
  private engagementCache: Map<string, EngagementMetrics> = new Map();
  private contentMatchCache: Map<string, ContentMatchMetrics> = new Map();
  private featureVectorCache: Map<string, PostUserFeatureVector> = new Map();

  // Enhanced Social Graph Data Store
  private socialGraphData: SocialGraphData = {
    users: new Map(),
    posts: new Map(),
    clips: new Map(),
    userConnections: new Map(),
    userGroups: new Map(),
    groupMembers: new Map(),
    postEngagements: new Map(),
    clipEngagements: new Map(),
    userPostInteractions: new Map(),
    userClipInteractions: new Map(),
    clipTrendingScores: new Map(),
    userSimilarityMatrix: new Map(),
    clipViralityMetrics: new Map()
  };
  
  private socialGraphCandidateStrategies: SocialGraphCandidateStrategy[] = [];

  // TikTok-Inspired Clips Data Structures
  private clipsCandidateStrategies: ClipsCandidateStrategy[] = [];
  private clipsEngagementCache: Map<string, ClipEngagement> = new Map();
  private clipsTrendingCache: Map<string, TrendingScore> = new Map();
  private clipsViralityCache: Map<string, ViralityMetrics> = new Map();
  private userSimilarityCache: Map<string, Map<string, number>> = new Map();
  
  // TikTok-Inspired Scoring Cache
  private tikTokScoringCache: Map<string, TikTokScoringMetrics> = new Map();

  // Micro-Batch Feedback Loop Data Structures
  private activeBatches: Map<string, ClipsBatch> = new Map(); // userId -> active batch
  private batchConsumptionTrackers: Map<string, BatchConsumptionTracker> = new Map(); // batchId -> tracker
  private feedbackLoopStates: Map<string, FeedbackLoopState> = new Map(); // userId -> feedback loop state
  private candidatePool: Map<string, string[]> = new Map(); // userId -> candidate clip IDs
  private adaptiveWeights: Map<string, TikTokScoringWeights> = new Map(); // userId -> adaptive weights
  private batchHistory: Map<string, ClipsBatch[]> = new Map(); // userId -> batch history

  // ML Logging Service
  private mlLoggingService: MLLoggingService;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.mlLoggingService = MLLoggingService.getInstance();
    
    this.config = {
      enablePersonalization: true,
      enableRealTimeUpdates: true,
      enableABTesting: true,
      enablePrivacyMode: true,
      maxRecommendations: 50,
      refreshIntervalMs: 5 * 60 * 1000, // 5 minutes
      cacheExpiryMs: 30 * 60 * 1000, // 30 minutes
      signalBatchConfig: {
        maxBatchSize: 50,
        maxBatchAge: 30 * 1000, // 30 seconds
        compressionThreshold: 10,
        retryAttempts: 3,
        retryDelay: 1000,
        enableCompression: true,
        enableEncryption: true,
        realTimeProcessingEnabled: true,
        feedbackLoopPriority: true,
        adaptiveProcessing: true
      },
      // Enhanced config for feed ranking
      enableFeedRanking: true,
      socialGraphDepth: 2, // 1st and 2nd degree connections
      candidatePoolSize: 500,
      featureCacheEnabled: true,
      featureCacheTTL: 10 * 60 * 1000, // 10 minutes
      // TikTok-inspired clips configuration
      enableClipsRanking: true,
      clipsExplorationRate: 0.15, // 15% random clips for exploration
      clipsTrendingWindow: 6 * 60 * 60 * 1000, // 6 hours for trending
      clipsCollaborativeFilteringDepth: 100, // Consider top 100 similar users
      clipsViralityThreshold: 0.7, // Threshold for viral clips
      clipsSerendipityWeight: 0.2, // Weight for serendipitous content
      // TikTok-inspired scoring weights (heavily weighted on implicit signals)
      clipsWatchPercentageWeight: 0.4, // w1 - High weight for watch percentage
      clipsLoopCountWeight: 0.3, // w2 - High weight for loops (strong engagement signal)
      clipsShareCountWeight: 0.2, // w3 - Medium weight for shares
      clipsSkipSignalWeight: 0.5, // w4 - Strong negative weight for skips
      clipsSkipThreshold: 2000, // 2 seconds threshold for skip signal
      // Micro-batch feedback loop configuration
      enableMicroBatchFeedbackLoop: true,
      microBatchConfig: {
        batchSize: 7, // 7 clips per batch (optimal for mobile viewing)
        maxBatchAge: 5 * 60 * 1000, // 5 minutes max batch age
        adaptationThreshold: 0.1, // 10% improvement to trigger adaptation
        explorationRate: 0.2, // 20% exploration content
        convergenceThreshold: 0.85, // 85% satisfaction for convergence
        maxIterations: 10, // Max 10 feedback loop iterations per session
        realTimeProcessing: true,
        adaptiveWeightAdjustment: true,
        batchPreloadCount: 2, // Preload 2 batches ahead
        signalProcessingDelay: 1000 // 1 second delay for signal processing
      },
      // ML Logging configuration
      enableMLLogging: true,
      mlLoggingConfig: {
        logAllInteractions: true,
        logImpressions: true,
        logModelPredictions: true,
        logFeatureVectors: true,
        logABTestData: true,
        samplingRate: 1.0 // Log 100% of interactions initially
      }
    };

    this.feedRankingPipeline = this.initializeFeedRankingPipeline();
    this.initializeABTests();
    this.initializeSocialGraphData();
    this.initializeSocialGraphCandidateStrategies();
    this.initializeClipsCandidateStrategies();
    this.startBatchProcessor();
  }

  static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  // Initialize Social Graph Data Store
  private initializeSocialGraphData(): void {
    this.socialGraphData = {
      users: new Map(),
      posts: new Map(),
      clips: new Map(),
      userConnections: new Map(),
      userGroups: new Map(),
      groupMembers: new Map(),
      postEngagements: new Map(),
      clipEngagements: new Map(),
      userPostInteractions: new Map(),
      userClipInteractions: new Map(),
      // TikTok-inspired data structures
      clipTrendingScores: new Map(),
      userSimilarityMatrix: new Map(),
      clipViralityMetrics: new Map()
    };
  }

  // Initialize Social Graph Candidate Generation Strategies
  private initializeSocialGraphCandidateStrategies(): void {
    this.socialGraphCandidateStrategies = [
      {
        name: 'immediate_friends',
        weight: 0.35,
        enabled: true,
        maxCandidates: 150,
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
        config: {
          minEngagementThreshold: 0.1,
          friendInfluenceWeight: 0.8,
          diversityBonus: 0.1
        }
      },
      {
        name: 'friend_liked_content',
        weight: 0.25,
        enabled: true,
        maxCandidates: 100,
        timeWindow: 48 * 60 * 60 * 1000, // 48 hours
        config: {
          minEngagementThreshold: 0.2,
          friendInfluenceWeight: 0.6,
          diversityBonus: 0.15
        }
      },
      {
        name: 'group_content',
        weight: 0.20,
        enabled: true,
        maxCandidates: 80,
        timeWindow: 72 * 60 * 60 * 1000, // 72 hours
        config: {
          groupInfluenceWeight: 0.7,
          diversityBonus: 0.2
        }
      },
      {
        name: 'second_degree_friends',
        weight: 0.15,
        enabled: true,
        maxCandidates: 60,
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
        config: {
          minEngagementThreshold: 0.3,
          friendInfluenceWeight: 0.4,
          diversityBonus: 0.25
        }
      },
      {
        name: 'trending_in_network',
        weight: 0.05,
        enabled: true,
        maxCandidates: 20,
        timeWindow: 12 * 60 * 60 * 1000, // 12 hours
        config: {
          minEngagementThreshold: 0.5,
          diversityBonus: 0.3
        }
      }
    ];
  }

  // Initialize TikTok-Inspired Clips Candidate Generation Strategies
  private initializeClipsCandidateStrategies(): void {
    this.clipsCandidateStrategies = [
      {
        name: 'trending_clips',
        weight: 0.30,
        enabled: true,
        maxCandidates: 100,
        timeWindow: this.config.clipsTrendingWindow,
        config: {
          trendingThreshold: 0.6,
          diversityBonus: 0.1
        }
      },
      {
        name: 'similar_users_clips',
        weight: 0.25,
        enabled: true,
        maxCandidates: 80,
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
        config: {
          similarityThreshold: 0.3,
          diversityBonus: 0.15
        }
      },
      {
        name: 'collaborative_filtering',
        weight: 0.20,
        enabled: true,
        maxCandidates: 70,
        timeWindow: 48 * 60 * 60 * 1000, // 48 hours
        config: {
          similarityThreshold: 0.4,
          diversityBonus: 0.2
        }
      },
      {
        name: 'exploration_clips',
        weight: this.config.clipsExplorationRate,
        enabled: true,
        maxCandidates: Math.floor(this.config.candidatePoolSize * this.config.clipsExplorationRate),
        timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
        config: {
          explorationRate: this.config.clipsExplorationRate,
          diversityBonus: 0.4
        }
      },
      {
        name: 'viral_clips',
        weight: 0.10,
        enabled: true,
        maxCandidates: 30,
        timeWindow: 12 * 60 * 60 * 1000, // 12 hours
        config: {
          viralityThreshold: this.config.clipsViralityThreshold,
          diversityBonus: 0.1
        }
      }
    ];
  }

  // ===== ML LOGGING INTEGRATION =====

  // Enhanced logging for impressions with full ML context
  private async logImpression(
    contentId: string,
    contentType: ContentType,
    position: number,
    prediction: ModelPrediction,
    context: Partial<InteractionContext> = {}
  ): Promise<void> {
    if (!this.config.enableMLLogging || !this.config.mlLoggingConfig.logImpressions) {
      return;
    }

    try {
      const interactionContext: InteractionContext = {
        itemType: this.mapContentTypeToItemType(contentType),
        itemID: contentId,
        itemPosition: position,
        feedType: context.feedType || 'main_feed',
        screenName: context.screenName || 'feed',
        ...context
      };

      await this.mlLoggingService.logImpression(interactionContext, prediction);
    } catch (error) {
      console.error('Failed to log impression:', error);
    }
  }

  // Enhanced logging for user interactions with complete ML data
  private async logUserInteraction(
    contentId: string,
    contentType: ContentType,
    interactionType: InteractionType,
    prediction: ModelPrediction,
    userInteractionData: Partial<UserInteractionData>,
    context: Partial<InteractionContext> = {}
  ): Promise<void> {
    if (!this.config.enableMLLogging || !this.config.mlLoggingConfig.logAllInteractions) {
      return;
    }

    try {
      const interactionContext: InteractionContext = {
        itemType: this.mapContentTypeToItemType(contentType),
        itemID: contentId,
        ...context
      };

      const fullUserInteraction: UserInteractionData = {
        interactionType,
        dwellTimeMs: userInteractionData.dwellTimeMs || 0,
        engagementDepth: userInteractionData.engagementDepth || 0,
        attentionScore: userInteractionData.attentionScore || 0,
        ...userInteractionData
      };

      const interactionLog: InteractionLog = {
        logVersion: "1.0",
        eventID: this.generateEventId(),
        clientTimestamp: new Date().toISOString(),
        serverIngestionTimestamp: "", // Will be set by server
        sessionID: this.sessionId,
        userID: await this.getPseudonymizedUserId(),
        context: interactionContext,
        modelPrediction: prediction,
        finalUserInteraction: fullUserInteraction,
        privacyCompliant: true,
        dataRetentionPolicy: `${90}_days` // 90 days retention
      };

      await this.mlLoggingService.logInteraction(interactionLog);
    } catch (error) {
      console.error('Failed to log user interaction:', error);
    }
  }

  // Create model prediction data for logging
  private createModelPrediction(
    contentId: string,
    score: number,
    featureVector: FeatureVector,
    modelVersion: string = 'v1.0',
    abTestContext?: ABTestContext
  ): ModelPrediction {
    return {
      modelVersion,
      predictedScore: score,
      predictionTimestamp: new Date().toISOString(),
      featureVector,
      abTest: abTestContext,
      rankingPosition: 0, // Will be set by caller
      totalCandidates: 0, // Will be set by caller
      candidatePoolSource: 'hybrid' // Will be set by caller
    };
  }

  // Create feature vector for logging
  private createFeatureVector(
    userFeatures: UserFeatureVector,
    contentMetrics?: any,
    socialMetrics?: any
  ): FeatureVector {
    return {
      // Content features
      authorAffinity: contentMetrics?.authorAffinity || 0,
      contentMatchScore: contentMetrics?.contentMatchScore || 0,
      recencyDecay: contentMetrics?.recencyDecay || 0,
      qualityScore: contentMetrics?.qualityScore || 0,
      viralityScore: contentMetrics?.viralityScore || 0,
      
      // Social features
      socialProofScore: socialMetrics?.socialProofScore || 0,
      friendEngagementScore: socialMetrics?.friendEngagementScore || 0,
      mutualFriendsCount: socialMetrics?.mutualFriendsCount || 0,
      
      // Behavioral features
      userEngagementHistory: userFeatures.behaviorPatterns.socialInteractionRate,
      timeOfDayRelevance: this.calculateTimeOfDayRelevance(),
      deviceTypeRelevance: 0.8, // Mock value
      
      // Temporal features
      contentAge: contentMetrics?.contentAge || 0,
      userSessionTime: Date.now() - this.getSessionStartTime(),
      dayOfWeekRelevance: this.calculateDayOfWeekRelevance(),
      
      // Personalization features
      interestAlignment: this.calculateInterestAlignment(userFeatures.interests),
      behaviorPatternMatch: userFeatures.behaviorPatterns.explorationTendency,
      locationRelevance: 0.5, // Mock value
      
      // Custom features
      customFeatures: {
        sessionLength: Date.now() - this.getSessionStartTime(),
        feedPosition: 0, // Will be set by caller
        batchIteration: 0 // Will be set by caller for micro-batch feedback loop
      }
    };
  }

  // ===== MICRO-BATCH FEEDBACK LOOP IMPLEMENTATION =====

  // Initialize feedback loop for a user
  async initializeFeedbackLoop(userId: string): Promise<void> {
    try {
      const feedbackLoopState: FeedbackLoopState = {
        userId,
        currentIteration: 0,
        totalIterations: 0,
        activeBatch: undefined,
        previousBatches: [],
        pendingSignals: [],
        adaptiveLearningRate: 0.1, // Start with 10% learning rate
        convergenceScore: 0,
        explorationRate: this.config.microBatchConfig.explorationRate,
        lastAdaptationTime: Date.now(),
        adaptationHistory: []
      };

      this.feedbackLoopStates.set(userId, feedbackLoopState);

      // Initialize adaptive weights for the user
      const initialWeights: TikTokScoringWeights = {
        watchPercentageWeight: this.config.clipsWatchPercentageWeight,
        loopCountWeight: this.config.clipsLoopCountWeight,
        shareCountWeight: this.config.clipsShareCountWeight,
        skipSignalWeight: this.config.clipsSkipSignalWeight,
        adaptiveBonus: 0
      };

      this.adaptiveWeights.set(userId, initialWeights);

      // Generate initial candidate pool
      await this.generateCandidatePool(userId);

      // Create first batch
      await this.generateNextBatch(userId);

      console.log(`Micro-batch feedback loop initialized for user ${userId}`);
    } catch (error) {
      console.error('Failed to initialize feedback loop:', error);
    }
  }

  // Generate candidate pool for user
  private async generateCandidatePool(userId: string): Promise<void> {
    try {
      const candidates: string[] = [];

      // Use existing candidate generation strategies
      for (const strategy of this.clipsCandidateStrategies) {
        if (!strategy.enabled) continue;

        const strategyCandidates = await this.generateCandidatesByStrategy(userId, strategy);
        candidates.push(...strategyCandidates.slice(0, strategy.maxCandidates));
      }

      // Remove duplicates and shuffle
      const uniqueCandidates = Array.from(new Set(candidates));
      const shuffledCandidates = this.shuffleArray(uniqueCandidates);

      // Store candidate pool
      this.candidatePool.set(userId, shuffledCandidates);

      console.log(`Generated candidate pool of ${shuffledCandidates.length} clips for user ${userId}`);
    } catch (error) {
      console.error('Failed to generate candidate pool:', error);
    }
  }

  // Generate candidates by strategy
  private async generateCandidatesByStrategy(
    userId: string, 
    strategy: ClipsCandidateStrategy
  ): Promise<string[]> {
    // Mock implementation - in real app, this would query the database
    const mockClipIds = [
      'clip_1', 'clip_2', 'clip_3', 'clip_4', 'clip_5',
      'clip_6', 'clip_7', 'clip_8', 'clip_9', 'clip_10',
      'clip_11', 'clip_12', 'clip_13', 'clip_14', 'clip_15'
    ];

    // Simulate different strategies
    switch (strategy.name) {
      case 'trending_clips':
        return mockClipIds.filter((_, index) => index % 2 === 0); // Even indices
      case 'similar_users_clips':
        return mockClipIds.filter((_, index) => index % 3 === 0); // Every 3rd
      case 'collaborative_filtering':
        return mockClipIds.filter((_, index) => index % 4 === 0); // Every 4th
      case 'exploration_clips':
        return this.shuffleArray(mockClipIds).slice(0, 5); // Random 5
      case 'viral_clips':
        return mockClipIds.slice(0, 3); // First 3
      default:
        return mockClipIds.slice(0, strategy.maxCandidates);
    }
  }

  // Generate next batch for user
  async generateNextBatch(userId: string): Promise<ClipsBatch | null> {
    try {
      const feedbackLoopState = this.feedbackLoopStates.get(userId);
      if (!feedbackLoopState) {
        console.error('Feedback loop state not found for user:', userId);
        return null;
      }

      // Check if we've reached max iterations
      if (feedbackLoopState.totalIterations >= this.config.microBatchConfig.maxIterations) {
        console.log(`Max iterations reached for user ${userId}`);
        return null;
      }

      const candidatePool = this.candidatePool.get(userId) || [];
      if (candidatePool.length === 0) {
        console.error('No candidates available for user:', userId);
        return null;
      }

      // Calculate adaptive factors
      const adaptiveFactors = await this.calculateAdaptiveFactors(userId);

      // Select clips for batch using adaptive ranking
      const batchClipIds = await this.selectClipsForBatch(userId, candidatePool, adaptiveFactors);

      // Create batch
      const batch: ClipsBatch = {
        batchId: `batch_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        clipIds: batchClipIds,
        batchSize: batchClipIds.length,
        batchType: feedbackLoopState.totalIterations === 0 ? 'initial' : 'adaptive',
        generationTimestamp: Date.now(),
        feedbackLoopIteration: feedbackLoopState.currentIteration,
        candidatePoolSize: candidatePool.length,
        rankingModelVersion: '3.0.0-micro-batch',
        adaptiveFactors,
        batchMetrics: {
          averageWatchPercentage: 0,
          averageLoopCount: 0,
          skipRate: 0,
          engagementRate: 0,
          completionRate: 0,
          averageDwellTime: 0,
          batchConsumptionTime: 0,
          userSatisfactionScore: 0
        },
        previousBatchSignals: feedbackLoopState.pendingSignals
      };

      // Update feedback loop state
      feedbackLoopState.activeBatch = batch;
      feedbackLoopState.currentIteration++;
      feedbackLoopState.totalIterations++;

      // Store batch
      this.activeBatches.set(userId, batch);

      // Initialize consumption tracker
      const consumptionTracker: BatchConsumptionTracker = {
        batchId: batch.batchId,
        userId,
        clipConsumptionStatus: {},
        batchStartTime: Date.now(),
        currentClipIndex: 0,
        totalClipsInBatch: batch.batchSize,
        consumptionVelocity: 0,
        batchProgress: 0,
        isCompleted: false,
        isAbandoned: false
      };

      // Initialize consumption status for each clip
      batchClipIds.forEach((clipId, index) => {
        consumptionTracker.clipConsumptionStatus[clipId] = {
          clipId,
          batchPosition: index,
          viewStartTime: 0,
          watchPercentage: 0,
          loopCount: 0,
          dwellTime: 0,
          skipSignal: false,
          engagementActions: [],
          consumptionComplete: false,
          satisfactionScore: 0
        };
      });

      this.batchConsumptionTrackers.set(batch.batchId, consumptionTracker);

      // Update processing stats
      this.processingStats.activeFeedbackLoops = this.activeBatches.size;

      // Log batch generation for ML training
      if (this.config.enableMLLogging) {
        await this.logBatchGeneration(batch, adaptiveFactors);
      }

      console.log(`Generated batch ${batch.batchId} for user ${userId} (iteration ${feedbackLoopState.currentIteration})`);
      return batch;
    } catch (error) {
      console.error('Failed to generate next batch:', error);
      return null;
    }
  }

  // Log batch generation for ML training
  private async logBatchGeneration(batch: ClipsBatch, adaptiveFactors: AdaptiveRankingFactors): Promise<void> {
    try {
      const userFeatures = this.userFeatures.get(batch.userId);
      if (!userFeatures) return;

      // Log each clip in the batch as an impression with prediction data
      for (let i = 0; i < batch.clipIds.length; i++) {
        const clipId = batch.clipIds[i];
        
        const featureVector = this.createFeatureVector(userFeatures, {
          contentAge: 0, // Mock value
          qualityScore: 0.8, // Mock value
          viralityScore: 0.6 // Mock value
        }, {
          socialProofScore: 0.7, // Mock value
          friendEngagementScore: 0.5 // Mock value
        });

        // Add micro-batch specific features
        featureVector.customFeatures = {
          ...featureVector.customFeatures,
          batchIteration: batch.feedbackLoopIteration,
          batchPosition: i,
          adaptiveWeights: JSON.stringify(adaptiveFactors.adaptiveWeights),
          explorationAppetite: adaptiveFactors.explorationAppetite,
          sessionMomentum: adaptiveFactors.sessionMomentum
        };

        const prediction = this.createModelPrediction(
          clipId,
          0.8 + (Math.random() * 0.2), // Mock predicted score
          featureVector,
          batch.rankingModelVersion
        );

        prediction.rankingPosition = i;
        prediction.totalCandidates = batch.candidatePoolSize;
        prediction.candidatePoolSource = 'micro_batch_adaptive';

        await this.logImpression(
          clipId,
          'video',
          i,
          prediction,
          {
            feedType: 'clips_feed',
            screenName: 'clips',
            itemPosition: i
          }
        );
      }
    } catch (error) {
      console.error('Failed to log batch generation:', error);
    }
  }

  // Calculate adaptive factors based on user behavior
  private async calculateAdaptiveFactors(userId: string): Promise<AdaptiveRankingFactors> {
    const feedbackLoopState = this.feedbackLoopStates.get(userId);
    const previousBatches = feedbackLoopState?.previousBatches || [];

    // Calculate metrics from previous batches
    let avgWatchPercentage = 0.7; // Default
    let avgSkipRate = 0.2; // Default
    let avgLoopCount = 0.5; // Default
    let sessionMomentum = 0.5; // Default

    if (previousBatches.length > 0) {
      const recentBatches = previousBatches.slice(-3); // Last 3 batches
      
      avgWatchPercentage = recentBatches.reduce((sum, batch) => 
        sum + batch.batchMetrics.averageWatchPercentage, 0) / recentBatches.length;
      
      avgSkipRate = recentBatches.reduce((sum, batch) => 
        sum + batch.batchMetrics.skipRate, 0) / recentBatches.length;
      
      avgLoopCount = recentBatches.reduce((sum, batch) => 
        sum + batch.batchMetrics.averageLoopCount, 0) / recentBatches.length;

      // Calculate session momentum based on engagement trend
      const engagementTrend = recentBatches.map(batch => batch.batchMetrics.engagementRate);
      sessionMomentum = engagementTrend.length > 1 
        ? Math.max(0, Math.min(1, engagementTrend[engagementTrend.length - 1] - engagementTrend[0] + 0.5))
        : 0.5;
    }

    // Calculate user engagement velocity
    const userEngagementVelocity = Math.min(1, avgWatchPercentage + (avgLoopCount * 0.2));

    // Calculate exploration appetite based on skip rate
    const explorationAppetite = Math.max(0.1, Math.min(0.4, avgSkipRate * 2));

    // Get current adaptive weights
    const currentWeights = this.adaptiveWeights.get(userId) || {
      watchPercentageWeight: this.config.clipsWatchPercentageWeight,
      loopCountWeight: this.config.clipsLoopCountWeight,
      shareCountWeight: this.config.clipsShareCountWeight,
      skipSignalWeight: this.config.clipsSkipSignalWeight,
      adaptiveBonus: 0
    };

    return {
      userEngagementVelocity,
      recentSkipRate: avgSkipRate,
      preferredWatchPercentage: avgWatchPercentage,
      loopingBehavior: avgLoopCount,
      sessionMomentum,
      explorationAppetite,
      adaptiveWeights: currentWeights
    };
  }

  // Select clips for batch using adaptive ranking
  private async selectClipsForBatch(
    userId: string, 
    candidatePool: string[], 
    adaptiveFactors: AdaptiveRankingFactors
  ): Promise<string[]> {
    const batchSize = this.config.microBatchConfig.batchSize;
    const explorationCount = Math.floor(batchSize * adaptiveFactors.explorationAppetite);
    const personalizedCount = batchSize - explorationCount;

    // Score all candidates using adaptive weights
    const scoredCandidates = await Promise.all(
      candidatePool.map(async (clipId) => {
        const score = await this.scoreClipWithAdaptiveWeights(clipId, userId, adaptiveFactors.adaptiveWeights);
        return { clipId, score };
      })
    );

    // Sort by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Select top personalized clips
    const personalizedClips = scoredCandidates.slice(0, personalizedCount).map(c => c.clipId);

    // Select random exploration clips
    const remainingCandidates = candidatePool.filter(clipId => !personalizedClips.includes(clipId));
    const explorationClips = this.shuffleArray(remainingCandidates).slice(0, explorationCount);

    // Combine and shuffle final batch
    const batchClips = [...personalizedClips, ...explorationClips];
    return this.shuffleArray(batchClips);
  }

  // Score clip with adaptive weights
  private async scoreClipWithAdaptiveWeights(
    clipId: string, 
    userId: string, 
    weights: TikTokScoringWeights
  ): Promise<number> {
    // Mock scoring - in real app, this would use actual clip data
    const mockWatchPercentage = Math.random();
    const mockLoopCount = Math.floor(Math.random() * 3);
    const mockShareCount = Math.floor(Math.random() * 10);
    const mockSkipSignal = Math.random() < 0.3 ? 1 : 0; // 30% skip rate

    // Apply TikTok-inspired scoring formula with adaptive weights
    const score = 
      (weights.watchPercentageWeight * mockWatchPercentage) +
      (weights.loopCountWeight * Math.min(mockLoopCount / 3, 1)) +
      (weights.shareCountWeight * Math.min(mockShareCount / 10, 1)) -
      (weights.skipSignalWeight * mockSkipSignal) +
      weights.adaptiveBonus;

    return Math.max(0, Math.min(1, score));
  }

  // Track clip consumption
  async trackClipConsumption(
    userId: string,
    clipId: string,
    watchPercentage: number,
    loopCount: number,
    dwellTime: number,
    skipSignal: boolean,
    engagementActions: UserAction[] = []
  ): Promise<void> {
    try {
      const activeBatch = this.activeBatches.get(userId);
      if (!activeBatch) {
        console.warn('No active batch found for user:', userId);
        return;
      }

      const consumptionTracker = this.batchConsumptionTrackers.get(activeBatch.batchId);
      if (!consumptionTracker) {
        console.warn('No consumption tracker found for batch:', activeBatch.batchId);
        return;
      }

      const clipStatus = consumptionTracker.clipConsumptionStatus[clipId];
      if (!clipStatus) {
        console.warn('Clip not found in batch:', clipId);
        return;
      }

      // Update clip consumption status
      clipStatus.viewEndTime = Date.now();
      clipStatus.watchPercentage = watchPercentage;
      clipStatus.loopCount = loopCount;
      clipStatus.dwellTime = dwellTime;
      clipStatus.skipSignal = skipSignal;
      clipStatus.engagementActions = engagementActions;
      clipStatus.consumptionComplete = true;
      clipStatus.satisfactionScore = this.calculateSatisfactionScore(watchPercentage, loopCount, skipSignal, engagementActions);

      // Update batch progress
      const completedClips = Object.values(consumptionTracker.clipConsumptionStatus)
        .filter(status => status.consumptionComplete).length;
      
      consumptionTracker.batchProgress = completedClips / consumptionTracker.totalClipsInBatch;
      consumptionTracker.currentClipIndex = completedClips;

      // Calculate consumption velocity
      const elapsedTime = Date.now() - consumptionTracker.batchStartTime;
      consumptionTracker.consumptionVelocity = completedClips / (elapsedTime / 60000); // clips per minute

      // Log the interaction for ML training
      if (this.config.enableMLLogging) {
        await this.logClipConsumption(userId, clipId, activeBatch, clipStatus);
      }

      // Check if batch is completed
      if (completedClips >= consumptionTracker.totalClipsInBatch) {
        await this.completeBatch(userId, activeBatch.batchId);
      }

      console.log(`Tracked consumption for clip ${clipId} in batch ${activeBatch.batchId}`);
    } catch (error) {
      console.error('Failed to track clip consumption:', error);
    }
  }

  // Log clip consumption for ML training
  private async logClipConsumption(
    userId: string,
    clipId: string,
    batch: ClipsBatch,
    clipStatus: ClipConsumptionStatus
  ): Promise<void> {
    try {
      const userFeatures = this.userFeatures.get(userId);
      if (!userFeatures) return;

      const featureVector = this.createFeatureVector(userFeatures);
      featureVector.customFeatures = {
        ...featureVector.customFeatures,
        batchIteration: batch.feedbackLoopIteration,
        batchPosition: clipStatus.batchPosition,
        batchProgress: clipStatus.batchPosition / batch.batchSize
      };

      const prediction = this.createModelPrediction(
        clipId,
        0.8, // Mock predicted score
        featureVector,
        batch.rankingModelVersion
      );

      const userInteractionData: UserInteractionData = {
        interactionType: clipStatus.skipSignal ? 'SKIP' : 
                        clipStatus.watchPercentage >= 0.9 ? 'FULL_SCREEN' : 'CLICK',
        dwellTimeMs: clipStatus.dwellTime,
        videoWatchPercentage: clipStatus.watchPercentage,
        videoLoopCount: clipStatus.loopCount,
        engagementDepth: this.calculateEngagementDepth(clipStatus),
        attentionScore: this.calculateAttentionScore(clipStatus),
        secondaryInteractions: clipStatus.engagementActions.map(action => ({
          type: action as InteractionType,
          timestamp: new Date().toISOString()
        }))
      };

      await this.logUserInteraction(
        clipId,
        'video',
        userInteractionData.interactionType,
        prediction,
        userInteractionData,
        {
          itemPosition: clipStatus.batchPosition,
          feedType: 'clips_feed',
          screenName: 'clips'
        }
      );
    } catch (error) {
      console.error('Failed to log clip consumption:', error);
    }
  }

  // Calculate satisfaction score for a clip
  private calculateSatisfactionScore(
    watchPercentage: number,
    loopCount: number,
    skipSignal: boolean,
    engagementActions: UserAction[]
  ): number {
    if (skipSignal) return 0.1; // Very low satisfaction for skipped content

    let score = watchPercentage * 0.6; // Base score from watch percentage
    score += Math.min(loopCount * 0.2, 0.3); // Bonus for loops
    score += engagementActions.length * 0.1; // Bonus for engagement actions

    return Math.min(score, 1.0);
  }

  // Calculate engagement depth for logging
  private calculateEngagementDepth(clipStatus: ClipConsumptionStatus): number {
    let depth = clipStatus.watchPercentage * 0.7;
    depth += Math.min(clipStatus.loopCount * 0.1, 0.2);
    depth += clipStatus.engagementActions.length * 0.1;
    return Math.min(depth, 1.0);
  }

  // Calculate attention score for logging
  private calculateAttentionScore(clipStatus: ClipConsumptionStatus): number {
    if (clipStatus.skipSignal) return 0.1;
    
    let attention = clipStatus.watchPercentage * 0.8;
    if (clipStatus.loopCount > 0) attention += 0.2;
    
    return Math.min(attention, 1.0);
  }

  // Complete batch and trigger feedback loop
  async completeBatch(userId: string, batchId: string): Promise<void> {
    try {
      const consumptionTracker = this.batchConsumptionTrackers.get(batchId);
      const activeBatch = this.activeBatches.get(userId);
      
      if (!consumptionTracker || !activeBatch) {
        console.error('Batch or tracker not found for completion');
        return;
      }

      // Mark batch as completed
      consumptionTracker.isCompleted = true;

      // Calculate batch metrics
      const batchMetrics = this.calculateBatchMetrics(consumptionTracker);
      activeBatch.batchMetrics = batchMetrics;
      activeBatch.consumedTimestamp = Date.now();

      // Update feedback loop state
      const feedbackLoopState = this.feedbackLoopStates.get(userId);
      if (feedbackLoopState) {
        feedbackLoopState.previousBatches.push(activeBatch);
        feedbackLoopState.activeBatch = undefined;
      }

      // Process feedback and adapt
      await this.processBatchFeedback(userId, activeBatch, batchMetrics);

      // Generate next batch
      await this.generateNextBatch(userId);

      // Clean up
      this.activeBatches.delete(userId);
      this.batchConsumptionTrackers.delete(batchId);

      console.log(`Completed batch ${batchId} for user ${userId}`);
    } catch (error) {
      console.error('Failed to complete batch:', error);
    }
  }

  // Calculate batch metrics from consumption data
  private calculateBatchMetrics(consumptionTracker: BatchConsumptionTracker): BatchMetrics {
    const clipStatuses = Object.values(consumptionTracker.clipConsumptionStatus);
    const completedClips = clipStatuses.filter(status => status.consumptionComplete);

    if (completedClips.length === 0) {
      return {
        averageWatchPercentage: 0,
        averageLoopCount: 0,
        skipRate: 0,
        engagementRate: 0,
        completionRate: 0,
        averageDwellTime: 0,
        batchConsumptionTime: Date.now() - consumptionTracker.batchStartTime,
        userSatisfactionScore: 0
      };
    }

    const averageWatchPercentage = completedClips.reduce((sum, clip) => sum + clip.watchPercentage, 0) / completedClips.length;
    const averageLoopCount = completedClips.reduce((sum, clip) => sum + clip.loopCount, 0) / completedClips.length;
    const skipRate = completedClips.filter(clip => clip.skipSignal).length / completedClips.length;
    const engagementRate = completedClips.filter(clip => clip.engagementActions.length > 0).length / completedClips.length;
    const completionRate = completedClips.filter(clip => clip.watchPercentage >= 0.9).length / completedClips.length;
    const averageDwellTime = completedClips.reduce((sum, clip) => sum + clip.dwellTime, 0) / completedClips.length;
    const userSatisfactionScore = completedClips.reduce((sum, clip) => sum + clip.satisfactionScore, 0) / completedClips.length;

    return {
      averageWatchPercentage,
      averageLoopCount,
      skipRate,
      engagementRate,
      completionRate,
      averageDwellTime,
      batchConsumptionTime: Date.now() - consumptionTracker.batchStartTime,
      userSatisfactionScore
    };
  }

  // Process batch feedback and adapt system
  private async processBatchFeedback(
    userId: string, 
    batch: ClipsBatch, 
    batchMetrics: BatchMetrics
  ): Promise<void> {
    try {
      const feedbackLoopState = this.feedbackLoopStates.get(userId);
      if (!feedbackLoopState) return;

      // Calculate improvement from previous batch
      const previousBatch = feedbackLoopState.previousBatches[feedbackLoopState.previousBatches.length - 2];
      let improvement = 0;

      if (previousBatch) {
        const currentSatisfaction = batchMetrics.userSatisfactionScore;
        const previousSatisfaction = previousBatch.batchMetrics.userSatisfactionScore;
        improvement = currentSatisfaction - previousSatisfaction;
      }

      // Check if adaptation is needed
      if (Math.abs(improvement) >= this.config.microBatchConfig.adaptationThreshold) {
        await this.adaptRankingWeights(userId, batchMetrics);
        
        // Record adaptation event
        const adaptationEvent: AdaptationEvent = {
          timestamp: Date.now(),
          iteration: batch.feedbackLoopIteration,
          batchId: batch.batchId,
          adaptationType: improvement > 0 ? 'weight_adjustment' : 'exploration_increase',
          previousMetrics: previousBatch?.batchMetrics || batchMetrics,
          newMetrics: batchMetrics,
          improvement,
          adaptationReason: improvement > 0 ? 'Positive feedback detected' : 'Negative feedback detected'
        };

        feedbackLoopState.adaptationHistory.push(adaptationEvent);
        feedbackLoopState.lastAdaptationTime = Date.now();
      }

      // Update convergence score
      feedbackLoopState.convergenceScore = batchMetrics.userSatisfactionScore;

      // Adjust exploration rate based on satisfaction
      if (batchMetrics.userSatisfactionScore < 0.6) {
        feedbackLoopState.explorationRate = Math.min(0.4, feedbackLoopState.explorationRate + 0.05);
      } else if (batchMetrics.userSatisfactionScore > 0.8) {
        feedbackLoopState.explorationRate = Math.max(0.1, feedbackLoopState.explorationRate - 0.02);
      }

      console.log(`Processed feedback for batch ${batch.batchId}, satisfaction: ${batchMetrics.userSatisfactionScore.toFixed(2)}`);
    } catch (error) {
      console.error('Failed to process batch feedback:', error);
    }
  }

  // Adapt ranking weights based on batch performance
  async adaptRankingWeights(userId: string, batchMetrics: BatchMetrics): Promise<TikTokScoringWeights> {
    try {
      const currentWeights = this.adaptiveWeights.get(userId) || {
        watchPercentageWeight: this.config.clipsWatchPercentageWeight,
        loopCountWeight: this.config.clipsLoopCountWeight,
        shareCountWeight: this.config.clipsShareCountWeight,
        skipSignalWeight: this.config.clipsSkipSignalWeight,
        adaptiveBonus: 0
      };

      const feedbackLoopState = this.feedbackLoopStates.get(userId);
      const learningRate = feedbackLoopState?.adaptiveLearningRate || 0.1;

      // Adapt weights based on batch performance
      const newWeights = { ...currentWeights };

      // Increase watch percentage weight if completion rate is high
      if (batchMetrics.completionRate > 0.7) {
        newWeights.watchPercentageWeight += learningRate * 0.1;
      } else if (batchMetrics.completionRate < 0.3) {
        newWeights.watchPercentageWeight -= learningRate * 0.05;
      }

      // Increase loop count weight if average loop count is high
      if (batchMetrics.averageLoopCount > 1) {
        newWeights.loopCountWeight += learningRate * 0.1;
      }

      // Increase skip signal weight if skip rate is high
      if (batchMetrics.skipRate > 0.4) {
        newWeights.skipSignalWeight += learningRate * 0.1;
      }

      // Add adaptive bonus based on satisfaction
      newWeights.adaptiveBonus = batchMetrics.userSatisfactionScore * 0.1;

      // Normalize weights to ensure they stay within reasonable bounds
      const totalWeight = newWeights.watchPercentageWeight + newWeights.loopCountWeight + newWeights.shareCountWeight;
      if (totalWeight > 1.2) {
        const normalizationFactor = 1.0 / totalWeight;
        newWeights.watchPercentageWeight *= normalizationFactor;
        newWeights.loopCountWeight *= normalizationFactor;
        newWeights.shareCountWeight *= normalizationFactor;
      }

      // Store updated weights
      this.adaptiveWeights.set(userId, newWeights);

      console.log(`Adapted ranking weights for user ${userId}:`, newWeights);
      return newWeights;
    } catch (error) {
      console.error('Failed to adapt ranking weights:', error);
      return this.adaptiveWeights.get(userId) || {
        watchPercentageWeight: this.config.clipsWatchPercentageWeight,
        loopCountWeight: this.config.clipsLoopCountWeight,
        shareCountWeight: this.config.clipsShareCountWeight,
        skipSignalWeight: this.config.clipsSkipSignalWeight,
        adaptiveBonus: 0
      };
    }
  }

  // Get current batch for user
  getCurrentBatch(userId: string): ClipsBatch | null {
    return this.activeBatches.get(userId) || null;
  }

  // Get batch consumption status
  getBatchConsumptionStatus(batchId: string): BatchConsumptionTracker | null {
    return this.batchConsumptionTrackers.get(batchId) || null;
  }

  // Get feedback loop state
  getFeedbackLoopState(userId: string): FeedbackLoopState | null {
    return this.feedbackLoopStates.get(userId) || null;
  }

  // Utility function to shuffle array
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ===== HELPER METHODS FOR ML LOGGING =====

  private mapContentTypeToItemType(contentType: ContentType): 'POST' | 'CLIP' | 'PROFILE_SUGGESTION' | 'FRIEND_SUGGESTION' | 'AD' | 'STORY' {
    switch (contentType) {
      case 'text':
      case 'image':
      case 'shared':
        return 'POST';
      case 'video':
        return 'CLIP';
      case 'sponsored':
        return 'AD';
      case 'suggestion':
        return 'FRIEND_SUGGESTION';
      case 'family':
        return 'PROFILE_SUGGESTION';
      default:
        return 'POST';
    }
  }

  private async getPseudonymizedUserId(): Promise<string> {
    // In a real implementation, this would create a privacy-safe hash of the user ID
    return 'user_' + this.generateEventId().substring(0, 16);
  }

  private generateEventId(): string {
    return 'event_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private calculateTimeOfDayRelevance(): number {
    const hour = new Date().getHours();
    // Peak hours: 7-9 AM, 12-2 PM, 6-10 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 22)) {
      return 0.9;
    } else if (hour >= 22 || hour <= 6) {
      return 0.3; // Late night/early morning
    } else {
      return 0.6; // Regular hours
    }
  }

  private calculateDayOfWeekRelevance(): number {
    const day = new Date().getDay();
    // Weekend: higher engagement
    if (day === 0 || day === 6) {
      return 0.8;
    } else {
      return 0.6;
    }
  }

  private calculateInterestAlignment(interests: InterestVector): number {
    // Mock calculation - in real implementation, this would compare with content interests
    const totalInterest = Object.values(interests).reduce((sum, value) => sum + value, 0);
    const avgInterest = totalInterest / Object.keys(interests).length;
    return Math.min(avgInterest, 1.0);
  }

  private getSessionStartTime(): number {
    // Mock implementation - would track actual session start
    return Date.now() - (30 * 60 * 1000); // 30 minutes ago
  }

  // ===== EXISTING METHODS (Updated for ML Logging) =====

  // TikTok-Inspired Scoring Function Implementation
  // RankScore = (w1 * WatchPercentage) + (w2 * LoopCount) + (w3 * ShareCount) - (w4 * SkipSignal)
  private calculateTikTokInspiredScore(
    clipId: string,
    userId: string,
    watchPercentage: number,
    loopCount: number,
    shareCount: number,
    dwellTime: number
  ): TikTokScoringMetrics {
    // Get adaptive weights if available, otherwise use default
    const weights = this.adaptiveWeights.get(userId) || {
      watchPercentageWeight: this.config.clipsWatchPercentageWeight,
      loopCountWeight: this.config.clipsLoopCountWeight,
      shareCountWeight: this.config.clipsShareCountWeight,
      skipSignalWeight: this.config.clipsSkipSignalWeight,
      adaptiveBonus: 0
    };

    // Calculate SkipSignal (1 if DwellTime < 2 seconds, 0 otherwise)
    const skipSignal = dwellTime < this.config.clipsSkipThreshold ? 1 : 0;

    // Normalize inputs for scoring
    const normalizedWatchPercentage = Math.min(Math.max(watchPercentage, 0), 1);
    const normalizedLoopCount = Math.min(loopCount / 5, 1); // Normalize to max 5 loops
    const normalizedShareCount = Math.min(shareCount / 100, 1); // Normalize to max 100 shares

    // Apply TikTok-inspired scoring formula with adaptive weights
    const rawScore = 
      (weights.watchPercentageWeight * normalizedWatchPercentage) +
      (weights.loopCountWeight * normalizedLoopCount) +
      (weights.shareCountWeight * normalizedShareCount) -
      (weights.skipSignalWeight * skipSignal) +
      weights.adaptiveBonus;

    // Ensure score is between 0 and 1
    const finalScore = Math.max(0, Math.min(rawScore, 1));

    const scoringMetrics: TikTokScoringMetrics = {
      clipId,
      userId,
      watchPercentage: normalizedWatchPercentage,
      loopCount,
      shareCount,
      skipSignal,
      dwellTime,
      rawScore,
      finalScore,
      scoringTimestamp: Date.now()
    };

    // Cache the scoring metrics
    const cacheKey = `${clipId}_${userId}`;
    this.tikTokScoringCache.set(cacheKey, scoringMetrics);

    return scoringMetrics;
  }

  // Enhanced clip scoring with TikTok-inspired algorithm
  private async scoreClipWithTikTokAlgorithm(
    clipId: string,
    userId: string,
    userFeatures: UserFeatureVector
  ): Promise<number> {
    try {
      // Get clip engagement data
      const clipEngagement = this.socialGraphData.clipEngagements.get(clipId);
      const userClipInteractions = this.socialGraphData.userClipInteractions.get(userId);
      const userInteraction = userClipInteractions?.get(clipId);

      // Extract metrics for scoring
      let watchPercentage = 0;
      let loopCount = 0;
      let shareCount = 0;
      let dwellTime = 0;

      if (userInteraction) {
        watchPercentage = userInteraction.watchPercentage;
        loopCount = userInteraction.loopCount;
        dwellTime = userInteraction.dwellTime;
      }

      if (clipEngagement) {
        shareCount = clipEngagement.shares.size;
        
        // Get user-specific data from engagement
        if (clipEngagement.watchPercentages.has(userId)) {
          watchPercentage = clipEngagement.watchPercentages.get(userId)!;
        }
        
        if (clipEngagement.loops.has(userId)) {
          loopCount = clipEngagement.loops.get(userId)!;
        }
        
        if (clipEngagement.dwellTimes.has(userId)) {
          dwellTime = clipEngagement.dwellTimes.get(userId)!;
        }
      }

      // Apply TikTok-inspired scoring with adaptive weights
      const scoringMetrics = this.calculateTikTokInspiredScore(
        clipId,
        userId,
        watchPercentage,
        loopCount,
        shareCount,
        dwellTime
      );

      return scoringMetrics.finalScore;

    } catch (error) {
      console.error('Failed to score clip with TikTok algorithm:', error);
      return 0.5; // Default score
    }
  }

  // Update clip engagement with TikTok-inspired metrics
  async updateClipEngagementMetrics(
    clipId: string,
    userId: string,
    watchPercentage: number,
    loopCount: number,
    dwellTime: number,
    skipSignal: boolean
  ): Promise<void> {
    try {
      let clipEngagement = this.socialGraphData.clipEngagements.get(clipId);
      
      if (!clipEngagement) {
        // Create new engagement record
        clipEngagement = {
          clipId,
          authorId: 'unknown',
          likes: new Set(),
          comments: new Set(),
          shares: new Set(),
          views: new Set(),
          completions: new Set(),
          loops: new Map(),
          timestamp: Date.now(),
          watchTime: new Map(),
          engagementVelocity: 0,
          viralityScore: 0,
          trendingScore: 0,
          watchPercentages: new Map(),
          skipSignals: new Map(),
          dwellTimes: new Map()
        };
        
        this.socialGraphData.clipEngagements.set(clipId, clipEngagement);
      }

      // Update TikTok-inspired metrics
      clipEngagement.watchPercentages.set(userId, watchPercentage);
      clipEngagement.loops.set(userId, loopCount);
      clipEngagement.dwellTimes.set(userId, dwellTime);
      clipEngagement.skipSignals.set(userId, skipSignal);
      
      // Add to views
      clipEngagement.views.add(userId);
      
      // Add to completions if watch percentage > 90%
      if (watchPercentage > 0.9) {
        clipEngagement.completions.add(userId);
      }

      // Update user clip interactions
      let userInteractions = this.socialGraphData.userClipInteractions.get(userId);
      if (!userInteractions) {
        userInteractions = new Map();
        this.socialGraphData.userClipInteractions.set(userId, userInteractions);
      }

      const interaction: UserClipInteraction = {
        userId,
        clipId,
        interactionType: skipSignal ? 'skip' : (watchPercentage > 0.9 ? 'completion' : 'view'),
        timestamp: Date.now(),
        engagementScore: this.calculateEngagementScore(watchPercentage, loopCount, skipSignal),
        watchPercentage,
        loopCount,
        dwellTime,
        skipSignal
      };

      userInteractions.set(clipId, interaction);

      // Track consumption in active batch if applicable
      await this.trackClipConsumption(userId, clipId, watchPercentage, loopCount, dwellTime, skipSignal);

      console.log(`Updated clip engagement metrics for ${clipId}: watchPercentage=${watchPercentage}, loopCount=${loopCount}, skipSignal=${skipSignal}`);

    } catch (error) {
      console.error('Failed to update clip engagement metrics:', error);
    }
  }

  // Calculate engagement score based on TikTok-inspired metrics
  private calculateEngagementScore(
    watchPercentage: number,
    loopCount: number,
    skipSignal: boolean
  ): number {
    if (skipSignal) {
      return 0.1; // Very low engagement for skipped content
    }

    let score = watchPercentage * 0.6; // Base score from watch percentage
    score += Math.min(loopCount * 0.2, 0.4); // Bonus for loops (max 0.4)
    
    return Math.min(score, 1.0);
  }

  // Generate TikTok-inspired clips recommendations with enhanced scoring
  async generateClipsRecommendations(
    userId: string, 
    count: number = 20
  ): Promise<RecommendationResult[]> {
    try {
      const startTime = Date.now();

      // Check user consent
      if (!await this.hasValidConsent(userId, 'personalization')) {
        return this.generateFallbackRecommendations('video', count);
      }

      // Initialize feedback loop if not already done
      if (!this.feedbackLoopStates.has(userId) && this.config.enableMicroBatchFeedbackLoop) {
        await this.initializeFeedbackLoop(userId);
      }

      // If micro-batch feedback loop is enabled, return current batch
      if (this.config.enableMicroBatchFeedbackLoop) {
        const currentBatch = this.getCurrentBatch(userId);
        if (currentBatch) {
          return this.convertBatchToRecommendations(currentBatch);
        }
      }

      // Fallback to regular recommendation generation
      const userFeatures = await this.getUserFeaturesWithSignals(userId);
      if (!userFeatures) {
        return this.generateFallbackRecommendations('video', count);
      }

      // Stage 1: TikTok-Inspired Clips Candidate Generation
      const candidates = await this.generateClipsCandidates(userFeatures);
      
      // Stage 2: TikTok-Inspired Scoring with Implicit Signals
      const scoredResults = await this.scoreClipsCandidatesWithTikTokAlgorithm(candidates, userFeatures, userId);
      
      // Stage 3: Diversification with exploration
      const diversifiedResults = await this.diversifyClipsResults(scoredResults, userFeatures, userId);
      
      // Stage 4: Privacy Filtering
      const filteredResults = await this.applyPrivacyFiltering(diversifiedResults, userId);
      
      // Limit results
      const finalResults = filteredResults.slice(0, count);

      // Log enhanced analytics
      await this.logClipsRankingAnalytics(userId, finalResults, candidates.length, Date.now() - startTime);

      // Log privacy audit
      await this.logPrivacyAudit(userId, 'recommendation_generation', ['user_features', 'recommendations', 'signals', 'clips'], 'personalization');

      return finalResults;
    } catch (error) {
      console.error('Failed to generate clips recommendations:', error);
      return this.generateFallbackRecommendations('video', count);
    }
  }

  // Convert batch to recommendation results
  private convertBatchToRecommendations(batch: ClipsBatch): RecommendationResult[] {
    return batch.clipIds.map((clipId, index) => ({
      contentId: clipId,
      contentType: 'video' as ContentType,
      score: 0.8 + (Math.random() * 0.2), // Mock score
      confidence: 0.9,
      reasons: [{
        type: 'adaptive_learning',
        description: 'محتوى مخصص بناءً على التعلم التكيفي',
        confidence: 0.9,
        weight: 1.0,
        signalBased: true
      }],
      diversityScore: Math.random() * 0.5 + 0.5,
      privacyCompliant: true,
      metadata: {
        generationTime: batch.generationTimestamp,
        modelVersion: batch.rankingModelVersion,
        cacheable: false, // Micro-batches are not cacheable
        ttl: 300, // 5 minutes TTL
        signalFreshness: 1.0, // Very fresh signals
        personalizationLevel: 0.9,
        candidatePoolSize: batch.candidatePoolSize,
        featureComputationTime: 0,
        rankingComputationTime: 0,
        socialGraphDepth: 0,
        feedbackLoopEnabled: true,
        adaptiveRanking: true,
        batchGenerationTime: batch.generationTimestamp,
        previousBatchInfluence: batch.previousBatchSignals?.length || 0
      },
      signalContribution: [],
      rankingFactors: [],
      socialContext: undefined,
      batchId: batch.batchId,
      batchPosition: index,
      adaptiveScore: 0.8 + (Math.random() * 0.2),
      feedbackLoopIteration: batch.feedbackLoopIteration
    }));
  }

  // ===== INTERFACE IMPLEMENTATIONS =====

  // RealTimeSignalProcessor interface methods
  async processSignal(signal: UserSignal): Promise<void> {
    try {
      // Add to signal queue
      this.signalQueue.push(signal);
      
      // If this is a feedback loop signal, prioritize it
      if (signal.batchId && this.config.signalBatchConfig.feedbackLoopPriority) {
        await this.processFeedbackLoopSignal(signal);
      }
      
      // Update processing stats
      this.processingStats.queueSize = this.signalQueue.length;
    } catch (error) {
      console.error('Failed to process signal:', error);
    }
  }

  // Process feedback loop signal immediately
  private async processFeedbackLoopSignal(signal: UserSignal): Promise<void> {
    try {
      if (!signal.batchId) return;

      const feedbackLoopState = this.feedbackLoopStates.get(signal.userId);
      if (!feedbackLoopState) return;

      // Add signal to pending signals for this feedback loop
      feedbackLoopState.pendingSignals.push(signal);

      // If we have enough signals or batch is complete, process immediately
      const activeBatch = this.activeBatches.get(signal.userId);
      if (activeBatch && signal.batchId === activeBatch.batchId) {
        // Check if this signal indicates batch completion
        if (signal.action === 'batch_complete') {
          await this.completeBatch(signal.userId, signal.batchId);
        }
      }
    } catch (error) {
      console.error('Failed to process feedback loop signal:', error);
    }
  }

  async processBatch(batch: SignalBatch): Promise<SignalProcessingResult> {
    try {
      const startTime = Date.now();
      let processedSignals = 0;
      let failedSignals = 0;
      const errors: string[] = [];
      const featureUpdates: FeatureUpdate[] = [];
      const adaptiveUpdates: AdaptiveUpdate[] = [];

      // Process each signal in the batch
      for (const signal of batch.signals) {
        try {
          await this.processSignal(signal);
          processedSignals++;
        } catch (error) {
          failedSignals++;
          errors.push(`Failed to process signal ${signal.id}: ${error}`);
        }
      }

      // If this is a feedback loop batch, process adaptively
      let nextBatchRecommendations: string[] = [];
      let feedbackLoopMetrics: FeedbackLoopMetrics = {
        adaptationSpeed: 0,
        learningEfficiency: 0,
        userSatisfactionTrend: 0,
        convergenceProgress: 0,
        explorationBalance: 0
      };

      if (batch.feedbackLoopBatchId && batch.realTimeProcessing) {
        const result = await this.processFeedbackLoopBatchInternal(batch);
        if (result) {
          nextBatchRecommendations = result.clipIds;
          feedbackLoopMetrics = this.calculateFeedbackLoopMetrics(batch.userId);
        }
      }

      const processingTime = Date.now() - startTime;

      // Update processing stats
      this.processingStats.processingRate = processedSignals / (processingTime / 1000);
      this.processingStats.averageLatency = processingTime;
      this.processingStats.errorRate = failedSignals / batch.signals.length;
      this.processingStats.lastProcessedTimestamp = Date.now();

      return {
        batchId: batch.batchId,
        processedSignals,
        failedSignals,
        processingTime,
        errors,
        featureUpdates,
        adaptiveUpdates,
        nextBatchRecommendations,
        feedbackLoopMetrics
      };
    } catch (error) {
      console.error('Failed to process batch:', error);
      return {
        batchId: batch.batchId,
        processedSignals: 0,
        failedSignals: batch.signals.length,
        processingTime: 0,
        errors: [`Batch processing failed: ${error}`],
        featureUpdates: [],
        adaptiveUpdates: [],
        nextBatchRecommendations: [],
        feedbackLoopMetrics: {
          adaptationSpeed: 0,
          learningEfficiency: 0,
          userSatisfactionTrend: 0,
          convergenceProgress: 0,
          explorationBalance: 0
        }
      };
    }
  }

  // Process feedback loop batch (internal method to avoid interface conflict)
  private async processFeedbackLoopBatchInternal(batch: SignalBatch): Promise<ClipsBatch | null> {
    try {
      if (!batch.feedbackLoopBatchId || !batch.userId) return null;

      const feedbackLoopState = this.feedbackLoopStates.get(batch.userId);
      if (!feedbackLoopState) return null;

      // Process signals and update user features
      await this.updateUserFeatures(batch.userId, batch.signals);

      // Generate next batch based on feedback
      return await this.generateNextBatch(batch.userId);
    } catch (error) {
      console.error('Failed to process feedback loop batch:', error);
      return null;
    }
  }

  // Fixed method signature to match interface
  async processFeedbackLoopBatch(batch: ClipsBatch, signals: UserSignal[]): Promise<ClipsBatch> {
    try {
      // Process signals and update user features
      await this.updateUserFeatures(batch.userId, signals);

      // Generate next batch based on feedback
      const nextBatch = await this.generateNextBatch(batch.userId);
      
      // Return the next batch or the current batch if generation failed
      return nextBatch || batch;
    } catch (error) {
      console.error('Failed to process feedback loop batch:', error);
      return batch;
    }
  }

  // Calculate feedback loop metrics
  private calculateFeedbackLoopMetrics(userId: string): FeedbackLoopMetrics {
    const feedbackLoopState = this.feedbackLoopStates.get(userId);
    if (!feedbackLoopState) {
      return {
        adaptationSpeed: 0,
        learningEfficiency: 0,
        userSatisfactionTrend: 0,
        convergenceProgress: 0,
        explorationBalance: 0
      };
    }

    const recentBatches = feedbackLoopState.previousBatches.slice(-5); // Last 5 batches
    
    // Calculate adaptation speed (adaptations per batch)
    const adaptationSpeed = feedbackLoopState.adaptationHistory.length / Math.max(feedbackLoopState.totalIterations, 1);
    
    // Calculate learning efficiency (improvement per adaptation)
    const learningEfficiency = feedbackLoopState.adaptationHistory.length > 0
      ? feedbackLoopState.adaptationHistory.reduce((sum, event) => sum + Math.abs(event.improvement), 0) / feedbackLoopState.adaptationHistory.length
      : 0;
    
    // Calculate satisfaction trend
    const satisfactionScores = recentBatches.map(batch => batch.batchMetrics.userSatisfactionScore);
    const userSatisfactionTrend = satisfactionScores.length > 1
      ? satisfactionScores[satisfactionScores.length - 1] - satisfactionScores[0]
      : 0;
    
    // Calculate convergence progress
    const convergenceProgress = feedbackLoopState.convergenceScore;
    
    // Calculate exploration balance
    const explorationBalance = feedbackLoopState.explorationRate;

    return {
      adaptationSpeed,
      learningEfficiency,
      userSatisfactionTrend,
      convergenceProgress,
      explorationBalance
    };
  }

  async updateUserFeatures(userId: string, signals: UserSignal[]): Promise<void> {
    // Implementation for updating user features based on signals
    // This would update the user's feature vector based on the collected signals
    console.log(`Updated user features for ${userId} with ${signals.length} signals`);
  }

  getProcessingStatus(): ProcessingStatus {
    return this.processingStats;
  }

  // ===== PLACEHOLDER IMPLEMENTATIONS =====

  private async generateClipsCandidates(userFeatures: UserFeatureVector): Promise<string[]> {
    // Mock implementation
    return ['clip_1', 'clip_2', 'clip_3', 'clip_4', 'clip_5'];
  }

  private async scoreClipsCandidatesWithTikTokAlgorithm(candidates: string[], userFeatures: UserFeatureVector, userId: string): Promise<RecommendationResult[]> {
    // Mock implementation
    return candidates.map(clipId => ({
      contentId: clipId,
      contentType: 'video' as ContentType,
      score: Math.random(),
      confidence: 0.8,
      reasons: [],
      diversityScore: 0.5,
      privacyCompliant: true,
      metadata: {
        generationTime: Date.now(),
        modelVersion: '3.0.0',
        cacheable: true,
        ttl: 300,
        signalFreshness: 0.9,
        personalizationLevel: 0.8,
        candidatePoolSize: candidates.length,
        featureComputationTime: 0,
        rankingComputationTime: 0,
        socialGraphDepth: 0,
        feedbackLoopEnabled: false,
        adaptiveRanking: false,
        batchGenerationTime: 0,
        previousBatchInfluence: 0
      },
      signalContribution: [],
      rankingFactors: [],
      socialContext: undefined
    }));
  }

  private async diversifyClipsResults(results: RecommendationResult[], userFeatures: UserFeatureVector, userId: string): Promise<RecommendationResult[]> {
    return results;
  }

  private async applyPrivacyFiltering(results: RecommendationResult[], userId: string): Promise<RecommendationResult[]> {
    return results;
  }

  private async logClipsRankingAnalytics(userId: string, results: RecommendationResult[], candidateCount: number, time: number): Promise<void> {
    console.log('Clips ranking analytics logged');
  }

  private async logPrivacyAudit(userId: string, action: string, dataTypes: string[], purpose: string): Promise<void> {
    console.log('Privacy audit logged');
  }

  private generateFallbackRecommendations(contentType: ContentType, count: number): RecommendationResult[] {
    return [];
  }

  private async getUserFeaturesWithSignals(userId: string): Promise<UserFeatureVector | null> {
    return null;
  }

  private async hasValidConsent(userId: string, consentType: string): Promise<boolean> {
    return true;
  }

  // Initialize the Facebook-inspired feed ranking pipeline
  private initializeFeedRankingPipeline(): FeedRankingPipeline {
    return {
      candidateGeneration: {
        strategies: [
          { name: 'social_graph_posts', weight: 0.4, enabled: true, config: { maxPosts: 200, degreeLimit: 2 } },
          { name: 'friend_engagement', weight: 0.3, enabled: true, config: { maxPosts: 150, engagementThreshold: 0.1 } },
          { name: 'interest_based', weight: 0.2, enabled: true, config: { maxPosts: 100, similarityThreshold: 0.3 } },
          { name: 'trending_content', weight: 0.1, enabled: true, config: { maxPosts: 50, trendingWindow: 24 * 60 * 60 * 1000 } }
        ],
        maxCandidates: this.config.candidatePoolSize,
        timeoutMs: 2000,
        socialGraphDepth: this.config.socialGraphDepth,
        temporalWindow: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      featureExtraction: {
        enabled: true,
        features: [
          { name: 'author_affinity', weight: 0.25, enabled: true, config: {}, computationCost: 'medium' },
          { name: 'engagement_score', weight: 0.25, enabled: true, config: { decayHalfLife: 24 * 60 * 60 * 1000 }, computationCost: 'low' },
          { name: 'content_match', weight: 0.2, enabled: true, config: { vectorDimensions: 128 }, computationCost: 'high' },
          { name: 'recency', weight: 0.15, enabled: true, config: { halfLife: 6 * 60 * 60 * 1000 }, computationCost: 'low' },
          { name: 'social_proof', weight: 0.1, enabled: true, config: { friendWeight: 0.8 }, computationCost: 'medium' },
          { name: 'diversity', weight: 0.05, enabled: true, config: { diversityWindow: 10 }, computationCost: 'low' }
        ],
        computationTimeout: 5000,
        cacheFeatures: this.config.featureCacheEnabled,
        featureCacheTTL: this.config.featureCacheTTL
      },
      scoring: {
        models: [
          { 
            name: 'facebook_inspired_ranker', 
            weight: 1.0, 
            enabled: true, 
            features: ['author_affinity', 'engagement_score', 'content_match', 'recency', 'social_proof'], 
            config: { modelType: 'logistic_regression', regularization: 0.01 },
            signalDependencies: ['explicit_engagement', 'implicit_behavior', 'social_interaction'],
            modelType: 'ensemble'
          }
        ],
        ensembleMethod: 'logistic_regression',
        timeoutMs: 3000,
        signalFeatures: [
          { signalType: 'explicit_engagement', weight: 0.4, decayRate: 0.1, aggregationWindow: 24 * 60 * 60 * 1000, enabled: true },
          { signalType: 'implicit_behavior', weight: 0.3, decayRate: 0.2, aggregationWindow: 12 * 60 * 60 * 1000, enabled: true },
          { signalType: 'social_interaction', weight: 0.2, decayRate: 0.15, aggregationWindow: 48 * 60 * 60 * 1000, enabled: true },
          { signalType: 'content_analysis', weight: 0.1, decayRate: 0.05, aggregationWindow: 7 * 24 * 60 * 60 * 1000, enabled: true }
        ],
        decayFunctions: [
          { name: 'exponential', halfLife: 24 * 60 * 60 * 1000, minValue: 0.01, maxAge: 7 * 24 * 60 * 60 * 1000 },
          { name: 'linear', halfLife: 12 * 60 * 60 * 1000, minValue: 0.1, maxAge: 3 * 24 * 60 * 60 * 1000 }
        ]
      },
      diversification: {
        enabled: true,
        diversityWeight: 0.2,
        maxSimilarContent: 2,
        temporalDiversity: true,
        topicalDiversity: true,
        authorDiversity: true,
        signalBasedDiversity: true
      },
      privacyFiltering: {
        enabled: true,
        respectUserPrivacy: true,
        filterBlockedUsers: true,
        filterReportedContent: true,
        ageAppropriate: true,
        signalPrivacyCompliance: true
      },
      signalIntegration: {
        enabled: true,
        realTimeWeight: 0.7,
        signalDecayRate: 0.1,
        signalAggregationMethod: 'exponential_decay',
        minimumSignalCount: 5
      }
    };
  }

  // Initialize A/B tests
  private initializeABTests(): void {
    const feedRankingTest: ABTestConfig = {
      testId: 'facebook_feed_ranking_v1',
      testName: 'Facebook-Inspired Feed Ranking',
      enabled: true,
      trafficAllocation: 0.2, // 20% of users
      variants: [
        { variantId: 'control', variantName: 'Standard Ranking', allocation: 0.5, config: { algorithm: 'standard' } },
        { variantId: 'facebook_inspired', variantName: 'Facebook-Inspired Ranking', allocation: 0.5, config: { algorithm: 'facebook_inspired' } }
      ],
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      metrics: ['ctr', 'engagement_rate', 'session_duration', 'user_satisfaction'],
      signalTracking: true
    };

    // TikTok-inspired clips ranking A/B test
    const clipsRankingTest: ABTestConfig = {
      testId: 'tiktok_clips_ranking_v1',
      testName: 'TikTok-Inspired Clips Ranking',
      enabled: true,
      trafficAllocation: 0.3, // 30% of users
      variants: [
        { variantId: 'control', variantName: 'Standard Clips', allocation: 0.5, config: { algorithm: 'standard' } },
        { variantId: 'tiktok_inspired', variantName: 'TikTok-Inspired Ranking', allocation: 0.5, config: { algorithm: 'tiktok_inspired' } }
      ],
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      metrics: ['watch_time', 'completion_rate', 'loop_rate', 'engagement_rate'],
      signalTracking: true
    };

    // Micro-batch feedback loop A/B test
    const microBatchTest: ABTestConfig = {
      testId: 'micro_batch_feedback_loop_v1',
      testName: 'Micro-Batch Feedback Loop',
      enabled: true,
      trafficAllocation: 0.4, // 40% of users
      variants: [
        { variantId: 'control', variantName: 'Standard Batching', allocation: 0.5, config: { feedbackLoop: false } },
        { variantId: 'micro_batch', variantName: 'Micro-Batch Feedback Loop', allocation: 0.5, config: { feedbackLoop: true } }
      ],
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      metrics: ['user_satisfaction', 'session_length', 'adaptation_speed', 'convergence_rate'],
      signalTracking: true
    };

    this.abTests.set(feedRankingTest.testId, feedRankingTest);
    this.abTests.set(clipsRankingTest.testId, clipsRankingTest);
    this.abTests.set(microBatchTest.testId, microBatchTest);
  }

  // Start batch processor
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(async () => {
      if (this.signalQueue.length > 0) {
        await this.processPendingSignals();
      }
    }, this.config.signalBatchConfig.maxBatchAge);
  }

  private async processPendingSignals(): Promise<void> {
    // Implementation for processing pending signals
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Public API methods
  async initialize(userId: string): Promise<void> {
    this.isInitialized = true;
    
    // Initialize micro-batch feedback loop if enabled
    if (this.config.enableMicroBatchFeedbackLoop) {
      await this.initializeFeedbackLoop(userId);
    }
  }

  async collectSignal(
    userId: string,
    contentId: string,
    contentType: ContentType,
    action: UserAction,
    context: Partial<SignalContext>,
    explicitData?: ExplicitSignalData,
    implicitData?: ImplicitSignalData
  ): Promise<void> {
    // Implementation for collecting signals
  }

  async grantConsent(userId: string, consentType: string, granularPermissions: Record<string, boolean>): Promise<void> {
    // Implementation for granting consent
  }

  async withdrawConsent(userId: string, consentType: string): Promise<void> {
    // Implementation for withdrawing consent
  }

  async deleteUserData(userId: string): Promise<void> {
    // Implementation for deleting user data
    // Also clean up micro-batch data
    this.activeBatches.delete(userId);
    this.feedbackLoopStates.delete(userId);
    this.candidatePool.delete(userId);
    this.adaptiveWeights.delete(userId);
    this.batchHistory.delete(userId);
  }

  getStatus(): any {
    return {
      initialized: this.isInitialized,
      sessionId: this.sessionId,
      config: this.config,
      tikTokScoringCacheSize: this.tikTokScoringCache.size,
      activeBatches: this.activeBatches.size,
      feedbackLoopStates: this.feedbackLoopStates.size,
      processingStats: this.processingStats,
      mlLoggingEnabled: this.config.enableMLLogging,
      mlLoggingMetrics: this.mlLoggingService.getMetrics()
    };
  }
}

export default RecommendationEngine;