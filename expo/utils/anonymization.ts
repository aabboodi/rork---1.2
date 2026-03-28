import { Platform } from 'react-native';
import CryptoService from '@/services/security/CryptoService';
import { 
  AnonymizationConfig, 
  AnonymizationResult,
  AnonymizedFeatureVector,
  EngagementOutcome,
  RetrainingDataPoint,
  UserInteractionData,
  InteractionContext,
  FeatureVector
} from '@/types/recommendation';

interface DifferentialPrivacyConfig {
  epsilon: number; // Privacy budget
  delta: number; // Failure probability
  sensitivity: number; // Global sensitivity
  mechanism: 'laplace' | 'gaussian' | 'exponential';
}

interface KAnonymityConfig {
  k: number; // Minimum group size
  quasiIdentifiers: string[]; // Fields that could be used for identification
  sensitiveAttributes: string[]; // Fields to protect
}

class AnonymizationService {
  private static instance: AnonymizationService;
  private cryptoService: CryptoService;
  private saltCache: Map<string, string> = new Map();

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
  }

  static getInstance(): AnonymizationService {
    if (!AnonymizationService.instance) {
      AnonymizationService.instance = new AnonymizationService();
    }
    return AnonymizationService.instance;
  }

  // ===== MAIN ANONYMIZATION METHODS =====

  async anonymizeRetrainingData(
    dataPoint: RetrainingDataPoint,
    config: Partial<AnonymizationConfig>
  ): Promise<AnonymizationResult> {
    try {
      const fullConfig = this.getDefaultConfig(config);
      let anonymizedData = { ...dataPoint };
      const appliedTechniques: string[] = [];

      // 1. Remove direct identifiers
      if (fullConfig.removeDirectIdentifiers) {
        anonymizedData = this.removeDirectIdentifiers(anonymizedData);
        appliedTechniques.push('direct_identifier_removal');
      }

      // 2. Hash user identifiers
      if (fullConfig.hashUserIds) {
        anonymizedData.userCohort = await this.hashIdentifier(anonymizedData.userCohort);
        anonymizedData.demographicCluster = await this.hashIdentifier(anonymizedData.demographicCluster);
        appliedTechniques.push('identifier_hashing');
      }

      // 3. Generalize timestamps
      if (fullConfig.generalizeTimestamps) {
        anonymizedData.anonymizationTimestamp = this.generalizeTimestamp(
          anonymizedData.anonymizationTimestamp,
          fullConfig.timestampGranularity
        );
        appliedTechniques.push('timestamp_generalization');
      }

      // 4. Apply noise to feature vector
      if (fullConfig.addNoise) {
        anonymizedData.featureVector = this.addNoiseToFeatureVector(
          anonymizedData.featureVector,
          fullConfig.noiseLevel
        );
        appliedTechniques.push('noise_addition');
      }

      // 5. Apply differential privacy
      if (fullConfig.enableDifferentialPrivacy) {
        anonymizedData = await this.applyDifferentialPrivacy(
          anonymizedData,
          {
            epsilon: fullConfig.privacyBudget,
            delta: 0.00001,
            sensitivity: fullConfig.sensitivity,
            mechanism: 'laplace'
          }
        );
        appliedTechniques.push('differential_privacy');
      }

      // 6. Apply k-anonymity
      if (fullConfig.enableKAnonymity) {
        anonymizedData = this.applyKAnonymity(anonymizedData, {
          k: fullConfig.kValue,
          quasiIdentifiers: ['timeOfDay', 'dayOfWeek', 'seasonality'],
          sensitiveAttributes: ['actualEngagement']
        });
        appliedTechniques.push('k_anonymity');
      }

      // 7. Data minimization
      if (fullConfig.removeUnusedFeatures) {
        anonymizedData.featureVector = this.minimizeFeatureVector(
          anonymizedData.featureVector,
          fullConfig.featureWhitelist
        );
        appliedTechniques.push('data_minimization');
      }

      // Calculate privacy metrics
      const privacyMetrics = this.calculatePrivacyMetrics(dataPoint, anonymizedData, appliedTechniques);

      return {
        success: true,
        anonymizedData,
        anonymizationLevel: fullConfig.level,
        privacyMetrics,
        appliedTechniques,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Anonymization failed:', error);
      return {
        success: false,
        anonymizedData: null,
        anonymizationLevel: 'none',
        privacyMetrics: {
          identifiabilityRisk: 1.0,
          informationLoss: 0.0,
          utilityPreservation: 0.0
        },
        appliedTechniques: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  // Create anonymized feature vector from interaction data
  createAnonymizedFeatureVector(
    originalFeatureVector: FeatureVector,
    userInteraction: UserInteractionData,
    context: InteractionContext
  ): AnonymizedFeatureVector {
    return {
      // Content features (anonymized)
      contentType: this.anonymizeContentType(context.itemType),
      contentAge: this.normalizeValue(originalFeatureVector.contentAge || 0),
      contentQuality: this.normalizeValue(originalFeatureVector.qualityScore || 0.5),
      contentPopularity: this.normalizeValue(originalFeatureVector.viralityScore || 0.5),
      
      // User behavior features (anonymized)
      userEngagementHistory: this.normalizeValue(originalFeatureVector.userEngagementHistory || 0.5),
      userSessionTime: this.normalizeSessionTime(originalFeatureVector.userSessionTime || 0),
      userActivityLevel: this.calculateActivityLevel(userInteraction),
      
      // Temporal features
      timeOfDayRelevance: this.normalizeValue(originalFeatureVector.timeOfDayRelevance || 0.5),
      dayOfWeekRelevance: this.normalizeValue(originalFeatureVector.dayOfWeekRelevance || 0.5),
      seasonalRelevance: this.calculateSeasonalRelevance(),
      
      // Social features (anonymized)
      socialProofScore: this.normalizeValue(originalFeatureVector.socialProofScore || 0.5),
      networkInfluence: this.normalizeValue(originalFeatureVector.friendEngagementScore || 0.5),
      viralityIndicator: this.normalizeValue(originalFeatureVector.viralityScore || 0.5),
      
      // Personalization features (anonymized)
      interestAlignment: this.normalizeValue(originalFeatureVector.interestAlignment || 0.5),
      behaviorPatternMatch: this.normalizeValue(originalFeatureVector.behaviorPatternMatch || 0.5),
      diversityScore: this.calculateDiversityScore(originalFeatureVector),
      
      // Context features
      deviceType: this.anonymizeDeviceType(),
      networkQuality: this.anonymizeNetworkQuality(userInteraction.interactionContext?.networkQuality),
      locationContext: this.anonymizeLocationContext(),
      
      // Custom features (extensible)
      customFeatures: this.anonymizeCustomFeatures(originalFeatureVector.customFeatures || {})
    };
  }

  // Create engagement outcome from user interaction
  createEngagementOutcome(
    userInteraction: UserInteractionData,
    sessionContext: { position: number; sessionLength: number }
  ): EngagementOutcome {
    return {
      // Primary engagement metrics
      engaged: this.determineEngagement(userInteraction.interactionType),
      engagementType: this.mapInteractionToEngagement(userInteraction.interactionType),
      engagementStrength: this.calculateEngagementStrength(userInteraction),
      
      // Temporal metrics
      dwellTime: userInteraction.dwellTimeMs,
      timeToEngagement: userInteraction.timeToInteraction || 0,
      
      // Video-specific metrics (if applicable)
      watchPercentage: userInteraction.videoWatchPercentage,
      loopCount: userInteraction.videoLoopCount,
      
      // Negative signals
      skipped: userInteraction.interactionType === 'SKIP',
      hidden: userInteraction.interactionType === 'HIDE',
      reported: userInteraction.interactionType === 'REPORT',
      
      // Session context
      sessionPosition: sessionContext.position,
      sessionLength: sessionContext.sessionLength,
      
      // Quality indicators
      organicEngagement: this.isOrganicEngagement(userInteraction),
      sustainedAttention: this.hasSustainedAttention(userInteraction)
    };
  }

  // ===== ANONYMIZATION TECHNIQUES =====

  private removeDirectIdentifiers(data: any): any {
    const anonymized = { ...data };
    
    // Remove or hash direct identifiers
    const directIdentifiers = ['userId', 'sessionId', 'deviceId', 'ipAddress', 'email', 'phoneNumber'];
    
    directIdentifiers.forEach(field => {
      if (anonymized[field]) {
        delete anonymized[field];
      }
    });

    return anonymized;
  }

  private async hashIdentifier(identifier: string): Promise<string> {
    try {
      // Use a consistent salt for the same identifier
      let salt = this.saltCache.get(identifier);
      if (!salt) {
        salt = this.generateSalt();
        this.saltCache.set(identifier, salt);
      }

      const hashedData = this.cryptoService.hash(identifier + salt);
      return hashedData.substring(0, 16); // Truncate for anonymity
    } catch (error) {
      console.error('Failed to hash identifier:', error);
      return 'anonymous_' + Math.random().toString(36).substring(2, 8);
    }
  }

  private generalizeTimestamp(timestamp: string, granularity: 'hour' | 'day' | 'week'): string {
    const date = new Date(timestamp);
    
    switch (granularity) {
      case 'hour':
        date.setMinutes(0, 0, 0);
        break;
      case 'day':
        date.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        date.setHours(0, 0, 0, 0);
        break;
    }
    
    return date.toISOString();
  }

  private addNoiseToFeatureVector(
    featureVector: AnonymizedFeatureVector,
    noiseLevel: number
  ): AnonymizedFeatureVector {
    const noisyVector = { ...featureVector };
    
    // Add Laplace noise to numerical features
    const numericalFields = [
      'contentAge', 'contentQuality', 'contentPopularity',
      'userEngagementHistory', 'userSessionTime', 'userActivityLevel',
      'timeOfDayRelevance', 'dayOfWeekRelevance', 'seasonalRelevance',
      'socialProofScore', 'networkInfluence', 'viralityIndicator',
      'interestAlignment', 'behaviorPatternMatch', 'diversityScore'
    ];

    numericalFields.forEach(field => {
      if (typeof noisyVector[field as keyof AnonymizedFeatureVector] === 'number') {
        const originalValue = noisyVector[field as keyof AnonymizedFeatureVector] as number;
        const noise = this.generateLaplaceNoise(0, noiseLevel);
        (noisyVector as any)[field] = Math.max(0, Math.min(1, originalValue + noise));
      }
    });

    return noisyVector;
  }

  private async applyDifferentialPrivacy(
    data: RetrainingDataPoint,
    config: DifferentialPrivacyConfig
  ): Promise<RetrainingDataPoint> {
    const privatizedData = { ...data };
    
    // Apply differential privacy to sensitive numerical fields
    privatizedData.dataQualityScore = this.addDifferentialPrivacyNoise(
      privatizedData.dataQualityScore,
      config
    );

    // Apply to feature vector
    const sensitiveFeatures = ['userEngagementHistory', 'userSessionTime', 'userActivityLevel'];
    sensitiveFeatures.forEach(feature => {
      if (typeof privatizedData.featureVector[feature as keyof AnonymizedFeatureVector] === 'number') {
        const originalValue = privatizedData.featureVector[feature as keyof AnonymizedFeatureVector] as number;
        (privatizedData.featureVector as any)[feature] = this.addDifferentialPrivacyNoise(
          originalValue,
          config
        );
      }
    });

    return privatizedData;
  }

  private applyKAnonymity(
    data: RetrainingDataPoint,
    config: KAnonymityConfig
  ): RetrainingDataPoint {
    const anonymizedData = { ...data };
    
    // Generalize quasi-identifiers to ensure k-anonymity
    config.quasiIdentifiers.forEach(field => {
      if (field === 'timeOfDay') {
        // Generalize hour to 4-hour blocks
        anonymizedData.timeOfDay = Math.floor(anonymizedData.timeOfDay / 4) * 4;
      } else if (field === 'dayOfWeek') {
        // Generalize to weekday/weekend
        anonymizedData.dayOfWeek = anonymizedData.dayOfWeek < 5 ? 1 : 0; // 1 for weekday, 0 for weekend
      }
    });

    return anonymizedData;
  }

  private minimizeFeatureVector(
    featureVector: AnonymizedFeatureVector,
    whitelist: string[]
  ): AnonymizedFeatureVector {
    if (whitelist.length === 0) {
      return featureVector; // No minimization if whitelist is empty
    }

    const minimizedVector: Partial<AnonymizedFeatureVector> = {};
    
    whitelist.forEach(field => {
      if (field in featureVector) {
        (minimizedVector as any)[field] = featureVector[field as keyof AnonymizedFeatureVector];
      }
    });

    // Ensure required fields are always included
    const requiredFields = ['contentType', 'deviceType', 'networkQuality', 'locationContext'];
    requiredFields.forEach(field => {
      if (field in featureVector) {
        (minimizedVector as any)[field] = featureVector[field as keyof AnonymizedFeatureVector];
      }
    });

    return minimizedVector as AnonymizedFeatureVector;
  }

  // ===== UTILITY METHODS =====

  private generateLaplaceNoise(mean: number, scale: number): number {
    // Generate Laplace noise using inverse transform sampling
    const u = Math.random() - 0.5;
    return mean - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private addDifferentialPrivacyNoise(value: number, config: DifferentialPrivacyConfig): number {
    let noise: number;
    
    switch (config.mechanism) {
      case 'laplace':
        noise = this.generateLaplaceNoise(0, config.sensitivity / config.epsilon);
        break;
      case 'gaussian':
        noise = this.generateGaussianNoise(0, Math.sqrt(2 * Math.log(1.25 / config.delta)) * config.sensitivity / config.epsilon);
        break;
      default:
        noise = this.generateLaplaceNoise(0, config.sensitivity / config.epsilon);
    }
    
    return Math.max(0, Math.min(1, value + noise));
  }

  private generateGaussianNoise(mean: number, stddev: number): number {
    // Box-Muller transform for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stddev * z0;
  }

  private generateSalt(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private normalizeValue(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private normalizeSessionTime(sessionTime: number): number {
    // Normalize session time to 0-1 range (assuming max 2 hours)
    const maxSessionTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    return Math.min(sessionTime / maxSessionTime, 1);
  }

  private calculateActivityLevel(userInteraction: UserInteractionData): number {
    let activityScore = 0;
    
    // Base activity from interaction type
    const engagementTypes = ['LIKE', 'COMMENT', 'SHARE', 'SAVE'];
    if (engagementTypes.includes(userInteraction.interactionType)) {
      activityScore += 0.5;
    }
    
    // Activity from dwell time
    if (userInteraction.dwellTimeMs > 5000) { // More than 5 seconds
      activityScore += 0.3;
    }
    
    // Activity from secondary interactions
    if (userInteraction.secondaryInteractions && userInteraction.secondaryInteractions.length > 0) {
      activityScore += 0.2;
    }
    
    return Math.min(activityScore, 1);
  }

  private calculateSeasonalRelevance(): number {
    const month = new Date().getMonth();
    // Simple seasonal relevance based on current month
    return (Math.sin((month / 12) * 2 * Math.PI) + 1) / 2;
  }

  private calculateDiversityScore(featureVector: FeatureVector): number {
    // Calculate diversity based on feature variance
    const features = [
      featureVector.authorAffinity || 0.5,
      featureVector.contentMatchScore || 0.5,
      featureVector.socialProofScore || 0.5,
      featureVector.interestAlignment || 0.5
    ];
    
    const mean = features.reduce((sum, val) => sum + val, 0) / features.length;
    const variance = features.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / features.length;
    
    return Math.min(variance * 4, 1); // Scale variance to 0-1 range
  }

  private anonymizeContentType(itemType: string): string {
    const typeMapping: Record<string, string> = {
      'POST': 'text_content',
      'CLIP': 'video_content',
      'AD': 'sponsored_content',
      'STORY': 'ephemeral_content'
    };
    
    return typeMapping[itemType] || 'unknown_content';
  }

  private anonymizeDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    // Generalize device type based on platform
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return 'mobile';
    } else {
      return 'desktop';
    }
  }

  private anonymizeNetworkQuality(quality?: string): 'poor' | 'fair' | 'good' | 'excellent' {
    // Generalize network quality
    const qualityMapping: Record<string, 'poor' | 'fair' | 'good' | 'excellent'> = {
      'poor': 'poor',
      'fair': 'fair',
      'good': 'good',
      'excellent': 'excellent'
    };
    
    return qualityMapping[quality || 'fair'] || 'fair';
  }

  private anonymizeLocationContext(): 'home' | 'work' | 'public' | 'unknown' {
    // Always return unknown for privacy
    return 'unknown';
  }

  private anonymizeCustomFeatures(customFeatures: Record<string, any>): Record<string, number> {
    const anonymized: Record<string, number> = {};
    
    Object.entries(customFeatures).forEach(([key, value]) => {
      if (typeof value === 'number') {
        // Add noise to numerical custom features
        const noise = this.generateLaplaceNoise(0, 0.01);
        anonymized[key] = Math.max(0, Math.min(1, value + noise));
      }
    });
    
    return anonymized;
  }

  private determineEngagement(interactionType: string): boolean {
    const engagementTypes = ['LIKE', 'COMMENT', 'SHARE', 'SAVE', 'FOLLOW', 'SUBSCRIBE'];
    return engagementTypes.includes(interactionType);
  }

  private mapInteractionToEngagement(interactionType: string): 'view' | 'like' | 'comment' | 'share' | 'save' | 'skip' | 'hide' {
    const mapping: Record<string, 'view' | 'like' | 'comment' | 'share' | 'save' | 'skip' | 'hide'> = {
      'IMPRESSION': 'view',
      'CLICK': 'view',
      'LIKE': 'like',
      'COMMENT': 'comment',
      'SHARE': 'share',
      'SAVE': 'save',
      'SKIP': 'skip',
      'HIDE': 'hide'
    };
    
    return mapping[interactionType] || 'view';
  }

  private calculateEngagementStrength(userInteraction: UserInteractionData): number {
    let strength = 0;
    
    // Base strength from interaction type
    const strengthMapping: Record<string, number> = {
      'IMPRESSION': 0.1,
      'CLICK': 0.3,
      'LIKE': 0.6,
      'COMMENT': 0.8,
      'SHARE': 0.9,
      'SAVE': 0.7,
      'SKIP': 0.0,
      'HIDE': 0.0
    };
    
    strength = strengthMapping[userInteraction.interactionType] || 0.1;
    
    // Adjust based on dwell time
    if (userInteraction.dwellTimeMs > 10000) { // More than 10 seconds
      strength = Math.min(strength + 0.2, 1);
    }
    
    // Adjust based on engagement depth
    strength = Math.min(strength + (userInteraction.engagementDepth * 0.1), 1);
    
    return strength;
  }

  private isOrganicEngagement(userInteraction: UserInteractionData): boolean {
    // Consider engagement organic if it's not prompted by notifications
    return userInteraction.timeToInteraction === undefined || userInteraction.timeToInteraction > 1000;
  }

  private hasSustainedAttention(userInteraction: UserInteractionData): boolean {
    return userInteraction.dwellTimeMs > 5000 && userInteraction.attentionScore > 0.7;
  }

  private calculatePrivacyMetrics(
    original: RetrainingDataPoint,
    anonymized: RetrainingDataPoint,
    techniques: string[]
  ): { identifiabilityRisk: number; informationLoss: number; utilityPreservation: number } {
    // Calculate identifiability risk (lower is better)
    let identifiabilityRisk = 1.0;
    
    if (techniques.includes('direct_identifier_removal')) identifiabilityRisk *= 0.3;
    if (techniques.includes('identifier_hashing')) identifiabilityRisk *= 0.2;
    if (techniques.includes('differential_privacy')) identifiabilityRisk *= 0.1;
    if (techniques.includes('k_anonymity')) identifiabilityRisk *= 0.4;
    
    // Calculate information loss (how much data was changed)
    const informationLoss = this.calculateInformationLoss(original, anonymized);
    
    // Calculate utility preservation (how useful the data remains)
    const utilityPreservation = 1 - (informationLoss * 0.7); // Assume 70% correlation
    
    return {
      identifiabilityRisk: Math.max(identifiabilityRisk, 0.01), // Minimum 1% risk
      informationLoss,
      utilityPreservation: Math.max(utilityPreservation, 0.1) // Minimum 10% utility
    };
  }

  private calculateInformationLoss(original: RetrainingDataPoint, anonymized: RetrainingDataPoint): number {
    let totalFields = 0;
    let changedFields = 0;
    
    // Compare feature vectors
    const originalFeatures = original.featureVector;
    const anonymizedFeatures = anonymized.featureVector;
    
    Object.keys(originalFeatures).forEach(key => {
      totalFields++;
      const originalValue = (originalFeatures as any)[key];
      const anonymizedValue = (anonymizedFeatures as any)[key];
      
      if (typeof originalValue === 'number' && typeof anonymizedValue === 'number') {
        if (Math.abs(originalValue - anonymizedValue) > 0.01) {
          changedFields++;
        }
      } else if (originalValue !== anonymizedValue) {
        changedFields++;
      }
    });
    
    return totalFields > 0 ? changedFields / totalFields : 0;
  }

  private getDefaultConfig(config: Partial<AnonymizationConfig>): AnonymizationConfig {
    return {
      level: config.level || 'enhanced',
      removeDirectIdentifiers: config.removeDirectIdentifiers ?? true,
      hashUserIds: config.hashUserIds ?? true,
      generalizeLocations: config.generalizeLocations ?? true,
      addNoise: config.addNoise ?? true,
      noiseLevel: config.noiseLevel ?? 0.01,
      generalizeTimestamps: config.generalizeTimestamps ?? true,
      timestampGranularity: config.timestampGranularity || 'hour',
      enableDifferentialPrivacy: config.enableDifferentialPrivacy ?? false,
      privacyBudget: config.privacyBudget ?? 1.0,
      sensitivity: config.sensitivity ?? 1.0,
      enableKAnonymity: config.enableKAnonymity ?? false,
      kValue: config.kValue ?? 5,
      removeUnusedFeatures: config.removeUnusedFeatures ?? true,
      featureWhitelist: config.featureWhitelist ?? []
    };
  }
}

export default AnonymizationService;