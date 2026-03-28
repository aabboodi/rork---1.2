import { Platform } from 'react-native';

// Types for secure aggregation
interface ModelUpdate {
  id: string;
  deviceId: string;
  timestamp: number;
  gradients: Float32Array;
  metadata: {
    modelVersion: string;
    trainingSteps: number;
    datasetSize: number;
    deviceType: string;
    performanceMetrics: {
      accuracy: number;
      loss: number;
      convergence: number;
    };
  };
}

interface AnonymizedUpdate {
  id: string;
  anonymizedId: string;
  timestamp: number;
  noisyGradients: Float32Array;
  clippedMetadata: {
    modelVersion: string;
    trainingSteps: number;
    deviceCategory: string;
    clippedMetrics: {
      accuracy: number;
      loss: number;
    };
  };
}

interface AggregationResult {
  aggregatedGradients: Float32Array;
  participantCount: number;
  privacyBudget: number;
  qualityScore: number;
  outlierCount: number;
  convergenceMetrics: {
    variance: number;
    stability: number;
    improvement: number;
  };
}

interface DifferentialPrivacyConfig {
  epsilon: number; // Privacy budget
  delta: number;   // Privacy parameter
  sensitivity: number; // L2 sensitivity
  clipNorm: number; // Gradient clipping threshold
}

interface OutlierDetectionConfig {
  zScoreThreshold: number;
  iqrMultiplier: number;
  minParticipants: number;
  maxOutlierRatio: number;
}

/**
 * Phase 3 Secure Aggregation Service
 * Implements differential privacy, anonymization, and outlier rejection
 * for federated learning model updates
 */
export class SecureAggregationService {
  private privacyConfig: DifferentialPrivacyConfig;
  private outlierConfig: OutlierDetectionConfig;
  private aggregationHistory: AggregationResult[];
  private anonymizationSalt: string;
  
  constructor() {
    this.privacyConfig = {
      epsilon: 1.0,        // Privacy budget per round
      delta: 1e-5,         // Privacy parameter
      sensitivity: 1.0,    // L2 sensitivity bound
      clipNorm: 1.0        // Gradient clipping threshold
    };
    
    this.outlierConfig = {
      zScoreThreshold: 2.5,    // Z-score threshold for outlier detection
      iqrMultiplier: 1.5,      // IQR multiplier for outlier detection
      minParticipants: 3,      // Minimum participants for aggregation
      maxOutlierRatio: 0.3     // Maximum ratio of outliers to reject
    };
    
    this.aggregationHistory = [];
    this.anonymizationSalt = this.generateSalt();
    
    console.log('🔒 SecureAggregationService initialized with differential privacy');
  }
  
  /**
   * Main aggregation function with privacy and security guarantees
   */
  async aggregateUpdates(updates: ModelUpdate[]): Promise<AggregationResult> {
    console.log(`🔄 Starting secure aggregation for ${updates.length} updates`);
    
    if (updates.length < this.outlierConfig.minParticipants) {
      throw new Error(`Insufficient participants: ${updates.length} < ${this.outlierConfig.minParticipants}`);
    }
    
    // Step 1: Anonymize updates
    const anonymizedUpdates = this.anonymizeUpdates(updates);
    console.log(`🎭 Anonymized ${anonymizedUpdates.length} updates`);
    
    // Step 2: Detect and remove outliers
    const { validUpdates, outlierCount } = this.detectOutliers(anonymizedUpdates);
    console.log(`🚫 Detected ${outlierCount} outliers, ${validUpdates.length} valid updates`);
    
    // Step 3: Apply differential privacy
    const privateUpdates = this.applyDifferentialPrivacy(validUpdates);
    console.log(`🔐 Applied differential privacy to ${privateUpdates.length} updates`);
    
    // Step 4: Secure aggregation
    const aggregationResult = this.performSecureAggregation(privateUpdates, outlierCount);
    
    // Step 5: Store aggregation history
    this.aggregationHistory.push(aggregationResult);
    if (this.aggregationHistory.length > 100) {
      this.aggregationHistory = this.aggregationHistory.slice(-100);
    }
    
    console.log(`✅ Secure aggregation completed with quality score: ${aggregationResult.qualityScore.toFixed(3)}`);
    return aggregationResult;
  }
  
  /**
   * Anonymize device updates to protect participant identity
   */
  private anonymizeUpdates(updates: ModelUpdate[]): AnonymizedUpdate[] {
    return updates.map(update => {
      // Generate anonymous ID using hash of device ID + salt
      const anonymizedId = this.hashWithSalt(update.deviceId, this.anonymizationSalt);
      
      // Clip gradients to prevent gradient-based attacks
      const clippedGradients = this.clipGradients(update.gradients, this.privacyConfig.clipNorm);
      
      // Generalize device metadata
      const deviceCategory = this.generalizeDeviceType(update.metadata.deviceType);
      
      // Clip performance metrics to prevent inference attacks
      const clippedMetrics = {
        accuracy: Math.min(Math.max(update.metadata.performanceMetrics.accuracy, 0), 1),
        loss: Math.min(update.metadata.performanceMetrics.loss, 10) // Cap loss at 10
      };
      
      return {
        id: update.id,
        anonymizedId,
        timestamp: update.timestamp,
        noisyGradients: clippedGradients,
        clippedMetadata: {
          modelVersion: update.metadata.modelVersion,
          trainingSteps: Math.min(update.metadata.trainingSteps, 1000), // Cap training steps
          deviceCategory,
          clippedMetrics
        }
      };
    });
  }
  
  /**
   * Detect and remove outlier updates using statistical methods
   */
  private detectOutliers(updates: AnonymizedUpdate[]): { validUpdates: AnonymizedUpdate[], outlierCount: number } {
    if (updates.length < 3) {
      return { validUpdates: updates, outlierCount: 0 };
    }
    
    // Calculate gradient norms for outlier detection
    const gradientNorms = updates.map(update => this.calculateL2Norm(update.noisyGradients));
    
    // Z-score based outlier detection
    const mean = gradientNorms.reduce((sum, norm) => sum + norm, 0) / gradientNorms.length;
    const variance = gradientNorms.reduce((sum, norm) => sum + Math.pow(norm - mean, 2), 0) / gradientNorms.length;
    const stdDev = Math.sqrt(variance);
    
    const zScoreOutliers = new Set<number>();
    gradientNorms.forEach((norm, index) => {
      const zScore = Math.abs((norm - mean) / stdDev);
      if (zScore > this.outlierConfig.zScoreThreshold) {
        zScoreOutliers.add(index);
      }
    });
    
    // IQR based outlier detection
    const sortedNorms = [...gradientNorms].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedNorms.length * 0.25);
    const q3Index = Math.floor(sortedNorms.length * 0.75);
    const q1 = sortedNorms[q1Index];
    const q3 = sortedNorms[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - this.outlierConfig.iqrMultiplier * iqr;
    const upperBound = q3 + this.outlierConfig.iqrMultiplier * iqr;
    
    const iqrOutliers = new Set<number>();
    gradientNorms.forEach((norm, index) => {
      if (norm < lowerBound || norm > upperBound) {
        iqrOutliers.add(index);
      }
    });
    
    // Combine outlier detection methods
    const allOutliers = new Set([...zScoreOutliers, ...iqrOutliers]);
    
    // Limit outlier removal to prevent too much data loss
    const maxOutliers = Math.floor(updates.length * this.outlierConfig.maxOutlierRatio);
    const outliersToRemove = Array.from(allOutliers).slice(0, maxOutliers);
    
    const validUpdates = updates.filter((_, index) => !outliersToRemove.includes(index));
    
    console.log(`📊 Outlier detection: Z-score=${zScoreOutliers.size}, IQR=${iqrOutliers.size}, Removed=${outliersToRemove.length}`);
    
    return {
      validUpdates,
      outlierCount: outliersToRemove.length
    };
  }
  
  /**
   * Apply differential privacy to gradient updates
   */
  private applyDifferentialPrivacy(updates: AnonymizedUpdate[]): AnonymizedUpdate[] {
    const { epsilon, sensitivity } = this.privacyConfig;
    
    // Calculate noise scale for Gaussian mechanism
    const noiseScale = Math.sqrt(2 * Math.log(1.25 / this.privacyConfig.delta)) * sensitivity / epsilon;
    
    return updates.map(update => {
      // Add calibrated Gaussian noise to gradients
      const noisyGradients = new Float32Array(update.noisyGradients.length);
      for (let i = 0; i < update.noisyGradients.length; i++) {
        const noise = this.generateGaussianNoise(0, noiseScale);
        noisyGradients[i] = update.noisyGradients[i] + noise;
      }
      
      return {
        ...update,
        noisyGradients
      };
    });
  }
  
  /**
   * Perform secure aggregation of privacy-protected updates
   */
  private performSecureAggregation(updates: AnonymizedUpdate[], outlierCount: number): AggregationResult {
    if (updates.length === 0) {
      throw new Error('No valid updates for aggregation');
    }
    
    const gradientLength = updates[0].noisyGradients.length;
    const aggregatedGradients = new Float32Array(gradientLength);
    
    // Weighted aggregation based on data quality
    let totalWeight = 0;
    const weights: number[] = [];
    
    updates.forEach(update => {
      // Calculate weight based on training quality and device reliability
      const accuracyWeight = update.clippedMetadata.clippedMetrics.accuracy;
      const lossWeight = Math.max(0, 1 - update.clippedMetadata.clippedMetrics.loss / 10);
      const stepsWeight = Math.min(update.clippedMetadata.trainingSteps / 100, 1);
      
      const weight = (accuracyWeight + lossWeight + stepsWeight) / 3;
      weights.push(weight);
      totalWeight += weight;
    });
    
    // Normalize weights
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    // Aggregate gradients with normalized weights
    for (let i = 0; i < gradientLength; i++) {
      let weightedSum = 0;
      updates.forEach((update, index) => {
        weightedSum += update.noisyGradients[i] * normalizedWeights[index];
      });
      aggregatedGradients[i] = weightedSum;
    }
    
    // Calculate convergence metrics
    const convergenceMetrics = this.calculateConvergenceMetrics(updates, aggregatedGradients);
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(updates, convergenceMetrics, outlierCount);
    
    return {
      aggregatedGradients,
      participantCount: updates.length,
      privacyBudget: this.privacyConfig.epsilon,
      qualityScore,
      outlierCount,
      convergenceMetrics
    };
  }
  
  /**
   * Calculate convergence metrics for aggregation quality assessment
   */
  private calculateConvergenceMetrics(updates: AnonymizedUpdate[], aggregated: Float32Array) {
    // Calculate variance across participant updates
    const variance = this.calculateGradientVariance(updates.map(u => u.noisyGradients));
    
    // Calculate stability (consistency across participants)
    const stability = 1 / (1 + variance);
    
    // Calculate improvement (based on historical performance)
    let improvement = 0.5; // Default neutral improvement
    if (this.aggregationHistory.length > 0) {
      const lastResult = this.aggregationHistory[this.aggregationHistory.length - 1];
      const currentNorm = this.calculateL2Norm(aggregated);
      const lastNorm = this.calculateL2Norm(lastResult.aggregatedGradients);
      improvement = Math.max(0, Math.min(1, 1 - Math.abs(currentNorm - lastNorm) / lastNorm));
    }
    
    return {
      variance,
      stability,
      improvement
    };
  }
  
  /**
   * Calculate overall quality score for the aggregation
   */
  private calculateQualityScore(updates: AnonymizedUpdate[], convergence: any, outlierCount: number): number {
    const participantScore = Math.min(updates.length / 10, 1); // More participants = better
    const outlierScore = 1 - (outlierCount / (updates.length + outlierCount)); // Fewer outliers = better
    const convergenceScore = (convergence.stability + convergence.improvement) / 2;
    
    // Average quality metrics
    const avgAccuracy = updates.reduce((sum, u) => sum + u.clippedMetadata.clippedMetrics.accuracy, 0) / updates.length;
    const avgLoss = updates.reduce((sum, u) => sum + u.clippedMetadata.clippedMetrics.loss, 0) / updates.length;
    const lossScore = Math.max(0, 1 - avgLoss / 10);
    
    return (participantScore + outlierScore + convergenceScore + avgAccuracy + lossScore) / 5;
  }
  
  // Utility functions
  private generateSalt(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  private hashWithSalt(input: string, salt: string): string {
    // Simple hash function for anonymization (in production, use crypto.subtle)
    let hash = 0;
    const combined = input + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  private clipGradients(gradients: Float32Array, clipNorm: number): Float32Array {
    const norm = this.calculateL2Norm(gradients);
    if (norm <= clipNorm) {
      return new Float32Array(gradients);
    }
    
    const clipped = new Float32Array(gradients.length);
    const scale = clipNorm / norm;
    for (let i = 0; i < gradients.length; i++) {
      clipped[i] = gradients[i] * scale;
    }
    return clipped;
  }
  
  private calculateL2Norm(array: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += array[i] * array[i];
    }
    return Math.sqrt(sum);
  }
  
  private calculateGradientVariance(gradients: Float32Array[]): number {
    if (gradients.length === 0) return 0;
    
    const length = gradients[0].length;
    let totalVariance = 0;
    
    for (let i = 0; i < length; i++) {
      const values = gradients.map(g => g[i]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      totalVariance += variance;
    }
    
    return totalVariance / length;
  }
  
  private generalizeDeviceType(deviceType: string): string {
    // Generalize device types to prevent fingerprinting
    if (deviceType.toLowerCase().includes('iphone') || deviceType.toLowerCase().includes('ios')) {
      return 'mobile_ios';
    }
    if (deviceType.toLowerCase().includes('android')) {
      return 'mobile_android';
    }
    if (deviceType.toLowerCase().includes('web') || deviceType.toLowerCase().includes('browser')) {
      return 'web';
    }
    return 'unknown';
  }
  
  private generateGaussianNoise(mean: number, stdDev: number): number {
    // Box-Muller transform for Gaussian noise generation
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return z * stdDev + mean;
  }
  
  /**
   * Get aggregation statistics for monitoring
   */
  getAggregationStats() {
    const recentResults = this.aggregationHistory.slice(-10);
    if (recentResults.length === 0) {
      return {
        totalAggregations: 0,
        averageQuality: 0,
        averageParticipants: 0,
        privacyBudgetUsed: 0
      };
    }
    
    return {
      totalAggregations: this.aggregationHistory.length,
      averageQuality: recentResults.reduce((sum, r) => sum + r.qualityScore, 0) / recentResults.length,
      averageParticipants: recentResults.reduce((sum, r) => sum + r.participantCount, 0) / recentResults.length,
      privacyBudgetUsed: this.privacyConfig.epsilon * this.aggregationHistory.length
    };
  }
  
  /**
   * Update privacy configuration
   */
  updatePrivacyConfig(config: Partial<DifferentialPrivacyConfig>) {
    this.privacyConfig = { ...this.privacyConfig, ...config };
    console.log('🔧 Updated privacy configuration:', this.privacyConfig);
  }
  
  /**
   * Update outlier detection configuration
   */
  updateOutlierConfig(config: Partial<OutlierDetectionConfig>) {
    this.outlierConfig = { ...this.outlierConfig, ...config };
    console.log('🔧 Updated outlier detection configuration:', this.outlierConfig);
  }
}

export default SecureAggregationService;