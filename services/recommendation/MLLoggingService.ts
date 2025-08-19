import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  InteractionLog, 
  LoggingConfig, 
  LoggingMetrics, 
  LoggingService,
  InteractionContext,
  ModelPrediction,
  UserInteractionData,
  InteractionType,
  FeatureVector,
  ABTestContext,
  DeviceLoggingContext,
  NetworkLoggingContext,
  ExperimentContext,
  // Enhanced: Retraining data types
  RetrainingDataPoint,
  RetrainingDataBatch,
  RetrainingDataConfig,
  RetrainingDataMetrics,
  AnonymizedFeatureVector,
  EngagementOutcome,
  AnonymizationConfig
} from '@/types/recommendation';
import SecurityManager from '@/services/security/SecurityManager';
import NetworkSecurity from '@/services/security/NetworkSecurity';
import AnonymizationService from '@/utils/anonymization';

interface QueuedLog {
  log: InteractionLog;
  timestamp: number;
  retryCount: number;
}

interface QueuedRetrainingData {
  dataPoint: RetrainingDataPoint;
  timestamp: number;
  retryCount: number;
}

interface LoggingState {
  isInitialized: boolean;
  isProcessing: boolean;
  lastFlushTime: number;
  queueSize: number;
  totalLogsGenerated: number;
  totalLogsSent: number;
  totalLogsFailed: number;
  // Enhanced: Retraining data state
  totalRetrainingDataGenerated: number;
  totalRetrainingDataSent: number;
  totalRetrainingDataFailed: number;
}

interface BatchDispatchConfig {
  maxBatchSize: number; // N logs (e.g., 20)
  maxBatchAge: number; // T milliseconds (e.g., 60 seconds)
  compressionEnabled: boolean;
  retryAttempts: number;
  retryDelay: number;
  apiEndpoint: string;
  // Enhanced: Retraining data endpoints
  retrainingDataEndpoint: string;
  retrainingBatchEndpoint: string;
}

interface DataIngestionMetrics {
  totalBatchesDispatched: number;
  totalBatchesFailed: number;
  averageBatchSize: number;
  averageDispatchTime: number;
  compressionRatio: number;
  networkUsage: number;
  lastSuccessfulDispatch: string;
  ingestionThroughput: number; // logs per second
  // Enhanced: Retraining data metrics
  totalRetrainingBatchesDispatched: number;
  totalRetrainingBatchesFailed: number;
  averageRetrainingBatchSize: number;
  retrainingDataThroughput: number;
}

class MLLoggingService implements LoggingService {
  private static instance: MLLoggingService;
  private config: LoggingConfig;
  private logQueue: QueuedLog[] = [];
  private retrainingDataQueue: QueuedRetrainingData[] = [];
  private metrics: LoggingMetrics;
  private state: LoggingState;
  private batchTimer: NodeJS.Timeout | null = null;
  private retrainingBatchTimer: NodeJS.Timeout | null = null;
  private securityManager: SecurityManager;
  private networkSecurity: NetworkSecurity;
  private anonymizationService: AnonymizationService;
  private sessionId: string;
  
  // Enhanced batching configuration
  private batchDispatchConfig: BatchDispatchConfig;
  private dataIngestionMetrics: DataIngestionMetrics;
  private backgroundService: boolean = false;

  private constructor() {
    this.securityManager = SecurityManager.getInstance();
    this.networkSecurity = NetworkSecurity.getInstance();
    this.anonymizationService = AnonymizationService.getInstance();
    this.sessionId = this.generateSessionId();
    
    this.config = {
      enabled: true,
      logLevel: 'info',
      impressionSamplingRate: 1.0,
      interactionSamplingRate: 1.0,
      errorSamplingRate: 1.0,
      retentionPolicyDays: 90,
      anonymizationDelayDays: 30,
      enableUserDataCollection: true,
      enableDeviceDataCollection: true,
      enableLocationDataCollection: false,
      enableBehaviorDataCollection: true,
      batchSize: 20,
      flushIntervalMs: 60000,
      maxQueueSize: 1000,
      compressionEnabled: true,
      encryptionEnabled: true,
      enableDataValidation: true,
      enableSchemaValidation: true,
      enableDuplicateDetection: true,
      enableRealTimeProcessing: false,
      realTimeProcessingThreshold: 100,
      enableLoggingExperiments: false,
      // Enhanced: Retraining data sampling
      retrainingDataSamplingRate: 0.1, // 10% sampling for retraining data
      // Enhanced: Retraining data configuration
      retrainingDataConfig: {
        enabled: true,
        samplingRate: 0.1, // 10% of interactions
        minimumDwellTime: 1000, // 1 second minimum
        minimumSessionLength: 30000, // 30 seconds minimum
        anonymizationLevel: 'enhanced',
        enableDifferentialPrivacy: false,
        privacyBudget: 1.0,
        batchSize: 50, // Larger batches for retraining data
        batchTimeout: 300000, // 5 minutes
        retentionDays: 365, // Keep retraining data longer
        compressionEnabled: true,
        encryptionEnabled: true,
        trainingSplit: 0.7,
        validationSplit: 0.2,
        testSplit: 0.1,
        enableDataValidation: true,
        enableOutlierDetection: true,
        enableBiasDetection: true
      }
    };

    // Enhanced batch dispatch configuration
    this.batchDispatchConfig = {
      maxBatchSize: 20,
      maxBatchAge: 60000,
      compressionEnabled: true,
      retryAttempts: 3,
      retryDelay: 1000,
      apiEndpoint: '/v1/ml-telemetry/log',
      // Enhanced: Retraining data endpoints
      retrainingDataEndpoint: '/v1/ml-retraining/data',
      retrainingBatchEndpoint: '/v1/ml-retraining/batch'
    };

    this.metrics = {
      totalLogsGenerated: 0,
      totalLogsSuccessfullySent: 0,
      totalLogsFailed: 0,
      averageLogSize: 0,
      averageBatchSize: 0,
      averageFlushTime: 0,
      queueUtilization: 0,
      errorRate: 0,
      dataCompressionRatio: 0,
      networkUsage: 0,
      storageUsage: 0,
      lastSuccessfulFlush: new Date().toISOString(),
      performanceMetrics: {
        logGenerationTime: 0,
        serializationTime: 0,
        compressionTime: 0,
        encryptionTime: 0,
        networkTransmissionTime: 0
      },
      // Enhanced: Retraining data metrics
      retrainingDataMetrics: {
        totalDataPointsCollected: 0,
        dataPointsPerAlgorithm: {},
        averageDataQuality: 0,
        anonymizationSuccessRate: 0,
        privacyComplianceRate: 0,
        trainingReadyDataPoints: 0,
        validationReadyDataPoints: 0,
        testReadyDataPoints: 0,
        engagementDistribution: {},
        temporalDistribution: {},
        cohortDistribution: {},
        dataIntegrityScore: 0,
        biasDetectionScore: 0,
        outlierDetectionRate: 0
      }
    };

    this.dataIngestionMetrics = {
      totalBatchesDispatched: 0,
      totalBatchesFailed: 0,
      averageBatchSize: 0,
      averageDispatchTime: 0,
      compressionRatio: 0,
      networkUsage: 0,
      lastSuccessfulDispatch: new Date().toISOString(),
      ingestionThroughput: 0,
      // Enhanced: Retraining data metrics
      totalRetrainingBatchesDispatched: 0,
      totalRetrainingBatchesFailed: 0,
      averageRetrainingBatchSize: 0,
      retrainingDataThroughput: 0
    };

    this.state = {
      isInitialized: false,
      isProcessing: false,
      lastFlushTime: Date.now(),
      queueSize: 0,
      totalLogsGenerated: 0,
      totalLogsSent: 0,
      totalLogsFailed: 0,
      // Enhanced: Retraining data state
      totalRetrainingDataGenerated: 0,
      totalRetrainingDataSent: 0,
      totalRetrainingDataFailed: 0
    };

    this.initialize();
  }

  static getInstance(): MLLoggingService {
    if (!MLLoggingService.instance) {
      MLLoggingService.instance = new MLLoggingService();
    }
    return MLLoggingService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Load persisted configuration
      await this.loadPersistedConfig();
      
      // Load persisted metrics
      await this.loadPersistedMetrics();
      
      // Start background batching service
      this.startBackgroundBatchingService();
      
      // Start retraining data batching service
      this.startRetrainingDataBatchingService();
      
      // Load any persisted logs from previous session
      await this.loadPersistedLogs();
      
      this.state.isInitialized = true;
      this.backgroundService = true;
      
      console.log('Enhanced ML Logging Service with Retraining Data Collection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML Logging Service:', error);
      this.state.isInitialized = false;
    }
  }

  // ===== ENHANCED: RETRAINING DATA COLLECTION =====

  /**
   * Log retraining data point for ML model improvement
   */
  async logRetrainingData(dataPoint: RetrainingDataPoint): Promise<void> {
    if (!this.config.enabled || !this.config.retrainingDataConfig.enabled) {
      return;
    }

    try {
      // Apply sampling rate
      if (Math.random() > this.config.retrainingDataConfig.samplingRate) {
        return;
      }

      // Validate data point
      if (!this.validateRetrainingData(dataPoint)) {
        console.warn('Invalid retraining data point, skipping');
        return;
      }

      // Anonymize data point
      const anonymizationResult = await this.anonymizationService.anonymizeRetrainingData(
        dataPoint,
        {
          level: this.config.retrainingDataConfig.anonymizationLevel,
          enableDifferentialPrivacy: this.config.retrainingDataConfig.enableDifferentialPrivacy,
          privacyBudget: this.config.retrainingDataConfig.privacyBudget
        }
      );

      if (!anonymizationResult.success) {
        console.error('Failed to anonymize retraining data');
        return;
      }

      const anonymizedDataPoint = anonymizationResult.anonymizedData as RetrainingDataPoint;

      // Add to retraining data queue
      const queuedData: QueuedRetrainingData = {
        dataPoint: anonymizedDataPoint,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.retrainingDataQueue.push(queuedData);
      this.state.totalRetrainingDataGenerated++;
      this.metrics.retrainingDataMetrics.totalDataPointsCollected++;

      // Update algorithm-specific metrics
      const algorithmType = dataPoint.algorithmType;
      this.metrics.retrainingDataMetrics.dataPointsPerAlgorithm[algorithmType] = 
        (this.metrics.retrainingDataMetrics.dataPointsPerAlgorithm[algorithmType] || 0) + 1;

      // Update data quality metrics
      this.updateRetrainingDataQualityMetrics(anonymizedDataPoint);

      // Check if we need to dispatch batch
      if (this.retrainingDataQueue.length >= this.config.retrainingDataConfig.batchSize) {
        await this.dispatchRetrainingDataBatch();
      }

      console.log(`Logged retraining data point for ${algorithmType}`);

    } catch (error) {
      console.error('Failed to log retraining data:', error);
      this.state.totalRetrainingDataFailed++;
    }
  }

  /**
   * Log retraining batch for bulk processing
   */
  async logRetrainingBatch(batch: RetrainingDataBatch): Promise<void> {
    if (!this.config.enabled || !this.config.retrainingDataConfig.enabled) {
      return;
    }

    try {
      // Validate batch
      if (!this.validateRetrainingBatch(batch)) {
        console.warn('Invalid retraining batch, skipping');
        return;
      }

      // Dispatch batch directly
      await this.dispatchRetrainingBatchToServer(batch);

      console.log(`Logged retraining batch ${batch.batchId} with ${batch.batchSize} data points`);

    } catch (error) {
      console.error('Failed to log retraining batch:', error);
    }
  }

  /**
   * Create retraining data point from interaction log
   */
  async createRetrainingDataFromInteraction(
    log: InteractionLog,
    algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions'
  ): Promise<RetrainingDataPoint | null> {
    try {
      if (!log.modelPrediction || !log.finalUserInteraction) {
        return null;
      }

      // Check minimum requirements
      if (log.finalUserInteraction.dwellTimeMs < this.config.retrainingDataConfig.minimumDwellTime) {
        return null;
      }

      // Create anonymized feature vector
      const anonymizedFeatureVector = this.anonymizationService.createAnonymizedFeatureVector(
        log.modelPrediction.featureVector,
        log.finalUserInteraction,
        log.context
      );

      // Create engagement outcome
      const engagementOutcome = this.anonymizationService.createEngagementOutcome(
        log.finalUserInteraction,
        { position: log.context.itemPosition, sessionLength: 0 }
      );

      // Determine dataset split
      const datasetSplit = this.determineDatasetSplit();

      // Create retraining data point
      const retrainingDataPoint: RetrainingDataPoint = {
        featureVector: anonymizedFeatureVector,
        predictedRank: log.modelPrediction.rankingPosition || 0,
        actualEngagement: engagementOutcome,
        modelVersion: log.modelPrediction.modelVersion,
        algorithmType,
        candidatePoolSize: log.modelPrediction.totalCandidates || 0,
        anonymizationLevel: 'enhanced',
        anonymizationTimestamp: new Date().toISOString(),
        dataQualityScore: this.calculateDataQualityScore(log),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        seasonality: this.getCurrentSeason(),
        userCohort: 'general', // Anonymized
        demographicCluster: 'general', // Anonymized
        isTrainingCandidate: datasetSplit === 'train',
        isValidationCandidate: datasetSplit === 'validation',
        datasetSplit
      };

      return retrainingDataPoint;

    } catch (error) {
      console.error('Failed to create retraining data from interaction:', error);
      return null;
    }
  }

  // ===== ENHANCED: INTERACTION LOGGING WITH RETRAINING DATA =====

  async logInteraction(log: InteractionLog): Promise<void> {
    if (!this.config.enabled || !this.state.isInitialized) {
      return;
    }

    const startTime = Date.now();

    try {
      // Apply sampling rate
      if (!this.shouldSampleLog(log)) {
        return;
      }

      // Validate log if enabled
      if (this.config.enableDataValidation && !this.validateLog(log)) {
        console.warn('Invalid log detected, skipping:', log.eventID);
        return;
      }

      // Check for duplicates if enabled
      if (this.config.enableDuplicateDetection && this.isDuplicateLog(log)) {
        console.warn('Duplicate log detected, skipping:', log.eventID);
        return;
      }

      // Enhance log with additional context
      const enhancedLog = await this.enhanceLog(log);

      // Add to queue for batching
      const queuedLog: QueuedLog = {
        log: enhancedLog,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.logQueue.push(queuedLog);
      this.state.queueSize = this.logQueue.length;
      this.state.totalLogsGenerated++;
      this.metrics.totalLogsGenerated++;

      // Enhanced: Create retraining data from interaction
      if (this.config.retrainingDataConfig.enabled && this.shouldCreateRetrainingData(enhancedLog)) {
        const algorithmType = this.determineAlgorithmType(enhancedLog);
        if (algorithmType) {
          const retrainingData = await this.createRetrainingDataFromInteraction(enhancedLog, algorithmType);
          if (retrainingData) {
            await this.logRetrainingData(retrainingData);
          }
        }
      }

      // Update metrics
      const logSize = JSON.stringify(enhancedLog).length;
      this.updateAverageLogSize(logSize);
      this.metrics.performanceMetrics.logGenerationTime = Date.now() - startTime;

      // Check if we need to dispatch immediately (size-based trigger)
      if (this.logQueue.length >= this.batchDispatchConfig.maxBatchSize) {
        await this.dispatchBatch();
      }

      // Check queue size limits
      if (this.logQueue.length > this.config.maxQueueSize) {
        console.warn('Log queue size exceeded, dropping oldest logs');
        this.logQueue = this.logQueue.slice(-this.config.maxQueueSize);
        this.state.queueSize = this.logQueue.length;
      }

    } catch (error) {
      console.error('Failed to log interaction:', error);
      this.metrics.totalLogsFailed++;
      this.state.totalLogsFailed++;
    }
  }

  // ===== RETRAINING DATA BATCHING SERVICE =====

  private startRetrainingDataBatchingService(): void {
    // Clear any existing timer
    if (this.retrainingBatchTimer) {
      clearInterval(this.retrainingBatchTimer);
    }

    // Start the retraining data batching timer
    this.retrainingBatchTimer = setInterval(async () => {
      await this.checkAndDispatchRetrainingDataBatch();
    }, 30000); // Check every 30 seconds

    console.log('Retraining data batching service started');
  }

  private async checkAndDispatchRetrainingDataBatch(): Promise<void> {
    if (this.state.isProcessing || this.retrainingDataQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastFlush = now - this.state.lastFlushTime;
    const shouldDispatchBySize = this.retrainingDataQueue.length >= this.config.retrainingDataConfig.batchSize;
    const shouldDispatchByTime = timeSinceLastFlush >= this.config.retrainingDataConfig.batchTimeout;

    if (shouldDispatchBySize || shouldDispatchByTime) {
      await this.dispatchRetrainingDataBatch();
    }
  }

  private async dispatchRetrainingDataBatch(): Promise<void> {
    if (this.state.isProcessing || this.retrainingDataQueue.length === 0) {
      return;
    }

    this.state.isProcessing = true;
    const startTime = Date.now();

    try {
      // Create batch from current queue
      const batchSize = Math.min(this.retrainingDataQueue.length, this.config.retrainingDataConfig.batchSize);
      const batchData = this.retrainingDataQueue.slice(0, batchSize);
      
      // Create retraining batch
      const retrainingBatch: RetrainingDataBatch = {
        batchId: this.generateBatchId(),
        batchTimestamp: new Date().toISOString(),
        algorithmType: this.determineBatchAlgorithmType(batchData),
        dataPoints: batchData.map(qd => qd.dataPoint),
        batchSize: batchData.length,
        dataQualityScore: this.calculateBatchDataQuality(batchData),
        anonymizationLevel: 'enhanced',
        privacyCompliant: true,
        retentionPolicy: `${this.config.retrainingDataConfig.retentionDays}_days`,
        anonymizationApplied: true,
        readyForTraining: true,
        validationPassed: true,
        dataIntegrityHash: this.calculateDataIntegrityHash(batchData)
      };
      
      // Dispatch to server
      await this.dispatchRetrainingBatchToServer(retrainingBatch);
      
      // Remove successfully dispatched data from queue
      this.retrainingDataQueue = this.retrainingDataQueue.slice(batchSize);
      this.state.totalRetrainingDataSent += batchSize;
      
      // Update metrics
      this.updateRetrainingDispatchMetrics(batchData.length, Date.now() - startTime);
      
      console.log(`Successfully dispatched retraining batch of ${batchData.length} data points`);
      
    } catch (error) {
      console.error('Failed to dispatch retraining batch:', error);
      this.dataIngestionMetrics.totalRetrainingBatchesFailed++;
      this.state.totalRetrainingDataFailed += this.retrainingDataQueue.length;
      
      // Increment retry count for failed data
      this.retrainingDataQueue.forEach(queuedData => {
        queuedData.retryCount++;
      });
      
      // Remove data that has exceeded retry limit
      this.retrainingDataQueue = this.retrainingDataQueue.filter(queuedData => 
        queuedData.retryCount < this.batchDispatchConfig.retryAttempts
      );
      
    } finally {
      this.state.isProcessing = false;
    }
  }

  private async dispatchRetrainingBatchToServer(batch: RetrainingDataBatch): Promise<void> {
    const networkStart = Date.now();
    
    try {
      // Prepare batch payload
      const payload = {
        batch,
        metadata: {
          clientVersion: '1.0.0',
          sessionId: this.sessionId,
          compressionUsed: this.config.retrainingDataConfig.compressionEnabled,
          encryptionUsed: this.config.retrainingDataConfig.encryptionEnabled
        }
      };

      const serializedPayload = JSON.stringify(payload);

      // Use NetworkSecurity for secure request
      const response = await this.networkSecurity.secureRequest(
        `https://api.connectapp.com${this.batchDispatchConfig.retrainingBatchEndpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Batch-Size': batch.batchSize.toString(),
            'X-Algorithm-Type': batch.algorithmType,
            'X-Client-Session': this.sessionId
          },
          body: serializedPayload
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Update metrics
      this.metrics.performanceMetrics.networkTransmissionTime = Date.now() - networkStart;
      this.dataIngestionMetrics.networkUsage += serializedPayload.length / 1024 / 1024; // MB
      this.dataIngestionMetrics.lastSuccessfulDispatch = new Date().toISOString();
      
      console.log('Retraining batch successfully ingested by server:', responseData);
      
    } catch (error) {
      console.error('Failed to dispatch retraining batch to server:', error);
      throw error;
    }
  }

  // ===== EXISTING METHODS (Enhanced) =====

  // 1.2. CLIENT-SIDE SIGNAL BATCHING AGENT (Enhanced)
  private startBackgroundBatchingService(): void {
    // Clear any existing timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    // Start the batching timer
    this.batchTimer = setInterval(async () => {
      await this.checkAndDispatchBatch();
    }, 5000); // Check every 5 seconds

    console.log('Background batching service started');
  }

  private async checkAndDispatchBatch(): Promise<void> {
    if (this.state.isProcessing || this.logQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastFlush = now - this.state.lastFlushTime;
    const shouldDispatchBySize = this.logQueue.length >= this.batchDispatchConfig.maxBatchSize;
    const shouldDispatchByTime = timeSinceLastFlush >= this.batchDispatchConfig.maxBatchAge;

    if (shouldDispatchBySize || shouldDispatchByTime) {
      await this.dispatchBatch();
    }
  }

  private async dispatchBatch(): Promise<void> {
    if (this.state.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.state.isProcessing = true;
    const startTime = Date.now();

    try {
      // Create batch from current queue
      const batchSize = Math.min(this.logQueue.length, this.batchDispatchConfig.maxBatchSize);
      const batchLogs = this.logQueue.slice(0, batchSize);
      
      // Prepare batch payload
      const batchPayload = await this.prepareBatchPayload(batchLogs);
      
      // Dispatch to server
      await this.dispatchToServer(batchPayload);
      
      // Remove successfully dispatched logs from queue
      this.logQueue = this.logQueue.slice(batchSize);
      this.state.queueSize = this.logQueue.length;
      this.state.lastFlushTime = Date.now();
      
      // Update metrics
      this.updateDispatchMetrics(batchLogs.length, Date.now() - startTime);
      
      console.log(`Successfully dispatched batch of ${batchLogs.length} logs`);
      
    } catch (error) {
      console.error('Failed to dispatch batch:', error);
      this.dataIngestionMetrics.totalBatchesFailed++;
      
      // Increment retry count for failed logs
      this.logQueue.forEach(queuedLog => {
        queuedLog.retryCount++;
      });
      
      // Remove logs that have exceeded retry limit
      this.logQueue = this.logQueue.filter(queuedLog => 
        queuedLog.retryCount < this.batchDispatchConfig.retryAttempts
      );
      this.state.queueSize = this.logQueue.length;
      
    } finally {
      this.state.isProcessing = false;
    }
  }

  private async prepareBatchPayload(batchLogs: QueuedLog[]): Promise<any> {
    const serializationStart = Date.now();
    
    // Extract logs and add server ingestion timestamp
    const logs = batchLogs.map(queuedLog => ({
      ...queuedLog.log,
      serverIngestionTimestamp: new Date().toISOString()
    }));

    // Create batch metadata
    const batchMetadata = {
      batchId: this.generateBatchId(),
      batchSize: logs.length,
      batchTimestamp: new Date().toISOString(),
      clientVersion: '1.0.0',
      sessionId: this.sessionId,
      compressionUsed: this.batchDispatchConfig.compressionEnabled,
      encryptionUsed: this.config.encryptionEnabled
    };

    // Serialize the payload
    const payload = {
      metadata: batchMetadata,
      logs: logs
    };

    const serializedPayload = JSON.stringify(payload);
    this.metrics.performanceMetrics.serializationTime = Date.now() - serializationStart;

    // Apply compression if enabled
    let finalPayload = serializedPayload;
    if (this.batchDispatchConfig.compressionEnabled) {
      const compressionStart = Date.now();
      // In a real implementation, you would use a compression library like pako
      // For now, we'll simulate compression
      finalPayload = serializedPayload; // Placeholder
      this.metrics.performanceMetrics.compressionTime = Date.now() - compressionStart;
      this.dataIngestionMetrics.compressionRatio = finalPayload.length / serializedPayload.length;
    }

    return {
      payload: finalPayload,
      originalSize: serializedPayload.length,
      compressedSize: finalPayload.length
    };
  }

  private async dispatchToServer(batchData: any): Promise<void> {
    const networkStart = Date.now();
    
    try {
      // Use NetworkSecurity for secure request
      const response = await this.networkSecurity.secureRequest(
        `https://api.connectapp.com${this.batchDispatchConfig.apiEndpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Batch-Size': batchData.payload.length.toString(),
            'X-Compression-Used': this.batchDispatchConfig.compressionEnabled.toString(),
            'X-Client-Session': this.sessionId
          },
          body: batchData.payload
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Update metrics
      this.metrics.performanceMetrics.networkTransmissionTime = Date.now() - networkStart;
      this.dataIngestionMetrics.networkUsage += batchData.compressedSize / 1024 / 1024; // MB
      this.dataIngestionMetrics.lastSuccessfulDispatch = new Date().toISOString();
      
      console.log('Batch successfully ingested by server:', responseData);
      
    } catch (error) {
      console.error('Failed to dispatch batch to server:', error);
      throw error;
    }
  }

  private updateDispatchMetrics(batchSize: number, dispatchTime: number): void {
    this.dataIngestionMetrics.totalBatchesDispatched++;
    this.dataIngestionMetrics.averageBatchSize = 
      (this.dataIngestionMetrics.averageBatchSize + batchSize) / 2;
    this.dataIngestionMetrics.averageDispatchTime = 
      (this.dataIngestionMetrics.averageDispatchTime + dispatchTime) / 2;
    
    // Calculate ingestion throughput (logs per second)
    const totalLogs = this.dataIngestionMetrics.totalBatchesDispatched * this.dataIngestionMetrics.averageBatchSize;
    const totalTime = this.dataIngestionMetrics.totalBatchesDispatched * this.dataIngestionMetrics.averageDispatchTime / 1000;
    this.dataIngestionMetrics.ingestionThroughput = totalTime > 0 ? totalLogs / totalTime : 0;
  }

  private updateRetrainingDispatchMetrics(batchSize: number, dispatchTime: number): void {
    this.dataIngestionMetrics.totalRetrainingBatchesDispatched++;
    this.dataIngestionMetrics.averageRetrainingBatchSize = 
      (this.dataIngestionMetrics.averageRetrainingBatchSize + batchSize) / 2;
    
    // Calculate retraining data throughput
    const totalData = this.dataIngestionMetrics.totalRetrainingBatchesDispatched * this.dataIngestionMetrics.averageRetrainingBatchSize;
    const totalTime = this.dataIngestionMetrics.totalRetrainingBatchesDispatched * dispatchTime / 1000;
    this.dataIngestionMetrics.retrainingDataThroughput = totalTime > 0 ? totalData / totalTime : 0;
  }

  // ===== ENHANCED VALIDATION METHODS =====

  validateRetrainingData(dataPoint: RetrainingDataPoint): boolean {
    try {
      // Check required fields
      if (!dataPoint.featureVector || !dataPoint.actualEngagement || !dataPoint.modelVersion) {
        return false;
      }

      // Validate algorithm type
      if (!['posts_feed', 'clips_feed', 'friend_suggestions'].includes(dataPoint.algorithmType)) {
        return false;
      }

      // Validate data quality score
      if (dataPoint.dataQualityScore < 0 || dataPoint.dataQualityScore > 1) {
        return false;
      }

      // Validate engagement outcome
      if (!this.validateEngagementOutcome(dataPoint.actualEngagement)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Retraining data validation error:', error);
      return false;
    }
  }

  private validateRetrainingBatch(batch: RetrainingDataBatch): boolean {
    try {
      // Check required fields
      if (!batch.batchId || !batch.dataPoints || batch.dataPoints.length === 0) {
        return false;
      }

      // Validate each data point
      for (const dataPoint of batch.dataPoints) {
        if (!this.validateRetrainingData(dataPoint)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Retraining batch validation error:', error);
      return false;
    }
  }

  private validateEngagementOutcome(outcome: EngagementOutcome): boolean {
    // Validate engagement strength
    if (outcome.engagementStrength < 0 || outcome.engagementStrength > 1) {
      return false;
    }

    // Validate dwell time
    if (outcome.dwellTime < 0) {
      return false;
    }

    // Validate watch percentage if present
    if (outcome.watchPercentage !== undefined && 
        (outcome.watchPercentage < 0 || outcome.watchPercentage > 1)) {
      return false;
    }

    return true;
  }

  // ===== ENHANCED HELPER METHODS =====

  private shouldCreateRetrainingData(log: InteractionLog): boolean {
    // Check if this interaction is suitable for retraining data
    if (!log.modelPrediction || !log.finalUserInteraction) {
      return false;
    }

    // Check minimum dwell time
    if (log.finalUserInteraction.dwellTimeMs < this.config.retrainingDataConfig.minimumDwellTime) {
      return false;
    }

    // Apply sampling rate
    return Math.random() <= this.config.retrainingDataConfig.samplingRate;
  }

  private determineAlgorithmType(log: InteractionLog): 'posts_feed' | 'clips_feed' | 'friend_suggestions' | null {
    switch (log.context.itemType) {
      case 'POST':
        return 'posts_feed';
      case 'CLIP':
        return 'clips_feed';
      case 'FRIEND_SUGGESTION':
      case 'PROFILE_SUGGESTION':
        return 'friend_suggestions';
      default:
        return null;
    }
  }

  private determineBatchAlgorithmType(batchData: QueuedRetrainingData[]): 'posts_feed' | 'clips_feed' | 'friend_suggestions' {
    // Determine the most common algorithm type in the batch
    const algorithmCounts: Record<string, number> = {};
    
    batchData.forEach(qd => {
      const type = qd.dataPoint.algorithmType;
      algorithmCounts[type] = (algorithmCounts[type] || 0) + 1;
    });

    const mostCommon = Object.entries(algorithmCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return mostCommon ? mostCommon[0] as any : 'posts_feed';
  }

  private determineDatasetSplit(): 'train' | 'validation' | 'test' | 'holdout' {
    const random = Math.random();
    const config = this.config.retrainingDataConfig;
    
    if (random < config.trainingSplit) {
      return 'train';
    } else if (random < config.trainingSplit + config.validationSplit) {
      return 'validation';
    } else {
      return 'test';
    }
  }

  private calculateDataQualityScore(log: InteractionLog): number {
    let qualityScore = 0.5; // Base score
    
    // Higher quality for longer dwell times
    if (log.finalUserInteraction.dwellTimeMs > 5000) qualityScore += 0.2;
    if (log.finalUserInteraction.dwellTimeMs > 15000) qualityScore += 0.1;
    
    // Higher quality for explicit interactions
    const explicitInteractions = ['LIKE', 'COMMENT', 'SHARE', 'SAVE'];
    if (explicitInteractions.includes(log.finalUserInteraction.interactionType)) {
      qualityScore += 0.2;
    }
    
    // Higher quality for complete feature vectors
    const featureCount = Object.keys(log.modelPrediction.featureVector).length;
    if (featureCount > 5) qualityScore += 0.1;
    
    return Math.min(1, qualityScore);
  }

  private calculateBatchDataQuality(batchData: QueuedRetrainingData[]): number {
    if (batchData.length === 0) return 0;
    
    const totalQuality = batchData.reduce((sum, qd) => sum + qd.dataPoint.dataQualityScore, 0);
    return totalQuality / batchData.length;
  }

  private calculateDataIntegrityHash(batchData: QueuedRetrainingData[]): string {
    const dataString = batchData.map(qd => qd.dataPoint.featureVector).join('');
    return this.generateSimpleHash(dataString);
  }

  private generateSimpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private updateRetrainingDataQualityMetrics(dataPoint: RetrainingDataPoint): void {
    const metrics = this.metrics.retrainingDataMetrics;
    
    // Update average data quality
    const totalPoints = metrics.totalDataPointsCollected;
    metrics.averageDataQuality = ((metrics.averageDataQuality * (totalPoints - 1)) + dataPoint.dataQualityScore) / totalPoints;
    
    // Update engagement distribution
    const engagementType = dataPoint.actualEngagement.engagementType;
    metrics.engagementDistribution[engagementType] = (metrics.engagementDistribution[engagementType] || 0) + 1;
    
    // Update temporal distribution
    const timeSlot = `${dataPoint.timeOfDay}-${dataPoint.dayOfWeek}`;
    metrics.temporalDistribution[timeSlot] = (metrics.temporalDistribution[timeSlot] || 0) + 1;
    
    // Update dataset split counters
    switch (dataPoint.datasetSplit) {
      case 'train':
        metrics.trainingReadyDataPoints++;
        break;
      case 'validation':
        metrics.validationReadyDataPoints++;
        break;
      case 'test':
        metrics.testReadyDataPoints++;
        break;
    }
    
    // Update privacy compliance rate
    metrics.privacyComplianceRate = metrics.totalDataPointsCollected > 0 ? 
      (metrics.privacyComplianceRate * (totalPoints - 1) + 1) / totalPoints : 1;
  }

  // ===== ENHANCED PUBLIC API =====

  async flushRetrainingData(): Promise<void> {
    await this.dispatchRetrainingDataBatch();
  }

  getRetrainingDataMetrics(): RetrainingDataMetrics {
    return { ...this.metrics.retrainingDataMetrics };
  }

  async exportRetrainingData(startDate: string, endDate: string): Promise<RetrainingDataPoint[]> {
    try {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      
      const filteredData = this.retrainingDataQueue
        .filter(queuedData => {
          const dataTime = new Date(queuedData.dataPoint.anonymizationTimestamp).getTime();
          return dataTime >= start && dataTime <= end;
        })
        .map(queuedData => queuedData.dataPoint);

      console.log(`Exported ${filteredData.length} retraining data points for date range ${startDate} to ${endDate}`);
      return filteredData;
    } catch (error) {
      console.error('Failed to export retraining data:', error);
      return [];
    }
  }

  // ===== EXISTING METHODS (Maintained for compatibility) =====

  async logImpression(context: InteractionContext, prediction: ModelPrediction): Promise<void> {
    if (!this.config.enabled || Math.random() > this.config.impressionSamplingRate) {
      return;
    }

    const impressionLog: InteractionLog = {
      logVersion: "1.0",
      eventID: this.generateEventId(),
      clientTimestamp: new Date().toISOString(),
      serverIngestionTimestamp: "",
      sessionID: this.sessionId,
      userID: await this.getPseudonymizedUserId(),
      context,
      modelPrediction: prediction,
      finalUserInteraction: {
        interactionType: 'IMPRESSION',
        dwellTimeMs: 0,
        engagementDepth: 0,
        attentionScore: 0
      },
      privacyCompliant: true,
      dataRetentionPolicy: `${this.config.retentionPolicyDays}_days`
    };

    await this.logInteraction(impressionLog);
  }

  async logError(error: Error, context?: any): Promise<void> {
    if (!this.config.enabled || Math.random() > this.config.errorSamplingRate) {
      return;
    }

    const errorLog: InteractionLog = {
      logVersion: "1.0",
      eventID: this.generateEventId(),
      clientTimestamp: new Date().toISOString(),
      serverIngestionTimestamp: "",
      sessionID: this.sessionId,
      userID: await this.getPseudonymizedUserId(),
      context: {
        itemType: 'POST',
        itemID: 'error_' + Date.now()
      },
      modelPrediction: {
        modelVersion: 'error_handler_v1.0',
        predictedScore: 0,
        predictionTimestamp: new Date().toISOString(),
        featureVector: {}
      },
      finalUserInteraction: {
        interactionType: 'REPORT',
        dwellTimeMs: 0,
        engagementDepth: 0,
        attentionScore: 0,
        interactionContext: {
          errorMessage: error.message,
          errorStack: error.stack,
          errorContext: context
        }
      },
      privacyCompliant: true,
      dataRetentionPolicy: `${this.config.retentionPolicyDays}_days`
    };

    await this.logInteraction(errorLog);
  }

  async flushLogs(): Promise<void> {
    await this.dispatchBatch();
  }

  clearQueue(): void {
    this.logQueue = [];
    this.retrainingDataQueue = [];
    this.state.queueSize = 0;
    console.log('All queues cleared');
  }

  updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.batchSize) {
      this.batchDispatchConfig.maxBatchSize = config.batchSize;
    }
    if (config.flushIntervalMs) {
      this.batchDispatchConfig.maxBatchAge = config.flushIntervalMs;
    }
    
    this.persistConfig();
    console.log('Logging configuration updated');
  }

  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  getMetrics(): LoggingMetrics {
    this.metrics.queueUtilization = this.logQueue.length / this.config.maxQueueSize;
    this.metrics.errorRate = this.metrics.totalLogsFailed / Math.max(this.metrics.totalLogsGenerated, 1);
    
    return { ...this.metrics };
  }

  getDataIngestionMetrics(): any {
    return { ...this.dataIngestionMetrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalLogsGenerated: 0,
      totalLogsSuccessfullySent: 0,
      totalLogsFailed: 0,
      averageLogSize: 0,
      averageBatchSize: 0,
      averageFlushTime: 0,
      queueUtilization: 0,
      errorRate: 0,
      dataCompressionRatio: 0,
      networkUsage: 0,
      storageUsage: 0,
      lastSuccessfulFlush: new Date().toISOString(),
      performanceMetrics: {
        logGenerationTime: 0,
        serializationTime: 0,
        compressionTime: 0,
        encryptionTime: 0,
        networkTransmissionTime: 0
      },
      retrainingDataMetrics: {
        totalDataPointsCollected: 0,
        dataPointsPerAlgorithm: {},
        averageDataQuality: 0,
        anonymizationSuccessRate: 0,
        privacyComplianceRate: 0,
        trainingReadyDataPoints: 0,
        validationReadyDataPoints: 0,
        testReadyDataPoints: 0,
        engagementDistribution: {},
        temporalDistribution: {},
        cohortDistribution: {},
        dataIntegrityScore: 0,
        biasDetectionScore: 0,
        outlierDetectionRate: 0
      }
    };
    
    this.dataIngestionMetrics = {
      totalBatchesDispatched: 0,
      totalBatchesFailed: 0,
      averageBatchSize: 0,
      averageDispatchTime: 0,
      compressionRatio: 0,
      networkUsage: 0,
      lastSuccessfulDispatch: new Date().toISOString(),
      ingestionThroughput: 0,
      totalRetrainingBatchesDispatched: 0,
      totalRetrainingBatchesFailed: 0,
      averageRetrainingBatchSize: 0,
      retrainingDataThroughput: 0
    };
    
    console.log('All metrics reset');
  }

  async exportLogs(startDate: string, endDate: string): Promise<InteractionLog[]> {
    try {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      
      const filteredLogs = this.logQueue
        .filter(queuedLog => {
          const logTime = new Date(queuedLog.log.clientTimestamp).getTime();
          return logTime >= start && logTime <= end;
        })
        .map(queuedLog => queuedLog.log);

      console.log(`Exported ${filteredLogs.length} logs for date range ${startDate} to ${endDate}`);
      return filteredLogs;
    } catch (error) {
      console.error('Failed to export logs:', error);
      return [];
    }
  }

  async anonymizeLogs(beforeDate: string): Promise<void> {
    try {
      const cutoffTime = new Date(beforeDate).getTime();
      
      this.logQueue.forEach(queuedLog => {
        const logTime = new Date(queuedLog.log.clientTimestamp).getTime();
        if (logTime < cutoffTime) {
          queuedLog.log.userID = 'anonymized_' + this.generateEventId().substring(0, 8);
          queuedLog.log.sessionID = 'anonymized_session';
          
          if (queuedLog.log.deviceContext) {
            queuedLog.log.deviceContext = undefined;
          }
          
          if (queuedLog.log.networkContext) {
            queuedLog.log.networkContext = undefined;
          }
        }
      });

      console.log(`Anonymized logs before ${beforeDate}`);
    } catch (error) {
      console.error('Failed to anonymize logs:', error);
    }
  }

  async deleteLogs(beforeDate: string): Promise<void> {
    try {
      const cutoffTime = new Date(beforeDate).getTime();
      
      const initialCount = this.logQueue.length;
      this.logQueue = this.logQueue.filter(queuedLog => {
        const logTime = new Date(queuedLog.log.clientTimestamp).getTime();
        return logTime >= cutoffTime;
      });
      
      const deletedCount = initialCount - this.logQueue.length;
      this.state.queueSize = this.logQueue.length;
      
      console.log(`Deleted ${deletedCount} logs before ${beforeDate}`);
    } catch (error) {
      console.error('Failed to delete logs:', error);
    }
  }

  validateLog(log: InteractionLog): boolean {
    try {
      if (!log.logVersion || !log.eventID || !log.clientTimestamp || !log.userID) {
        return false;
      }

      if (log.logVersion !== "1.0") {
        return false;
      }

      if (!this.isValidISODate(log.clientTimestamp)) {
        return false;
      }

      if (!log.context || !log.context.itemType || !log.context.itemID) {
        return false;
      }

      if (!log.modelPrediction || !log.modelPrediction.modelVersion) {
        return false;
      }

      if (!log.finalUserInteraction || !log.finalUserInteraction.interactionType) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Log validation error:', error);
      return false;
    }
  }

  detectDuplicates(logs: InteractionLog[]): InteractionLog[] {
    const seen = new Set<string>();
    const duplicates: InteractionLog[] = [];

    for (const log of logs) {
      const key = `${log.userID}_${log.context.itemID}_${log.finalUserInteraction.interactionType}_${log.clientTimestamp}`;
      
      if (seen.has(key)) {
        duplicates.push(log);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  async requestDataDeletion(userID: string): Promise<void> {
    try {
      const initialCount = this.logQueue.length;
      this.logQueue = this.logQueue.filter(queuedLog => queuedLog.log.userID !== userID);
      
      const deletedCount = initialCount - this.logQueue.length;
      this.state.queueSize = this.logQueue.length;
      
      // Also delete retraining data
      const initialRetrainingCount = this.retrainingDataQueue.length;
      this.retrainingDataQueue = this.retrainingDataQueue.filter(queuedData => 
        queuedData.dataPoint.userCohort !== userID
      );
      
      const deletedRetrainingCount = initialRetrainingCount - this.retrainingDataQueue.length;
      
      console.log(`Deleted ${deletedCount} logs and ${deletedRetrainingCount} retraining data points for user ${userID}`);
    } catch (error) {
      console.error('Failed to delete user data:', error);
    }
  }

  async requestDataExport(userID: string): Promise<InteractionLog[]> {
    try {
      const userLogs = this.logQueue
        .filter(queuedLog => queuedLog.log.userID === userID)
        .map(queuedLog => queuedLog.log);

      console.log(`Exported ${userLogs.length} logs for user ${userID}`);
      return userLogs;
    } catch (error) {
      console.error('Failed to export user data:', error);
      return [];
    }
  }

  async anonymizeUserData(userID: string): Promise<void> {
    try {
      const anonymizedId = 'anonymized_' + this.generateEventId().substring(0, 8);
      
      this.logQueue.forEach(queuedLog => {
        if (queuedLog.log.userID === userID) {
          queuedLog.log.userID = anonymizedId;
          queuedLog.log.sessionID = 'anonymized_session';
          
          queuedLog.log.deviceContext = undefined;
          queuedLog.log.networkContext = undefined;
        }
      });

      console.log(`Anonymized data for user ${userID}`);
    } catch (error) {
      console.error('Failed to anonymize user data:', error);
    }
  }

  // ===== HELPER METHODS =====

  private shouldSampleLog(log: InteractionLog): boolean {
    const samplingRate = log.finalUserInteraction.interactionType === 'IMPRESSION' 
      ? this.config.impressionSamplingRate 
      : this.config.interactionSamplingRate;
    
    return Math.random() <= samplingRate;
  }

  private isDuplicateLog(log: InteractionLog): boolean {
    const key = `${log.userID}_${log.context.itemID}_${log.finalUserInteraction.interactionType}_${log.clientTimestamp}`;
    
    return this.logQueue.some(queuedLog => {
      const existingKey = `${queuedLog.log.userID}_${queuedLog.log.context.itemID}_${queuedLog.log.finalUserInteraction.interactionType}_${queuedLog.log.clientTimestamp}`;
      return existingKey === key;
    });
  }

  private async enhanceLog(log: InteractionLog): Promise<InteractionLog> {
    const enhanced = { ...log };

    if (this.config.enableDeviceDataCollection) {
      enhanced.deviceContext = await this.getDeviceContext();
    }

    if (this.config.enableDeviceDataCollection) {
      enhanced.networkContext = await this.getNetworkContext();
    }

    enhanced.experimentContext = await this.getExperimentContext();

    return enhanced;
  }

  private updateAverageLogSize(newSize: number): void {
    this.metrics.averageLogSize = (this.metrics.averageLogSize + newSize) / 2;
  }

  private async getDeviceContext(): Promise<DeviceLoggingContext> {
    return {
      deviceType: Platform.OS === 'ios' || Platform.OS === 'android' ? 'mobile' : 'desktop',
      platform: Platform.OS as any,
      appVersion: '1.0.0',
      osVersion: Platform.Version.toString(),
      screenResolution: '1920x1080',
      screenDensity: 2,
      availableMemory: 4096,
      networkType: 'wifi',
      preferredLanguage: 'ar',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private async getNetworkContext(): Promise<NetworkLoggingContext> {
    return {
      connectionType: 'wifi',
      downloadSpeed: 50,
      uploadSpeed: 10,
      latency: 20,
      isMetered: false,
      signalStrength: 85
    };
  }

  private async getExperimentContext(): Promise<ExperimentContext> {
    return {
      activeExperiments: [],
      userSegment: 'standard',
      featureFlags: {},
      personalizedWeights: {}
    };
  }

  private async getPseudonymizedUserId(): Promise<string> {
    return 'user_' + this.generateEventId().substring(0, 16);
  }

  private generateEventId(): string {
    return 'event_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateBatchId(): string {
    return 'batch_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private isValidISODate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString;
    } catch {
      return false;
    }
  }

  private async loadPersistedConfig(): Promise<void> {
    try {
      const configString = await AsyncStorage.getItem('ml_logging_config');
      if (configString) {
        const persistedConfig = JSON.parse(configString);
        this.config = { ...this.config, ...persistedConfig };
      }
    } catch (error) {
      console.error('Failed to load persisted config:', error);
    }
  }

  private async persistConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('ml_logging_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to persist config:', error);
    }
  }

  private async loadPersistedMetrics(): Promise<void> {
    try {
      const metricsString = await AsyncStorage.getItem('ml_logging_metrics');
      if (metricsString) {
        const persistedMetrics = JSON.parse(metricsString);
        this.metrics = { ...this.metrics, ...persistedMetrics };
      }
    } catch (error) {
      console.error('Failed to load persisted metrics:', error);
    }
  }

  private async loadPersistedLogs(): Promise<void> {
    try {
      const logsString = await AsyncStorage.getItem('ml_logging_queue');
      if (logsString) {
        const persistedLogs = JSON.parse(logsString);
        this.logQueue = persistedLogs;
        this.state.queueSize = this.logQueue.length;
      }
    } catch (error) {
      console.error('Failed to load persisted logs:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = null;
      }

      if (this.retrainingBatchTimer) {
        clearInterval(this.retrainingBatchTimer);
        this.retrainingBatchTimer = null;
      }

      await this.flushLogs();
      await this.flushRetrainingData();

      await AsyncStorage.setItem('ml_logging_metrics', JSON.stringify(this.metrics));
      await AsyncStorage.setItem('ml_logging_queue', JSON.stringify(this.logQueue));
      await AsyncStorage.setItem('ml_data_ingestion_metrics', JSON.stringify(this.dataIngestionMetrics));

      this.backgroundService = false;
      console.log('Enhanced ML Logging Service cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup ML Logging Service:', error);
    }
  }

  getServiceStatus(): any {
    return {
      isInitialized: this.state.isInitialized,
      backgroundServiceRunning: this.backgroundService,
      queueSize: this.logQueue.length,
      retrainingDataQueueSize: this.retrainingDataQueue.length,
      lastFlushTime: this.state.lastFlushTime,
      batchDispatchConfig: this.batchDispatchConfig,
      dataIngestionMetrics: this.dataIngestionMetrics,
      totalLogsGenerated: this.state.totalLogsGenerated,
      totalLogsSent: this.state.totalLogsSent,
      totalLogsFailed: this.state.totalLogsFailed,
      totalRetrainingDataGenerated: this.state.totalRetrainingDataGenerated,
      totalRetrainingDataSent: this.state.totalRetrainingDataSent,
      totalRetrainingDataFailed: this.state.totalRetrainingDataFailed
    };
  }
}

export default MLLoggingService;