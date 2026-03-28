import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import SecureStorage from '@/services/security/SecureStorage';
import { 
  UserFeatureVector, 
  RecommendationResult, 
  UserSignal, 
  RecommendationPrivacySettings,
  ConsentRecord,
  ABTestConfig,
  SignalBatch,
  SignalBatchConfig,
  ExplicitSignalData,
  ImplicitSignalData,
  SignalSummary,
  ProcessingStatus,
  SignalType,
  UserAction,
  PostUserFeatureVector,
  FeedRankingMetrics,
  RankingFactor,
  SocialRankingContext,
  // Micro-batch feedback loop types
  ClipsBatch,
  BatchConsumptionTracker,
  FeedbackLoopState,
  BatchMetrics,
  MicroBatchConfig,
  AdaptiveRankingFactors,
  TikTokScoringWeights,
  FeedbackLoopAnalytics,
  // ML Logging types
  InteractionLog,
  LoggingMetrics
} from '@/types/recommendation';
import { ContentType } from '@/types/recommendation';
import RecommendationEngine from '@/services/recommendation/RecommendationEngine';
import MLLoggingService from '@/services/recommendation/MLLoggingService';

interface MLLoggingState {
  // ML Logging Service state
  mlLoggingService: MLLoggingService | null;
  loggingMetrics: LoggingMetrics | null;
  dataIngestionMetrics: any | null;
  loggingServiceStatus: any | null;
  
  // Batch dispatch monitoring
  pendingLogBatches: number;
  lastBatchDispatchTime: number;
  batchDispatchErrors: string[];
  
  // Data ingestion analytics
  totalLogsGenerated: number;
  totalBatchesDispatched: number;
  averageBatchSize: number;
  ingestionThroughput: number; // logs per second
  compressionRatio: number;
  networkUsageBytes: number;
}

interface RecommendationState extends MLLoggingState {
  // User Features
  userFeatures: UserFeatureVector | null;
  privacySettings: RecommendationPrivacySettings;
  
  // Enhanced Recommendations with Feed Ranking
  feedRecommendations: RecommendationResult[];
  clipsRecommendations: RecommendationResult[];
  socialRecommendations: RecommendationResult[];
  
  // Enhanced Signal Management
  sessionSignals: UserSignal[];
  signalQueue: UserSignal[];
  pendingBatches: SignalBatch[];
  signalBatchConfig: SignalBatchConfig;
  sessionStartTime: number;
  
  // Signal Analytics
  signalSummary: SignalSummary | null;
  processingStatus: ProcessingStatus | null;
  
  // Feed Ranking Analytics
  feedRankingMetrics: FeedRankingMetrics | null;
  lastRankingFactors: RankingFactor[];
  socialContext: SocialRankingContext | null;
  
  // Micro-Batch Feedback Loop State
  currentBatch: ClipsBatch | null;
  batchConsumptionTracker: BatchConsumptionTracker | null;
  feedbackLoopState: FeedbackLoopState | null;
  microBatchConfig: MicroBatchConfig;
  feedbackLoopAnalytics: FeedbackLoopAnalytics | null;
  adaptiveWeights: TikTokScoringWeights | null;
  batchHistory: ClipsBatch[];
  
  // Privacy and Consent
  consentRecords: ConsentRecord[];
  privacyMode: boolean;
  
  // A/B Testing
  activeExperiments: ABTestConfig[];
  userExperimentGroup: Record<string, string>;
  
  // State Management
  isInitialized: boolean;
  isLoading: boolean;
  lastUpdateTime: number;
  
  // Enhanced Actions
  initializeRecommendations: (userId: string) => Promise<void>;
  updatePrivacySettings: (settings: Partial<RecommendationPrivacySettings>) => Promise<void>;
  
  // Signal Collection Actions
  collectSignal: (
    contentId: string, 
    contentType: ContentType, 
    action: UserAction, 
    context?: any,
    explicitData?: ExplicitSignalData,
    implicitData?: ImplicitSignalData
  ) => Promise<void>;
  
  collectDwellTimeSignal: (contentId: string, contentType: ContentType, dwellTime: number, context?: any) => Promise<void>;
  collectScrollVelocitySignal: (contentId: string, contentType: ContentType, velocity: number, context?: any) => Promise<void>;
  collectVideoWatchSignal: (contentId: string, watchPercentage: number, loopCount?: number, context?: any) => Promise<void>;
  collectProfileClickSignal: (contentId: string, authorId: string, context?: any) => Promise<void>;
  
  // Batch Processing Actions
  processPendingSignals: () => Promise<void>;
  configureBatching: (config: Partial<SignalBatchConfig>) => void;
  getSignalAnalytics: () => SignalSummary | null;
  getProcessingStatus: () => ProcessingStatus | null;
  
  // Enhanced Recommendation Actions with Feed Ranking
  generateFeedRecommendations: (count?: number) => Promise<void>;
  generateClipsRecommendations: (count?: number) => Promise<void>;
  generateSocialRecommendations: (count?: number) => Promise<void>;
  refreshAllRecommendations: () => Promise<void>;
  
  // Micro-Batch Feedback Loop Actions
  initializeFeedbackLoop: () => Promise<void>;
  getCurrentBatch: () => ClipsBatch | null;
  trackClipConsumption: (
    clipId: string,
    watchPercentage: number,
    loopCount: number,
    dwellTime: number,
    skipSignal: boolean,
    engagementActions?: UserAction[]
  ) => Promise<void>;
  completeBatch: () => Promise<void>;
  abandonBatch: (reason: string) => Promise<void>;
  getNextBatch: () => Promise<ClipsBatch | null>;
  getFeedbackLoopState: () => FeedbackLoopState | null;
  getBatchConsumptionStatus: () => BatchConsumptionTracker | null;
  updateMicroBatchConfig: (config: Partial<MicroBatchConfig>) => void;
  
  // Feed Ranking Actions
  getFeedRankingMetrics: () => FeedRankingMetrics | null;
  getLastRankingFactors: () => RankingFactor[];
  getSocialContext: () => SocialRankingContext | null;
  
  // Enhanced ML Logging Actions
  initializeMLLogging: () => Promise<void>;
  getMLLoggingMetrics: () => LoggingMetrics | null;
  getDataIngestionMetrics: () => any | null;
  getMLLoggingServiceStatus: () => any | null;
  flushMLLogs: () => Promise<void>;
  exportMLLogs: (startDate: string, endDate: string) => Promise<InteractionLog[]>;
  clearMLLogQueue: () => void;
  updateMLLoggingConfig: (config: any) => void;
  
  // Privacy Actions
  grantConsent: (consentType: string, granularPermissions: Record<string, boolean>) => Promise<void>;
  withdrawConsent: (consentType: string) => Promise<void>;
  enablePrivacyMode: () => void;
  disablePrivacyMode: () => void;
  
  // Utility Actions
  joinExperiment: (experimentId: string, variantId: string) => void;
  getRecommendationForContent: (contentId: string) => RecommendationResult | null;
  clearUserData: () => Promise<void>;
  getAnalytics: () => any;
  
  // Signal Debugging Actions
  exportSignalData: () => Promise<string>;
  clearSignalQueue: () => void;
  getSignalHistory: (timeWindow?: number) => UserSignal[];
}

// Simple storage for Zustand
const simpleJSONStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    try {
      const secureStorage = SecureStorage.getInstance();
      const value = await secureStorage.getItem(name);
      return value;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await secureStorage.setItem(name, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await secureStorage.removeItem(name);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
}));

export const useRecommendationStore = create<RecommendationState>()(
  persist(
    (set, get) => ({
      // Initial State
      userFeatures: null,
      privacySettings: {
        allowPersonalization: true,
        allowBehaviorTracking: true,
        allowSocialGraphAnalysis: true,
        allowLocationBasedRecommendations: false,
        allowCrossAppTracking: false,
        dataRetentionDays: 365,
        anonymizeData: true,
      },
      feedRecommendations: [],
      clipsRecommendations: [],
      socialRecommendations: [],
      
      // Enhanced Signal State
      sessionSignals: [],
      signalQueue: [],
      pendingBatches: [],
      signalBatchConfig: {
        maxBatchSize: 20, // Enhanced: N logs per batch
        maxBatchAge: 60 * 1000, // Enhanced: T milliseconds (60 seconds)
        compressionThreshold: 10,
        retryAttempts: 3,
        retryDelay: 1000,
        enableCompression: true,
        enableEncryption: true,
        realTimeProcessingEnabled: true,
        feedbackLoopPriority: true,
        adaptiveProcessing: true
      },
      sessionStartTime: Date.now(),
      
      // Signal Analytics
      signalSummary: null,
      processingStatus: null,
      
      // Feed Ranking Analytics
      feedRankingMetrics: null,
      lastRankingFactors: [],
      socialContext: null,
      
      // Micro-Batch Feedback Loop State
      currentBatch: null,
      batchConsumptionTracker: null,
      feedbackLoopState: null,
      microBatchConfig: {
        batchSize: 7,
        maxBatchAge: 5 * 60 * 1000, // 5 minutes
        adaptationThreshold: 0.1,
        explorationRate: 0.2,
        convergenceThreshold: 0.85,
        maxIterations: 10,
        realTimeProcessing: true,
        adaptiveWeightAdjustment: true,
        batchPreloadCount: 2,
        signalProcessingDelay: 1000
      },
      feedbackLoopAnalytics: null,
      adaptiveWeights: null,
      batchHistory: [],
      
      // Enhanced ML Logging State
      mlLoggingService: null,
      loggingMetrics: null,
      dataIngestionMetrics: null,
      loggingServiceStatus: null,
      pendingLogBatches: 0,
      lastBatchDispatchTime: 0,
      batchDispatchErrors: [],
      totalLogsGenerated: 0,
      totalBatchesDispatched: 0,
      averageBatchSize: 0,
      ingestionThroughput: 0,
      compressionRatio: 0,
      networkUsageBytes: 0,
      
      consentRecords: [],
      privacyMode: false,
      activeExperiments: [],
      userExperimentGroup: {},
      isInitialized: false,
      isLoading: false,
      lastUpdateTime: 0,

      // Initialize recommendation system with enhanced ML logging
      initializeRecommendations: async (userId: string) => {
        try {
          set({ isLoading: true });
          
          const recommendationEngine = RecommendationEngine.getInstance();
          await recommendationEngine.initialize(userId);
          
          // Initialize ML Logging Service
          await get().initializeMLLogging();
          
          // Grant comprehensive consent for signal collection
          await recommendationEngine.grantConsent(userId, 'signal_collection', {
            explicit_engagement: true,
            implicit_behavior: true,
            navigation: true,
            content_interaction: true,
            social_interaction: true,
            temporal: true,
            contextual: true,
            content_analysis: false, // Opt-in required
            friend_suggestion: true,
            family_management: true
          });
          
          // Grant default consent for personalization with feed ranking
          await recommendationEngine.grantConsent(userId, 'personalization', {
            basic_personalization: true,
            interest_tracking: true,
            social_signals: true,
            behavior_analysis: true,
            feed_ranking: true,
            social_graph_analysis: true,
            micro_batch_feedback_loop: true
          });
          
          // Initialize micro-batch feedback loop
          await get().initializeFeedbackLoop();
          
          // Generate initial recommendations with enhanced feed ranking
          await get().generateFeedRecommendations(20);
          await get().generateClipsRecommendations(15);
          await get().generateSocialRecommendations(10);
          
          // Update processing status
          const processingStatus = recommendationEngine.getProcessingStatus();
          set({ processingStatus });
          
          set({ 
            isInitialized: true, 
            isLoading: false,
            lastUpdateTime: Date.now(),
            sessionStartTime: Date.now()
          });
          
          console.log('Enhanced Recommendation System with ML Logging Pipeline initialized successfully');
        } catch (error) {
          console.error('Failed to initialize recommendations:', error);
          set({ isLoading: false });
        }
      },

      // Enhanced ML Logging initialization
      initializeMLLogging: async () => {
        try {
          const mlLoggingService = MLLoggingService.getInstance();
          
          // Get initial metrics and status
          const loggingMetrics = mlLoggingService.getMetrics();
          const dataIngestionMetrics = mlLoggingService.getDataIngestionMetrics();
          const loggingServiceStatus = mlLoggingService.getServiceStatus();
          
          set({
            mlLoggingService,
            loggingMetrics,
            dataIngestionMetrics,
            loggingServiceStatus,
            totalLogsGenerated: loggingServiceStatus.totalLogsGenerated || 0,
            totalBatchesDispatched: dataIngestionMetrics.totalBatchesDispatched || 0,
            averageBatchSize: dataIngestionMetrics.averageBatchSize || 0,
            ingestionThroughput: dataIngestionMetrics.ingestionThroughput || 0,
            compressionRatio: dataIngestionMetrics.compressionRatio || 0,
            networkUsageBytes: dataIngestionMetrics.networkUsage * 1024 * 1024 || 0 // Convert MB to bytes
          });
          
          console.log('ML Logging Service initialized with batching agent');
        } catch (error) {
          console.error('Failed to initialize ML Logging Service:', error);
        }
      },

      // Get ML Logging metrics
      getMLLoggingMetrics: () => {
        const { mlLoggingService } = get();
        if (!mlLoggingService) return null;
        
        const metrics = mlLoggingService.getMetrics();
        set({ loggingMetrics: metrics });
        return metrics;
      },

      // Get data ingestion metrics
      getDataIngestionMetrics: () => {
        const { mlLoggingService } = get();
        if (!mlLoggingService) return null;
        
        const metrics = mlLoggingService.getDataIngestionMetrics();
        set({ dataIngestionMetrics: metrics });
        return metrics;
      },

      // Get ML Logging service status
      getMLLoggingServiceStatus: () => {
        const { mlLoggingService } = get();
        if (!mlLoggingService) return null;
        
        const status = mlLoggingService.getServiceStatus();
        set({ loggingServiceStatus: status });
        return status;
      },

      // Flush ML logs
      flushMLLogs: async () => {
        try {
          const { mlLoggingService } = get();
          if (!mlLoggingService) return;
          
          await mlLoggingService.flushLogs();
          
          // Update metrics after flush
          const loggingMetrics = mlLoggingService.getMetrics();
          const dataIngestionMetrics = mlLoggingService.getDataIngestionMetrics();
          
          set({ 
            loggingMetrics,
            dataIngestionMetrics,
            lastBatchDispatchTime: Date.now()
          });
          
          console.log('ML logs flushed successfully');
        } catch (error) {
          console.error('Failed to flush ML logs:', error);
          const { batchDispatchErrors } = get();
          set({ 
            batchDispatchErrors: [...batchDispatchErrors, error instanceof Error ? error.message : 'Unknown error']
          });
        }
      },

      // Export ML logs
      exportMLLogs: async (startDate: string, endDate: string) => {
        try {
          const { mlLoggingService } = get();
          if (!mlLoggingService) return [];
          
          const logs = await mlLoggingService.exportLogs(startDate, endDate);
          console.log(`Exported ${logs.length} ML logs`);
          return logs;
        } catch (error) {
          console.error('Failed to export ML logs:', error);
          return [];
        }
      },

      // Clear ML log queue
      clearMLLogQueue: () => {
        const { mlLoggingService } = get();
        if (!mlLoggingService) return;
        
        mlLoggingService.clearQueue();
        console.log('ML log queue cleared');
      },

      // Update ML logging configuration
      updateMLLoggingConfig: (config: any) => {
        const { mlLoggingService } = get();
        if (!mlLoggingService) return;
        
        mlLoggingService.updateConfig(config);
        console.log('ML logging configuration updated');
      },

      // Initialize micro-batch feedback loop
      initializeFeedbackLoop: async () => {
        try {
          const recommendationEngine = RecommendationEngine.getInstance();
          await recommendationEngine.initializeFeedbackLoop('current_user');
          
          // Get initial batch
          const currentBatch = recommendationEngine.getCurrentBatch('current_user');
          const feedbackLoopState = recommendationEngine.getFeedbackLoopState('current_user');
          
          // Initialize adaptive weights
          const adaptiveWeights: TikTokScoringWeights = {
            watchPercentageWeight: 0.4,
            loopCountWeight: 0.3,
            shareCountWeight: 0.2,
            skipSignalWeight: 0.5,
            adaptiveBonus: 0
          };
          
          set({ 
            currentBatch,
            feedbackLoopState,
            adaptiveWeights
          });
          
          console.log('Micro-batch feedback loop initialized');
        } catch (error) {
          console.error('Failed to initialize feedback loop:', error);
        }
      },

      // Get current batch
      getCurrentBatch: () => {
        return get().currentBatch;
      },

      // Track clip consumption in current batch with ML logging
      trackClipConsumption: async (
        clipId: string,
        watchPercentage: number,
        loopCount: number,
        dwellTime: number,
        skipSignal: boolean,
        engagementActions: UserAction[] = []
      ) => {
        try {
          const { currentBatch, privacySettings, mlLoggingService } = get();
          
          if (!currentBatch || !privacySettings.allowBehaviorTracking) {
            return;
          }
          
          const recommendationEngine = RecommendationEngine.getInstance();
          
          // Track consumption in the recommendation engine
          await recommendationEngine.trackClipConsumption(
            'current_user',
            clipId,
            watchPercentage,
            loopCount,
            dwellTime,
            skipSignal,
            engagementActions
          );
          
          // Update local batch consumption tracker
          const batchConsumptionTracker = recommendationEngine.getBatchConsumptionStatus(currentBatch.batchId);
          set({ batchConsumptionTracker });
          
          // Enhanced ML logging for clip consumption
          if (mlLoggingService) {
            const interactionLog: InteractionLog = {
              logVersion: "1.0",
              eventID: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              clientTimestamp: new Date().toISOString(),
              serverIngestionTimestamp: "",
              sessionID: `session_${get().sessionStartTime}`,
              userID: 'current_user_pseudonymized',
              context: {
                itemType: 'CLIP',
                itemID: clipId,
                itemPosition: currentBatch.clipIds.indexOf(clipId),
                feedType: 'clips_feed',
                screenName: 'clips'
              },
              modelPrediction: {
                modelVersion: currentBatch.rankingModelVersion,
                predictedScore: 0.8, // Mock predicted score
                predictionTimestamp: new Date().toISOString(),
                featureVector: {
                  batchIteration: currentBatch.feedbackLoopIteration,
                  batchPosition: currentBatch.clipIds.indexOf(clipId),
                  adaptiveWeights: JSON.stringify(get().adaptiveWeights)
                }
              },
              finalUserInteraction: {
                interactionType: skipSignal ? 'SKIP' : (watchPercentage >= 0.9 ? 'FULL_SCREEN' : 'CLICK'),
                dwellTimeMs: dwellTime,
                videoWatchPercentage: watchPercentage,
                videoLoopCount: loopCount,
                engagementDepth: watchPercentage,
                attentionScore: skipSignal ? 0.1 : watchPercentage,
                secondaryInteractions: engagementActions.map(action => ({
                  type: action as any,
                  timestamp: new Date().toISOString()
                }))
              },
              privacyCompliant: true,
              dataRetentionPolicy: "90_days"
            };
            
            await mlLoggingService.logInteraction(interactionLog);
          }
          
          // Collect detailed signal for this consumption
          await get().collectVideoWatchSignal(clipId, watchPercentage, loopCount, {
            batchId: currentBatch.batchId,
            batchPosition: currentBatch.clipIds.indexOf(clipId),
            feedbackLoopIteration: currentBatch.feedbackLoopIteration,
            skipSignal,
            engagementActions,
            dwellTime
          });
          
          console.log(`Tracked consumption for clip ${clipId}: ${(watchPercentage * 100).toFixed(1)}% watched, ${loopCount} loops`);
        } catch (error) {
          console.error('Failed to track clip consumption:', error);
        }
      },

      // Complete current batch
      completeBatch: async () => {
        try {
          const { currentBatch } = get();
          if (!currentBatch) return;
          
          const recommendationEngine = RecommendationEngine.getInstance();
          await recommendationEngine.completeBatch('current_user', currentBatch.batchId);
          
          // Update state with new batch
          const newBatch = recommendationEngine.getCurrentBatch('current_user');
          const feedbackLoopState = recommendationEngine.getFeedbackLoopState('current_user');
          const batchConsumptionTracker = newBatch ? recommendationEngine.getBatchConsumptionStatus(newBatch.batchId) : null;
          
          // Add completed batch to history
          const { batchHistory } = get();
          const updatedHistory = [...batchHistory, currentBatch].slice(-10); // Keep last 10 batches
          
          set({ 
            currentBatch: newBatch,
            feedbackLoopState,
            batchConsumptionTracker,
            batchHistory: updatedHistory
          });
          
          console.log(`Completed batch ${currentBatch.batchId}, new batch: ${newBatch?.batchId || 'none'}`);
        } catch (error) {
          console.error('Failed to complete batch:', error);
        }
      },

      // Abandon current batch
      abandonBatch: async (reason: string) => {
        try {
          const { currentBatch, batchConsumptionTracker } = get();
          if (!currentBatch || !batchConsumptionTracker) return;
          
          // Mark batch as abandoned
          const updatedTracker = {
            ...batchConsumptionTracker,
            isAbandoned: true,
            abandonmentReason: reason as any
          };
          
          // Collect abandonment signal
          await get().collectSignal(
            currentBatch.batchId,
            'video',
            'batch_abandon',
            {
              batchId: currentBatch.batchId,
              abandonmentReason: reason,
              batchProgress: updatedTracker.batchProgress,
              consumedClips: updatedTracker.currentClipIndex
            }
          );
          
          // Generate new batch
          await get().getNextBatch();
          
          console.log(`Abandoned batch ${currentBatch.batchId} due to: ${reason}`);
        } catch (error) {
          console.error('Failed to abandon batch:', error);
        }
      },

      // Get next batch
      getNextBatch: async () => {
        try {
          const recommendationEngine = RecommendationEngine.getInstance();
          const nextBatch = await recommendationEngine.generateNextBatch('current_user');
          
          if (nextBatch) {
            const feedbackLoopState = recommendationEngine.getFeedbackLoopState('current_user');
            const batchConsumptionTracker = recommendationEngine.getBatchConsumptionStatus(nextBatch.batchId);
            
            set({ 
              currentBatch: nextBatch,
              feedbackLoopState,
              batchConsumptionTracker
            });
          }
          
          return nextBatch;
        } catch (error) {
          console.error('Failed to get next batch:', error);
          return null;
        }
      },

      // Get feedback loop state
      getFeedbackLoopState: () => {
        return get().feedbackLoopState;
      },

      // Get batch consumption status
      getBatchConsumptionStatus: () => {
        return get().batchConsumptionTracker;
      },

      // Update micro-batch configuration
      updateMicroBatchConfig: (config: Partial<MicroBatchConfig>) => {
        const { microBatchConfig } = get();
        set({ 
          microBatchConfig: { 
            ...microBatchConfig, 
            ...config 
          }
        });
      },

      // Enhanced signal collection with ML logging integration
      collectSignal: async (
        contentId: string, 
        contentType: ContentType, 
        action: UserAction, 
        context: any = {},
        explicitData?: ExplicitSignalData,
        implicitData?: ImplicitSignalData
      ) => {
        try {
          const { privacySettings, sessionSignals, signalQueue, currentBatch, mlLoggingService } = get();
          
          // Check if behavior tracking is allowed
          if (!privacySettings.allowBehaviorTracking) {
            return;
          }
          
          const recommendationEngine = RecommendationEngine.getInstance();
          
          // Collect signal with enhanced data
          await recommendationEngine.collectSignal(
            'current_user',
            contentId,
            contentType,
            action,
            {
              screenName: context.screenName || 'unknown',
              position: context.position || 0,
              timeSpent: context.timeSpent || 0,
              scrollDepth: context.scrollDepth || 0,
              ...context
            },
            explicitData,
            implicitData
          );
          
          // Enhanced ML logging for signal collection
          if (mlLoggingService) {
            const interactionLog: InteractionLog = {
              logVersion: "1.0",
              eventID: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              clientTimestamp: new Date().toISOString(),
              serverIngestionTimestamp: "",
              sessionID: `session_${get().sessionStartTime}`,
              userID: 'current_user_pseudonymized',
              context: {
                itemType: contentType === 'video' ? 'CLIP' : 'POST',
                itemID: contentId,
                itemPosition: context.position || 0,
                feedType: context.screenName === 'clips' ? 'clips_feed' : 'main_feed',
                screenName: context.screenName || 'unknown'
              },
              modelPrediction: {
                modelVersion: 'signal_collection_v1.0',
                predictedScore: 0.5, // Default for signal collection
                predictionTimestamp: new Date().toISOString(),
                featureVector: {
                  contentType: contentType,
                  sessionTime: Date.now() - get().sessionStartTime
                }
              },
              finalUserInteraction: {
                interactionType: action.toUpperCase() as any,
                dwellTimeMs: implicitData?.dwellTime || context.timeSpent || 0,
                engagementDepth: implicitData?.engagementDepth || 0.5,
                attentionScore: implicitData?.attentionScore || 0.5,
                videoWatchPercentage: implicitData?.watchPercentage,
                videoLoopCount: implicitData?.loopCount
              },
              privacyCompliant: true,
              dataRetentionPolicy: "90_days"
            };
            
            await mlLoggingService.logInteraction(interactionLog);
          }
          
          // Create local signal for session tracking
          const signal: UserSignal = {
            id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: 'current_user',
            signalType: determineSignalType(action),
            contentId,
            contentType,
            action,
            context: context,
            timestamp: Date.now(),
            sessionId: `session_${get().sessionStartTime}`,
            anonymized: privacySettings.anonymizeData,
            privacyCompliant: true,
            explicitSignal: explicitData,
            implicitSignal: implicitData,
            // Micro-batch feedback loop data
            batchId: currentBatch?.batchId,
            batchPosition: context.batchPosition,
            feedbackLoopIteration: currentBatch?.feedbackLoopIteration
          };
          
          // Add to session signals and queue
          const updatedSessionSignals = [...sessionSignals, signal];
          const updatedSignalQueue = [...signalQueue, signal];
          
          // Keep only recent signals in memory
          const recentSignals = updatedSessionSignals.filter(
            s => Date.now() - s.timestamp < 60 * 60 * 1000 // Last hour
          );
          
          set({ 
            sessionSignals: recentSignals,
            signalQueue: updatedSignalQueue
          });
          
          // Update signal summary
          updateSignalSummary();
          
          // Process batch if needed
          if (updatedSignalQueue.length >= get().signalBatchConfig.maxBatchSize) {
            await get().processPendingSignals();
          }
          
        } catch (error) {
          console.error('Failed to collect signal:', error);
        }
      },

      // Specialized signal collection methods
      collectDwellTimeSignal: async (
        contentId: string, 
        contentType: ContentType, 
        dwellTime: number, 
        context: any = {}
      ) => {
        const implicitData: ImplicitSignalData = {
          dwellTime,
          scrollVelocity: context.scrollVelocity || 0,
          engagementDepth: Math.min(dwellTime / 10000, 1), // 0-1 based on 10s max
          attentionScore: Math.min(dwellTime / 5000, 1), // 0-1 based on 5s max
          exitMethod: context.exitMethod || 'scroll'
        };
        
        await get().collectSignal(contentId, contentType, 'dwell', context, undefined, implicitData);
      },

      collectScrollVelocitySignal: async (
        contentId: string, 
        contentType: ContentType, 
        velocity: number, 
        context: any = {}
      ) => {
        const implicitData: ImplicitSignalData = {
          dwellTime: context.dwellTime || 0,
          scrollVelocity: velocity,
          engagementDepth: velocity < 100 ? 0.8 : 0.2, // Slow scroll = high engagement
          attentionScore: velocity < 200 ? 0.7 : 0.1,
          exitMethod: 'scroll'
        };
        
        await get().collectSignal(contentId, contentType, 'scroll_past', context, undefined, implicitData);
      },

      collectVideoWatchSignal: async (
        contentId: string, 
        watchPercentage: number, 
        loopCount: number = 0, 
        context: any = {}
      ) => {
        const implicitData: ImplicitSignalData = {
          dwellTime: context.dwellTime || watchPercentage * 30000, // Estimate based on percentage
          watchPercentage,
          loopCount,
          scrollVelocity: 0,
          engagementDepth: watchPercentage,
          attentionScore: Math.min(watchPercentage + (loopCount * 0.2), 1),
          exitMethod: watchPercentage >= 0.9 ? 'completion' : 'skip'
        };
        
        const action = loopCount > 0 ? 'video_loop' : 'video_watch';
        await get().collectSignal(contentId, 'video', action, context, undefined, implicitData);
      },

      collectProfileClickSignal: async (
        contentId: string, 
        authorId: string, 
        context: any = {}
      ) => {
        const implicitData: ImplicitSignalData = {
          dwellTime: context.dwellTime || 0,
          scrollVelocity: 0,
          engagementDepth: 0.8, // High engagement for profile clicks
          attentionScore: 0.9,
          exitMethod: 'click'
        };
        
        const enhancedContext = {
          ...context,
          contentContext: {
            ...context.contentContext,
            authorId
          }
        };
        
        await get().collectSignal(contentId, context.contentType || 'text', 'profile_click', enhancedContext, undefined, implicitData);
      },

      // Batch processing
      processPendingSignals: async () => {
        try {
          const { signalQueue } = get();
          if (signalQueue.length === 0) return;
          
          const recommendationEngine = RecommendationEngine.getInstance();
          
          // Create batch
          const batch: SignalBatch = {
            batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: 'current_user',
            signals: [...signalQueue],
            batchTimestamp: Date.now(),
            sessionId: `session_${get().sessionStartTime}`,
            batchSize: signalQueue.length,
            compressionUsed: signalQueue.length >= get().signalBatchConfig.compressionThreshold,
            checksumHash: signalQueue.map(s => s.id).join('').length.toString(36),
            privacyCompliant: signalQueue.every(s => s.privacyCompliant),
            // Micro-batch feedback loop
            feedbackLoopBatchId: get().currentBatch?.batchId,
            feedbackLoopIteration: get().currentBatch?.feedbackLoopIteration,
            realTimeProcessing: true
          };
          
          // Process batch
          const result = await recommendationEngine.processBatch(batch);
          
          // Update state
          set({ 
            signalQueue: [],
            pendingBatches: [...get().pendingBatches, batch],
            processingStatus: recommendationEngine.getProcessingStatus()
          });
          
          console.log('Processed signal batch:', result);
          
        } catch (error) {
          console.error('Failed to process pending signals:', error);
        }
      },

      // Configure signal batching
      configureBatching: (config: Partial<SignalBatchConfig>) => {
        set({ 
          signalBatchConfig: { 
            ...get().signalBatchConfig, 
            ...config 
          }
        });
      },

      // Get signal analytics
      getSignalAnalytics: () => {
        return get().signalSummary;
      },

      // Get processing status
      getProcessingStatus: () => {
        return get().processingStatus;
      },

      // Update privacy settings
      updatePrivacySettings: async (settings: Partial<RecommendationPrivacySettings>) => {
        try {
          const currentSettings = get().privacySettings;
          const newSettings = { ...currentSettings, ...settings };
          
          set({ privacySettings: newSettings });
          
          // If personalization is disabled, clear recommendations
          if (!newSettings.allowPersonalization) {
            set({ 
              feedRecommendations: [],
              clipsRecommendations: [],
              socialRecommendations: [],
              feedRankingMetrics: null,
              lastRankingFactors: [],
              socialContext: null,
              currentBatch: null,
              feedbackLoopState: null
            });
          } else {
            // Refresh recommendations with new settings
            await get().refreshAllRecommendations();
          }
          
          console.log('Privacy settings updated:', newSettings);
        } catch (error) {
          console.error('Failed to update privacy settings:', error);
        }
      },

      // Generate enhanced feed recommendations with Facebook-inspired ranking
      generateFeedRecommendations: async (count: number = 20) => {
        try {
          const { privacySettings } = get();
          
          if (!privacySettings.allowPersonalization) {
            console.log('Personalization disabled, skipping feed recommendations');
            return;
          }
          
          const recommendationEngine = RecommendationEngine.getInstance();
          
          // Use the enhanced Facebook-inspired feed ranking
          const recommendations = await recommendationEngine.generateClipsRecommendations(
            'current_user',
            count
          );
          
          // Extract feed ranking metrics and factors
          const feedRankingMetrics: FeedRankingMetrics = {
            candidatesGenerated: recommendations.length * 5, // Mock candidate pool
            candidatesRanked: recommendations.length,
            averageRankingScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
            topRankingFactors: extractTopRankingFactors(recommendations),
            socialGraphUtilization: calculateSocialGraphUtilization(recommendations),
            personalizedResults: recommendations.filter(r => r.metadata.personalizationLevel > 0.5).length,
            diversityAchieved: recommendations.reduce((sum, r) => sum + r.diversityScore, 0) / recommendations.length,
            computationTime: 150 // Mock computation time
          };
          
          // Extract ranking factors from first recommendation
          const lastRankingFactors = recommendations[0]?.rankingFactors || [];
          
          // Extract social context from first recommendation
          const socialContext = recommendations[0]?.socialContext || null;
          
          set({ 
            feedRecommendations: recommendations,
            feedRankingMetrics,
            lastRankingFactors,
            socialContext,
            lastUpdateTime: Date.now()
          });
          
          console.log(`Generated ${recommendations.length} enhanced feed recommendations with TikTok-inspired scoring`);
        } catch (error) {
          console.error('Failed to generate feed recommendations:', error);
        }
      },

      // Generate clips recommendations with TikTok-inspired scoring and micro-batch feedback loop
      generateClipsRecommendations: async (count: number = 15) => {
        try {
          const { privacySettings, currentBatch } = get();
          
          if (!privacySettings.allowPersonalization) {
            console.log('Personalization disabled, skipping clips recommendations');
            return;
          }
          
          // If we have an active batch, use it instead of generating new recommendations
          if (currentBatch) {
            const recommendationEngine = RecommendationEngine.getInstance();
            const batchRecommendations = recommendationEngine.getCurrentBatch('current_user');
            
            if (batchRecommendations) {
              // Convert batch to recommendations format
              const recommendations = batchRecommendations.clipIds.map((clipId, index) => ({
                contentId: clipId,
                contentType: 'video' as ContentType,
                score: 0.8 + (Math.random() * 0.2),
                confidence: 0.9,
                reasons: [{
                  type: 'feedback_loop' as any,
                  description: 'محتوى مخصص من خلال التعلم التكيفي',
                  confidence: 0.9,
                  weight: 1.0,
                  signalBased: true
                }],
                diversityScore: Math.random() * 0.5 + 0.5,
                privacyCompliant: true,
                metadata: {
                  generationTime: batchRecommendations.generationTimestamp,
                  modelVersion: batchRecommendations.rankingModelVersion,
                  cacheable: false,
                  ttl: 300,
                  signalFreshness: 1.0,
                  personalizationLevel: 0.9,
                  candidatePoolSize: batchRecommendations.candidatePoolSize,
                  featureComputationTime: 0,
                  rankingComputationTime: 0,
                  socialGraphDepth: 0,
                  feedbackLoopEnabled: true,
                  adaptiveRanking: true,
                  batchGenerationTime: batchRecommendations.generationTimestamp,
                  previousBatchInfluence: batchRecommendations.previousBatchSignals?.length || 0
                },
                signalContribution: [],
                rankingFactors: [],
                socialContext: undefined,
                batchId: batchRecommendations.batchId,
                batchPosition: index,
                adaptiveScore: 0.8 + (Math.random() * 0.2),
                feedbackLoopIteration: batchRecommendations.feedbackLoopIteration
              }));
              
              set({ 
                clipsRecommendations: recommendations,
                lastUpdateTime: Date.now()
              });
              
              console.log(`Using micro-batch recommendations: ${recommendations.length} clips from batch ${currentBatch.batchId}`);
              return;
            }
          }
          
          // Fallback to regular recommendation generation
          const recommendationEngine = RecommendationEngine.getInstance();
          const recommendations = await recommendationEngine.generateClipsRecommendations(
            'current_user',
            count
          );
          
          set({ 
            clipsRecommendations: recommendations,
            lastUpdateTime: Date.now()
          });
          
          console.log(`Generated ${recommendations.length} clips recommendations with TikTok-inspired scoring`);
        } catch (error) {
          console.error('Failed to generate clips recommendations:', error);
        }
      },

      // Generate social recommendations
      generateSocialRecommendations: async (count: number = 10) => {
        try {
          const { privacySettings } = get();
          
          if (!privacySettings.allowSocialGraphAnalysis) {
            console.log('Social graph analysis disabled, skipping social recommendations');
            return;
          }
          
          const recommendationEngine = RecommendationEngine.getInstance();
          const recommendations = await recommendationEngine.generateClipsRecommendations(
            'current_user',
            count
          );
          
          set({ 
            socialRecommendations: recommendations,
            lastUpdateTime: Date.now()
          });
          
          console.log(`Generated ${recommendations.length} social recommendations`);
        } catch (error) {
          console.error('Failed to generate social recommendations:', error);
        }
      },

      // Refresh all recommendations
      refreshAllRecommendations: async () => {
        try {
          set({ isLoading: true });
          
          await Promise.all([
            get().generateFeedRecommendations(),
            get().generateClipsRecommendations(),
            get().generateSocialRecommendations()
          ]);
          
          set({ isLoading: false });
          console.log('All recommendations refreshed with micro-batch feedback loop and ML logging');
        } catch (error) {
          console.error('Failed to refresh recommendations:', error);
          set({ isLoading: false });
        }
      },

      // Feed Ranking Actions
      getFeedRankingMetrics: () => {
        return get().feedRankingMetrics;
      },

      getLastRankingFactors: () => {
        return get().lastRankingFactors;
      },

      getSocialContext: () => {
        return get().socialContext;
      },

      // Grant consent
      grantConsent: async (consentType: string, granularPermissions: Record<string, boolean>) => {
        try {
          const recommendationEngine = RecommendationEngine.getInstance();
          await recommendationEngine.grantConsent('current_user', consentType, granularPermissions);
          
          const consent: ConsentRecord = {
            userId: 'current_user',
            consentId: `consent_${Date.now()}`,
            consentType: consentType as any,
            granted: true,
            timestamp: Date.now(),
            expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
            granularPermissions,
            signalPermissions: {
              explicit_engagement: granularPermissions.explicit_engagement || true,
              implicit_behavior: granularPermissions.implicit_behavior || true,
              navigation: granularPermissions.navigation || true,
              content_interaction: granularPermissions.content_interaction || true,
              social_interaction: granularPermissions.social_interaction || true,
              temporal: granularPermissions.temporal || true,
              contextual: granularPermissions.contextual || true,
              content_analysis: granularPermissions.content_analysis || false,
              friend_suggestion: granularPermissions.friend_suggestion || true,
              family_management: granularPermissions.family_management || true
            }
          };
          
          const { consentRecords } = get();
          set({ consentRecords: [...consentRecords, consent] });
          
          console.log(`Consent granted for ${consentType}`);
        } catch (error) {
          console.error('Failed to grant consent:', error);
        }
      },

      // Withdraw consent
      withdrawConsent: async (consentType: string) => {
        try {
          const recommendationEngine = RecommendationEngine.getInstance();
          await recommendationEngine.withdrawConsent('current_user', consentType);
          
          const { consentRecords } = get();
          const updatedRecords = consentRecords.map(record => 
            record.consentType === consentType 
              ? { ...record, withdrawalDate: Date.now() }
              : record
          );
          
          set({ consentRecords: updatedRecords });
          
          // Clear related data based on consent type
          if (consentType === 'personalization') {
            set({ 
              feedRecommendations: [],
              clipsRecommendations: [],
              socialRecommendations: [],
              feedRankingMetrics: null,
              lastRankingFactors: [],
              socialContext: null,
              currentBatch: null,
              feedbackLoopState: null
            });
          }
          
          if (consentType === 'signal_collection') {
            set({
              sessionSignals: [],
              signalQueue: [],
              signalSummary: null
            });
          }
          
          console.log(`Consent withdrawn for ${consentType}`);
        } catch (error) {
          console.error('Failed to withdraw consent:', error);
        }
      },

      // Enable privacy mode
      enablePrivacyMode: () => {
        set({ 
          privacyMode: true,
          privacySettings: {
            ...get().privacySettings,
            anonymizeData: true,
            allowCrossAppTracking: false
          }
        });
        console.log('Privacy mode enabled');
      },

      // Disable privacy mode
      disablePrivacyMode: () => {
        set({ 
          privacyMode: false,
          privacySettings: {
            ...get().privacySettings,
            anonymizeData: false
          }
        });
        console.log('Privacy mode disabled');
      },

      // Join A/B test experiment
      joinExperiment: (experimentId: string, variantId: string) => {
        const { userExperimentGroup } = get();
        set({ 
          userExperimentGroup: {
            ...userExperimentGroup,
            [experimentId]: variantId
          }
        });
        console.log(`Joined experiment ${experimentId} with variant ${variantId}`);
      },

      // Get recommendation for specific content
      getRecommendationForContent: (contentId: string): RecommendationResult | null => {
        const { feedRecommendations, clipsRecommendations, socialRecommendations } = get();
        
        const allRecommendations = [
          ...feedRecommendations,
          ...clipsRecommendations,
          ...socialRecommendations
        ];
        
        return allRecommendations.find(rec => rec.contentId === contentId) || null;
      },

      // Clear all user data
      clearUserData: async () => {
        try {
          const recommendationEngine = RecommendationEngine.getInstance();
          await recommendationEngine.deleteUserData('current_user');
          
          // Clear ML logging data
          const { mlLoggingService } = get();
          if (mlLoggingService) {
            await mlLoggingService.requestDataDeletion('current_user');
          }
          
          set({
            userFeatures: null,
            feedRecommendations: [],
            clipsRecommendations: [],
            socialRecommendations: [],
            sessionSignals: [],
            signalQueue: [],
            pendingBatches: [],
            signalSummary: null,
            feedRankingMetrics: null,
            lastRankingFactors: [],
            socialContext: null,
            currentBatch: null,
            batchConsumptionTracker: null,
            feedbackLoopState: null,
            feedbackLoopAnalytics: null,
            adaptiveWeights: null,
            batchHistory: [],
            consentRecords: [],
            userExperimentGroup: {},
            isInitialized: false,
            lastUpdateTime: 0,
            // Clear ML logging state
            loggingMetrics: null,
            dataIngestionMetrics: null,
            loggingServiceStatus: null,
            pendingLogBatches: 0,
            batchDispatchErrors: [],
            totalLogsGenerated: 0,
            totalBatchesDispatched: 0
          });
          
          console.log('All user data cleared including ML logs');
        } catch (error) {
          console.error('Failed to clear user data:', error);
        }
      },

      // Get enhanced analytics data with ML logging metrics
      getAnalytics: () => {
        const { 
          sessionSignals, 
          feedRecommendations, 
          clipsRecommendations, 
          socialRecommendations,
          sessionStartTime,
          signalSummary,
          feedRankingMetrics,
          lastRankingFactors,
          currentBatch,
          feedbackLoopState,
          batchHistory,
          loggingMetrics,
          dataIngestionMetrics,
          totalLogsGenerated,
          totalBatchesDispatched,
          ingestionThroughput
        } = get();
        
        const sessionDuration = Date.now() - sessionStartTime;
        const totalRecommendations = feedRecommendations.length + clipsRecommendations.length + socialRecommendations.length;
        const engagementSignals = sessionSignals.filter(s => 
          ['like', 'comment', 'share', 'save'].includes(s.action)
        );
        
        // Micro-batch feedback loop analytics
        const feedbackLoopAnalytics = {
          totalBatches: batchHistory.length + (currentBatch ? 1 : 0),
          currentIteration: feedbackLoopState?.currentIteration || 0,
          convergenceScore: feedbackLoopState?.convergenceScore || 0,
          explorationRate: feedbackLoopState?.explorationRate || 0,
          adaptationCount: feedbackLoopState?.adaptationHistory.length || 0,
          averageBatchSatisfaction: batchHistory.length > 0
            ? batchHistory.reduce((sum, batch) => sum + batch.batchMetrics.userSatisfactionScore, 0) / batchHistory.length
            : 0
        };
        
        // Enhanced ML logging analytics
        const mlLoggingAnalytics = {
          totalLogsGenerated,
          totalBatchesDispatched,
          ingestionThroughput,
          averageBatchSize: dataIngestionMetrics?.averageBatchSize || 0,
          compressionRatio: dataIngestionMetrics?.compressionRatio || 0,
          networkUsage: dataIngestionMetrics?.networkUsage || 0,
          lastSuccessfulDispatch: dataIngestionMetrics?.lastSuccessfulDispatch || '',
          loggingServiceActive: !!loggingMetrics,
          queueUtilization: loggingMetrics?.queueUtilization || 0,
          errorRate: loggingMetrics?.errorRate || 0
        };
        
        return {
          sessionDuration,
          totalSignals: sessionSignals.length,
          engagementSignals: engagementSignals.length,
          engagementRate: sessionSignals.length > 0 ? engagementSignals.length / sessionSignals.length : 0,
          totalRecommendations,
          feedRecommendations: feedRecommendations.length,
          clipsRecommendations: clipsRecommendations.length,
          socialRecommendations: socialRecommendations.length,
          averageRecommendationScore: totalRecommendations > 0 
            ? [...feedRecommendations, ...clipsRecommendations, ...socialRecommendations]
                .reduce((sum, rec) => sum + rec.score, 0) / totalRecommendations
            : 0,
          signalSummary,
          signalQuality: signalSummary?.signalQuality || 0,
          averageDwellTime: signalSummary?.averageDwellTime || 0,
          averageScrollVelocity: signalSummary?.averageScrollVelocity || 0,
          // Enhanced TikTok-inspired analytics
          feedRankingMetrics,
          topRankingFactors: lastRankingFactors.map(f => f.factor),
          averagePersonalizationLevel: feedRecommendations.length > 0
            ? feedRecommendations.reduce((sum, r) => sum + r.metadata.personalizationLevel, 0) / feedRecommendations.length
            : 0,
          socialGraphUtilization: feedRankingMetrics?.socialGraphUtilization || 0,
          diversityAchieved: feedRankingMetrics?.diversityAchieved || 0,
          // TikTok-inspired metrics
          averageWatchPercentage: calculateAverageWatchPercentage(sessionSignals),
          averageLoopCount: calculateAverageLoopCount(sessionSignals),
          skipRate: calculateSkipRate(sessionSignals),
          completionRate: calculateCompletionRate(sessionSignals),
          // Micro-batch feedback loop analytics
          feedbackLoopAnalytics,
          // Enhanced ML logging analytics
          mlLoggingAnalytics
        };
      },

      // Export signal data for debugging
      exportSignalData: async (): Promise<string> => {
        const { 
          sessionSignals, 
          signalQueue, 
          pendingBatches, 
          signalSummary, 
          feedRankingMetrics,
          currentBatch,
          feedbackLoopState,
          batchHistory,
          loggingMetrics,
          dataIngestionMetrics
        } = get();
        
        const exportData = {
          sessionSignals,
          signalQueue,
          pendingBatches,
          signalSummary,
          feedRankingMetrics,
          currentBatch,
          feedbackLoopState,
          batchHistory,
          loggingMetrics,
          dataIngestionMetrics,
          exportTimestamp: Date.now()
        };
        
        return JSON.stringify(exportData, null, 2);
      },

      // Clear signal queue
      clearSignalQueue: () => {
        set({ signalQueue: [] });
        console.log('Signal queue cleared');
      },

      // Get signal history
      getSignalHistory: (timeWindow: number = 24 * 60 * 60 * 1000): UserSignal[] => {
        const { sessionSignals } = get();
        const now = Date.now();
        
        return sessionSignals.filter(signal => 
          now - signal.timestamp <= timeWindow
        );
      }
    }),
    {
      name: 'recommendation-storage',
      storage: simpleJSONStorage,
      // Only persist non-sensitive data
      partialize: (state) => ({
        privacySettings: state.privacySettings,
        privacyMode: state.privacyMode,
        userExperimentGroup: state.userExperimentGroup,
        lastUpdateTime: state.lastUpdateTime,
        signalBatchConfig: state.signalBatchConfig,
        microBatchConfig: state.microBatchConfig,
        // Don't persist recommendations, signals, batches, feedback loop state, or ML logs for privacy
      }),
    }
  )
);

// Helper functions outside the store
function determineSignalType(action: UserAction): SignalType {
  switch (action) {
    case 'like':
    case 'comment':
    case 'share':
    case 'follow':
    case 'unfollow':
    case 'save':
    case 'report':
    case 'hide':
      return 'explicit_engagement';
    
    case 'view':
    case 'dwell':
    case 'scroll_past':
    case 'profile_click':
    case 'video_watch':
    case 'video_loop':
    case 'video_skip':
    case 'video_pause':
    case 'video_replay':
      return 'implicit_behavior';
    
    case 'click':
    case 'scroll':
    case 'swipe':
    case 'back':
    case 'exit':
      return 'navigation';
    
    case 'batch_start':
    case 'batch_complete':
    case 'batch_abandon':
      return 'contextual';
    
    case 'accept':
    case 'dismiss':
    case 'suggestion_view':
    case 'suggestion_click':
    case 'suggestion_accept':
    case 'suggestion_dismiss':
      return 'friend_suggestion';
    
    case 'add_family':
    case 'remove_family':
    case 'update_family':
    case 'verify_family':
    case 'privacy_change':
    case 'family_add':
    case 'family_remove':
    case 'family_verify':
    case 'family_privacy_change':
      return 'family_management';
    
    default:
      return 'contextual';
  }
}

function updateSignalSummary() {
  const state = useRecommendationStore.getState();
  const { sessionSignals } = state;
  
  if (sessionSignals.length === 0) {
    useRecommendationStore.setState({ signalSummary: null });
    return;
  }
  
  const signalsByType: Record<string, number> = {};
  let totalDwellTime = 0;
  let totalScrollVelocity = 0;
  let engagementCount = 0;
  let dwellTimeCount = 0;
  let scrollVelocityCount = 0;

  for (const signal of sessionSignals) {
    // Count by type
    signalsByType[signal.signalType] = (signalsByType[signal.signalType] || 0) + 1;

    // Aggregate metrics
    if (signal.implicitSignal?.dwellTime) {
      totalDwellTime += signal.implicitSignal.dwellTime;
      dwellTimeCount++;
    }

    if (signal.implicitSignal?.scrollVelocity) {
      totalScrollVelocity += signal.implicitSignal.scrollVelocity;
      scrollVelocityCount++;
    }

    if (['like', 'comment', 'share', 'save'].includes(signal.action)) {
      engagementCount++;
    }
  }

  const signalSummary: SignalSummary = {
    totalSignals: sessionSignals.length,
    signalsByType: signalsByType as any,
    averageDwellTime: dwellTimeCount > 0 ? totalDwellTime / dwellTimeCount : 0,
    averageScrollVelocity: scrollVelocityCount > 0 ? totalScrollVelocity / scrollVelocityCount : 0,
    engagementRate: sessionSignals.length > 0 ? engagementCount / sessionSignals.length : 0,
    signalQuality: calculateSignalQuality(sessionSignals)
  };

  useRecommendationStore.setState({ signalSummary });
}

function calculateSignalQuality(signals: UserSignal[]): number {
  if (signals.length === 0) return 0;

  let qualityScore = 0;
  
  for (const signal of signals) {
    // Higher quality for explicit signals
    if (signal.signalType === 'explicit_engagement') {
      qualityScore += 0.8;
    }
    
    // Medium quality for implicit signals with good data
    if (signal.signalType === 'implicit_behavior' && signal.implicitSignal?.dwellTime) {
      qualityScore += 0.6;
    }
    
    // Lower quality for basic navigation signals
    if (signal.signalType === 'navigation') {
      qualityScore += 0.3;
    }
  }

  return qualityScore / signals.length;
}

function extractTopRankingFactors(recommendations: RecommendationResult[]): string[] {
  const factorCounts: Record<string, number> = {};
  
  for (const rec of recommendations) {
    if (rec.rankingFactors) {
      for (const factor of rec.rankingFactors) {
        if (factor.contribution > 0.1) { // Only count significant contributions
          factorCounts[factor.factor] = (factorCounts[factor.factor] || 0) + 1;
        }
      }
    }
  }

  return Object.entries(factorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([factor]) => factor);
}

function calculateSocialGraphUtilization(recommendations: RecommendationResult[]): number {
  const socialRecommendations = recommendations.filter(r => 
    r.socialContext && (
      r.socialContext.friendsWhoEngaged.length > 0 ||
      r.socialContext.mutualFriendEngagement > 0.1
    )
  );

  return recommendations.length > 0 ? socialRecommendations.length / recommendations.length : 0;
}

// TikTok-inspired analytics helper functions
function calculateAverageWatchPercentage(signals: UserSignal[]): number {
  const videoSignals = signals.filter(s => s.contentType === 'video' && s.implicitSignal?.watchPercentage);
  if (videoSignals.length === 0) return 0;
  
  const totalWatchPercentage = videoSignals.reduce((sum, signal) => 
    sum + (signal.implicitSignal?.watchPercentage || 0), 0
  );
  
  return totalWatchPercentage / videoSignals.length;
}

function calculateAverageLoopCount(signals: UserSignal[]): number {
  const loopSignals = signals.filter(s => s.action === 'video_loop' && s.implicitSignal?.loopCount);
  if (loopSignals.length === 0) return 0;
  
  const totalLoops = loopSignals.reduce((sum, signal) => 
    sum + (signal.implicitSignal?.loopCount || 0), 0
  );
  
  return totalLoops / loopSignals.length;
}

function calculateSkipRate(signals: UserSignal[]): number {
  const videoSignals = signals.filter(s => s.contentType === 'video');
  if (videoSignals.length === 0) return 0;
  
  const skipSignals = videoSignals.filter(s => 
    s.action === 'video_skip' || 
    (s.implicitSignal?.dwellTime && s.implicitSignal.dwellTime < 2000)
  );
  
  return skipSignals.length / videoSignals.length;
}

function calculateCompletionRate(signals: UserSignal[]): number {
  const videoSignals = signals.filter(s => s.contentType === 'video');
  if (videoSignals.length === 0) return 0;
  
  const completionSignals = videoSignals.filter(s => 
    s.implicitSignal?.watchPercentage && s.implicitSignal.watchPercentage >= 0.9
  );
  
  return completionSignals.length / videoSignals.length;
}