import {
  RetrainingDataPoint,
  RetrainingDataBatch,
  AnonymizedFeatureVector,
  EngagementOutcome,
  InteractionLog
} from '@/types/recommendation';

interface ValidationRule {
  name: string;
  description: string;
  validate: (data: any) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
  category: 'data_quality' | 'privacy' | 'consistency' | 'completeness';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-1
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
  expectedType?: string;
  expectedRange?: [number, number];
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
}

interface DataQualityReport {
  overallScore: number;
  totalDataPoints: number;
  validDataPoints: number;
  errorCount: number;
  warningCount: number;
  categoryScores: Record<string, number>;
  detailedResults: ValidationResult[];
  recommendations: string[];
  timestamp: number;
}

class DataValidationService {
  private static instance: DataValidationService;
  private validationRules: ValidationRule[] = [];

  private constructor() {
    this.initializeValidationRules();
  }

  static getInstance(): DataValidationService {
    if (!DataValidationService.instance) {
      DataValidationService.instance = new DataValidationService();
    }
    return DataValidationService.instance;
  }

  private initializeValidationRules(): void {
    this.validationRules = [
      // Data Quality Rules
      {
        name: 'required_fields',
        description: 'Check that all required fields are present',
        validate: this.validateRequiredFields.bind(this),
        severity: 'error',
        category: 'completeness'
      },
      {
        name: 'data_types',
        description: 'Validate data types for all fields',
        validate: this.validateDataTypes.bind(this),
        severity: 'error',
        category: 'data_quality'
      },
      {
        name: 'value_ranges',
        description: 'Check that numerical values are within expected ranges',
        validate: this.validateValueRanges.bind(this),
        severity: 'error',
        category: 'data_quality'
      },
      {
        name: 'engagement_consistency',
        description: 'Validate consistency between engagement type and strength',
        validate: this.validateEngagementConsistency.bind(this),
        severity: 'warning',
        category: 'consistency'
      },
      {
        name: 'feature_completeness',
        description: 'Check feature vector completeness',
        validate: this.validateFeatureCompleteness.bind(this),
        severity: 'warning',
        category: 'completeness'
      },
      {
        name: 'temporal_validity',
        description: 'Validate timestamp consistency and recency',
        validate: this.validateTemporalValidity.bind(this),
        severity: 'warning',
        category: 'data_quality'
      },
      {
        name: 'privacy_compliance',
        description: 'Check privacy and anonymization compliance',
        validate: this.validatePrivacyCompliance.bind(this),
        severity: 'error',
        category: 'privacy'
      },
      {
        name: 'outlier_detection',
        description: 'Detect statistical outliers in numerical features',
        validate: this.validateOutliers.bind(this),
        severity: 'info',
        category: 'data_quality'
      }
    ];
  }

  // ===== MAIN VALIDATION METHODS =====

  validateRetrainingDataPoint(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalScore = 0;
    let ruleCount = 0;

    for (const rule of this.validationRules) {
      try {
        const result = rule.validate(dataPoint);
        
        errors.push(...result.errors);
        warnings.push(...result.warnings);
        totalScore += result.score;
        ruleCount++;
      } catch (error) {
        errors.push({
          field: 'validation_rule',
          message: `Validation rule '${rule.name}' failed: ${error}`,
          value: rule.name
        });
      }
    }

    const overallScore = ruleCount > 0 ? totalScore / ruleCount : 0;
    const isValid = errors.length === 0 && overallScore >= 0.7;

    return {
      isValid,
      errors,
      warnings,
      score: overallScore
    };
  }

  validateRetrainingDataBatch(batch: RetrainingDataBatch): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalScore = 0;
    let validDataPoints = 0;

    // Validate batch metadata
    if (!batch.batchId || !batch.batchTimestamp || !batch.algorithmType) {
      errors.push({
        field: 'batch_metadata',
        message: 'Missing required batch metadata fields'
      });
    }

    if (batch.dataPoints.length !== batch.batchSize) {
      errors.push({
        field: 'batch_size',
        message: 'Batch size mismatch',
        value: `Expected: ${batch.batchSize}, Actual: ${batch.dataPoints.length}`
      });
    }

    // Validate each data point
    for (let i = 0; i < batch.dataPoints.length; i++) {
      const dataPoint = batch.dataPoints[i];
      const result = this.validateRetrainingDataPoint(dataPoint);
      
      if (result.isValid) {
        validDataPoints++;
      }
      
      totalScore += result.score;
      
      // Add errors with data point index
      for (const error of result.errors) {
        errors.push({
          ...error,
          field: `dataPoint[${i}].${error.field}`
        });
      }
      
      // Add warnings with data point index
      for (const warning of result.warnings) {
        warnings.push({
          ...warning,
          field: `dataPoint[${i}].${warning.field}`
        });
      }
    }

    const overallScore = batch.dataPoints.length > 0 ? totalScore / batch.dataPoints.length : 0;
    const validityRate = batch.dataPoints.length > 0 ? validDataPoints / batch.dataPoints.length : 0;
    const isValid = errors.length === 0 && validityRate >= 0.8;

    // Add batch-level warnings
    if (validityRate < 0.9) {
      warnings.push({
        field: 'batch_quality',
        message: `Low data quality: ${(validityRate * 100).toFixed(1)}% valid data points`,
        suggestion: 'Review data collection and preprocessing steps',
        impact: validityRate < 0.7 ? 'high' : 'medium'
      });
    }

    return {
      isValid,
      errors,
      warnings,
      score: overallScore
    };
  }

  validateInteractionLog(log: InteractionLog): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate log structure
    if (!log.logVersion || log.logVersion !== "1.0") {
      errors.push({
        field: 'logVersion',
        message: 'Invalid or missing log version',
        value: log.logVersion,
        expectedType: 'string "1.0"'
      });
    }

    if (!log.eventID || typeof log.eventID !== 'string') {
      errors.push({
        field: 'eventID',
        message: 'Missing or invalid event ID',
        value: log.eventID,
        expectedType: 'string'
      });
    }

    if (!log.clientTimestamp || !this.isValidISODate(log.clientTimestamp)) {
      errors.push({
        field: 'clientTimestamp',
        message: 'Invalid client timestamp',
        value: log.clientTimestamp,
        expectedType: 'ISO 8601 date string'
      });
    }

    // Validate context
    if (!log.context || !log.context.itemType || !log.context.itemID) {
      errors.push({
        field: 'context',
        message: 'Missing required context fields (itemType, itemID)'
      });
    }

    // Validate model prediction
    if (!log.modelPrediction || !log.modelPrediction.modelVersion) {
      errors.push({
        field: 'modelPrediction',
        message: 'Missing model prediction data'
      });
    }

    // Validate user interaction
    if (!log.finalUserInteraction || !log.finalUserInteraction.interactionType) {
      errors.push({
        field: 'finalUserInteraction',
        message: 'Missing user interaction data'
      });
    }

    const score = errors.length === 0 ? 1.0 : Math.max(0, 1 - (errors.length * 0.2));
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score
    };
  }

  // ===== SPECIFIC VALIDATION RULES =====

  private validateRequiredFields(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const requiredFields = [
      'featureVector',
      'actualEngagement',
      'modelVersion',
      'algorithmType',
      'anonymizationTimestamp'
    ];

    for (const field of requiredFields) {
      if (!(field in dataPoint) || dataPoint[field as keyof RetrainingDataPoint] === null || dataPoint[field as keyof RetrainingDataPoint] === undefined) {
        errors.push({
          field,
          message: `Required field '${field}' is missing or null`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1 - (errors.length / requiredFields.length))
    };
  }

  private validateDataTypes(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check algorithm type
    if (!['posts_feed', 'clips_feed', 'friend_suggestions'].includes(dataPoint.algorithmType)) {
      errors.push({
        field: 'algorithmType',
        message: 'Invalid algorithm type',
        value: dataPoint.algorithmType,
        expectedType: 'posts_feed | clips_feed | friend_suggestions'
      });
    }

    // Check predicted rank
    if (typeof dataPoint.predictedRank !== 'number' || dataPoint.predictedRank < 0) {
      errors.push({
        field: 'predictedRank',
        message: 'Invalid predicted rank',
        value: dataPoint.predictedRank,
        expectedType: 'positive number'
      });
    }

    // Check data quality score
    if (typeof dataPoint.dataQualityScore !== 'number' || dataPoint.dataQualityScore < 0 || dataPoint.dataQualityScore > 1) {
      errors.push({
        field: 'dataQualityScore',
        message: 'Invalid data quality score',
        value: dataPoint.dataQualityScore,
        expectedRange: [0, 1]
      });
    }

    // Check anonymization timestamp
    if (!this.isValidISODate(dataPoint.anonymizationTimestamp)) {
      errors.push({
        field: 'anonymizationTimestamp',
        message: 'Invalid anonymization timestamp',
        value: dataPoint.anonymizationTimestamp,
        expectedType: 'ISO 8601 date string'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1 - (errors.length * 0.25))
    };
  }

  private validateValueRanges(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate engagement strength
    const engagementStrength = dataPoint.actualEngagement.engagementStrength;
    if (engagementStrength < 0 || engagementStrength > 1) {
      errors.push({
        field: 'actualEngagement.engagementStrength',
        message: 'Engagement strength out of range',
        value: engagementStrength,
        expectedRange: [0, 1]
      });
    }

    // Validate dwell time
    const dwellTime = dataPoint.actualEngagement.dwellTime;
    if (dwellTime < 0) {
      errors.push({
        field: 'actualEngagement.dwellTime',
        message: 'Negative dwell time',
        value: dwellTime,
        expectedRange: [0, Infinity]
      });
    }

    // Validate watch percentage if present
    const watchPercentage = dataPoint.actualEngagement.watchPercentage;
    if (watchPercentage !== undefined && (watchPercentage < 0 || watchPercentage > 1)) {
      errors.push({
        field: 'actualEngagement.watchPercentage',
        message: 'Watch percentage out of range',
        value: watchPercentage,
        expectedRange: [0, 1]
      });
    }

    // Validate feature vector numerical values
    const featureVector = dataPoint.featureVector;
    const numericalFeatures = [
      'contentAge', 'contentQuality', 'contentPopularity',
      'userEngagementHistory', 'userSessionTime', 'userActivityLevel',
      'timeOfDayRelevance', 'dayOfWeekRelevance', 'seasonalRelevance',
      'socialProofScore', 'networkInfluence', 'viralityIndicator',
      'interestAlignment', 'behaviorPatternMatch', 'diversityScore'
    ];

    for (const feature of numericalFeatures) {
      const value = (featureVector as any)[feature];
      if (typeof value === 'number' && (value < 0 || value > 1)) {
        warnings.push({
          field: `featureVector.${feature}`,
          message: `Feature value out of expected range [0,1]`,
          suggestion: 'Consider normalizing feature values',
          impact: 'medium'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1 - (errors.length * 0.2))
    };
  }

  private validateEngagementConsistency(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const engagement = dataPoint.actualEngagement;
    const engagementType = engagement.engagementType;
    const engagementStrength = engagement.engagementStrength;

    // Check consistency between engagement type and strength
    let expectedRange: [number, number];
    
    switch (engagementType) {
      case 'skip':
      case 'hide':
        expectedRange = [0, 0.3];
        break;
      case 'view':
        expectedRange = [0.1, 0.7];
        break;
      case 'like':
      case 'comment':
      case 'share':
      case 'save':
        expectedRange = [0.5, 1.0];
        break;
      default:
        expectedRange = [0, 1];
    }

    if (engagementStrength < expectedRange[0] || engagementStrength > expectedRange[1]) {
      warnings.push({
        field: 'actualEngagement',
        message: `Engagement strength (${engagementStrength}) inconsistent with type (${engagementType})`,
        suggestion: `Expected range for ${engagementType}: [${expectedRange[0]}, ${expectedRange[1]}]`,
        impact: 'medium'
      });
    }

    // Check dwell time consistency
    if (engagementType === 'skip' && engagement.dwellTime > 5000) {
      warnings.push({
        field: 'actualEngagement.dwellTime',
        message: 'High dwell time for skip interaction',
        suggestion: 'Verify interaction classification logic',
        impact: 'low'
      });
    }

    return {
      isValid: true, // Consistency issues are warnings, not errors
      errors,
      warnings,
      score: warnings.length === 0 ? 1.0 : 0.8
    };
  }

  private validateFeatureCompleteness(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const featureVector = dataPoint.featureVector;
    const requiredFeatures = [
      'contentType', 'deviceType', 'networkQuality', 'locationContext'
    ];

    const optionalFeatures = [
      'contentAge', 'contentQuality', 'contentPopularity',
      'userEngagementHistory', 'userSessionTime', 'userActivityLevel',
      'timeOfDayRelevance', 'dayOfWeekRelevance', 'seasonalRelevance',
      'socialProofScore', 'networkInfluence', 'viralityIndicator',
      'interestAlignment', 'behaviorPatternMatch', 'diversityScore'
    ];

    // Check required features
    for (const feature of requiredFeatures) {
      if (!(feature in featureVector) || (featureVector as any)[feature] === null || (featureVector as any)[feature] === undefined) {
        errors.push({
          field: `featureVector.${feature}`,
          message: `Required feature '${feature}' is missing`
        });
      }
    }

    // Check optional features completeness
    const presentOptionalFeatures = optionalFeatures.filter(feature => 
      feature in featureVector && (featureVector as any)[feature] !== null && (featureVector as any)[feature] !== undefined
    );

    const completenessRatio = presentOptionalFeatures.length / optionalFeatures.length;
    
    if (completenessRatio < 0.5) {
      warnings.push({
        field: 'featureVector',
        message: `Low feature completeness: ${(completenessRatio * 100).toFixed(1)}%`,
        suggestion: 'Consider improving feature extraction pipeline',
        impact: 'medium'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? Math.max(0.5, completenessRatio) : 0
    };
  }

  private validateTemporalValidity(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const now = Date.now();
    const anonymizationTime = new Date(dataPoint.anonymizationTimestamp).getTime();
    
    // Check if timestamp is in the future
    if (anonymizationTime > now) {
      errors.push({
        field: 'anonymizationTimestamp',
        message: 'Timestamp is in the future',
        value: dataPoint.anonymizationTimestamp
      });
    }

    // Check if data is too old (more than 90 days)
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (now - anonymizationTime > maxAge) {
      warnings.push({
        field: 'anonymizationTimestamp',
        message: 'Data point is older than 90 days',
        suggestion: 'Consider data retention policies',
        impact: 'low'
      });
    }

    // Validate time-based features
    if (dataPoint.timeOfDay < 0 || dataPoint.timeOfDay > 23) {
      errors.push({
        field: 'timeOfDay',
        message: 'Invalid time of day',
        value: dataPoint.timeOfDay,
        expectedRange: [0, 23]
      });
    }

    if (dataPoint.dayOfWeek < 0 || dataPoint.dayOfWeek > 6) {
      errors.push({
        field: 'dayOfWeek',
        message: 'Invalid day of week',
        value: dataPoint.dayOfWeek,
        expectedRange: [0, 6]
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1 - (errors.length * 0.3))
    };
  }

  private validatePrivacyCompliance(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check anonymization level
    if (!['basic', 'enhanced', 'differential_privacy'].includes(dataPoint.anonymizationLevel)) {
      errors.push({
        field: 'anonymizationLevel',
        message: 'Invalid anonymization level',
        value: dataPoint.anonymizationLevel
      });
    }

    // Check if user cohort is properly anonymized
    if (dataPoint.userCohort && dataPoint.userCohort.includes('user_') && dataPoint.userCohort.length > 20) {
      warnings.push({
        field: 'userCohort',
        message: 'User cohort may contain identifiable information',
        suggestion: 'Ensure proper anonymization of user cohorts',
        impact: 'high'
      });
    }

    // Check demographic cluster anonymization
    if (dataPoint.demographicCluster && dataPoint.demographicCluster !== 'general') {
      warnings.push({
        field: 'demographicCluster',
        message: 'Specific demographic cluster may reduce anonymity',
        suggestion: 'Consider using more general demographic categories',
        impact: 'medium'
      });
    }

    // Check for potential PII in custom features
    if (dataPoint.featureVector.customFeatures) {
      const customFeatures = dataPoint.featureVector.customFeatures;
      for (const [key, value] of Object.entries(customFeatures)) {
        if (typeof value === 'string' && this.containsPotentialPII(value)) {
          errors.push({
            field: `featureVector.customFeatures.${key}`,
            message: 'Custom feature may contain PII',
            value: value
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : 0
    };
  }

  private validateOutliers(dataPoint: RetrainingDataPoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Simple outlier detection for engagement strength
    const engagementStrength = dataPoint.actualEngagement.engagementStrength;
    
    // Check for extreme values that might indicate data quality issues
    if (engagementStrength === 0 && dataPoint.actualEngagement.engagementType !== 'skip') {
      warnings.push({
        field: 'actualEngagement.engagementStrength',
        message: 'Zero engagement strength for non-skip interaction',
        suggestion: 'Verify engagement calculation logic',
        impact: 'medium'
      });
    }

    if (engagementStrength === 1 && dataPoint.actualEngagement.dwellTime < 1000) {
      warnings.push({
        field: 'actualEngagement',
        message: 'Maximum engagement with very low dwell time',
        suggestion: 'Review engagement scoring algorithm',
        impact: 'medium'
      });
    }

    return {
      isValid: true, // Outliers are informational, not errors
      errors,
      warnings,
      score: warnings.length === 0 ? 1.0 : 0.9
    };
  }

  // ===== BATCH VALIDATION =====

  generateDataQualityReport(
    dataPoints: RetrainingDataPoint[],
    batches?: RetrainingDataBatch[]
  ): DataQualityReport {
    const results: ValidationResult[] = [];
    let totalScore = 0;
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    // Validate individual data points
    for (const dataPoint of dataPoints) {
      const result = this.validateRetrainingDataPoint(dataPoint);
      results.push(result);
      
      totalScore += result.score;
      if (result.isValid) validCount++;
      errorCount += result.errors.length;
      warningCount += result.warnings.length;
    }

    // Validate batches if provided
    if (batches) {
      for (const batch of batches) {
        const result = this.validateRetrainingDataBatch(batch);
        results.push(result);
        
        totalScore += result.score;
        if (result.isValid) validCount++;
        errorCount += result.errors.length;
        warningCount += result.warnings.length;
      }
    }

    const overallScore = results.length > 0 ? totalScore / results.length : 0;

    // Calculate category scores
    const categoryScores = this.calculateCategoryScores(results);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, overallScore);

    return {
      overallScore,
      totalDataPoints: dataPoints.length,
      validDataPoints: validCount,
      errorCount,
      warningCount,
      categoryScores,
      detailedResults: results,
      recommendations,
      timestamp: Date.now()
    };
  }

  private calculateCategoryScores(results: ValidationResult[]): Record<string, number> {
    const categoryScores: Record<string, number> = {
      data_quality: 0,
      privacy: 0,
      consistency: 0,
      completeness: 0
    };

    const categoryCounts: Record<string, number> = {
      data_quality: 0,
      privacy: 0,
      consistency: 0,
      completeness: 0
    };

    for (const result of results) {
      // This is a simplified calculation - in a real implementation,
      // you would track which rules contributed to each category
      categoryScores.data_quality += result.score;
      categoryCounts.data_quality++;
    }

    // Normalize scores
    for (const category of Object.keys(categoryScores)) {
      if (categoryCounts[category] > 0) {
        categoryScores[category] /= categoryCounts[category];
      }
    }

    return categoryScores;
  }

  private generateRecommendations(results: ValidationResult[], overallScore: number): string[] {
    const recommendations: string[] = [];

    if (overallScore < 0.7) {
      recommendations.push('Overall data quality is below acceptable threshold. Review data collection and preprocessing pipelines.');
    }

    const commonErrors = this.findCommonErrors(results);
    for (const error of commonErrors) {
      recommendations.push(`Address common error: ${error}`);
    }

    const commonWarnings = this.findCommonWarnings(results);
    for (const warning of commonWarnings) {
      recommendations.push(`Consider addressing: ${warning}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Data quality is good. Continue monitoring for consistency.');
    }

    return recommendations;
  }

  private findCommonErrors(results: ValidationResult[]): string[] {
    const errorCounts: Record<string, number> = {};
    
    for (const result of results) {
      for (const error of result.errors) {
        const key = `${error.field}: ${error.message}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    }

    return Object.entries(errorCounts)
      .filter(([, count]) => count >= Math.max(2, results.length * 0.1))
      .map(([error]) => error);
  }

  private findCommonWarnings(results: ValidationResult[]): string[] {
    const warningCounts: Record<string, number> = {};
    
    for (const result of results) {
      for (const warning of result.warnings) {
        const key = `${warning.field}: ${warning.message}`;
        warningCounts[key] = (warningCounts[key] || 0) + 1;
      }
    }

    return Object.entries(warningCounts)
      .filter(([, count]) => count >= Math.max(3, results.length * 0.2))
      .map(([warning]) => warning);
  }

  // ===== UTILITY METHODS =====

  private isValidISODate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString;
    } catch {
      return false;
    }
  }

  private containsPotentialPII(value: string): boolean {
    // Simple PII detection patterns
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone pattern
      /\b\d{16}\b/, // Credit card pattern
    ];

    return piiPatterns.some(pattern => pattern.test(value));
  }

  // ===== PUBLIC API =====

  addCustomValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  removeValidationRule(ruleName: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.name !== ruleName);
  }

  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  validateDataset(dataPoints: RetrainingDataPoint[]): DataQualityReport {
    return this.generateDataQualityReport(dataPoints);
  }
}

export default DataValidationService;