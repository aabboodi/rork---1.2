// Enhanced types for friend suggestions and family relationships
export interface FamilyRelationship {
  userId: string;
  relationshipType: 'parent' | 'sibling' | 'spouse' | 'child' | 'grandparent' | 'grandchild' | 'uncle_aunt' | 'cousin' | 'other';
  confirmedBy: 'both' | 'sender' | 'receiver';
  createdAt: number;
  displayName?: string;
  isPublic: boolean; // Whether this relationship is visible to others
}

export interface ContactInfo {
  phoneNumber?: string;
  email?: string;
  hashedContact?: string; // Hashed version for privacy
  contactSource: 'phone' | 'email' | 'social' | 'manual';
  lastSynced?: number;
}

export interface LocationProximityData {
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  frequentLocations?: Array<{
    latitude: number;
    longitude: number;
    name?: string;
    visitCount: number;
    lastVisit: number;
  }>;
  workLocation?: {
    latitude: number;
    longitude: number;
    name: string;
    verified: boolean;
  };
  homeLocation?: {
    latitude: number;
    longitude: number;
    verified: boolean;
  };
}

export interface InterestVector {
  technology: number;
  sports: number;
  music: number;
  travel: number;
  food: number;
  art: number;
  business: number;
  health: number;
  education: number;
  entertainment: number;
  fashion: number;
  gaming: number;
  photography: number;
  books: number;
  science: number;
  // Normalized values between 0-1
}

export interface ProfileSimilarityMetrics {
  workplaceSimilarity: number; // 0-1
  educationSimilarity: number; // 0-1
  interestSimilarity: number; // 0-1
  demographicSimilarity: number; // 0-1
  behaviorSimilarity: number; // 0-1
  locationSimilarity: number; // 0-1
}

export interface FriendSuggestionCandidate {
  userId: string;
  candidateType: 'contact' | 'second_degree' | 'profile_similarity' | 'family_network' | 'hybrid';
  sources: Array<{
    type: 'hashed_contact' | 'mutual_friends' | 'workplace' | 'location' | 'interests' | 'family_connection';
    confidence: number;
    metadata?: any;
  }>;
  
  // Scoring components
  mutualFriendsCount: number;
  mutualFamilyCount: number;
  interestVectorSimilarity: number;
  locationProximityScore: number;
  isContact: boolean;
  contactInfo?: ContactInfo;
  
  // Additional metrics
  profileSimilarity: ProfileSimilarityMetrics;
  socialGraphOverlap: number;
  interactionProbability: number;
  
  // Final scores
  rawScore: number;
  normalizedScore: number;
  confidenceScore: number;
  
  // Metadata
  generationTimestamp: number;
  lastUpdated: number;
  suggestionReason: string;
  privacyCompliant: boolean;
}

export interface FriendSuggestionWeights {
  mutualFriendsWeight: number; // w1
  interestSimilarityWeight: number; // w2
  locationProximityWeight: number; // w3
  isContactWeight: number; // w4
  mutualFamilyWeight: number; // w5
  
  // Additional weights for enhanced scoring
  workplaceSimilarityWeight: number;
  educationSimilarityWeight: number;
  behaviorSimilarityWeight: number;
  socialGraphOverlapWeight: number;
  
  // Diversity and exploration
  diversityBonus: number;
  noveltyBonus: number;
  serendipityWeight: number;
}

export interface FriendSuggestionConfig {
  enabled: boolean;
  maxSuggestions: number;
  refreshIntervalMs: number;
  
  // Candidate generation limits
  maxContactCandidates: number;
  maxSecondDegreeCandidates: number;
  maxProfileSimilarityCandidates: number;
  maxFamilyNetworkCandidates: number;
  
  // Scoring thresholds
  minimumScore: number;
  minimumConfidence: number;
  diversityThreshold: number;
  
  // Privacy settings
  respectContactPermissions: boolean;
  respectLocationPermissions: boolean;
  respectFamilyPrivacy: boolean;
  anonymizeData: boolean;
  
  // Algorithm parameters
  weights: FriendSuggestionWeights;
  locationRadiusKm: number;
  interestSimilarityThreshold: number;
  mutualFriendsThreshold: number;
  
  // Cache settings
  cacheEnabled: boolean;
  cacheTTL: number;
  backgroundRefresh: boolean;
}

export interface FriendSuggestionAnalytics {
  totalCandidatesGenerated: number;
  candidatesBySource: Record<string, number>;
  averageScore: number;
  averageConfidence: number;
  suggestionAcceptanceRate: number;
  suggestionDismissalRate: number;
  
  // Performance metrics
  generationTime: number;
  scoringTime: number;
  totalProcessingTime: number;
  
  // Quality metrics
  diversityAchieved: number;
  noveltyScore: number;
  privacyCompliance: number;
  
  // User engagement
  viewRate: number;
  clickThroughRate: number;
  conversionRate: number;
}

export interface FriendSuggestionResult {
  suggestions: FriendSuggestionCandidate[];
  analytics: FriendSuggestionAnalytics;
  generationTimestamp: number;
  nextRefreshTime: number;
  privacyCompliant: boolean;
  
  // Metadata
  userId: string;
  sessionId: string;
  algorithmVersion: string;
  configSnapshot: Partial<FriendSuggestionConfig>;
}

// ===== ENHANCED ML RETRAINING DATA LOGGING PIPELINE =====

// Master Logging Schema v1.0 - Foundation for ML Retraining
export interface InteractionLog {
  // Schema versioning for backward compatibility
  logVersion: string; // "1.0"
  
  // Unique identifiers
  eventID: string; // UUID for this specific log entry
  clientTimestamp: string; // ISO 8601 UTC timestamp when event occurred on client
  serverIngestionTimestamp: string; // ISO 8601 UTC timestamp when server received the log
  
  // Session and user context
  sessionID: string; // Session UUID for grouping related interactions
  userID: string; // Pseudonymized user ID hash for privacy
  
  // Content context
  context: InteractionContext;
  
  // Model prediction data (what the algorithm predicted)
  modelPrediction: ModelPrediction;
  
  // Actual user interaction (ground truth for training)
  finalUserInteraction: UserInteractionData;
  
  // Enhanced: Retraining data collection
  retrainingData?: RetrainingDataPoint;
  
  // Privacy and compliance
  privacyCompliant: boolean;
  dataRetentionPolicy: string; // How long this data should be kept
  
  // Additional metadata
  deviceContext?: DeviceLoggingContext;
  networkContext?: NetworkLoggingContext;
  experimentContext?: ExperimentContext;
}

// ===== NEW: RETRAINING DATA STRUCTURES =====

export interface RetrainingDataPoint {
  // Core retraining triplet: (FeatureVector, PredictedRank, FinalUserInteraction)
  featureVector: AnonymizedFeatureVector;
  predictedRank: number; // Original predicted ranking position
  actualEngagement: EngagementOutcome;
  
  // Model context
  modelVersion: string;
  algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions';
  candidatePoolSize: number;
  
  // Anonymization metadata
  anonymizationLevel: 'basic' | 'enhanced' | 'differential_privacy';
  anonymizationTimestamp: string;
  dataQualityScore: number; // 0-1 quality score for this data point
  
  // Temporal context for model training
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  seasonality: string; // 'spring', 'summer', 'fall', 'winter'
  
  // Cohort information (anonymized)
  userCohort: string; // Anonymized user segment
  demographicCluster: string; // Anonymized demographic group
  
  // Training metadata
  isTrainingCandidate: boolean; // Whether this should be used for training
  isValidationCandidate: boolean; // Whether this should be used for validation
  datasetSplit: 'train' | 'validation' | 'test' | 'holdout';
}

export interface AnonymizedFeatureVector {
  // Content features (anonymized)
  contentType: string;
  contentAge: number; // Normalized 0-1
  contentQuality: number; // Normalized 0-1
  contentPopularity: number; // Normalized 0-1
  
  // User behavior features (anonymized)
  userEngagementHistory: number; // Normalized 0-1
  userSessionTime: number; // Normalized 0-1
  userActivityLevel: number; // Normalized 0-1
  
  // Temporal features
  timeOfDayRelevance: number; // 0-1
  dayOfWeekRelevance: number; // 0-1
  seasonalRelevance: number; // 0-1
  
  // Social features (anonymized)
  socialProofScore: number; // 0-1
  networkInfluence: number; // 0-1
  viralityIndicator: number; // 0-1
  
  // Personalization features (anonymized)
  interestAlignment: number; // 0-1
  behaviorPatternMatch: number; // 0-1
  diversityScore: number; // 0-1
  
  // Context features
  deviceType: 'mobile' | 'tablet' | 'desktop';
  networkQuality: 'poor' | 'fair' | 'good' | 'excellent';
  locationContext: 'home' | 'work' | 'public' | 'unknown';
  
  // Custom features (extensible)
  customFeatures: Record<string, number>;
}

export interface EngagementOutcome {
  // Primary engagement metrics
  engaged: boolean; // Did user engage with content?
  engagementType: 'view' | 'like' | 'comment' | 'share' | 'save' | 'skip' | 'hide';
  engagementStrength: number; // 0-1 normalized engagement strength
  
  // Temporal metrics
  dwellTime: number; // Milliseconds spent viewing
  timeToEngagement: number; // Time from impression to first interaction
  
  // Video-specific metrics (if applicable)
  watchPercentage?: number; // 0-1
  loopCount?: number;
  
  // Negative signals
  skipped: boolean;
  hidden: boolean;
  reported: boolean;
  
  // Session context
  sessionPosition: number; // Position in user's session
  sessionLength: number; // Total session length when this occurred
  
  // Quality indicators
  organicEngagement: boolean; // Not influenced by notifications/prompts
  sustainedAttention: boolean; // User stayed engaged for meaningful time
}

export interface RetrainingDataBatch {
  batchId: string;
  batchTimestamp: string;
  algorithmType: 'posts_feed' | 'clips_feed' | 'friend_suggestions';
  dataPoints: RetrainingDataPoint[];
  
  // Batch metadata
  batchSize: number;
  dataQualityScore: number; // Average quality of data points
  anonymizationLevel: 'basic' | 'enhanced' | 'differential_privacy';
  
  // Privacy compliance
  privacyCompliant: boolean;
  retentionPolicy: string;
  anonymizationApplied: boolean;
  
  // Training readiness
  readyForTraining: boolean;
  validationPassed: boolean;
  dataIntegrityHash: string;
}

export interface RetrainingDataConfig {
  // Collection settings
  enabled: boolean;
  samplingRate: number; // 0-1, what percentage of interactions to log
  
  // Data quality thresholds
  minimumDwellTime: number; // Minimum dwell time to consider valid
  minimumSessionLength: number; // Minimum session length to consider
  
  // Anonymization settings
  anonymizationLevel: 'basic' | 'enhanced' | 'differential_privacy';
  enableDifferentialPrivacy: boolean;
  privacyBudget: number; // For differential privacy
  
  // Batch settings
  batchSize: number; // Number of data points per batch
  batchTimeout: number; // Max time to wait before dispatching batch
  
  // Storage settings
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  
  // Training data splits
  trainingSplit: number; // 0-1, percentage for training
  validationSplit: number; // 0-1, percentage for validation
  testSplit: number; // 0-1, percentage for testing
  
  // Quality assurance
  enableDataValidation: boolean;
  enableOutlierDetection: boolean;
  enableBiasDetection: boolean;
}

export interface RetrainingDataMetrics {
  // Collection metrics
  totalDataPointsCollected: number;
  dataPointsPerAlgorithm: Record<string, number>;
  averageDataQuality: number;
  
  // Privacy metrics
  anonymizationSuccessRate: number;
  privacyComplianceRate: number;
  
  // Training readiness metrics
  trainingReadyDataPoints: number;
  validationReadyDataPoints: number;
  testReadyDataPoints: number;
  
  // Data distribution metrics
  engagementDistribution: Record<string, number>;
  temporalDistribution: Record<string, number>;
  cohortDistribution: Record<string, number>;
  
  // Quality metrics
  dataIntegrityScore: number;
  biasDetectionScore: number;
  outlierDetectionRate: number;
}

// ===== ENHANCED A/B TESTING FRAMEWORK =====

// Core A/B Testing Types
export interface ABTestExperiment {
  experimentId: string;
  experimentName: string;
  description: string;
  
  // Experiment configuration
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  startDate: number;
  endDate: number;
  
  // Traffic allocation
  trafficAllocation: number; // 0-1, percentage of users to include
  targetAudience: ExperimentTargetAudience;
  
  // Variants configuration
  variants: ABTestVariant[];
  
  // Metrics and goals
  primaryMetrics: ExperimentMetric[];
  secondaryMetrics: ExperimentMetric[];
  guardrailMetrics: ExperimentMetric[];
  
  // Statistical configuration
  statisticalConfig: StatisticalConfig;
  
  // Experiment metadata
  createdBy: string;
  createdAt: number;
  lastModified: number;
  tags: string[];
  category: 'algorithm' | 'ui' | 'feature' | 'content' | 'recommendation';
  
  // Results and analysis
  results?: ExperimentResults;
  analysisConfig?: AnalysisConfig;
}

export interface ABTestVariant {
  variantId: string;
  variantName: string;
  description: string;
  allocation: number; // 0-1, percentage within experiment
  isControl: boolean;
  
  // Configuration for this variant
  config: VariantConfig;
  
  // Variant-specific metadata
  createdAt: number;
  enabled: boolean;
}

export interface VariantConfig {
  // Algorithm-specific configurations
  algorithmConfig?: {
    modelVersion?: string;
    weights?: Record<string, number>;
    parameters?: Record<string, any>;
    features?: string[];
  };
  
  // UI/UX configurations
  uiConfig?: {
    theme?: string;
    layout?: string;
    colors?: Record<string, string>;
    components?: Record<string, any>;
  };
  
  // Feature flags
  featureFlags?: Record<string, boolean>;
  
  // Custom configuration
  customConfig?: Record<string, any>;
}

export interface ExperimentTargetAudience {
  // User segmentation
  userSegments?: string[];
  excludeSegments?: string[];
  
  // Geographic targeting
  countries?: string[];
  regions?: string[];
  excludeCountries?: string[];
  
  // Demographic targeting
  ageRange?: { min: number; max: number };
  languages?: string[];
  
  // Behavioral targeting
  userTypes?: ('new' | 'returning' | 'active' | 'inactive')[];
  engagementLevel?: ('low' | 'medium' | 'high')[];
  
  // Platform targeting
  platforms?: ('ios' | 'android' | 'web')[];
  appVersions?: string[];
  
  // Custom targeting
  customFilters?: Record<string, any>;
}

export interface ExperimentMetric {
  metricId: string;
  metricName: string;
  metricType: 'conversion' | 'engagement' | 'retention' | 'revenue' | 'custom';
  
  // Metric configuration
  aggregation: 'sum' | 'average' | 'count' | 'rate' | 'percentile';
  unit: string;
  
  // Statistical requirements
  minimumDetectableEffect: number; // Minimum effect size to detect
  expectedBaseline: number; // Expected baseline value
  
  // Guardrail settings (for guardrail metrics)
  isGuardrail?: boolean;
  guardrailThreshold?: number;
  guardrailDirection?: 'increase' | 'decrease';
}

export interface StatisticalConfig {
  // Power analysis
  statisticalPower: number; // 0-1, typically 0.8
  significanceLevel: number; // 0-1, typically 0.05
  
  // Sample size
  minimumSampleSize: number;
  maximumSampleSize?: number;
  
  // Analysis method
  analysisMethod: 'frequentist' | 'bayesian';
  multipleTestingCorrection: 'bonferroni' | 'benjamini_hochberg' | 'none';
  
  // Sequential testing
  enableSequentialTesting: boolean;
  sequentialTestingConfig?: {
    lookbackPeriods: number[];
    alphaSpending: 'obrien_fleming' | 'pocock' | 'custom';
    earlyStoppingRules: EarlyStoppingRule[];
  };
}

export interface EarlyStoppingRule {
  ruleType: 'futility' | 'superiority' | 'guardrail_violation';
  threshold: number;
  consecutivePeriods: number;
  enabled: boolean;
}

export interface ExperimentResults {
  // Overall results
  status: 'running' | 'completed' | 'stopped_early' | 'inconclusive';
  conclusionDate?: number;
  
  // Statistical results
  statisticalSignificance: boolean;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  
  // Variant performance
  variantResults: VariantResults[];
  
  // Metric results
  metricResults: MetricResult[];
  
  // Analysis metadata
  analysisTimestamp: number;
  sampleSize: number;
  actualPower: number;
}

export interface VariantResults {
  variantId: string;
  variantName: string;
  
  // Traffic and exposure
  usersAssigned: number;
  usersExposed: number;
  exposureRate: number;
  
  // Primary metrics
  primaryMetricValues: Record<string, number>;
  primaryMetricConfidenceIntervals: Record<string, [number, number]>;
  
  // Secondary metrics
  secondaryMetricValues: Record<string, number>;
  
  // Guardrail metrics
  guardrailMetricValues: Record<string, number>;
  guardrailViolations: string[];
  
  // Performance indicators
  isWinner: boolean;
  winProbability: number;
  expectedLift: number;
}

export interface MetricResult {
  metricId: string;
  metricName: string;
  
  // Statistical test results
  testStatistic: number;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  
  // Practical significance
  practicalSignificance: boolean;
  businessImpact: number;
  
  // Variant comparisons
  variantComparisons: VariantComparison[];
}

export interface VariantComparison {
  controlVariantId: string;
  treatmentVariantId: string;
  
  // Comparison results
  relativeChange: number; // Percentage change
  absoluteChange: number;
  statisticalSignificance: boolean;
  practicalSignificance: boolean;
  
  // Confidence intervals
  relativeChangeCI: [number, number];
  absoluteChangeCI: [number, number];
}

export interface AnalysisConfig {
  // Analysis schedule
  analysisFrequency: 'daily' | 'weekly' | 'custom';
  customAnalysisSchedule?: number[]; // Days since start
  
  // Reporting configuration
  enableAutomatedReporting: boolean;
  reportRecipients: string[];
  reportFormat: 'summary' | 'detailed' | 'executive';
  
  // Alert configuration
  enableAlerts: boolean;
  alertThresholds: AlertThreshold[];
}

export interface AlertThreshold {
  metricId: string;
  thresholdType: 'guardrail_violation' | 'significant_change' | 'sample_size';
  threshold: number;
  alertSeverity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

// A/B Testing Service Interfaces
export interface ABTestingService {
  // Experiment management
  createExperiment(experiment: ABTestExperiment): Promise<string>;
  updateExperiment(experimentId: string, updates: Partial<ABTestExperiment>): Promise<void>;
  deleteExperiment(experimentId: string): Promise<void>;
  getExperiment(experimentId: string): Promise<ABTestExperiment | null>;
  listExperiments(filters?: ExperimentFilters): Promise<ABTestExperiment[]>;
  
  // Experiment lifecycle
  startExperiment(experimentId: string): Promise<void>;
  pauseExperiment(experimentId: string): Promise<void>;
  stopExperiment(experimentId: string, reason: string): Promise<void>;
  archiveExperiment(experimentId: string): Promise<void>;
  
  // User assignment
  assignUserToExperiment(userId: string, experimentId: string): Promise<ABTestAssignment>;
  getUserAssignments(userId: string): Promise<ABTestAssignment[]>;
  getVariantConfig(userId: string, experimentId: string): Promise<VariantConfig | null>;
  
  // Analytics and reporting
  getExperimentResults(experimentId: string): Promise<ExperimentResults>;
  generateExperimentReport(experimentId: string, format: 'summary' | 'detailed'): Promise<ExperimentReport>;
  getExperimentMetrics(experimentId: string, metricIds: string[]): Promise<MetricResult[]>;
  
  // Real-time monitoring
  getExperimentStatus(experimentId: string): Promise<ExperimentStatus>;
  checkGuardrailViolations(experimentId: string): Promise<GuardrailViolation[]>;
  
  // Configuration management
  validateExperimentConfig(experiment: ABTestExperiment): Promise<ValidationResult>;
  estimateSampleSize(config: StatisticalConfig, metrics: ExperimentMetric[]): Promise<SampleSizeEstimate>;
}

export interface ABTestAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  variantName: string;
  assignmentTimestamp: number;
  exposureTimestamp?: number;
  
  // Assignment metadata
  assignmentMethod: 'random' | 'deterministic' | 'manual';
  assignmentContext: Record<string, any>;
  
  // Tracking
  isExposed: boolean;
  exposureEvents: ExposureEvent[];
}

export interface ExposureEvent {
  eventType: 'impression' | 'interaction' | 'conversion';
  timestamp: number;
  context: Record<string, any>;
}

export interface ExperimentFilters {
  status?: ('draft' | 'active' | 'paused' | 'completed' | 'archived')[];
  category?: ('algorithm' | 'ui' | 'feature' | 'content' | 'recommendation')[];
  createdBy?: string;
  tags?: string[];
  dateRange?: { start: number; end: number };
}

export interface ExperimentStatus {
  experimentId: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  
  // Runtime statistics
  usersAssigned: number;
  usersExposed: number;
  exposureRate: number;
  
  // Variant distribution
  variantDistribution: Record<string, number>;
  
  // Health indicators
  healthScore: number; // 0-1
  healthIssues: string[];
  
  // Progress indicators
  progressPercentage: number;
  estimatedCompletionDate?: number;
  
  // Real-time metrics
  realtimeMetrics: Record<string, number>;
  lastUpdated: number;
}

export interface GuardrailViolation {
  metricId: string;
  metricName: string;
  variantId: string;
  
  // Violation details
  currentValue: number;
  thresholdValue: number;
  violationType: 'above_threshold' | 'below_threshold';
  
  // Severity and impact
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  
  // Recommended actions
  recommendedActions: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

export interface SampleSizeEstimate {
  minimumSampleSize: number;
  recommendedSampleSize: number;
  estimatedDuration: number; // Days
  
  // Per-variant sample sizes
  variantSampleSizes: Record<string, number>;
  
  // Assumptions
  assumptions: {
    dailyActiveUsers: number;
    conversionRate: number;
    trafficAllocation: number;
  };
}

export interface ExperimentReport {
  experimentId: string;
  experimentName: string;
  reportType: 'summary' | 'detailed' | 'executive';
  
  // Report metadata
  generatedAt: number;
  generatedBy: string;
  reportPeriod: { start: number; end: number };
  
  // Executive summary
  executiveSummary: {
    conclusion: string;
    recommendation: string;
    keyFindings: string[];
    businessImpact: string;
  };
  
  // Detailed results
  results: ExperimentResults;
  
  // Visualizations and charts
  charts: ReportChart[];
  
  // Appendices
  appendices: {
    methodology: string;
    assumptions: string[];
    limitations: string[];
    nextSteps: string[];
  };
}

export interface ReportChart {
  chartId: string;
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  description: string;
  data: any; // Chart-specific data format
  config: any; // Chart-specific configuration
}

// ===== ANONYMIZATION UTILITIES =====

export interface AnonymizationConfig {
  level: 'basic' | 'enhanced' | 'differential_privacy';
  
  // Basic anonymization
  removeDirectIdentifiers: boolean;
  hashUserIds: boolean;
  generalizeLocations: boolean;
  
  // Enhanced anonymization
  addNoise: boolean;
  noiseLevel: number; // 0-1
  generalizeTimestamps: boolean;
  timestampGranularity: 'hour' | 'day' | 'week';
  
  // Differential privacy
  enableDifferentialPrivacy: boolean;
  privacyBudget: number;
  sensitivity: number;
  
  // K-anonymity
  enableKAnonymity: boolean;
  kValue: number; // Minimum group size
  
  // Data minimization
  removeUnusedFeatures: boolean;
  featureWhitelist: string[];
}

export interface AnonymizationResult {
  success: boolean;
  anonymizedData: any;
  anonymizationLevel: string;
  privacyMetrics: {
    identifiabilityRisk: number; // 0-1
    informationLoss: number; // 0-1
    utilityPreservation: number; // 0-1
  };
  appliedTechniques: string[];
  timestamp: string;
}

// ===== EXISTING TYPES (Enhanced) =====

export interface InteractionContext {
  itemType: 'POST' | 'CLIP' | 'PROFILE_SUGGESTION' | 'FRIEND_SUGGESTION' | 'AD' | 'STORY';
  itemID: string; // UUID of the content item
  itemPosition?: number; // Position in feed/list
  feedType?: 'main_feed' | 'clips_feed' | 'suggestions_feed' | 'search_results';
  screenName?: string; // Which screen the interaction occurred on
  previousItemID?: string; // For sequence analysis
  nextItemID?: string; // For sequence analysis
  
  // Enhanced: Retraining context
  retrainingContext?: {
    candidatePoolSize: number;
    algorithmVersion: string;
    rankingModelUsed: string;
    featureSetVersion: string;
  };
}

export interface ModelPrediction {
  modelVersion: string; // e.g., "posts_v1.2", "clips_v3.1", "friends_v2.0"
  predictedScore: number; // 0-1 predicted engagement/relevance score
  predictionTimestamp: string; // When prediction was made
  
  // Feature vector used for this prediction (critical for model debugging)
  featureVector: FeatureVector;
  
  // A/B testing context
  abTest?: ABTestContext;
  
  // Ranking context
  rankingPosition?: number; // Where this item was ranked
  totalCandidates?: number; // How many items were considered
  candidatePoolSource?: string; // Which candidate generation strategy was used
  
  // Enhanced: Retraining prediction data
  retrainingPrediction?: {
    rawScore: number; // Pre-normalization score
    normalizedScore: number; // Post-normalization score
    confidenceInterval: [number, number]; // Prediction confidence bounds
    modelUncertainty: number; // 0-1 model uncertainty
    featureImportance: Record<string, number>; // Feature contribution scores
  };
}

export interface FeatureVector {
  // Content features
  authorAffinity?: number;
  contentMatchScore?: number;
  recencyDecay?: number;
  qualityScore?: number;
  viralityScore?: number;
  
  // Social features
  socialProofScore?: number;
  friendEngagementScore?: number;
  mutualFriendsCount?: number;
  
  // Behavioral features
  userEngagementHistory?: number;
  timeOfDayRelevance?: number;
  deviceTypeRelevance?: number;
  
  // Temporal features
  contentAge?: number;
  userSessionTime?: number;
  dayOfWeekRelevance?: number;
  
  // Personalization features
  interestAlignment?: number;
  behaviorPatternMatch?: number;
  locationRelevance?: number;
  
  // Batch and feedback loop features
  batchIteration?: number;
  batchPosition?: number;
  adaptiveWeights?: string;
  feedbackLoopIteration?: number;
  
  // Signal-based features
  signalType?: string;
  contentType?: string;
  sessionTime?: number;
  
  // Additional custom features (extensible)
  customFeatures?: Record<string, any>;
}

export interface ABTestContext {
  experimentID: string; // e.g., "exp_color_button_2023"
  variant: string; // "A" (control), "B" (treatment1), etc.
  experimentType: 'ui_test' | 'algorithm_test' | 'feature_test';
  trafficAllocation: number; // Percentage of users in this experiment
  experimentStartDate: string;
  experimentEndDate?: string;
}

export interface UserInteractionData {
  // Primary interaction type
  interactionType: InteractionType;
  
  // Timing data
  dwellTimeMs: number; // Milliseconds spent viewing the content
  timeToInteraction?: number; // Time from impression to first interaction
  
  // Video-specific metrics (null if not video content)
  videoWatchPercentage?: number; // 0-1, percentage of video watched
  videoLoopCount?: number; // Number of times video was replayed
  videoPauseCount?: number; // Number of times video was paused
  videoSeekEvents?: VideoSeekEvent[]; // Seeking behavior within video
  
  // Scroll and navigation behavior
  scrollVelocity?: number; // px/sec, negative for scrolling down
  scrollDirection?: 'up' | 'down' | 'none';
  exitMethod?: 'scroll_past' | 'back_button' | 'tab_switch' | 'app_background';
  
  // Engagement depth
  engagementDepth: number; // 0-1 score of how deeply user engaged
  attentionScore: number; // 0-1 score of user attention quality
  
  // Secondary interactions (array of all interactions with this content)
  secondaryInteractions?: SecondaryInteraction[];
  
  // Context when interaction occurred
  interactionContext?: {
    batteryLevel?: number;
    networkQuality?: 'poor' | 'fair' | 'good' | 'excellent' | 'unknown';
    backgroundApps?: number;
    notificationsDuringView?: number;
  };
}

export type InteractionType = 
  | 'IMPRESSION' // Content was shown to user
  | 'CLICK' // User clicked/tapped on content
  | 'LIKE' // User liked the content
  | 'COMMENT' // User commented on content
  | 'SHARE' // User shared the content
  | 'SAVE' // User saved/bookmarked content
  | 'HIDE' // User hid the content
  | 'REPORT' // User reported the content
  | 'SKIP' // User quickly scrolled past (negative signal)
  | 'FOLLOW' // User followed the content creator
  | 'PROFILE_CLICK' // User clicked on creator's profile
  | 'LONG_PRESS' // User long-pressed on content
  | 'SWIPE_LEFT' // User swiped left (negative)
  | 'SWIPE_RIGHT' // User swiped right (positive)
  | 'DOUBLE_TAP' // User double-tapped (like)
  | 'PINCH_ZOOM' // User zoomed into content
  | 'SCREENSHOT' // User took screenshot
  | 'COPY_LINK' // User copied content link
  | 'DOWNLOAD' // User downloaded content
  | 'FULL_SCREEN' // User viewed content in full screen
  | 'MINIMIZE' // User minimized content
  | 'REPLAY' // User replayed video content
  | 'SEEK_FORWARD' // User seeked forward in video
  | 'SEEK_BACKWARD' // User seeked backward in video
  | 'VOLUME_CHANGE' // User changed volume
  | 'QUALITY_CHANGE' // User changed video quality
  | 'CAPTIONS_TOGGLE' // User toggled captions
  | 'SPEED_CHANGE' // User changed playback speed
  | 'PICTURE_IN_PICTURE' // User used PiP mode
  | 'CAST' // User cast content to another device
  | 'ADD_TO_PLAYLIST' // User added to playlist
  | 'REMOVE_FROM_PLAYLIST' // User removed from playlist
  | 'RATE' // User rated content
  | 'REVIEW' // User wrote a review
  | 'SUBSCRIBE' // User subscribed to creator
  | 'UNSUBSCRIBE' // User unsubscribed from creator
  | 'BLOCK' // User blocked creator
  | 'MUTE' // User muted creator
  | 'TURN_ON_NOTIFICATIONS' // User enabled notifications
  | 'TURN_OFF_NOTIFICATIONS' // User disabled notifications
  | 'VIEW_SIMILAR' // User viewed similar content
  | 'VIEW_MORE_FROM_CREATOR' // User viewed more from same creator
  | 'SEARCH_RELATED' // User searched for related content
  | 'EXTERNAL_SHARE' // User shared outside the app
  | 'COPY_TEXT' // User copied text from content
  | 'TRANSLATE' // User translated content
  | 'TEXT_TO_SPEECH' // User used text-to-speech
  | 'ACCESSIBILITY_ACTION' // User used accessibility features
  | 'CUSTOM_ACTION'; // Custom app-specific actions

export interface SecondaryInteraction {
  type: InteractionType;
  timestamp: string; // ISO 8601 UTC
  value?: number; // For quantifiable interactions (rating, seek position, etc.)
  metadata?: Record<string, any>; // Additional context
}

export interface VideoSeekEvent {
  fromPosition: number; // Seconds
  toPosition: number; // Seconds
  timestamp: string; // ISO 8601 UTC
  seekType: 'user_initiated' | 'auto_skip' | 'chapter_jump';
}

export interface DeviceLoggingContext {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'watch' | 'car';
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'linux';
  appVersion: string;
  osVersion: string;
  screenResolution: string; // "1920x1080"
  screenDensity: number; // DPI
  availableMemory: number; // MB
  batteryLevel?: number; // 0-100
  isCharging?: boolean;
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  connectionSpeed?: number; // Mbps
  isLowPowerMode?: boolean;
  isDarkMode?: boolean;
  isAccessibilityEnabled?: boolean;
  preferredLanguage: string;
  timezone: string;
}

export interface NetworkLoggingContext {
  connectionType: 'wifi' | '5g' | '4g' | '3g' | '2g' | 'ethernet' | 'unknown';
  downloadSpeed?: number; // Mbps
  uploadSpeed?: number; // Mbps
  latency?: number; // ms
  isMetered?: boolean; // Is user on a metered connection
  signalStrength?: number; // 0-100
  carrierName?: string;
  isRoaming?: boolean;
  dataUsageSession?: number; // MB used this session
}

export interface ExperimentContext {
  activeExperiments: ABTestContext[];
  userSegment?: string; // User segment for targeting
  cohortId?: string; // User cohort for analysis
  featureFlags?: Record<string, boolean>; // Active feature flags
  personalizedWeights?: Record<string, number>; // User-specific algorithm weights
}

// Logging Configuration and Management
export interface LoggingConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Sampling rates (0-1) to control data volume
  impressionSamplingRate: number; // Sample rate for impression logs
  interactionSamplingRate: number; // Sample rate for interaction logs
  errorSamplingRate: number; // Sample rate for error logs
  
  // Enhanced: Retraining data sampling
  retrainingDataSamplingRate: number; // Sample rate for retraining data collection
  
  // Data retention policies
  retentionPolicyDays: number; // How long to keep logs
  anonymizationDelayDays: number; // When to anonymize user data
  
  // Privacy settings
  enableUserDataCollection: boolean;
  enableDeviceDataCollection: boolean;
  enableLocationDataCollection: boolean;
  enableBehaviorDataCollection: boolean;
  
  // Enhanced: Client-side batching configuration
  batchSize: number; // N logs to batch before sending (e.g., 20)
  flushIntervalMs: number; // T milliseconds to wait before sending (e.g., 60000)
  maxQueueSize: number; // Maximum logs to queue before dropping
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  
  // Quality assurance
  enableDataValidation: boolean;
  enableSchemaValidation: boolean;
  enableDuplicateDetection: boolean;
  
  // Real-time processing
  enableRealTimeProcessing: boolean;
  realTimeProcessingThreshold: number; // Process immediately if queue exceeds this
  
  // Enhanced: Retraining data collection
  retrainingDataConfig: RetrainingDataConfig;
  
  // A/B testing for logging itself
  enableLoggingExperiments: boolean;
  loggingExperimentConfig?: ABTestContext;
}

export interface LoggingMetrics {
  totalLogsGenerated: number;
  totalLogsSuccessfullySent: number;
  totalLogsFailed: number;
  averageLogSize: number; // bytes
  averageBatchSize: number;
  averageFlushTime: number; // ms
  queueUtilization: number; // 0-1
  errorRate: number; // 0-1
  dataCompressionRatio: number; // 0-1
  networkUsage: number; // MB
  storageUsage: number; // MB
  lastSuccessfulFlush: string; // ISO 8601 UTC
  lastError?: string;
  performanceMetrics: {
    logGenerationTime: number; // ms
    serializationTime: number; // ms
    compressionTime: number; // ms
    encryptionTime: number; // ms
    networkTransmissionTime: number; // ms
  };
  
  // Enhanced: Retraining data metrics
  retrainingDataMetrics: RetrainingDataMetrics;
}

export interface LoggingService {
  // Core logging methods
  logInteraction(log: InteractionLog): Promise<void>;
  logImpression(context: InteractionContext, prediction: ModelPrediction): Promise<void>;
  logError(error: Error, context?: any): Promise<void>;
  
  // Enhanced: Retraining data logging
  logRetrainingData(dataPoint: RetrainingDataPoint): Promise<void>;
  logRetrainingBatch(batch: RetrainingDataBatch): Promise<void>;
  
  // Enhanced: Batch operations with client-side batching
  flushLogs(): Promise<void>;
  flushRetrainingData(): Promise<void>;
  clearQueue(): void;
  
  // Configuration
  updateConfig(config: Partial<LoggingConfig>): void;
  getConfig(): LoggingConfig;
  
  // Enhanced: Metrics and monitoring with data ingestion metrics
  getMetrics(): LoggingMetrics;
  getDataIngestionMetrics?(): any; // Additional metrics for data ingestion
  getRetrainingDataMetrics(): RetrainingDataMetrics;
  getServiceStatus?(): any; // Service status for monitoring
  resetMetrics(): void;
  
  // Data management
  exportLogs(startDate: string, endDate: string): Promise<InteractionLog[]>;
  exportRetrainingData(startDate: string, endDate: string): Promise<RetrainingDataPoint[]>;
  anonymizeLogs(beforeDate: string): Promise<void>;
  deleteLogs(beforeDate: string): Promise<void>;
  
  // Quality assurance
  validateLog(log: InteractionLog): boolean;
  validateRetrainingData(dataPoint: RetrainingDataPoint): boolean;
  detectDuplicates(logs: InteractionLog[]): InteractionLog[];
  
  // Privacy compliance
  requestDataDeletion(userID: string): Promise<void>;
  requestDataExport(userID: string): Promise<InteractionLog[]>;
  anonymizeUserData(userID: string): Promise<void>;
}

// Enhanced existing types
export interface UserFeatureVector {
  userId: string;
  interests: InterestVector;
  behaviorPatterns: BehaviorPatterns;
  contentPreferences: ContentPreferences;
  socialGraph: SocialGraphFeatures;
  temporalPatterns: TemporalPatterns;
  locationPatterns?: LocationPatterns;
  familyNetwork?: FamilyNetworkFeatures;
  contactNetwork?: ContactNetworkFeatures;
  lastUpdated: number;
  version: string;
}

export interface FamilyNetworkFeatures {
  familySize: number;
  familyEngagementLevel: number;
  familyInterestDiversity: number;
  familyLocationSpread: number;
  familyConnectionStrength: number;
  publicFamilyConnections: number;
}

export interface ContactNetworkFeatures {
  contactSyncEnabled: boolean;
  totalContacts: number;
  contactsOnPlatform: number;
  contactEngagementRate: number;
  contactInvitationsSent: number;
  contactInvitationsAccepted: number;
}

export interface LocationPatterns {
  homeLocation?: {
    latitude: number;
    longitude: number;
    confidence: number;
  };
  workLocation?: {
    latitude: number;
    longitude: number;
    confidence: number;
  };
  frequentLocations: Array<{
    latitude: number;
    longitude: number;
    visitFrequency: number;
    averageDuration: number;
    lastVisit: number;
  }>;
  mobilityScore: number; // How much the user moves around
  locationPrivacyLevel: 'public' | 'friends' | 'family' | 'private';
}

export interface SocialGraphFeatures {
  totalFriends: number;
  totalFamily: number;
  totalColleagues: number;
  networkDensity: number;
  clusteringCoefficient: number;
  centralityScore: number;
  diversityScore: number;
  engagementLevel: number;
  mutualConnectionsAverage: number;
  networkGrowthRate: number;
}

export interface BehaviorPatterns {
  sessionFrequency: number;
  averageSessionDuration: number;
  peakActivityHours: number[];
  contentConsumptionRate: number;
  socialInteractionRate: number;
  explorationTendency: number;
  privacyConsciousness: number;
  platformLoyalty: number;
}

export interface ContentPreferences {
  preferredContentTypes: ContentType[];
  preferredLanguages: string[];
  contentQualityThreshold: number;
  diversityPreference: number;
  noveltyPreference: number;
  trendingContentAffinity: number;
  personalizedContentAffinity: number;
}

export interface TemporalPatterns {
  timeZone: string;
  activeHours: number[];
  weekdayActivity: number[];
  seasonalPatterns: Record<string, number>;
  responseTimePatterns: number[];
  engagementTimePatterns: number[];
}

// Signal types for friend suggestions
export interface FriendSuggestionSignal extends UserSignal {
  suggestionId: string;
  candidateUserId: string;
  action: 'view' | 'click' | 'accept' | 'dismiss' | 'block' | 'report';
  suggestionType: 'contact' | 'second_degree' | 'profile_similarity' | 'family_network';
  suggestionReason: string;
  position: number;
  viewDuration?: number;
  dismissalReason?: string;
}

export interface FamilyManagementSignal extends UserSignal {
  action: 'add_family' | 'remove_family' | 'update_family' | 'verify_family' | 'privacy_change';
  familyMemberId?: string;
  relationshipType?: string;
  privacyLevel?: string;
  verificationMethod?: string;
}

// Existing types that need to be maintained for compatibility
export interface UserSignal {
  id: string;
  userId: string;
  signalType: SignalType;
  contentId: string;
  contentType: ContentType;
  action: UserAction;
  context: SignalContext;
  timestamp: number;
  sessionId: string;
  anonymized: boolean;
  privacyCompliant: boolean;
  explicitSignal?: ExplicitSignalData;
  implicitSignal?: ImplicitSignalData;
  batchId?: string;
  batchPosition?: number;
  feedbackLoopIteration?: number;
}

export interface SignalContext {
  screenName: string;
  position: number;
  timeSpent: number;
  scrollDepth: number;
  deviceContext?: DeviceContext;
  locationContext?: LocationContext;
  socialContext?: SocialContext;
  contentContext?: ContentContext;
  temporalContext?: TemporalContext;
}

export interface DeviceContext {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: 'ios' | 'android' | 'web';
  screenSize: { width: number; height: number };
  networkType: 'wifi' | 'cellular' | 'unknown';
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface LocationContext {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationName?: string;
  locationType?: 'home' | 'work' | 'public' | 'unknown';
  privacyLevel: 'precise' | 'approximate' | 'city' | 'none';
}

export interface SocialContext {
  friendsNearby?: number;
  socialActivity?: 'high' | 'medium' | 'low';
  groupContext?: string;
  eventContext?: string;
}

export interface ContentContext {
  authorId?: string;
  contentCategory?: string;
  contentTags?: string[];
  contentQuality?: number;
  contentAge?: number;
  isSponsored?: boolean;
}

export interface TemporalContext {
  dayOfWeek: number;
  hourOfDay: number;
  isWeekend: boolean;
  isHoliday?: boolean;
  timeZone: string;
  seasonality?: string;
}

export type SignalType = 
  | 'explicit_engagement' 
  | 'implicit_behavior' 
  | 'navigation' 
  | 'content_interaction' 
  | 'social_interaction' 
  | 'temporal' 
  | 'contextual' 
  | 'content_analysis'
  | 'friend_suggestion'
  | 'family_management';

export type UserAction = 
  | 'like' | 'comment' | 'share' | 'save' | 'report' | 'hide'
  | 'follow' | 'unfollow' | 'block' | 'unblock'
  | 'view' | 'click' | 'dwell' | 'scroll_past' | 'scroll'
  | 'swipe' | 'back' | 'exit' | 'profile_click'
  | 'video_watch' | 'video_pause' | 'video_skip' | 'video_replay' | 'video_loop'
  | 'batch_start' | 'batch_complete' | 'batch_abandon'
  | 'suggestion_view' | 'suggestion_click' | 'suggestion_accept' | 'suggestion_dismiss'
  | 'family_add' | 'family_remove' | 'family_verify' | 'family_privacy_change'
  | 'accept' | 'dismiss' | 'add_family' | 'remove_family' | 'update_family' | 'verify_family' | 'privacy_change'
  | 'donate';

export type ContentType = 'text' | 'image' | 'video' | 'shared' | 'sponsored' | 'suggestion' | 'family';

export interface ExplicitSignalData {
  rating?: number;
  feedback?: string;
  preference?: 'like' | 'dislike' | 'neutral';
  category?: string;
  tags?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  reactionType?: string;
  commentText?: string;
  shareDestination?: string;
  saveCategory?: string;
  donationAmount?: number;
  donationCurrency?: string;
}

export interface ImplicitSignalData {
  dwellTime: number;
  scrollVelocity: number;
  engagementDepth: number;
  attentionScore: number;
  exitMethod: string;
  watchPercentage?: number;
  loopCount?: number;
  interactionSequence?: string[];
}

export interface ContentSignalData {
  contentVector?: number[];
  topicDistribution?: Record<string, number>;
  qualityScore?: number;
  viralityScore?: number;
  engagementVelocity?: number;
  contentAge?: number;
}

// Rest of the existing types remain the same...
export interface RecommendationResult {
  contentId: string;
  contentType: ContentType;
  score: number;
  confidence: number;
  reasons: RecommendationReason[];
  diversityScore: number;
  privacyCompliant: boolean;
  metadata: RecommendationMetadata;
  signalContribution: SignalContribution[];
  rankingFactors: RankingFactor[];
  socialContext?: SocialRankingContext;
  batchId?: string;
  batchPosition?: number;
  adaptiveScore?: number;
  feedbackLoopIteration?: number;
}

export interface RecommendationReason {
  type: string;
  description: string;
  confidence: number;
  weight: number;
  signalBased: boolean;
}

export interface RecommendationMetadata {
  generationTime: number;
  modelVersion: string;
  cacheable: boolean;
  ttl: number;
  signalFreshness: number;
  personalizationLevel: number;
  candidatePoolSize: number;
  featureComputationTime: number;
  rankingComputationTime: number;
  socialGraphDepth: number;
  feedbackLoopEnabled: boolean;
  adaptiveRanking: boolean;
  batchGenerationTime: number;
  previousBatchInfluence: number;
}

export interface SignalContribution {
  signalType: SignalType;
  contribution: number;
  confidence: number;
  recency: number;
  weight: number;
}

export interface RankingFactor {
  factor: string;
  value: number;
  contribution: number;
  confidence: number;
  description: string;
  explanation?: string;
}

export interface SocialRankingContext {
  friendsWhoEngaged: string[];
  mutualFriendEngagement: number;
  socialProofScore: number;
  viralityIndicator: number;
  groupContext?: string;
  influencerEngagement?: number;
}

// Additional interfaces for the recommendation system
export interface RecommendationPrivacySettings {
  allowPersonalization: boolean;
  allowBehaviorTracking: boolean;
  allowSocialGraphAnalysis: boolean;
  allowLocationBasedRecommendations: boolean;
  allowCrossAppTracking: boolean;
  dataRetentionDays: number;
  anonymizeData: boolean;
}

export interface ConsentRecord {
  userId: string;
  consentId: string;
  consentType: 'signal_collection' | 'personalization' | 'social_analysis' | 'location_tracking' | 'contact_access' | 'family_network';
  granted: boolean;
  timestamp: number;
  expiryDate?: number;
  withdrawalDate?: number;
  granularPermissions: Record<string, boolean>;
  signalPermissions: Record<SignalType, boolean>;
}

export interface ABTestConfig {
  testId: string;
  testName: string;
  enabled: boolean;
  trafficAllocation: number;
  variants: ABTestVariant[];
  startDate: number;
  endDate: number;
  metrics: string[];
  signalTracking: boolean;
}

export interface SignalBatch {
  batchId: string;
  userId: string;
  signals: UserSignal[];
  batchTimestamp: number;
  sessionId: string;
  batchSize: number;
  compressionUsed: boolean;
  checksumHash: string;
  privacyCompliant: boolean;
  feedbackLoopBatchId?: string;
  feedbackLoopIteration?: number;
  realTimeProcessing?: boolean;
}

export interface SignalBatchConfig {
  maxBatchSize: number;
  maxBatchAge: number;
  compressionThreshold: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  realTimeProcessingEnabled: boolean;
  feedbackLoopPriority: boolean;
  adaptiveProcessing: boolean;
}

export interface SignalProcessingResult {
  batchId: string;
  processedSignals: number;
  failedSignals: number;
  processingTime: number;
  errors: string[];
  featureUpdates: FeatureUpdate[];
  adaptiveUpdates: AdaptiveUpdate[];
  nextBatchRecommendations: string[];
  feedbackLoopMetrics: FeedbackLoopMetrics;
}

export interface FeatureUpdate {
  userId: string;
  featureType: string;
  previousValue: number;
  newValue: number;
  confidence: number;
  updateReason: string;
  timestamp: number;
}

export interface AdaptiveUpdate {
  userId: string;
  updateType: 'weight_adjustment' | 'threshold_change' | 'strategy_switch';
  component: string;
  previousValue: any;
  newValue: any;
  improvement: number;
  confidence: number;
  timestamp: number;
}

export interface FeedbackLoopMetrics {
  adaptationSpeed: number;
  learningEfficiency: number;
  userSatisfactionTrend: number;
  convergenceProgress: number;
  explorationBalance: number;
}

export interface SignalSummary {
  totalSignals: number;
  signalsByType: Record<SignalType, number>;
  averageDwellTime: number;
  averageScrollVelocity: number;
  engagementRate: number;
  signalQuality: number;
}

export interface ProcessingStatus {
  queueSize: number;
  processingRate: number;
  averageLatency: number;
  errorRate: number;
  lastProcessedTimestamp: number;
  activeFeedbackLoops: number;
  averageAdaptationTime: number;
  feedbackLoopEfficiency: number;
}

export interface RealTimeSignalProcessor {
  processSignal(signal: UserSignal): Promise<void>;
  processBatch(batch: SignalBatch): Promise<SignalProcessingResult>;
  processFeedbackLoopBatch(batch: ClipsBatch, signals: UserSignal[]): Promise<ClipsBatch>;
  updateUserFeatures(userId: string, signals: UserSignal[]): Promise<void>;
  getProcessingStatus(): ProcessingStatus;
}

// Micro-batch feedback loop types
export interface ClipsBatch {
  batchId: string;
  userId: string;
  clipIds: string[];
  batchSize: number;
  batchType: 'initial' | 'adaptive' | 'exploration' | 'convergence';
  generationTimestamp: number;
  consumedTimestamp?: number;
  feedbackLoopIteration: number;
  candidatePoolSize: number;
  rankingModelVersion: string;
  adaptiveFactors: AdaptiveRankingFactors;
  batchMetrics: BatchMetrics;
  previousBatchSignals: UserSignal[];
}

export interface BatchConsumptionTracker {
  batchId: string;
  userId: string;
  clipConsumptionStatus: Record<string, ClipConsumptionStatus>;
  batchStartTime: number;
  currentClipIndex: number;
  totalClipsInBatch: number;
  consumptionVelocity: number;
  batchProgress: number;
  isCompleted: boolean;
  isAbandoned: boolean;
  abandonmentReason?: string;
}

export interface ClipConsumptionStatus {
  clipId: string;
  batchPosition: number;
  viewStartTime: number;
  viewEndTime?: number;
  watchPercentage: number;
  loopCount: number;
  dwellTime: number;
  skipSignal: boolean;
  engagementActions: UserAction[];
  consumptionComplete: boolean;
  satisfactionScore: number;
}

export interface FeedbackLoopState {
  userId: string;
  currentIteration: number;
  totalIterations: number;
  activeBatch?: ClipsBatch;
  previousBatches: ClipsBatch[];
  pendingSignals: UserSignal[];
  adaptiveLearningRate: number;
  convergenceScore: number;
  explorationRate: number;
  lastAdaptationTime: number;
  adaptationHistory: AdaptationEvent[];
}

export interface AdaptiveRankingFactors {
  userEngagementVelocity: number;
  recentSkipRate: number;
  preferredWatchPercentage: number;
  loopingBehavior: number;
  sessionMomentum: number;
  explorationAppetite: number;
  adaptiveWeights: TikTokScoringWeights;
}

export interface TikTokScoringWeights {
  watchPercentageWeight: number;
  loopCountWeight: number;
  shareCountWeight: number;
  skipSignalWeight: number;
  adaptiveBonus: number;
}

export interface BatchMetrics {
  averageWatchPercentage: number;
  averageLoopCount: number;
  skipRate: number;
  engagementRate: number;
  completionRate: number;
  averageDwellTime: number;
  batchConsumptionTime: number;
  userSatisfactionScore: number;
}

export interface MicroBatchConfig {
  batchSize: number;
  maxBatchAge: number;
  adaptationThreshold: number;
  explorationRate: number;
  convergenceThreshold: number;
  maxIterations: number;
  realTimeProcessing: boolean;
  adaptiveWeightAdjustment: boolean;
  batchPreloadCount: number;
  signalProcessingDelay: number;
}

export interface AdaptationEvent {
  timestamp: number;
  iteration: number;
  batchId: string;
  adaptationType: 'weight_adjustment' | 'exploration_increase' | 'convergence_detected' | 'strategy_switch';
  previousMetrics: BatchMetrics;
  newMetrics: BatchMetrics;
  improvement: number;
  adaptationReason: string;
}

export interface FeedbackLoopAnalytics {
  totalBatches: number;
  currentIteration: number;
  convergenceScore: number;
  explorationRate: number;
  adaptationCount: number;
  averageBatchSatisfaction: number;
}

// Feed ranking types
export interface FeedRankingPipeline {
  candidateGeneration: CandidateGenerationConfig;
  featureExtraction: FeatureExtractionConfig;
  scoring: ScoringConfig;
  diversification: DiversificationConfig;
  privacyFiltering: PrivacyFilteringConfig;
  signalIntegration: SignalIntegrationConfig;
}

export interface CandidateGenerationConfig {
  strategies: CandidateStrategy[];
  maxCandidates: number;
  timeoutMs: number;
  socialGraphDepth: number;
  temporalWindow: number;
}

export interface CandidateStrategy {
  name: string;
  weight: number;
  enabled: boolean;
  config: Record<string, any>;
}

export interface FeatureExtractionConfig {
  enabled: boolean;
  features: FeatureConfig[];
  computationTimeout: number;
  cacheFeatures: boolean;
  featureCacheTTL: number;
}

export interface FeatureConfig {
  name: string;
  weight: number;
  enabled: boolean;
  config: Record<string, any>;
  computationCost: 'low' | 'medium' | 'high';
}

export interface ScoringConfig {
  models: FeedScoringModel[];
  ensembleMethod: string;
  timeoutMs: number;
  signalFeatures: SignalFeatureConfig[];
  decayFunctions: DecayFunction[];
}

export interface FeedScoringModel {
  name: string;
  weight: number;
  enabled: boolean;
  features: string[];
  config: Record<string, any>;
  signalDependencies: SignalType[];
  modelType: 'linear' | 'tree' | 'neural' | 'ensemble';
}

export interface SignalFeatureConfig {
  signalType: SignalType;
  weight: number;
  decayRate: number;
  aggregationWindow: number;
  enabled: boolean;
}

export interface DecayFunction {
  name: string;
  halfLife: number;
  minValue: number;
  maxAge: number;
}

export interface DiversificationConfig {
  enabled: boolean;
  diversityWeight: number;
  maxSimilarContent: number;
  temporalDiversity: boolean;
  topicalDiversity: boolean;
  authorDiversity: boolean;
  signalBasedDiversity: boolean;
}

export interface PrivacyFilteringConfig {
  enabled: boolean;
  respectUserPrivacy: boolean;
  filterBlockedUsers: boolean;
  filterReportedContent: boolean;
  ageAppropriate: boolean;
  signalPrivacyCompliance: boolean;
}

export interface SignalIntegrationConfig {
  enabled: boolean;
  realTimeWeight: number;
  signalDecayRate: number;
  signalAggregationMethod: string;
  minimumSignalCount: number;
}

export interface PostUserFeatureVector {
  userId: string;
  postId: string;
  authorAffinity: AuthorAffinityMetrics;
  engagementMetrics: EngagementMetrics;
  contentMatch: ContentMatchMetrics;
  recencyMetrics: RecencyMetrics;
  socialContext: SocialRankingContext;
  computationTimestamp: number;
  cacheKey: string;
  ttl: number;
}

export interface AuthorAffinityMetrics {
  historicalInteractionScore: number;
  recentInteractionScore: number;
  interactionFrequency: number;
  interactionDiversity: number;
  mutualConnectionStrength: number;
  authorInfluenceScore: number;
  personalizedAffinityScore: number;
}

export interface EngagementMetrics {
  totalEngagements: number;
  recentEngagements: number;
  engagementVelocity: number;
  engagementDiversity: number;
  qualityEngagementScore: number;
  timeDecayedEngagement: number;
  socialProofEngagement: number;
}

export interface ContentMatchMetrics {
  interestVectorSimilarity: number;
  topicSimilarity: number;
  contentTypeSimilarity: number;
  qualityScore: number;
  noveltyScore: number;
  personalizedRelevanceScore: number;
  contextualRelevanceScore: number;
}

export interface RecencyMetrics {
  postAge: number;
  recencyScore: number;
  freshnessBonus: number;
  timeDecayFactor: number;
  optimalTimingScore: number;
  temporalRelevanceScore: number;
}

export interface FeedRankingMetrics {
  candidatesGenerated: number;
  candidatesRanked: number;
  averageRankingScore: number;
  topRankingFactors: string[];
  socialGraphUtilization: number;
  personalizedResults: number;
  diversityAchieved: number;
  computationTime: number;
}

export interface UserInteractionHistory {
  userId: string;
  authorInteractions: Map<string, AuthorInteractionMetrics>;
  contentTypePreferences: Record<ContentType, number>;
  temporalPatterns: TemporalPatterns;
  engagementPatterns: EngagementPatterns;
  socialInteractionPatterns: SocialInteractionPatterns;
  lastUpdated: number;
}

export interface AuthorInteractionMetrics {
  authorId: string;
  totalInteractions: number;
  recentInteractions: number;
  interactionTypes: Record<UserAction, number>;
  averageEngagementTime: number;
  lastInteractionTime: number;
  interactionQuality: number;
  affinityScore: number;
}

export interface EngagementPatterns {
  averageEngagementTime: number;
  preferredEngagementTypes: UserAction[];
  engagementFrequency: number;
  qualityThreshold: number;
  diversityPreference: number;
}

export interface SocialInteractionPatterns {
  friendInteractionRate: number;
  groupInteractionRate: number;
  influencerInteractionRate: number;
  socialProofSensitivity: number;
  viralContentAffinity: number;
}

export interface SocialGraphAffinity {
  userId: string;
  socialGraph: Map<string, ConnectionStrength>;
  groupMemberships: Map<string, GroupAffinity>;
  influencerFollowing: Map<string, InfluencerAffinity>;
  familyConnections: Map<string, FamilyConnectionStrength>;
  lastUpdated: number;
}

export interface ConnectionStrength {
  connectionId: string;
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  interactionFrequency: number;
  mutualConnections: number;
  relationshipType: 'friend' | 'family' | 'colleague' | 'acquaintance' | 'influencer';
  connectionDate: number;
  lastInteraction: number;
  affinityScore: number;
}

export interface GroupAffinity {
  groupId: string;
  membershipType: 'member' | 'admin' | 'moderator';
  engagementLevel: number;
  influenceScore: number;
  joinDate: number;
  lastActivity: number;
}

export interface InfluencerAffinity {
  influencerId: string;
  followDate: number;
  engagementRate: number;
  contentAffinity: number;
  influenceReceptivity: number;
  lastInteraction: number;
}

export interface FamilyConnectionStrength {
  familyMemberId: string;
  relationshipType: string;
  connectionStrength: number;
  interactionFrequency: number;
  sharedInterests: number;
  privacyLevel: string;
  verificationStatus: 'verified' | 'pending' | 'unverified';
}

export interface SocialGraphCandidateStrategy {
  name: 'immediate_friends' | 'friend_liked_content' | 'group_content' | 'second_degree_friends' | 'trending_in_network';
  weight: number;
  enabled: boolean;
  maxCandidates: number;
  timeWindow: number;
  config: {
    minEngagementThreshold?: number;
    friendInfluenceWeight?: number;
    groupInfluenceWeight?: number;
    diversityBonus?: number;
  };
}

export interface RecommendationAnalytics {
  userId: string;
  sessionId: string;
  totalRecommendations: number;
  recommendationsByType: Record<ContentType, number>;
  averageScore: number;
  averageConfidence: number;
  clickThroughRate: number;
  engagementRate: number;
  diversityAchieved: number;
  personalizedResults: number;
  signalUtilization: Record<SignalType, number>;
  processingMetrics: ProcessingMetrics;
  privacyCompliance: PrivacyComplianceMetrics;
  timestamp: number;
}

export interface ProcessingMetrics {
  candidateGenerationTime: number;
  featureExtractionTime: number;
  scoringTime: number;
  diversificationTime: number;
  totalProcessingTime: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface PrivacyComplianceMetrics {
  consentCompliance: number;
  dataMinimization: number;
  anonymizationLevel: number;
  retentionCompliance: number;
  accessControlCompliance: number;
}

export interface PrivacyAuditLog {
  auditId: string;
  userId: string;
  action: string;
  dataTypes: string[];
  purpose: string;
  legalBasis: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  consentStatus: boolean;
  dataRetentionPeriod: number;
  anonymized: boolean;
}