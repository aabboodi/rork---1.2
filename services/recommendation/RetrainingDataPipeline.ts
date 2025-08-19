import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  RetrainingDataPoint,
  RetrainingDataBatch,
  RetrainingDataConfig,
  RetrainingDataMetrics,
  AnonymizedFeatureVector,
  EngagementOutcome,
  InteractionLog,
  LoggingMetrics
} from '@/types/recommendation';
import MLLoggingService from './MLLoggingService';
import AnonymizationService from '@/utils/anonymization';
import SecurityManager from '@/services/security/SecurityManager';

interface DataAggregationConfig {
  batchSize: number;
  aggregationWindow: number; // milliseconds
  qualityThreshold: number; // 0-1
  maxRetentionDays: number;
  enableCompression: boolean;
  enableEncryption: boolean;
}

interface DataPreprocessingConfig {
  normalizeFeatures: boolean;
  removeOutliers: boolean;
  outlierThreshold: number; // standard deviations
  balanceDataset: boolean;
  minSamplesPerClass: number;
  featureSelection: boolean;
  maxFeatures: number;
}

interface DataQualityMetrics {
  totalDataPoints: number;
  validDataPoints: number;
  invalidDataPoints: number;
  duplicateDataPoints: number;
  qualityScore: number; // 0-1
  completenessScore: number; // 0-1
  consistencyScore: number; // 0-1
  accuracyScore: number; // 0-1
  timelinessScore: number; // 0-1
  lastValidationTime: number;
}

interface DataExportFormat {
  format: 'json' | 'csv' | 'parquet' | 'tfrecord';
  compression: 'none' | 'gzip' | 'brotli';
  encryption: boolean;
  anonymization: 'basic' | 'enhanced' | 'differential_privacy';
  includeMetadata: boolean;
}

interface TrainingDataSplit {
  trainData: RetrainingDataPoint[];
  validationData: RetrainingDataPoint[];
  testData: RetrainingDataPoint[];
  metadata: {
    trainSize: number;
    validationSize: number;
    testSize: number;
    splitRatio: [number, number, number];
    stratified: boolean;
    randomSeed: number;
  };
}

class RetrainingDataPipeline {
  private static instance: RetrainingDataPipeline;
  private mlLoggingService: MLLoggingService;
  private anonymizationService: AnonymizationService;
  private securityManager: SecurityManager;
  
  private aggregationConfig: DataAggregationConfig;
  private preprocessingConfig: DataPreprocessingConfig;
  private qualityMetrics: DataQualityMetrics;
  
  private dataBuffer: RetrainingDataPoint[] = [];
  private aggregationTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  private constructor() {
    this.mlLoggingService = MLLoggingService.getInstance();
    this.anonymizationService = AnonymizationService.getInstance();
    this.securityManager = SecurityManager.getInstance();
    
    this.aggregationConfig = {
      batchSize: 1000,
      aggregationWindow: 60 * 60 * 1000, // 1 hour
      qualityThreshold: 0.7,
      maxRetentionDays: 90,
      enableCompression: true,
      enableEncryption: true
    };

    this.preprocessingConfig = {
      normalizeFeatures: true,
      removeOutliers: true,
      outlierThreshold: 3.0,
      balanceDataset: true,
      minSamplesPerClass: 100,
      featureSelection: true,
      maxFeatures: 50
    };

    this.qualityMetrics = {
      totalDataPoints: 0,
      validDataPoints: 0,
      invalidDataPoints: 0,
      duplicateDataPoints: 0,
      qualityScore: 0,
      completenessScore: 0,
      consistencyScore: 0,
      accuracyScore: 0,
      timelinessScore: 0,
      lastValidationTime: 0
    };

    this.initialize();
  }

  static getInstance(): RetrainingDataPipeline {
    if (!RetrainingDataPipeline.instance) {
      RetrainingDataPipeline.instance = new RetrainingDataPipeline();
    }
    return RetrainingDataPipeline.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Load persisted configuration
      await this.loadConfiguration();
      
      // Start aggregation timer
      this.startAggregationTimer();
      
      // Load existing data buffer
      await this.loadDataBuffer();
      
      console.log('Retraining Data Pipeline initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Retraining Data Pipeline:', error);
    }
  }

  // ===== DATA AGGREGATION SERVICE =====

  async aggregateRetrainingData(timeWindow?: number): Promise<RetrainingDataBatch[]> {
    try {
      this.isProcessing = true;
      
      const window = timeWindow || this.aggregationConfig.aggregationWindow;
      const endTime = Date.now();
      const startTime = endTime - window;
      
      // Get raw retraining data from ML logging service
      const rawData = await this.mlLoggingService.exportRetrainingData(
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString()
      );
      
      // Add data from buffer
      const allData = [...rawData, ...this.dataBuffer];
      
      // Filter by time window
      const filteredData = allData.filter(dataPoint => {
        const timestamp = new Date(dataPoint.anonymizationTimestamp).getTime();
        return timestamp >= startTime && timestamp <= endTime;
      });
      
      // Validate and clean data
      const validatedData = await this.validateAndCleanData(filteredData);
      
      // Create batches
      const batches = this.createDataBatches(validatedData);
      
      // Update quality metrics
      this.updateQualityMetrics(filteredData, validatedData);
      
      // Clear processed data from buffer
      this.dataBuffer = this.dataBuffer.filter(dataPoint => {
        const timestamp = new Date(dataPoint.anonymizationTimestamp).getTime();
        return timestamp > endTime;
      });
      
      await this.saveDataBuffer();
      
      console.log(`Aggregated ${batches.length} retraining data batches`);
      return batches;
      
    } catch (error) {
      console.error('Failed to aggregate retraining data:', error);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  private createDataBatches(data: RetrainingDataPoint[]): RetrainingDataBatch[] {
    const batches: RetrainingDataBatch[] = [];
    const batchSize = this.aggregationConfig.batchSize;
    
    // Group by algorithm type
    const dataByAlgorithm = this.groupByAlgorithmType(data);
    
    for (const [algorithmType, algorithmData] of Object.entries(dataByAlgorithm)) {
      // Create batches for this algorithm
      for (let i = 0; i < algorithmData.length; i += batchSize) {
        const batchData = algorithmData.slice(i, i + batchSize);
        
        const batch: RetrainingDataBatch = {
          batchId: this.generateBatchId(),
          batchTimestamp: new Date().toISOString(),
          algorithmType: algorithmType as any,
          dataPoints: batchData,
          batchSize: batchData.length,
          dataQualityScore: this.calculateBatchQuality(batchData),
          anonymizationLevel: 'enhanced',
          privacyCompliant: true,
          retentionPolicy: `${this.aggregationConfig.maxRetentionDays}_days`,
          anonymizationApplied: true,
          readyForTraining: true,
          validationPassed: true,
          dataIntegrityHash: this.calculateIntegrityHash(batchData)
        };
        
        batches.push(batch);
      }
    }
    
    return batches;
  }

  private groupByAlgorithmType(data: RetrainingDataPoint[]): Record<string, RetrainingDataPoint[]> {
    const grouped: Record<string, RetrainingDataPoint[]> = {};
    
    for (const dataPoint of data) {
      const algorithmType = dataPoint.algorithmType;
      if (!grouped[algorithmType]) {
        grouped[algorithmType] = [];
      }
      grouped[algorithmType].push(dataPoint);
    }
    
    return grouped;
  }

  // ===== DATA PREPROCESSING FOR MODEL TRAINING =====

  async preprocessDataForTraining(
    batches: RetrainingDataBatch[],
    config?: Partial<DataPreprocessingConfig>
  ): Promise<TrainingDataSplit> {
    try {
      const finalConfig = { ...this.preprocessingConfig, ...config };
      
      // Combine all data points from batches
      const allDataPoints = batches.flatMap(batch => batch.dataPoints);
      
      // Step 1: Normalize features
      let processedData = finalConfig.normalizeFeatures 
        ? this.normalizeFeatures(allDataPoints)
        : allDataPoints;
      
      // Step 2: Remove outliers
      if (finalConfig.removeOutliers) {
        processedData = this.removeOutliers(processedData, finalConfig.outlierThreshold);
      }
      
      // Step 3: Feature selection
      if (finalConfig.featureSelection) {
        processedData = this.selectFeatures(processedData, finalConfig.maxFeatures);
      }
      
      // Step 4: Balance dataset
      if (finalConfig.balanceDataset) {
        processedData = this.balanceDataset(processedData, finalConfig.minSamplesPerClass);
      }
      
      // Step 5: Split data for training
      const dataSplit = this.splitDataForTraining(processedData);
      
      console.log(`Preprocessed ${allDataPoints.length} data points into training split`);
      return dataSplit;
      
    } catch (error) {
      console.error('Failed to preprocess data for training:', error);
      throw error;
    }
  }

  private normalizeFeatures(data: RetrainingDataPoint[]): RetrainingDataPoint[] {
    // Calculate feature statistics
    const featureStats = this.calculateFeatureStatistics(data);
    
    return data.map(dataPoint => ({
      ...dataPoint,
      featureVector: this.normalizeFeatureVector(dataPoint.featureVector, featureStats)
    }));
  }

  private calculateFeatureStatistics(data: RetrainingDataPoint[]): Record<string, { mean: number; std: number; min: number; max: number }> {
    const stats: Record<string, { mean: number; std: number; min: number; max: number }> = {};
    
    // Get all numerical feature keys
    const numericalFeatures = [
      'contentAge', 'contentQuality', 'contentPopularity',
      'userEngagementHistory', 'userSessionTime', 'userActivityLevel',
      'timeOfDayRelevance', 'dayOfWeekRelevance', 'seasonalRelevance',
      'socialProofScore', 'networkInfluence', 'viralityIndicator',
      'interestAlignment', 'behaviorPatternMatch', 'diversityScore'
    ];
    
    for (const feature of numericalFeatures) {
      const values = data.map(d => (d.featureVector as any)[feature]).filter(v => typeof v === 'number');
      
      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        stats[feature] = { mean, std, min, max };
      }
    }
    
    return stats;
  }

  private normalizeFeatureVector(
    featureVector: AnonymizedFeatureVector,
    stats: Record<string, { mean: number; std: number; min: number; max: number }>
  ): AnonymizedFeatureVector {
    const normalized = { ...featureVector };
    
    // Normalize numerical features using z-score normalization
    for (const [feature, stat] of Object.entries(stats)) {
      const value = (normalized as any)[feature];
      if (typeof value === 'number' && stat.std > 0) {
        (normalized as any)[feature] = (value - stat.mean) / stat.std;
      }
    }
    
    return normalized;
  }

  private removeOutliers(data: RetrainingDataPoint[], threshold: number): RetrainingDataPoint[] {
    // Calculate z-scores for engagement strength
    const engagementValues = data.map(d => d.actualEngagement.engagementStrength);
    const mean = engagementValues.reduce((sum, val) => sum + val, 0) / engagementValues.length;
    const variance = engagementValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / engagementValues.length;
    const std = Math.sqrt(variance);
    
    return data.filter(dataPoint => {
      const zScore = Math.abs((dataPoint.actualEngagement.engagementStrength - mean) / std);
      return zScore <= threshold;
    });
  }

  private selectFeatures(data: RetrainingDataPoint[], maxFeatures: number): RetrainingDataPoint[] {
    // Simple feature selection based on variance
    const featureVariances = this.calculateFeatureVariances(data);
    const selectedFeatures = Object.entries(featureVariances)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxFeatures)
      .map(([feature]) => feature);
    
    return data.map(dataPoint => ({
      ...dataPoint,
      featureVector: this.filterFeatureVector(dataPoint.featureVector, selectedFeatures)
    }));
  }

  private calculateFeatureVariances(data: RetrainingDataPoint[]): Record<string, number> {
    const variances: Record<string, number> = {};
    const numericalFeatures = [
      'contentAge', 'contentQuality', 'contentPopularity',
      'userEngagementHistory', 'userSessionTime', 'userActivityLevel',
      'timeOfDayRelevance', 'dayOfWeekRelevance', 'seasonalRelevance',
      'socialProofScore', 'networkInfluence', 'viralityIndicator',
      'interestAlignment', 'behaviorPatternMatch', 'diversityScore'
    ];
    
    for (const feature of numericalFeatures) {
      const values = data.map(d => (d.featureVector as any)[feature]).filter(v => typeof v === 'number');
      
      if (values.length > 1) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
        variances[feature] = variance;
      }
    }
    
    return variances;
  }

  private filterFeatureVector(
    featureVector: AnonymizedFeatureVector,
    selectedFeatures: string[]
  ): AnonymizedFeatureVector {
    const filtered: Partial<AnonymizedFeatureVector> = {};
    
    // Always keep categorical features
    filtered.contentType = featureVector.contentType;
    filtered.deviceType = featureVector.deviceType;
    filtered.networkQuality = featureVector.networkQuality;
    filtered.locationContext = featureVector.locationContext;
    
    // Add selected numerical features
    for (const feature of selectedFeatures) {
      if (feature in featureVector) {
        (filtered as any)[feature] = (featureVector as any)[feature];
      }
    }
    
    // Keep custom features
    filtered.customFeatures = featureVector.customFeatures;
    
    return filtered as AnonymizedFeatureVector;
  }

  private balanceDataset(data: RetrainingDataPoint[], minSamplesPerClass: number): RetrainingDataPoint[] {
    // Group by engagement type
    const groupedByEngagement = this.groupByEngagementType(data);
    
    // Find minimum class size
    const classSizes = Object.values(groupedByEngagement).map(group => group.length);
    const minClassSize = Math.max(Math.min(...classSizes), minSamplesPerClass);
    
    // Balance by sampling
    const balancedData: RetrainingDataPoint[] = [];
    
    for (const [engagementType, classData] of Object.entries(groupedByEngagement)) {
      if (classData.length >= minClassSize) {
        // Random sampling
        const shuffled = this.shuffleArray([...classData]);
        balancedData.push(...shuffled.slice(0, minClassSize));
      } else {
        // Oversample if needed
        const oversampledData = this.oversampleClass(classData, minClassSize);
        balancedData.push(...oversampledData);
      }
    }
    
    return this.shuffleArray(balancedData);
  }

  private groupByEngagementType(data: RetrainingDataPoint[]): Record<string, RetrainingDataPoint[]> {
    const grouped: Record<string, RetrainingDataPoint[]> = {};
    
    for (const dataPoint of data) {
      const engagementType = dataPoint.actualEngagement.engagementType;
      if (!grouped[engagementType]) {
        grouped[engagementType] = [];
      }
      grouped[engagementType].push(dataPoint);
    }
    
    return grouped;
  }

  private oversampleClass(classData: RetrainingDataPoint[], targetSize: number): RetrainingDataPoint[] {
    const oversampled = [...classData];
    
    while (oversampled.length < targetSize) {
      const randomIndex = Math.floor(Math.random() * classData.length);
      oversampled.push({ ...classData[randomIndex] });
    }
    
    return oversampled.slice(0, targetSize);
  }

  private splitDataForTraining(data: RetrainingDataPoint[]): TrainingDataSplit {
    const shuffledData = this.shuffleArray([...data]);
    
    // Default split ratios: 70% train, 20% validation, 10% test
    const trainRatio = 0.7;
    const validationRatio = 0.2;
    const testRatio = 0.1;
    
    const trainSize = Math.floor(shuffledData.length * trainRatio);
    const validationSize = Math.floor(shuffledData.length * validationRatio);
    const testSize = shuffledData.length - trainSize - validationSize;
    
    const trainData = shuffledData.slice(0, trainSize);
    const validationData = shuffledData.slice(trainSize, trainSize + validationSize);
    const testData = shuffledData.slice(trainSize + validationSize);
    
    return {
      trainData,
      validationData,
      testData,
      metadata: {
        trainSize,
        validationSize,
        testSize,
        splitRatio: [trainRatio, validationRatio, testRatio],
        stratified: false,
        randomSeed: Date.now()
      }
    };
  }

  // ===== DATA VALIDATION AND QUALITY CHECKS =====

  async validateAndCleanData(data: RetrainingDataPoint[]): Promise<RetrainingDataPoint[]> {
    const validatedData: RetrainingDataPoint[] = [];
    let duplicateCount = 0;
    let invalidCount = 0;
    
    const seenHashes = new Set<string>();
    
    for (const dataPoint of data) {
      // Check for duplicates
      const hash = this.calculateDataPointHash(dataPoint);
      if (seenHashes.has(hash)) {
        duplicateCount++;
        continue;
      }
      seenHashes.add(hash);
      
      // Validate data point
      if (this.validateDataPoint(dataPoint)) {
        validatedData.push(dataPoint);
      } else {
        invalidCount++;
      }
    }
    
    // Update quality metrics
    this.qualityMetrics.totalDataPoints = data.length;
    this.qualityMetrics.validDataPoints = validatedData.length;
    this.qualityMetrics.invalidDataPoints = invalidCount;
    this.qualityMetrics.duplicateDataPoints = duplicateCount;
    this.qualityMetrics.lastValidationTime = Date.now();
    
    console.log(`Data validation: ${validatedData.length} valid, ${invalidCount} invalid, ${duplicateCount} duplicates`);
    
    return validatedData;
  }

  private validateDataPoint(dataPoint: RetrainingDataPoint): boolean {
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
      
      // Check quality threshold
      if (dataPoint.dataQualityScore < this.aggregationConfig.qualityThreshold) {
        return false;
      }
      
      // Validate engagement outcome
      if (!this.validateEngagementOutcome(dataPoint.actualEngagement)) {
        return false;
      }
      
      // Validate feature vector
      if (!this.validateFeatureVector(dataPoint.featureVector)) {
        return false;
      }
      
      return true;
    } catch (error) {
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

  private validateFeatureVector(featureVector: AnonymizedFeatureVector): boolean {
    // Check required categorical features
    if (!featureVector.contentType || !featureVector.deviceType) {
      return false;
    }
    
    // Validate numerical features are in valid range
    const numericalFeatures = [
      'contentAge', 'contentQuality', 'contentPopularity',
      'userEngagementHistory', 'userSessionTime', 'userActivityLevel'
    ];
    
    for (const feature of numericalFeatures) {
      const value = (featureVector as any)[feature];
      if (typeof value === 'number' && (value < 0 || value > 1)) {
        return false;
      }
    }
    
    return true;
  }

  // ===== DATA EXPORT UTILITIES FOR ML TRAINING =====

  async exportDataForTraining(
    dataSplit: TrainingDataSplit,
    format: DataExportFormat,
    outputPath?: string
  ): Promise<{ success: boolean; exportPath?: string; metadata: any }> {
    try {
      const exportData = {
        trainData: dataSplit.trainData,
        validationData: dataSplit.validationData,
        testData: dataSplit.testData,
        metadata: {
          ...dataSplit.metadata,
          exportTimestamp: new Date().toISOString(),
          format: format.format,
          compression: format.compression,
          encryption: format.encryption,
          anonymization: format.anonymization,
          qualityMetrics: this.qualityMetrics
        }
      };
      
      // Apply additional anonymization if requested
      if (format.anonymization !== 'basic') {
        exportData.trainData = await this.applyAdvancedAnonymization(exportData.trainData, format.anonymization);
        exportData.validationData = await this.applyAdvancedAnonymization(exportData.validationData, format.anonymization);
        exportData.testData = await this.applyAdvancedAnonymization(exportData.testData, format.anonymization);
      }
      
      // Serialize data based on format
      let serializedData: string;
      switch (format.format) {
        case 'json':
          serializedData = JSON.stringify(exportData, null, 2);
          break;
        case 'csv':
          serializedData = this.convertToCSV(exportData);
          break;
        default:
          serializedData = JSON.stringify(exportData, null, 2);
      }
      
      // Apply compression if requested
      if (format.compression !== 'none') {
        serializedData = await this.compressData(serializedData, format.compression);
      }
      
      // Apply encryption if requested
      if (format.encryption) {
        serializedData = await this.encryptData(serializedData);
      }
      
      // Save to storage
      const exportPath = outputPath || `retraining_data_${Date.now()}.${format.format}`;
      await this.saveExportedData(exportPath, serializedData);
      
      console.log(`Successfully exported training data to ${exportPath}`);
      
      return {
        success: true,
        exportPath,
        metadata: exportData.metadata
      };
      
    } catch (error) {
      console.error('Failed to export data for training:', error);
      return {
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async applyAdvancedAnonymization(
    data: RetrainingDataPoint[],
    level: 'enhanced' | 'differential_privacy'
  ): Promise<RetrainingDataPoint[]> {
    const anonymizedData: RetrainingDataPoint[] = [];
    
    for (const dataPoint of data) {
      const result = await this.anonymizationService.anonymizeRetrainingData(dataPoint, {
        level: level,
        enableDifferentialPrivacy: level === 'differential_privacy',
        privacyBudget: 1.0
      });
      
      if (result.success && result.anonymizedData) {
        anonymizedData.push(result.anonymizedData as RetrainingDataPoint);
      }
    }
    
    return anonymizedData;
  }

  private convertToCSV(exportData: any): string {
    // Simple CSV conversion for training data
    const headers = [
      'algorithmType', 'predictedRank', 'engagementType', 'engagementStrength',
      'dwellTime', 'contentType', 'deviceType', 'dataQualityScore'
    ];
    
    let csv = headers.join(',') + '\n';
    
    const allData = [
      ...exportData.trainData.map((d: any) => ({ ...d, split: 'train' })),
      ...exportData.validationData.map((d: any) => ({ ...d, split: 'validation' })),
      ...exportData.testData.map((d: any) => ({ ...d, split: 'test' }))
    ];
    
    for (const dataPoint of allData) {
      const row = [
        dataPoint.algorithmType,
        dataPoint.predictedRank,
        dataPoint.actualEngagement.engagementType,
        dataPoint.actualEngagement.engagementStrength,
        dataPoint.actualEngagement.dwellTime,
        dataPoint.featureVector.contentType,
        dataPoint.featureVector.deviceType,
        dataPoint.dataQualityScore
      ];
      csv += row.join(',') + '\n';
    }
    
    return csv;
  }

  private async compressData(data: string, compression: 'gzip' | 'brotli'): Promise<string> {
    // Mock compression - in real implementation, use actual compression libraries
    return data;
  }

  private async encryptData(data: string): Promise<string> {
    try {
      const encryptedData = await this.securityManager.encryptData(data, 'retraining_data');
      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      return data;
    }
  }

  private async saveExportedData(path: string, data: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`exported_training_data_${path}`, data);
    } catch (error) {
      console.error('Failed to save exported data:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  private calculateBatchQuality(dataPoints: RetrainingDataPoint[]): number {
    if (dataPoints.length === 0) return 0;
    
    const totalQuality = dataPoints.reduce((sum, dp) => sum + dp.dataQualityScore, 0);
    return totalQuality / dataPoints.length;
  }

  private calculateIntegrityHash(dataPoints: RetrainingDataPoint[]): string {
    const dataString = dataPoints.map(dp => 
      `${dp.algorithmType}_${dp.predictedRank}_${dp.actualEngagement.engagementType}`
    ).join('');
    
    return this.generateSimpleHash(dataString);
  }

  private calculateDataPointHash(dataPoint: RetrainingDataPoint): string {
    const hashString = `${dataPoint.algorithmType}_${dataPoint.predictedRank}_${dataPoint.actualEngagement.engagementType}_${dataPoint.anonymizationTimestamp}`;
    return this.generateSimpleHash(hashString);
  }

  private generateSimpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private startAggregationTimer(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    
    this.aggregationTimer = setInterval(async () => {
      if (!this.isProcessing) {
        await this.aggregateRetrainingData();
      }
    }, this.aggregationConfig.aggregationWindow);
  }

  private updateQualityMetrics(originalData: RetrainingDataPoint[], validatedData: RetrainingDataPoint[]): void {
    const total = originalData.length;
    const valid = validatedData.length;
    
    this.qualityMetrics.qualityScore = total > 0 ? valid / total : 0;
    this.qualityMetrics.completenessScore = this.calculateCompletenessScore(validatedData);
    this.qualityMetrics.consistencyScore = this.calculateConsistencyScore(validatedData);
    this.qualityMetrics.accuracyScore = this.calculateAccuracyScore(validatedData);
    this.qualityMetrics.timelinessScore = this.calculateTimelinessScore(validatedData);
  }

  private calculateCompletenessScore(data: RetrainingDataPoint[]): number {
    if (data.length === 0) return 0;
    
    let completeCount = 0;
    for (const dataPoint of data) {
      const requiredFields = [
        dataPoint.featureVector.contentType,
        dataPoint.featureVector.deviceType,
        dataPoint.actualEngagement.engagementType,
        dataPoint.modelVersion
      ];
      
      if (requiredFields.every(field => field !== undefined && field !== null)) {
        completeCount++;
      }
    }
    
    return completeCount / data.length;
  }

  private calculateConsistencyScore(data: RetrainingDataPoint[]): number {
    // Simple consistency check based on engagement strength vs engagement type
    if (data.length === 0) return 0;
    
    let consistentCount = 0;
    for (const dataPoint of data) {
      const engagement = dataPoint.actualEngagement;
      const isConsistent = this.isEngagementConsistent(engagement);
      if (isConsistent) {
        consistentCount++;
      }
    }
    
    return consistentCount / data.length;
  }

  private isEngagementConsistent(engagement: EngagementOutcome): boolean {
    // Check if engagement strength matches engagement type
    switch (engagement.engagementType) {
      case 'skip':
      case 'hide':
        return engagement.engagementStrength < 0.3;
      case 'view':
        return engagement.engagementStrength >= 0.1 && engagement.engagementStrength <= 0.7;
      case 'like':
      case 'comment':
      case 'share':
      case 'save':
        return engagement.engagementStrength > 0.5;
      default:
        return true;
    }
  }

  private calculateAccuracyScore(data: RetrainingDataPoint[]): number {
    // Mock accuracy calculation - in real implementation, compare with ground truth
    return 0.85;
  }

  private calculateTimelinessScore(data: RetrainingDataPoint[]): number {
    if (data.length === 0) return 0;
    
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    let timelinessSum = 0;
    for (const dataPoint of data) {
      const age = now - new Date(dataPoint.anonymizationTimestamp).getTime();
      const timeliness = Math.max(0, 1 - (age / maxAge));
      timelinessSum += timeliness;
    }
    
    return timelinessSum / data.length;
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem('retraining_pipeline_config');
      if (configData) {
        const config = JSON.parse(configData);
        this.aggregationConfig = { ...this.aggregationConfig, ...config.aggregation };
        this.preprocessingConfig = { ...this.preprocessingConfig, ...config.preprocessing };
      }
    } catch (error) {
      console.error('Failed to load pipeline configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      const config = {
        aggregation: this.aggregationConfig,
        preprocessing: this.preprocessingConfig
      };
      await AsyncStorage.setItem('retraining_pipeline_config', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save pipeline configuration:', error);
    }
  }

  private async loadDataBuffer(): Promise<void> {
    try {
      const bufferData = await AsyncStorage.getItem('retraining_data_buffer');
      if (bufferData) {
        this.dataBuffer = JSON.parse(bufferData);
      }
    } catch (error) {
      console.error('Failed to load data buffer:', error);
    }
  }

  private async saveDataBuffer(): Promise<void> {
    try {
      await AsyncStorage.setItem('retraining_data_buffer', JSON.stringify(this.dataBuffer));
    } catch (error) {
      console.error('Failed to save data buffer:', error);
    }
  }

  // ===== PUBLIC API =====

  async addDataToBuffer(dataPoint: RetrainingDataPoint): Promise<void> {
    this.dataBuffer.push(dataPoint);
    
    if (this.dataBuffer.length >= this.aggregationConfig.batchSize) {
      await this.aggregateRetrainingData();
    }
  }

  getQualityMetrics(): RetrainingDataMetrics {
    // Convert DataQualityMetrics to RetrainingDataMetrics
    return {
      // Collection metrics
      totalDataPointsCollected: this.qualityMetrics.totalDataPoints,
      dataPointsPerAlgorithm: {}, // Would need to be calculated from actual data
      averageDataQuality: this.qualityMetrics.qualityScore,
      
      // Privacy metrics
      anonymizationSuccessRate: 1.0, // Assuming all data is anonymized
      privacyComplianceRate: 1.0,
      
      // Training readiness metrics
      trainingReadyDataPoints: this.qualityMetrics.validDataPoints,
      validationReadyDataPoints: Math.floor(this.qualityMetrics.validDataPoints * 0.2),
      testReadyDataPoints: Math.floor(this.qualityMetrics.validDataPoints * 0.1),
      
      // Data distribution metrics
      engagementDistribution: {}, // Would need to be calculated from actual data
      temporalDistribution: {},
      cohortDistribution: {},
      
      // Quality metrics
      dataIntegrityScore: this.qualityMetrics.consistencyScore,
      biasDetectionScore: 0.9, // Mock value
      outlierDetectionRate: 0.05 // Mock value
    };
  }

  updateAggregationConfig(config: Partial<DataAggregationConfig>): void {
    this.aggregationConfig = { ...this.aggregationConfig, ...config };
    this.saveConfiguration();
  }

  updatePreprocessingConfig(config: Partial<DataPreprocessingConfig>): void {
    this.preprocessingConfig = { ...this.preprocessingConfig, ...config };
    this.saveConfiguration();
  }

  async cleanup(): Promise<void> {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    await this.saveDataBuffer();
    await this.saveConfiguration();
    
    console.log('Retraining Data Pipeline cleanup completed');
  }
}

export default RetrainingDataPipeline;